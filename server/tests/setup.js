// NODE_ENV must be set before any imports that touch config or middleware
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dealtable';
process.env.JWT_EXPIRES_IN = '24h';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoMemoryServer;

beforeAll(async () => {
  mongoMemoryServer = await MongoMemoryServer.create();
  const mongoUri = mongoMemoryServer.getUri();
  process.env.MONGO_URI = mongoUri;
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  // Clear all collections between tests to keep each test isolated
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoMemoryServer.stop();
});
