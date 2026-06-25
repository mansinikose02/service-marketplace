'use strict';

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requirement',
      required: true,
      immutable: true,
    },
    bidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      required: true,
      immutable: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    clientName: { type: String, required: true },
    clientCompany: { type: String, required: true },
    providerName: { type: String, required: true },
    providerCompany: { type: String, required: true },
    title: { type: String, required: true },
    agreedBudget: { type: Number, required: true },
    agreedTimeline: { type: String, required: true },
    status: {
      type: String,
      enum: {
        values: ['active', 'pending_approval', 'disputed', 'completed'],
        message: 'Status must be active, pending_approval, disputed, or completed',
      },
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deal', dealSchema);
