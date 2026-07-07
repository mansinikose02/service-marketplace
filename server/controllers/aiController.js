'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const Requirement = require('../models/Requirement');
const ProviderProfile = require('../models/ProviderProfile');
const Bid = require('../models/Bid');

// Shared helper: initialise Gemini model
function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// Shared helper: strip markdown code fences and parse JSON
function parseJsonResponse(rawText) {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  return JSON.parse(cleaned);
}

// ── POST /api/ai/generate-requirement ────────────────────────────────────────

async function generateRequirement(req, res, next) {
  try {
    const { roughIdea } = req.body;

    if (!roughIdea || typeof roughIdea !== 'string' || roughIdea.trim().length < 10) {
      return res.status(400).json({
        message: 'roughIdea must be a string of at least 10 characters',
      });
    }

    const model = getGeminiModel();

    const prompt = `You are helping a business client write a professional 
service requirement brief for a B2B marketplace.

The client has described their need as:
"${roughIdea.trim()}"

Generate a structured requirement with these exact fields and respond 
ONLY with valid JSON, no extra text, no markdown:
{
  "title": "clear concise title (10-100 characters)",
  "description": "detailed professional description (100-500 characters)",
  "category": "one of: Web Development, Mobile Development, UI/UX Design, Digital Marketing, Content Writing, Consulting, Legal Services, Logistics, Manufacturing, Other",
  "budgetMin": number (realistic minimum budget in USD),
  "budgetMax": number (realistic maximum budget in USD),
  "timeline": "realistic timeline string e.g. 4 weeks, 2 months"
}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let parsed;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      return res.status(500).json({ message: 'AI response could not be parsed' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/ai/match-providers ──────────────────────────────────────────────

async function matchProviders(req, res, next) {
  try {
    const { requirementId } = req.body;

    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const providerProfiles = await ProviderProfile.find({ pitchComplete: true })
      .populate('userId', 'name company');

    if (providerProfiles.length === 0) {
      return res.status(200).json({ matches: [] });
    }

    // Build a compact provider list for the prompt
    const providerListText = providerProfiles.map((profile) => {
      const plain = profile.toObject();
      return [
        `providerId: ${plain.userId._id}`,
        `name: ${plain.userId.name}`,
        `company: ${plain.userId.company}`,
        `categories: ${plain.categories.join(', ')}`,
        `pitch (excerpt): ${plain.pitch.slice(0, 200)}`,
        `typicalBudget: $${plain.typicalBudgetMin}–$${plain.typicalBudgetMax}`,
        `teamSize: ${plain.teamSize}`,
      ].join(' | ');
    }).join('\n');

    const model = getGeminiModel();

    const prompt = `You are a B2B marketplace matchmaking AI.

REQUIREMENT:
- Title: ${requirement.title}
- Category: ${requirement.category}
- Description: ${requirement.description}
- Budget: $${requirement.budgetMin}–$${requirement.budgetMax}
- Timeline: ${requirement.timeline}

AVAILABLE PROVIDERS:
${providerListText}

Select the top 3 providers that best match this requirement.
Respond ONLY with valid JSON, no extra text, no markdown:
{
  "matches": [
    {
      "providerId": "the userId string",
      "providerName": "name",
      "reason": "one sentence explaining why this provider is a good match"
    }
  ]
}
Return exactly 3 matches ranked by fit, or fewer if there are not enough providers.`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let parsed;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      return res.status(500).json({ message: 'AI response could not be parsed' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/ai/analyse-bids ─────────────────────────────────────────────────

async function analyseBids(req, res, next) {
  try {
    const { requirementId } = req.body;

    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const bids = await Bid.find({ requirementId });

    if (bids.length < 2) {
      return res.status(200).json({
        analysis: 'Not enough proposals to compare yet.',
      });
    }

    const bidsText = bids.map((bid, index) =>
      `Bid ${index + 1}: ${bid.providerName} (${bid.providerCompany}) — $${bid.proposedBudget}, ${bid.proposedTimeline} — "${bid.message}"`
    ).join('\n');

    const model = getGeminiModel();

    const prompt = `You are analysing proposals for a B2B service requirement.

REQUIREMENT:
- Title: ${requirement.title}
- Category: ${requirement.category}
- Budget: $${requirement.budgetMin}–$${requirement.budgetMax}
- Timeline: ${requirement.timeline}

PROPOSALS RECEIVED:
${bidsText}

Analyse these proposals and respond ONLY with valid JSON, no extra text, no markdown:
{
  "summary": "2-3 sentence overall summary of the proposals received",
  "bestValue": "providerName of the best value bid",
  "bestValueReason": "one sentence why",
  "concerns": "any red flags or things to watch out for across the proposals, or null if none"
}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let parsed;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      return res.status(500).json({ message: 'AI response could not be parsed' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/ai/review-proposal ──────────────────────────────────────────────

async function reviewProposal(req, res, next) {
  try {
    const { requirementTitle, requirementDescription, proposedBudget, proposedTimeline, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ message: 'message must be at least 10 characters' });
    }

    const model = getGeminiModel();

    const prompt = `You are a B2B proposal writing coach.

REQUIREMENT CONTEXT:
- Title: ${requirementTitle}
- Description: ${requirementDescription}

PROVIDER'S DRAFT PROPOSAL:
- Proposed Budget: $${proposedBudget}
- Proposed Timeline: ${proposedTimeline}
- Message: "${message.trim()}"

Evaluate this proposal and respond ONLY with valid JSON, no extra text, no markdown:
{
  "score": number from 1 to 10,
  "strengths": "one sentence on what is good about this proposal",
  "improvements": "one specific actionable suggestion to make it stronger",
  "verdict": "one of: Strong, Good, Needs Work"
}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let parsed;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      return res.status(500).json({ message: 'AI response could not be parsed' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateRequirement, matchProviders, analyseBids, reviewProposal };
