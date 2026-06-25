'use strict';

const mongoose = require('mongoose');

function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const duplicatedField = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `${duplicatedField} already exists` });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({ message });
}

module.exports = errorHandler;
