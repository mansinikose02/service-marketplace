'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { submitReview, getProviderReviews } = require('../controllers/reviewController');

const router = express.Router();

router.post('/', authenticate, authorize('client'), submitReview);
router.get('/provider/:providerId', authenticate, getProviderReviews);

module.exports = router;
