'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  createRequirement,
  listOwnRequirements,
  listOpenRequirements,
  getRequirement,
  updateRequirement,
  closeRequirement,
} = require('../controllers/requirementController');

const router = express.Router();

// CRITICAL: /mine and /open must be registered before /:id
router.get('/mine', authenticate, authorize('client'), listOwnRequirements);
router.get('/open', authenticate, listOpenRequirements);

router.post('/', authenticate, authorize('client'), createRequirement);
router.get('/:id', authenticate, getRequirement);
router.patch('/:id', authenticate, authorize('client'), updateRequirement);
router.post('/:id/close', authenticate, authorize('client'), closeRequirement);

module.exports = router;
