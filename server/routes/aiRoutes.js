'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  generateRequirement,
  matchProviders,
  analyseBids,
  reviewProposal,
} = require('../controllers/aiController');

const router = express.Router();

router.post('/generate-requirement', authenticate, authorize('client'), generateRequirement);
router.post('/match-providers',      authenticate, authorize('client'), matchProviders);
router.post('/analyse-bids',         authenticate, authorize('client'), analyseBids);
router.post('/review-proposal',      authenticate, authorize('provider'), reviewProposal);

module.exports = router;
