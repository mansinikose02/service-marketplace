'use strict';

const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
      immutable: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorRole: {
      type: String,
      enum: {
        values: ['client', 'provider'],
        message: 'authorRole must be client or provider',
      },
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: [1, 'Content must be at least 1 character'],
      maxlength: [2000, 'Content must be at most 2000 characters'],
    },
  },
  { timestamps: true }
);

// Index for fetching all updates for a deal efficiently
updateSchema.index({ dealId: 1 });

module.exports = mongoose.model('Update', updateSchema);
