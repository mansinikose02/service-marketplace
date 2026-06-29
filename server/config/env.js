'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'GEMINI_API_KEY'];

requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const config = Object.freeze({
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  PORT: parseInt(process.env.PORT, 10) || 5002,
});

module.exports = config;