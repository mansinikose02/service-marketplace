'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const { postUpdate, getUpdates } = require('../controllers/updateController');

const router = express.Router();

router.post('/:dealId', authenticate, postUpdate);
router.get('/:dealId', authenticate, getUpdates);

module.exports = router;
