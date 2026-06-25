'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  upsertProfile,
  getOwnProfile,
  updateProfile,
  getPublicProfile,
} = require('../controllers/profileController');

const router = express.Router();

// Provider-only routes
router.post('/me', authenticate, authorize('provider'), upsertProfile);
router.get('/me', authenticate, authorize('provider'), getOwnProfile);
router.patch('/me', authenticate, authorize('provider'), updateProfile);

// Any authenticated user
router.get('/:userId', authenticate, getPublicProfile);

module.exports = router;
