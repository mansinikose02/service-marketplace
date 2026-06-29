'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

async function generateRequirement(req, res, next) {
  try {
    const { roughIdea } = req.body;

    if (!roughIdea || typeof roughIdea !== 'string' || roughIdea.trim().length < 10) {
      return res.status(400).json({ 
        message: 'roughIdea must be a string of at least 10 characters' 
      });
    }

    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
      const cleanedText = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleanedText);
    } catch {
      return res.status(500).json({ 
        message: 'AI response could not be parsed' 
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateRequirement };