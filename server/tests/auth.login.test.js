// Feature: project-scaffolding-auth — Login property tests (Properties 7–10)

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dealtable';
process.env.JWT_EXPIRES_IN = '24h';
process.env.MONGO_URI = 'mongodb://placeholder';

const request = require('supertest');
const fc = require('fast-check');
const jwt = require('jsonwebtoken');
const app = require('../server');

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

const validRegistrationPayload = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  email: fc.emailAddress().map((email) => `${Date.now()}-${Math.random().toString(36).slice(2)}-${email}`),
  password: fc.string({ minLength: 8, maxLength: 20 }).filter((s) => s.trim().length >= 8),
  role: fc.constantFrom('client', 'provider'),
  company: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
});

async function registerUser(payload) {
  const response = await request(app).post('/api/auth/register').send(payload);
  return response.body;
}

// Feature: project-scaffolding-auth, Property 7: Valid login returns 200 with token containing correct claims
test('P7: valid login returns 200 with a JWT containing correct id and role claims', async () => {
  await fc.assert(
    fc.asyncProperty(validRegistrationPayload, async (payload) => {
      const registeredUser = await registerUser(payload);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: payload.email, password: payload.password });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');

      const decoded = jwt.decode(loginResponse.body.token);
      expect(decoded.id).toBe(registeredUser.id);
      expect(decoded.role).toBe(payload.role);
    }),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 8: Token expiry is within 24 hours
test('P8: session token expiry is at most 24 hours from issue time', async () => {
  await fc.assert(
    fc.asyncProperty(validRegistrationPayload, async (payload) => {
      await registerUser(payload);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: payload.email, password: payload.password });

      const decoded = jwt.decode(loginResponse.body.token);
      const expiryDurationSeconds = decoded.exp - decoded.iat;

      expect(expiryDurationSeconds).toBeLessThanOrEqual(86400);
    }),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 9: Incorrect passwords return 401
test('P9: incorrect passwords return 401', async () => {
  await fc.assert(
    fc.asyncProperty(
      validRegistrationPayload,
      fc.string({ minLength: 1 }),
      async (payload, wrongPassword) => {
        fc.pre(wrongPassword !== payload.password);

        await registerUser(payload);

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({ email: payload.email, password: wrongPassword });

        expect(loginResponse.status).toBe(401);
        expect(loginResponse.body.message).toBe('Invalid email or password');
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 10: Login and /me responses never contain password data
test('P10: login and /me responses never expose password data', async () => {
  await fc.assert(
    fc.asyncProperty(validRegistrationPayload, async (payload) => {
      await registerUser(payload);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: payload.email, password: payload.password });

      expect(loginResponse.status).toBe(200);

      const loginKeys = JSON.stringify(loginResponse.body).toLowerCase();
      expect(loginKeys).not.toMatch(/password/);

      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(meResponse.status).toBe(200);

      const meKeys = JSON.stringify(meResponse.body).toLowerCase();
      expect(meKeys).not.toMatch(/password/);
    }),
    { numRuns: 100 }
  );
});
