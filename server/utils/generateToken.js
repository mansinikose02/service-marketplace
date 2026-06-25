'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

function generateToken(userId, userRole) {
  return jwt.sign(
    { id: userId, role: userRole },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

module.exports = generateToken;