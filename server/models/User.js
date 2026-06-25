'use strict';

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['client', 'provider'],
        message: 'Role must be "client" or "provider"',
      },
      required: [true, 'Role is required'],
    },
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving only when it has been modified
userSchema.pre('save', async function hashPasswordIfModified() {
  if (!this.isModified('password')) return;
  this.password = await bcryptjs.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
