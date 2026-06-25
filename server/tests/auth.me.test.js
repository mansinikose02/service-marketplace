// Feature: project-scaffolding-auth — /me endpoint property tests (Properties 11–12)

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dealtable';
process.env.JWT_EXPIRES_IN = '24h';
process.env.MONGO_URI = 'mongodb://placeholder';

const request = require('supertest');
const fc = require('fast-check');
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

async function registerAndLogin(payload) {
  await request(app).post('/api/auth/register').send(payload);
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: payload.email, password: payload.password });
  return loginResponse.body;
}

// Feature: project-scaffolding-auth, Property 11: Valid token grants 200 from /me with correct user data
test('P11: valid token grants access to /me and returns correct user data', async () => {
  await fc.assert(
    fc.asyncProperty(validRegistrationPayload, async (payload) => {
      const { token, user: loggedInUser } = await registerAndLogin(payload);

      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.id).toBe(loggedInUser.id);
      expect(meResponse.body.name).toBe(loggedInUser.name);
      expect(meResponse.body.email).toBe(loggedInUser.email);
      expect(meResponse.body.role).toBe(loggedInUser.role);
      expect(meResponse.body.company).toBe(loggedInUser.company);
    }),
    { numRuns: 100 }
  );
});

// Feature: project-scaffolding-auth, Property 12: Invalid or malformed tokens are rejected
test('P12: invalid or malformed bearer tokens return 401', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (randomString) => {
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${randomString}`);

      expect(meResponse.status).toBe(401);
    }),
    { numRuns: 100 }
  );
});
