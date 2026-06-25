'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  acceptBid,
  getMyDeals,
  getDeal,
  submitForApproval,
  approveCompletion,
  raiseDispute,
  resolveDispute,
} = require('../controllers/dealController');

const router = express.Router();

// CRITICAL: /mine must be before /:id to avoid Express matching "mine" as a param
router.get('/mine', authenticate, getMyDeals);

router.post('/accept/:bidId', authenticate, authorize('client'), acceptBid);
router.get('/:id', authenticate, getDeal);
router.post('/:id/submit', authenticate, authorize('provider'), submitForApproval);
router.post('/:id/approve', authenticate, authorize('client'), approveCompletion);
router.post('/:id/dispute', authenticate, authorize('client'), raiseDispute);
router.post('/:id/resolve', authenticate, resolveDispute);

module.exports = router;
