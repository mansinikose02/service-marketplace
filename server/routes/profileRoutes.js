'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  upsertProfile,
  getOwnProfile,
  updateProfile,
  getPublicProfile,
  listProviders,
} = require('../controllers/profileController');

const router = express.Router();

// Provider-only routes
router.post('/me', authenticate, authorize('provider'), upsertProfile);
router.get('/me', authenticate, authorize('provider'), getOwnProfile);
router.patch('/me', authenticate, authorize('provider'), updateProfile);

// Directory — any authenticated user; registered BEFORE /:userId to avoid route conflict
router.get('/', authenticate, listProviders);

// Any authenticated user
router.get('/:userId', authenticate, getPublicProfile);

module.exports = router;
