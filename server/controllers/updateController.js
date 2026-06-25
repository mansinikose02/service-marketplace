'use strict';

const Update = require('../models/Update');
const Deal = require('../models/Deal');
const User = require('../models/User');

// POST /api/updates/:dealId
async function postUpdate(req, res, next) {
  try {
    const { dealId } = req.params;
    const { content } = req.body;

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const isParticipant =
      deal.clientId.toString() === req.user.id.toString() ||
      deal.providerId.toString() === req.user.id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden: you are not a participant in this deal' });
    }

    if (deal.status !== 'active') {
      return res.status(409).json({ message: 'Cannot post updates on a completed deal' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 1 || content.length > 2000) {
      return res.status(400).json({ message: 'Content is required and must be between 1 and 2000 characters' });
    }

    const author = await User.findById(req.user.id).select('name');
    if (!author) {
      return res.status(400).json({ message: 'Author not found' });
    }

    const update = await Update.create({
      dealId,
      authorId: req.user.id,
      authorName: author.name,
      authorRole: req.user.role,
      content: content.trim(),
    });

    return res.status(201).json(update.toObject());
  } catch (err) {
    next(err);
  }
}

// GET /api/updates/:dealId
async function getUpdates(req, res, next) {
  try {
    const { dealId } = req.params;

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const isParticipant =
      deal.clientId.toString() === req.user.id.toString() ||
      deal.providerId.toString() === req.user.id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden: you are not a participant in this deal' });
    }

    const updates = await Update.find({ dealId }).sort({ createdAt: 1 });
    return res.status(200).json(updates);
  } catch (err) {
    next(err);
  }
}

module.exports = { postUpdate, getUpdates };
