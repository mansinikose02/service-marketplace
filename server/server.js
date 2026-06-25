'use strict';

// env.js must be required first — it calls dotenv.config() and validates env vars
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const bidRoutes = require('./routes/bidRoutes');
const dealRoutes = require('./routes/dealRoutes');
const updateRoutes = require('./routes/updateRoutes');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(helmet());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  // Skip rate limiting in test environment so property-based tests (100+ requests) are not blocked
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many requests, please try again later.' },
});

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/updates', updateRoutes);

app.use(errorHandler);

async function startServer() {
  await connectDB();
  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
