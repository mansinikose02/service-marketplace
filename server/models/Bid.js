'use strict';

const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requirement',
      required: true,
      immutable: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    providerName: {
      type: String,
      required: true,
    },
    providerCompany: {
      type: String,
      required: true,
    },
    proposedBudget: {
      type: Number,
      required: true,
      min: [0, 'Proposed budget must be at least 0'],
    },
    proposedTimeline: {
      type: String,
      required: true,
      minlength: [5, 'Proposed timeline must be at least 5 characters'],
      maxlength: [100, 'Proposed timeline must be at most 100 characters'],
    },
    message: {
      type: String,
      required: true,
      minlength: [10, 'Message must be at least 10 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'declined'],
        message: 'Status must be pending, accepted, or declined',
      },
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One provider can only bid once per requirement
bidSchema.index({ requirementId: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model('Bid', bidSchema);
