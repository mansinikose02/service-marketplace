'use strict';

const mongoose = require('mongoose');
const { VALID_CATEGORIES } = require('../utils/pitchComplete');

const providerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true,
    },
    pitch: {
      type: String,
      required: [true, 'Pitch is required'],
      minlength: [100, 'Pitch must be at least 100 characters'],
    },
    categories: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length >= 1 &&
          arr.length <= 5 &&
          arr.every((cat) => VALID_CATEGORIES.includes(cat)),
        message: 'categories must contain 1–5 valid ServiceCategory values',
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [20, 'Capacity must be at most 20'],
    },
    teamSize: {
      type: Number,
      required: [true, 'Team size is required'],
      min: [1, 'Team size must be at least 1'],
    },
    typicalBudgetMin: {
      type: Number,
      required: [true, 'Typical budget minimum is required'],
      min: [0, 'Typical budget minimum must be at least 0'],
    },
    typicalBudgetMax: {
      type: Number,
      required: [true, 'Typical budget maximum is required'],
      min: [0, 'Typical budget maximum must be at least 0'],
    },
    // Optional — URL format validation is enforced in the controller, not here
    websiteUrl: {
      type: String,
    },
    pitchComplete: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

//providerProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);
