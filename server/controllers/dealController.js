'use strict';

const Deal = require('../models/Deal');
const Bid = require('../models/Bid');
const Requirement = require('../models/Requirement');
const User = require('../models/User');

// POST /api/deals/accept/:bidId
async function acceptBid(req, res, next) {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    const requirement = await Requirement.findById(bid.requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    if (requirement.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you do not own this requirement' });
    }

    if (requirement.status !== 'open') {
      return res.status(409).json({ message: 'Requirement is not open — a bid may already have been accepted' });
    }

    // Fetch the client's name and company since req.user only carries id and role
    const client = await User.findById(req.user.id).select('name company');
    if (!client) {
      return res.status(400).json({ message: 'Client user not found' });
    }

    // a. Mark the accepted bid
    bid.status = 'accepted';
    await bid.save();

    // b. Decline all other bids on the same requirement
    await Bid.updateMany(
      { requirementId: requirement._id, _id: { $ne: bid._id } },
      { status: 'declined' }
    );

    // c. Seal the requirement so no further bids or accepts can happen
    requirement.status = 'sealed';
    await requirement.save();

    // d. Create the Deal with all denormalised fields
    const deal = await Deal.create({
      requirementId: requirement._id,
      bidId: bid._id,
      clientId: requirement.clientId,
      providerId: bid.providerId,
      clientName: client.name,
      clientCompany: client.company,
      providerName: bid.providerName,
      providerCompany: bid.providerCompany,
      title: requirement.title,
      agreedBudget: bid.proposedBudget,
      agreedTimeline: bid.proposedTimeline,
    });

    return res.status(201).json(deal.toObject());
  } catch (err) {
    next(err);
  }
}

// GET /api/deals/mine
async function getMyDeals(req, res, next) {
  try {
    const filter =
      req.user.role === 'client'
        ? { clientId: req.user.id }
        : { providerId: req.user.id };

    const deals = await Deal.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(deals);
  } catch (err) {
    next(err);
  }
}

// GET /api/deals/:id
async function getDeal(req, res, next) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const isParticipant =
      deal.clientId.toString() === req.user.id.toString() ||
      deal.providerId.toString() === req.user.id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden: you are not a participant in this deal' });
    }

    return res.status(200).json(deal.toObject());
  } catch (err) {
    next(err);
  }
}

// POST /api/deals/:id/submit  (provider only)
async function submitForApproval(req, res, next) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    if (deal.providerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you are not the provider on this deal' });
    }

    if (deal.status !== 'active') {
      return res.status(409).json({ message: 'Deal must be active to submit for approval' });
    }

    deal.status = 'pending_approval';
    await deal.save();

    return res.status(200).json(deal.toObject());
  } catch (err) {
    next(err);
  }
}

// POST /api/deals/:id/approve  (client only)
async function approveCompletion(req, res, next) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    if (deal.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you are not the client on this deal' });
    }

    if (deal.status !== 'pending_approval') {
      return res.status(409).json({ message: 'Deal must be pending approval to approve' });
    }

    deal.status = 'completed';
    await deal.save();

    return res.status(200).json(deal.toObject());
  } catch (err) {
    next(err);
  }
}

// POST /api/deals/:id/dispute  (client only)
async function raiseDispute(req, res, next) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    if (deal.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you are not the client on this deal' });
    }

    if (deal.status !== 'pending_approval') {
      return res.status(409).json({ message: 'Deal must be pending approval to raise a dispute' });
    }

    deal.status = 'disputed';
    await deal.save();

    return res.status(200).json(deal.toObject());
  } catch (err) {
    next(err);
  }
}

// POST /api/deals/:id/resolve  (any participant — resets to active)
async function resolveDispute(req, res, next) {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const isParticipant =
      deal.clientId.toString() === req.user.id.toString() ||
      deal.providerId.toString() === req.user.id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden: you are not a participant in this deal' });
    }

    if (deal.status !== 'disputed') {
      return res.status(409).json({ message: 'Deal must be disputed to resolve' });
    }

    deal.status = 'active';
    await deal.save();

    return res.status(200).json(deal.toObject());
  } catch (err) {
    next(err);
  }
}

module.exports = { acceptBid, getMyDeals, getDeal, submitForApproval, approveCompletion, raiseDispute, resolveDispute };
