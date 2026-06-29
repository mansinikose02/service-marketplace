'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { generateRequirement } = require('../controllers/aiController');

const router = express.Router();

router.post('/generate-requirement', authenticate, authorize('client'), generateRequirement);

module.exports = router;
