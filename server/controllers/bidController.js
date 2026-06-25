'use strict';

const Bid = require('../models/Bid');
const Requirement = require('../models/Requirement');
const User = require('../models/User');

// POST /api/bids
async function submitBid(req, res, next) {
  try {
    const { proposedBudget, proposedTimeline, message } = req.body;

    // Field validation
    if (proposedBudget === undefined || Number(proposedBudget) < 0) {
      return res.status(400).json({ message: 'proposedBudget is required and must be at least 0' });
    }
    if (
      !proposedTimeline ||
      typeof proposedTimeline !== 'string' ||
      proposedTimeline.length < 5 ||
      proposedTimeline.length > 100
    ) {
      return res.status(400).json({ message: 'proposedTimeline must be between 5 and 100 characters' });
    }
    if (!message || typeof message !== 'string' || message.length < 10) {
      return res.status(400).json({ message: 'message must be at least 10 characters' });
    }

    const { requirementId } = req.params;

    // Requirement must exist and be open
    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(400).json({ message: 'Requirement not found' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ message: 'Requirement is not open for bids' });
    }

    // Check for duplicate bid
    const existingBid = await Bid.findOne({ requirementId, providerId: req.user.id });
    if (existingBid) {
      return res.status(409).json({ message: 'You have already bid on this requirement' });
    }

    // Fetch provider name and company from the database since req.user only has id and role
    const provider = await User.findById(req.user.id).select('name company');
    if (!provider) {
      return res.status(400).json({ message: 'Provider not found' });
    }

    const bid = await Bid.create({
      requirementId,
      providerId: req.user.id,
      providerName: provider.name,
      providerCompany: provider.company,
      proposedBudget: Number(proposedBudget),
      proposedTimeline,
      message,
    });

    return res.status(201).json(bid.toObject());
  } catch (err) {
    next(err);
  }
}

// GET /api/bids/:requirementId
async function getBidsForRequirement(req, res, next) {
  try {
    const bids = await Bid.find({ requirementId: req.params.requirementId }).sort({ createdAt: -1 });
    return res.status(200).json(bids);
  } catch (err) {
    next(err);
  }
}

// GET /api/bids/mine
async function getMyBids(req, res, next) {
  try {
    const bids = await Bid.find({ providerId: req.user.id })
      .populate('requirementId', 'title category status')
      .sort({ createdAt: -1 });
    return res.status(200).json(bids);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitBid, getBidsForRequirement, getMyBids };
