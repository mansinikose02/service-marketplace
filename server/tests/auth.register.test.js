// Feature: project-scaffolding-auth — Registration property tests (Properties 1–6)

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dealtable';
process.env.JWT_EXPIRES_IN = '24h';
process.env.MONGO_URI = 'mongodb://placeholder';

const request = require('supertest');
const fc = require('fast-check');
const bcryptjs = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');

jest.setTimeout(120000);

// Hash passwords with 1 round in tests — 12 rounds makes 100-run PBTs timeout
jest.mock('bcryptjs', () => {
  const actual = jest.requireActual('bcryptjs');
  return {
    ...actual,
    hash: (plain, _rounds) => actual.hash(plain, 1),
    hashSync: (plain, _rounds) => actual.hashSync(plain, 1),
  };
});

const mongoose = require('mongoose');

const validPayload = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim() === s && s.trim().length > 0),
  email: fc.emailAddress(),
  password: fc.string({ minLength: 8, maxLength: 20 }).filter((s) => s.trim().length >= 8),
  role: fc.constantFrom('client', 'provider'),
  company: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim() === s && s.trim().length > 0),
});

// Feature: project-scaffolding-auth, Property 1: Valid registration returns 201 and no password field
test('P1: valid registration returns 201 with user DTO and no password data', async () => {
  await fc.assert(
    fc.asyncProperty(validPayload, async (payload) => {
      // Clear the collection before each iteration so the same email never collides
      // across runs or fast-check's shrinking replays
      await mongoose.connection.collections['users']?.deleteMany({});

      const response = await request(app).post('/api/auth/register').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', payload.name);
      expect(response.body).toHaveProperty('email', payload.email.toLowerCase());
      expect(response.body).toHaveProperty('role', payload.role);
      expect(response.body).toHaveProperty('company', payload.company);

      const responseKeys = Object.keys(response.body).join(' ').toLowerCase();
      expect(responseKeys).not.toMatch(/pass/);
    }),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 2: Invalid role values return 400
test('P2: invalid role values return 400', async () => {
  await fc.assert(
    fc.asyncProperty(
      validPayload,
      fc.string().filter((s) => s !== 'client' && s !== 'provider'),
      async (base, invalidRole) => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...base, role: invalidRole });

        expect(response.status).toBe(400);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 3: Missing required fields return 400
test('P3: missing required fields return 400', async () => {
  const allFields = ['name', 'email', 'password', 'role', 'company'];

  await fc.assert(
    fc.asyncProperty(
      validPayload,
      fc.subarray(allFields, { minLength: 1 }),
      async (base, fieldsToOmit) => {
        const payload = { ...base };
        for (const field of fieldsToOmit) {
          delete payload[field];
        }

        const response = await request(app).post('/api/auth/register').send(payload);

        expect(response.status).toBe(400);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 4: Passwords stored as bcryptjs hashes, never plaintext
test('P4: passwords are stored as bcryptjs hashes and never as plaintext', async () => {
  await fc.assert(
    fc.asyncProperty(
      validPayload,
      async (payload) => {
        await request(app).post('/api/auth/register').send(payload);

        const storedUser = await User.findOne({ email: payload.email.toLowerCase() }).select('+password');
        expect(storedUser).not.toBeNull();
        expect(storedUser.password).not.toBe(payload.password);

        const hashIsValid = await bcryptjs.compare(payload.password, storedUser.password);
        expect(hashIsValid).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 5: Two users with the same password get different hashes
test('P5: per-user salting produces unique hashes for identical passwords', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 8, maxLength: 30 }),
      async (sharedPassword) => {
        const payloadA = {
          name: 'Alice',
          email: `alice-${Date.now()}-${Math.random()}@test.com`,
          password: sharedPassword,
          role: 'client',
          company: 'ACME',
        };
        const payloadB = {
          name: 'Bob',
          email: `bob-${Date.now()}-${Math.random()}@test.com`,
          password: sharedPassword,
          role: 'provider',
          company: 'ACME',
        };

        await request(app).post('/api/auth/register').send(payloadA);
        await request(app).post('/api/auth/register').send(payloadB);

        const userA = await User.findOne({ email: payloadA.email }).select('+password');
        const userB = await User.findOne({ email: payloadB.email }).select('+password');

        expect(userA.password).not.toBe(userB.password);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 6: Passwords shorter than 8 characters return 400
test('P6: passwords shorter than 8 characters return 400', async () => {
  await fc.assert(
    fc.asyncProperty(
      validPayload,
      fc.string({ maxLength: 7 }),
      async (base, shortPassword) => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...base, password: shortPassword });

        expect(response.status).toBe(400);
      }
    ),
    { numRuns: 100 }
  );
});
