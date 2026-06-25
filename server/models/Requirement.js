'use strict';

const mongoose = require('mongoose');
const { VALID_CATEGORIES } = require('../utils/pitchComplete');

const requirementSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      minlength: [10, 'Title must be at least 10 characters'],
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: VALID_CATEGORIES,
        message: 'Category must be a valid ServiceCategory value',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [50, 'Description must be at least 50 characters'],
    },
    budgetMin: {
      type: Number,
      required: [true, 'Budget minimum is required'],
      min: [0, 'Budget minimum must be at least 0'],
    },
    // Cross-field constraint (budgetMax >= budgetMin) is enforced in the controller
    budgetMax: {
      type: Number,
      required: [true, 'Budget maximum is required'],
      min: [0, 'Budget maximum must be at least 0'],
    },
    timeline: {
      type: String,
      required: [true, 'Timeline is required'],
      minlength: [5, 'Timeline must be at least 5 characters'],
      maxlength: [100, 'Timeline must be at most 100 characters'],
    },
    // 'sealed' is reserved for Week 4 — no Week 2 endpoint sets or accepts it
    status: {
      type: String,
      enum: {
        values: ['open', 'sealed', 'closed'],
        message: 'Status must be open, sealed, or closed',
      },
      required: true,
      default: 'open',
    },
  },
  { timestamps: true }
);

// Index for list-own-requirements query performance
requirementSchema.index({ clientId: 1 });

module.exports = mongoose.model('Requirement', requirementSchema);
