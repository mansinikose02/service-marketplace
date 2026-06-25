'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { submitBid, getBidsForRequirement, getMyBids } = require('../controllers/bidController');

const router = express.Router();

// CRITICAL: /mine must be registered before /:requirementId
router.get('/mine', authenticate, authorize('provider'), getMyBids);

router.post('/:requirementId', authenticate, authorize('provider'), submitBid);
router.get('/:requirementId', authenticate, getBidsForRequirement);

module.exports = router;
