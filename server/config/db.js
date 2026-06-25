'use strict';

const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(config.MONGO_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;