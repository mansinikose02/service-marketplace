'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    // Covers both JsonWebTokenError and TokenExpiredError
    return res.status(401).json({ message: 'Not authorized' });
  }
}

module.exports = authenticate;
