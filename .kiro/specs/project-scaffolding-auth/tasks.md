# Implementation Plan: Project Scaffolding & Auth

## Overview

Stand up the Dealtable monorepo, implement stateless JWT-based role authentication on the Express server, build the React auth context and guarded routing on the client, and cover both sides with property-based and unit tests.

## Tasks

- [x] 1. Monorepo root scaffold
  - Create root `package.json` with `"workspaces": ["server", "client"]`
  - Add root scripts: `"dev"` (concurrently runs server + client), `"server"` (starts Express), `"client"` (starts Vite)
  - Install `concurrently` as a root dev dependency
  - Create `/server` and `/client` placeholder directories (each with a minimal `package.json` declaring the workspace name)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Server dependencies and project structure
  - Initialise `/server/package.json` using CommonJS — do **not** set `"type": "module"`; use `require`/`module.exports` throughout the server
  - Install production dependencies: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`, `helmet`, `express-rate-limit`
  - Install dev dependencies: `nodemon`
  - Create directory skeleton: `config/`, `models/`, `utils/`, `middleware/`, `controllers/`, `routes/`
  - _Requirements: 1.4_

- [-] 3. Server environment and database config
  - [x] 3.1 Create `server/config/env.js`
    - Import `dotenv` and call `dotenv.config()` at the top of this module
    - Validate that `MONGO_URI`, `JWT_SECRET`, and `JWT_EXPIRES_IN` are all defined; throw a descriptive `Error` at startup if any are missing
    - `PORT` is optional — default to `5000` if not set; do NOT throw for a missing `PORT`
    - Export a frozen config object with all four values (PORT included, using the default if absent)
    - _Requirements: 1.4_

  - [x] 3.2 Create `server/config/db.js`
    - Import `mongoose` and the config module
    - Export an async `connectDB` function that calls `mongoose.connect(config.MONGO_URI)` and logs success or rethrows on failure
    - _Requirements: 1.4_

  - [x] 3.3 Create `server/.env.example`
    - Document all env vars with placeholder values: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=24h`, `PORT=5000`, `CLIENT_URL=http://localhost:5173`

- [-] 4. User model
  - [x] 4.1 Create `server/models/User.js` with the full Mongoose schema
    - Fields: `name` (String, required, trim), `email` (String, required, unique, lowercase, trim, **match regex `/^\S+@\S+\.\S+$/`**), `password` (String, required, minlength 8, **select: false**), `role` (String, enum `['client','provider']`, required), `company` (String, required, trim)
    - Schema options: `{ timestamps: true }`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 7.1_

  - [x] 4.2 Add pre-save bcryptjs hook to `User.js`
    - Import `bcryptjs` (not `bcrypt`)
    - Before saving, if `password` is modified, replace it with `bcryptjs.hash(this.password, 12)`
    - Skip hashing if the field is not modified (prevents re-hashing on unrelated saves)
    - _Requirements: 2.5, 7.1, 7.2_

  - [x] 4.3 Add `comparePassword` instance method to `User.js`
    - Async method that calls `bcryptjs.compare(candidatePassword, this.password)` and returns the boolean result
    - _Requirements: 3.8_

- [x] 5. `generateToken` utility
  - Create `server/utils/generateToken.js`
  - Export a pure function `generateToken(id, role)` that calls `jwt.sign({ id, role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN })`
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 6. `authenticate` middleware
  - Create `server/middleware/authenticate.js`
  - Extract the `Authorization` header; return 401 if missing or not in `Bearer <token>` format
  - Call `jwt.verify(token, config.JWT_SECRET)` inside try/catch
  - On success: assign `req.user = { id: decoded.id, role: decoded.role }` and call `next()`
  - On `TokenExpiredError` or `JsonWebTokenError`: return 401 with generic `"Not authorized"` message
  - _Requirements: 4.2, 4.3, 4.5_

- [ ] 7. Auth controllers
  - [ ] 7.1 Create `server/controllers/authController.js` — `register` handler
    - Destructure `name`, `email`, `password`, `role`, `company` from `req.body`; return 400 if any are missing
    - Create and save a `new User({...})`; the pre-save hook handles hashing
    - Return 201 with `{ id, name, email, role, company }` (no password field)
    - Catch Mongoose `ValidationError` → 400; MongoDB duplicate key (`code 11000`) → 409; unexpected errors → `next(err)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [ ] 7.2 Create `login` handler in `authController.js`
    - Find user by email with `.select('+password')` to override `select: false`
    - **Both failure cases MUST return the identical 401 message `"Invalid email or password"`** — if user is not found, return 401 with that message without querying further; if the user is found but `comparePassword` returns false, return 401 with the same message. Do not distinguish between the two cases in the response.
    - Call `generateToken(user.id, user.role)` and return 200 with `{ token, user: { id, name, email, role, company } }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 7.3 Create `getMe` handler in `authController.js`
    - Find user by `req.user.id` (no password selected); return 200 with `{ id, name, email, role, company }`
    - _Requirements: 4.1, 4.4_

- [ ] 8. Auth routes and server entry point
  - [ ] 8.1 Create `server/routes/authRoutes.js`
    - Wire `POST /register → register`, `POST /login → login`, `GET /me → authenticate, getMe`
    - _Requirements: 2.1, 3.1, 4.1_

  - [ ] 8.2 Create `server/server.js`
    - Import `env.js` first (it calls `dotenv.config()` internally) — do **not** import or call `dotenv` directly in `server.js`
    - Import `express`, `cors`, `helmet`, `express-rate-limit`, `connectDB`, and `authRoutes`
    - Call `connectDB()` before starting the HTTP listener
    - Register middleware in order: `cors({ origin: process.env.CLIENT_URL })`, `express.json()`, `helmet()`
    - Apply rate limiter to the auth router: `rateLimit({ windowMs: 15 * 60 * 1000, max: 20, skip: () => process.env.NODE_ENV === 'test' })` — the `skip` option prevents the limiter from blocking property-based tests which make 100+ requests per property
    - Mount auth router at `/api/auth`
    - Register global error handler after all routes: `(err, req, res, next)` — maps `ValidationError` → 400, code 11000 → 409, default → 500
    - Listen on `config.PORT`
    - _Requirements: 1.4, 2.3_

- [ ] 9. Checkpoint — verify server starts and auth routes respond
  - Ensure `npm run server` starts without errors
  - Confirm `POST /api/auth/register` and `POST /api/auth/login` return expected shapes with a REST client (manual smoke check only — no code to write beyond what is already wired)

- [ ] 10. Client setup — Vite + React + Tailwind CSS
  - Scaffold the client app inside `/client` using `npm create vite@latest . -- --template react`
  - Install Tailwind CSS and its Vite plugin; initialise `tailwind.config.js` and add the Tailwind directives to `index.css`
  - Verify `npm run client` (or `vite`) starts the dev server without errors
  - _Requirements: 1.2, 1.5_

- [ ] 11. Client dependencies
  - Install `react-router-dom` for routing
  - Install `axios` for HTTP
  - _Requirements: 1.5_

- [ ] 12. `authService.js`
  - Create `client/src/services/authService.js`
  - Read base URL from `import.meta.env.VITE_API_URL` (default to `http://localhost:5000`)
  - Use `axios` for all HTTP calls
  - Implement and export three functions:
    - `register(payload)` — POST `/api/auth/register`; return parsed user object or throw with server message
    - `login(payload)` — POST `/api/auth/login`; return `{ token, user }` or throw
    - `getMe(token)` — GET `/api/auth/me` with `Authorization: Bearer <token>`; return user object or throw
  - Non-2xx responses should extract `error.response.data.message` from the axios error and throw an `Error` with that message
  - Create `client/.env.example` documenting `VITE_API_URL`
  - _Requirements: 4.1, 4.5_

- [ ] 13. `AuthContext` and `AuthProvider`
  - Create `client/src/context/AuthContext.jsx`
  - Define context shape: `{ user, token, isLoading, login(userData, token), logout() }`
  - `AuthProvider` on mount: read `token` and `user` from `localStorage`; set `isLoading = true` during read, `false` after
  - `login(userData, token)`: persist both values to `localStorage` and update state
  - `logout()`: remove both keys from `localStorage` and reset state to `{ user: null, token: null }`
  - Export `useAuth` convenience hook
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.7_

- [ ] 14. `AuthGuard` component
  - Create `client/src/components/AuthGuard.jsx`
  - Accept optional `requiredRole` prop (`"client"` | `"provider"`)
  - **Mode A — dashboard routes** (when `requiredRole` is provided):
    1. If `isLoading` → render `null` (prevents flash redirect before localStorage rehydrates)
    2. If `!user` → `<Navigate to="/login" replace />`
    3. If `user.role !== requiredRole` → `<Navigate to={`/${user.role}/dashboard`} replace />`
    4. Otherwise → render `<Outlet />`
  - **Mode B — public routes** (when `requiredRole` is NOT provided, used on `/login` and `/register`):
    1. If `isLoading` → render `null`
    2. If `user` is authenticated → `<Navigate to={`/${user.role}/dashboard`} replace />`
    3. Otherwise → render `<Outlet />`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 15. Page components
  - [ ] 15.1 Create `client/src/pages/LoginPage.jsx`
    - Controlled form: `email`, `password` fields
    - On submit: call `authService.login`; on success call `context.login(user, token)` then `navigate(`/${user.role}/dashboard`)`
    - On error: display the error message inline below the form
    - Basic Tailwind styling
    - _Requirements: 5.1, 3.1_

  - [ ] 15.2 Create `client/src/pages/RegisterPage.jsx`
    - Controlled form: `name`, `email`, `password`, `role` (select with options "client" / "provider"), `company`
    - On submit: call `authService.register`; on success automatically call `authService.login` with the same credentials, then call `context.login` and redirect to dashboard
    - **Two-call failure handling**: if `authService.register` succeeds but `authService.login` subsequently throws, do NOT leave the user on a broken/blank page — display a message such as "Account created! Please log in." and allow them to navigate to `/login` manually
    - On registration error: display inline error message
    - Basic Tailwind styling
    - _Requirements: 5.2, 2.1_

  - [ ] 15.3 Create `client/src/pages/ClientDashboard.jsx`
    - Placeholder page that displays the authenticated user's `name` and `role` from `useAuth()`
    - _Requirements: 5.3_

  - [ ] 15.4 Create `client/src/pages/ProviderDashboard.jsx`
    - Placeholder page that displays the authenticated user's `name` and `role` from `useAuth()`
    - _Requirements: 5.4_

- [ ] 16. React Router setup in `App.jsx`
  - Replace default `App.jsx` content with a `<BrowserRouter>` + `<Routes>` tree:
    ```
    <Route element={<AuthGuard />}>           ← Mode B: redirect authenticated users away
      /login          → <LoginPage />
      /register       → <RegisterPage />
    </Route>
    <Route element={<AuthGuard requiredRole="client" />}>
      /client/dashboard  → <ClientDashboard />
    </Route>
    <Route element={<AuthGuard requiredRole="provider" />}>
      /provider/dashboard → <ProviderDashboard />
    </Route>
    /               → <Navigate to="/login" /> (catch-all)
    ```
  - Wrap the entire tree in `<AuthProvider>` in `main.jsx`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1–6.7_

- [ ] 17. Backend test setup
  - Install dev dependencies in `/server`: `jest`, `fast-check`, `mongodb-memory-server`, `supertest`, `@jest/globals`
  - Add `"test"` script to `server/package.json`: `jest --runInBand`
  - Create `server/jest.config.js`: configure `testEnvironment: 'node'` and a global setup file
  - Create `server/tests/setup.js`: set `process.env.NODE_ENV = 'test'` as the **first line of the file**, before any imports that touch config or middleware — this ensures the rate limiter's `skip` function returns `true` for all test requests; then start `MongoMemoryServer`, connect Mongoose, and stop the server after all tests
  - _Requirements: (test infrastructure)_

- [ ] 18. Backend property-based tests
  - [ ] 18.1 Create `server/tests/auth.register.test.js` — Properties 1, 2, 3, 4, 5, 6
    - [ ] 18.1.1 Property 1: Valid registration returns 201 and no password field
      - Use `fc.record({ name: fc.string({minLength:1}), email: fc.emailAddress(), password: fc.string({minLength:8}), role: fc.constantFrom('client','provider'), company: fc.string({minLength:1}) })` (100 runs)
      - Assert status 201; assert response body has `id, name, email, role, company`; assert no key matches `/pass/i`
      - **Property 1 · Validates: Requirements 2.1, 2.6, 7.3**

    - [ ] 18.1.2 Property 2: Invalid role values return 400
      - Use `fc.string().filter(s => s !== 'client' && s !== 'provider')` as role (100 runs)
      - Assert status 400
      - **Property 2 · Validates: Requirements 2.2**

    - [ ] 18.1.3 Property 3: Missing required fields return 400
      - Use `fc.subarray(['name','email','password','role','company'], {minLength:1})` to select fields to omit (100 runs)
      - Assert status 400
      - **Property 3 · Validates: Requirements 2.4**

    - [ ] 18.1.4 Property 4: Passwords stored as bcryptjs hashes, never plaintext
      - Use `fc.string({minLength:8})` as password; register user; query DB directly with `.select('+password')` (100 runs)
      - Assert stored value !== plaintext; assert `bcryptjs.compareSync(plain, stored)` is true
      - **Property 4 · Validates: Requirements 2.5, 7.1, 7.2**

    - [ ] 18.1.5 Property 5: Two users with same password get different hashes
      - Use `fc.string({minLength:8})` as shared password; register two users with distinct emails (100 runs)
      - Assert hash of user A !== hash of user B
      - **Property 5 · Validates: Requirements 7.2**

    - [ ] 18.1.6 Property 6: Passwords shorter than 8 characters return 400
      - Use `fc.string({maxLength:7})` as password (100 runs)
      - Assert status 400
      - **Property 6 · Validates: Requirements 7.4**

  - [ ] 18.2 Create `server/tests/auth.login.test.js` — Properties 7, 8, 9, 10
    - [ ] 18.2.1 Property 7: Valid login returns 200 with token containing correct claims
      - Register a random user; login with correct credentials (100 runs)
      - Decode JWT (no verify needed for claim inspection); assert `id` and `role` match registered user
      - **Property 7 · Validates: Requirements 3.1, 3.3**

    - [ ] 18.2.2 Property 8: Token expiry ≤ 24 hours
      - Issue tokens for random users; decode and assert `exp − iat ≤ 86400` (100 runs)
      - **Property 8 · Validates: Requirements 3.4**

    - [ ] 18.2.3 Property 9: Incorrect password returns 401
      - Register a random user; login with `fc.string().filter(s => s !== correctPassword)` (100 runs)
      - Assert status 401
      - **Property 9 · Validates: Requirements 3.6**

    - [ ] 18.2.4 Property 10: Login and /me responses never expose password data
      - Login with valid credentials; call GET /api/auth/me; inspect both response bodies (100 runs)
      - Assert no key in either response matches `/pass/i`
      - **Property 10 · Validates: Requirements 3.7, 4.4, 7.3**

  - [ ] 18.3 Create `server/tests/auth.me.test.js` — Properties 11, 12
    - [ ] 18.3.1 Property 11: Valid token grants 200 from /me with correct user data
      - Register and login random user; call GET /api/auth/me with Bearer token (100 runs)
      - Assert status 200; assert `id, name, email, role, company` match registered user
      - **Property 11 · Validates: Requirements 4.1, 4.5**

    - [ ] 18.3.2 Property 12: Invalid/malformed tokens return 401
      - Use `fc.string()` as bearer token (100 runs)
      - Assert status 401
      - **Property 12 · Validates: Requirements 4.3**

- [ ] 19. Checkpoint — run backend tests
  - Run `npm test` in `/server`; ensure all passing tests pass and no unexpected failures remain.
  - Fix any test infrastructure issues before proceeding to frontend tests.

- [ ] 20. Frontend test setup
  - Install dev dependencies in `/client`: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `fast-check`, `jsdom`
  - Add `"test"` script to `client/package.json`: `vitest --run`
  - Configure `vitest.config.js` (or extend `vite.config.js`): `environment: 'jsdom'`, global setup importing `@testing-library/jest-dom`
  - _Requirements: (test infrastructure)_

- [ ] 21. Frontend property-based tests
  - [ ] 21.1 Create `client/src/tests/AuthGuard.test.jsx` — Properties 13, 14, 15
    - Helper: wrap `AuthGuard` in a `MemoryRouter` with a given `AuthContext` value and a mock `<Outlet>` child

    - [ ] 21.1.1 Property 13: Unauthenticated user is redirected to /login from protected routes
      - Generate null-user auth states; render `<AuthGuard requiredRole="client">` and `<AuthGuard requiredRole="provider">` (100 runs)
      - Assert `<Navigate to="/login">` is rendered; assert no dashboard content is visible
      - **Property 13 · Validates: Requirements 6.1, 6.2**

    - [ ] 21.1.2 Property 14: Role-mismatched user is redirected to their own dashboard
      - Generate `{ role: 'client' }` user; render guard with `requiredRole="provider"` (and vice-versa) (100 runs)
      - Assert `<Navigate to={`/${user.role}/dashboard`}>` is rendered
      - **Property 14 · Validates: Requirements 6.3, 6.4**

    - [ ] 21.1.3 Property 15: Correct role renders outlet without redirection
      - Generate user with `role: fc.constantFrom('client','provider')`; render guard with matching `requiredRole` (100 runs)
      - Assert outlet content is rendered; assert no `<Navigate>` element present
      - **Property 15 · Validates: Requirements 6.5, 6.6**

    - [ ] 21.1.4 Property 16: Authenticated users are redirected away from /login and /register
      - Generate authenticated user (`role: fc.constantFrom('client','provider')`); render `<AuthGuard>` (no `requiredRole`) wrapping a mock public page (100 runs)
      - Assert `<Navigate to={`/${user.role}/dashboard`}>` is rendered; assert public page content is not visible
      - **Property 16 · Validates: Requirements 6.7**

- [ ] 22. Smoke tests
  - Create `server/tests/smoke.test.js`
    - Assert `/server` and `/client` directories exist relative to monorepo root
    - Assert root `package.json` contains `dev`, `server`, and `client` scripts
    - Assert `server/package.json` lists `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`, `helmet`, `express-rate-limit` as dependencies
    - Assert `client/package.json` lists `react-router-dom` as a dependency
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 23. Final checkpoint — full test suite green
  - Run `npm test` in `/server`; run `npm test` in `/client`
  - All non-optional tests must pass; resolve any remaining failures before marking the feature complete.

## Notes

- All property-based tests are **required** — no PBT sub-tasks are optional.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 9, 19, 23) ensure incremental validation at natural integration boundaries.
- Property tests validate universal invariants; unit tests (woven into the same test files) cover concrete edge cases.
- The User model's `select: false` on `password` is the primary defence against accidental password leakage — every task that touches user queries must respect this.
- `bcryptjs` is used throughout in place of `bcrypt` — the API is identical but bcryptjs has no native compilation dependency.
- Both login failure cases (email not found, wrong password) MUST return the exact same 401 message `"Invalid email or password"` — this is a security requirement to prevent user enumeration.
