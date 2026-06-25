'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { acceptBid, getMyDeals, getDeal } = require('../controllers/dealController');

const router = express.Router();

// CRITICAL: /mine must be before /:id to avoid Express matching "mine" as a param
router.get('/mine', authenticate, getMyDeals);

router.post('/accept/:bidId', authenticate, authorize('client'), acceptBid);
router.get('/:id', authenticate, getDeal);

module.exports = router;
