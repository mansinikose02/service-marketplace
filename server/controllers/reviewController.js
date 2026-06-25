'use strict';

const Review = require('../models/Review');
const Deal = require('../models/Deal');

// POST /api/reviews
async function submitReview(req, res, next) {
  try {
    const { dealId, rating, comment } = req.body;

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    if (deal.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you are not the client on this deal' });
    }

    if (deal.status !== 'completed') {
      return res.status(409).json({ message: 'You can only review a completed deal' });
    }

    const existingReview = await Review.findOne({ dealId });
    if (existingReview) {
      return res.status(409).json({ message: 'You have already reviewed this deal' });
    }

    // Validate rating
    if (rating === undefined || rating === null) {
      return res.status(400).json({ message: 'Rating is required' });
    }
    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    // Validate comment
    if (!comment || typeof comment !== 'string' || comment.length < 10 || comment.length > 1000) {
      return res.status(400).json({ message: 'Comment must be between 10 and 1000 characters' });
    }

    const review = await Review.create({
      dealId,
      clientId: deal.clientId,
      providerId: deal.providerId,
      rating: parsedRating,
      comment,
      providerName: deal.providerName,
      providerCompany: deal.providerCompany,
      clientName: deal.clientName,
    });

    return res.status(201).json(review.toObject());
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/provider/:providerId
async function getProviderReviews(req, res, next) {
  try {
    const reviews = await Review.find({ providerId: req.params.providerId }).sort({ createdAt: -1 });

    const averageRating =
      reviews.length === 0
        ? null
        : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

    return res.status(200).json({ reviews, averageRating });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitReview, getProviderReviews };
