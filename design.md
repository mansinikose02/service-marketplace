# Design Document: Project Scaffolding & Auth

## Overview

This document describes the technical design for the Dealtable monorepo scaffold and role-based authentication system. The system is a two-sided B2B marketplace where users register as either a **client** (posts requirements) or a **provider** (bids on requirements). This feature establishes the foundational project structure and the complete auth flow — registration, login, protected endpoints, and frontend route guarding — upon which all subsequent Dealtable features will be built.

### Key Design Decisions

- **Stateless JWT auth**: No server-side session storage. The token carries the user's `id` and `role`, making auth self-contained on every request.
- **Bearer token only**: The JWT is transmitted exclusively via the `Authorization: Bearer <token>` header. Cookies are avoided to keep the API clean for future mobile/third-party clients.
- **`select: false` on password**: The Mongoose User model marks the `password` field with `select: false`, so password hashes are never accidentally leaked in queries or responses.
- **bcryptjs over bcrypt**: `bcryptjs` is used for password hashing — it has an identical API to `bcrypt` but is a pure-JS implementation with no native compilation step, avoiding build-time issues across environments.
- **React Context for auth state**: Auth state (user object + token) is held in a top-level `AuthContext`. All components read from context — no prop-drilling and no global store dependency at this stage.
- **AuthGuard as a wrapper component**: Route protection is implemented as a React component that wraps protected routes, keeping the routing logic declarative and easy to extend.
- **Helmet + rate limiting**: All responses are hardened with `helmet()` and the `/api/auth` router is protected by `express-rate-limit` (20 requests per 15 minutes per IP) to reduce brute-force exposure.
- **Indistinguishable login error responses**: Both "email not found" and "wrong password" return the identical 401 message `"Invalid email or password"` to prevent user enumeration.

---

## Architecture

The system is a monorepo with two independent applications that communicate over HTTP.

```
dealtable/
├── package.json           ← root workspace: scripts for dev/start/test
├── /server                ← Node.js + Express API
└── /client                ← React + Vite SPA
```

### Request Flow

```
Browser → React Router → AuthGuard
                             │
               ┌─────────────┴─────────────┐
          (unauthenticated)          (authenticated + correct role)
               │                           │
         redirect /login            render dashboard page
                                           │
                                    fetch /api/auth/me
                                           │
                                    Express authenticate middleware
                                           │
                              ┌────────────┴────────────┐
                         (invalid/missing token)    (valid token)
                              │                         │
                          401 Unauthorized      req.user populated
                                                         │
                                                  return user data
```

### Auth Flow

```
Registration:
  POST /api/auth/register
    ← validate payload
    ← check email uniqueness
    ← hash password (bcryptjs, 12 rounds)
    ← save User to MongoDB
    → 201 { id, name, email, role, company }

Login:
  POST /api/auth/login
    ← validate payload
    ← find User by email (re-select password)
    ← bcrypt.compare(submitted, hash)
    ← sign JWT { id, role }, exp 24h
    → 200 { token, user: { id, name, email, role, company } }

Protected request:
  GET /api/auth/me
    ← authenticate middleware: extract + verify Bearer token
    ← attach decoded { id, role } to req.user
    ← query User by id (password excluded by default)
    → 200 { id, name, email, role, company }
```

---

## Components and Interfaces

### Server

#### `config/db.js`
Establishes the Mongoose connection using `MONGO_URI` from environment variables.

```js
mongoose.connect(process.env.MONGO_URI)
```

#### `config/env.js`
Centralises environment variable access. Validates that required vars (`MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`) are present at startup and throws with a clear message if any are missing. `PORT` is optional and defaults to `5000` if not set.

#### `models/User.js`
Mongoose schema for the User collection (see Data Models section).

#### `utils/generateToken.js`
Pure function that signs and returns a JWT.

```js
/**
 * @param {string} id   - User's MongoDB _id as string
 * @param {string} role - "client" | "provider"
 * @returns {string}    - signed JWT
 */
generateToken(id, role) → string
```

Signs with `process.env.JWT_SECRET`, sets `expiresIn` to `process.env.JWT_EXPIRES_IN` (default `"24h"`).

#### `middleware/authenticate.js`
Express middleware that protects routes.

```
Request → extract Authorization header
        → split "Bearer <token>"
        → jwt.verify(token, JWT_SECRET)
        → on success: req.user = { id, role }; next()
        → on failure: res.status(401).json({ message: ... })
```

Handles: missing header, non-Bearer scheme, expired token, invalid signature.

#### `controllers/authController.js`
Contains three exported handler functions:

| Function | Route | Description |
|---|---|---|
| `register` | `POST /api/auth/register` | Validates payload, hashes password, creates User, returns 201 |
| `login` | `POST /api/auth/login` | Validates payload, verifies credentials, returns token + user. Both "email not found" and "wrong password" cases return 401 with the identical message `"Invalid email or password"` — no user enumeration |
| `getMe` | `GET /api/auth/me` | Returns `req.user`'s full profile from DB |

All handlers use try/catch and call `next(err)` for unexpected errors.

#### `routes/authRoutes.js`
Wires up the auth controller functions to Express routes.

```js
router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, getMe)
```

Mounted at `/api/auth` in `server.js`.

#### `server.js`
- Imports `env.js` first (which calls `dotenv.config()` internally) — no separate `dotenv` import needed in `server.js`
- Registers `helmet()` immediately after `cors` and `express.json()` to set secure HTTP response headers
- Configures `cors({ origin: process.env.CLIENT_URL })` — `CLIENT_URL` must be set in `.env` (e.g. `http://localhost:5173`)
- Applies `express-rate-limit` to the `/api/auth` router: 20 requests per 15-minute window per IP
- Mounts auth routes at `/api/auth`
- Registers global error handler after all routes

---

### Client

#### `context/AuthContext.jsx`
Provides `AuthContext` with the following shape:

```ts
{
  user: { id, name, email, role, company } | null,
  token: string | null,
  login(userData, token): void,   // stores in state + localStorage
  logout(): void,                  // clears state + localStorage
  isLoading: boolean               // true while restoring state from localStorage
}
```

`AuthProvider` reads from `localStorage` on mount to rehydrate auth state (so refreshing the page keeps the user logged in). It sets `isLoading = true` during this check, so `AuthGuard` can defer rendering until rehydration completes.

#### `components/AuthGuard.jsx`
A wrapper component that enforces auth + role access rules. Receives a `requiredRole` prop (`"client"` or `"provider"` for dashboards; omitted for public routes like `/login` and `/register`).

**Mode A — protecting dashboard routes** (when `requiredRole` is set):

```
if isLoading → render null (or spinner)
if !user → <Navigate to="/login" />
if user.role !== requiredRole → <Navigate to={`/${user.role}/dashboard`} />
else → render <Outlet />
```

**Mode B — guarding public routes** (when `requiredRole` is NOT set, used on `/login` and `/register`):

```
if isLoading → render null (or spinner)
if user is authenticated → <Navigate to={`/${user.role}/dashboard`} />
else → render <Outlet />
```

This prevents authenticated users from reaching the login or register pages and silently redirects them to their own dashboard.

Used to wrap React Router route groups:

```jsx
{/* Public routes — redirect away if already logged in */}
<Route element={<AuthGuard />}>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
</Route>

{/* Protected routes — require auth + correct role */}
<Route element={<AuthGuard requiredRole="client" />}>
  <Route path="/client/dashboard" element={<ClientDashboard />} />
</Route>
<Route element={<AuthGuard requiredRole="provider" />}>
  <Route path="/provider/dashboard" element={<ProviderDashboard />} />
</Route>
```

#### `services/authService.js`
Abstracts all API calls related to auth. Functions return the parsed response data or throw on error.

```js
authService.register(payload)  → { id, name, email, role, company }
authService.login(payload)     → { token, user }
authService.getMe(token)       → { id, name, email, role, company }
```

Uses `fetch` (or `axios` — to be decided during implementation) with the base URL from `VITE_API_URL` env variable.

#### `pages/LoginPage.jsx`
Form with email + password fields. On submit, calls `authService.login`, stores result via `AuthContext.login`, then redirects to `/${user.role}/dashboard`.

#### `pages/RegisterPage.jsx`
Form with name, email, password, role (select), company fields. On submit, calls `authService.register`. On success, automatically calls `authService.login` with the same credentials and redirects to the role dashboard. If `authService.register` succeeds but `authService.login` then fails, show a clear message directing the user to log in manually (e.g. "Account created! Please log in.") and do not leave the page silently broken.

#### `pages/ClientDashboard.jsx`
Placeholder dashboard for clients. Displays authenticated user's name and role.

#### `pages/ProviderDashboard.jsx`
Placeholder dashboard for providers. Displays authenticated user's name and role.

---

## Data Models

### User

```js
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,  // excluded from all queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['client', 'provider'],
        message: 'Role must be "client" or "provider"',
      },
      required: [true, 'Role is required'],
    },
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
    },
  },
  { timestamps: true }  // adds createdAt and updatedAt
);
```

**Pre-save hook**: Before saving, if `password` is modified, hash it with `bcryptjs.hash(password, 12)`. This keeps hashing logic co-located with the model.

**Instance method `comparePassword`**:

```js
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};
```

Used in the login controller after explicitly re-selecting the password field.

### Response shape (User DTO)

The public representation of a user returned by all API endpoints:

```js
{
  id: string,       // _id.toString()
  name: string,
  email: string,
  role: "client" | "provider",
  company: string
  // createdAt / updatedAt omitted from auth responses
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid registration succeeds and returns safe user data

*For any* valid registration payload (non-empty name, unique email, password ≥ 8 chars, valid role, non-empty company), the registration endpoint SHALL return a 201 status and a response body containing the user's id, name, email, role, and company — and the response body SHALL NOT contain any password or hash field.

**Validates: Requirements 2.1, 2.6, 7.3**

---

### Property 2: Invalid role values are rejected

*For any* string value supplied as the `role` field that is not exactly `"client"` or `"provider"`, the registration endpoint SHALL return a 400 status.

**Validates: Requirements 2.2**

---

### Property 3: Registration with missing required fields is rejected

*For any* registration payload that is missing at least one required field (name, email, password, role, or company), the registration endpoint SHALL return a 400 status.

**Validates: Requirements 2.4**

---

### Property 4: Passwords are always stored as hashes, never as plaintext

*For any* password string submitted during registration, the value stored in the database for that user's `password` field SHALL NOT equal the submitted plaintext string, and SHALL be verifiable as a valid bcrypt hash using the same plaintext.

**Validates: Requirements 2.5, 7.1, 7.2**

---

### Property 5: Per-user password salting produces unique hashes

*For any* two users registered with identical passwords, the stored `password` hash values in the database SHALL be different from each other.

**Validates: Requirements 7.2**

---

### Property 6: Short passwords are rejected

*For any* password string with length strictly less than 8 characters, the registration endpoint SHALL return a 400 status.

**Validates: Requirements 7.4**

---

### Property 7: Valid login returns token with correct claims

*For any* registered user, logging in with their correct credentials SHALL return a 200 status containing a Session_Token whose decoded payload includes the user's `id` and `role` claims with values matching the registered user.

**Validates: Requirements 3.1, 3.3**

---

### Property 8: Session_Token expiry is within 24 hours

*For any* Session_Token issued by the login endpoint, the difference between the `exp` claim and the `iat` claim SHALL be less than or equal to 86,400 seconds (24 hours).

**Validates: Requirements 3.4**

---

### Property 9: Incorrect passwords are rejected

*For any* registered user, submitting any password string that is not the user's actual password to the login endpoint SHALL return a 401 status.

**Validates: Requirements 3.6**

---

### Property 10: Login and current-user responses never contain password data

*For any* authenticated user, the responses from the login endpoint and the current-user endpoint SHALL NOT contain a `password`, `passwordHash`, or any field name matching `/pass/i`.

**Validates: Requirements 3.7, 4.4, 7.3**

*(Note: Property 1 covers registration response; this property covers login and /me responses. Together they ensure no password data leaks from any auth endpoint.)*

---

### Property 11: Valid token grants access to current-user endpoint

*For any* registered user with a valid unexpired Session_Token, a GET request to `/api/auth/me` with that token in the `Authorization: Bearer` header SHALL return a 200 status with the user's id, name, email, role, and company.

**Validates: Requirements 4.1, 4.5**

---

### Property 12: Invalid or malformed tokens are rejected by protected endpoints

*For any* string that is not a currently-valid Session_Token (random strings, expired tokens, tokens with tampered signatures), sending it as a Bearer token to a protected endpoint SHALL return a 401 status.

**Validates: Requirements 4.3**

---

### Property 13: Unauthenticated users are redirected to /login from protected routes

*For any* unauthenticated auth state (user = null) in the frontend, attempting to render a protected route (`/client/dashboard` or `/provider/dashboard`) SHALL result in a navigation to `/login` with no dashboard content rendered.

**Validates: Requirements 6.1, 6.2**

---

### Property 14: Role-mismatched users are redirected to their own dashboard

*For any* authenticated user, accessing a dashboard route that does not match their role SHALL redirect them to the dashboard that does match their role — a client accessing `/provider/dashboard` is sent to `/client/dashboard`, and a provider accessing `/client/dashboard` is sent to `/provider/dashboard`.

**Validates: Requirements 6.3, 6.4**

---

### Property 15: Authenticated users with correct role can access their dashboard

*For any* authenticated user, accessing the dashboard route matching their role SHALL render that dashboard without any redirection.

**Validates: Requirements 6.5, 6.6**

---

### Property 16: Authenticated users are redirected away from /login and /register

*For any* authenticated user (user object present in AuthContext), attempting to render the `/login` or `/register` route SHALL result in a navigation to `/${user.role}/dashboard` with no auth-page content rendered.

**Validates: Requirements 6.7**

---

## Error Handling

### Server-side

All controllers wrap logic in try/catch. Unexpected errors call `next(err)`, which is caught by a global error handler middleware registered in `server.js`:

```js
// server.js — registered after all routes
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
});
```

**Validation errors**: Mongoose validation failures (`err.name === 'ValidationError'`) are mapped to 400 with field-level messages.

**Duplicate key errors**: MongoDB `code 11000` (unique index violation on email) is mapped to a 409 response.

**JWT errors**:
- `JsonWebTokenError` (malformed or invalid signature) → 401
- `TokenExpiredError` → 401
- Missing `Authorization` header → 401

All 401 responses from the `authenticate` middleware use a generic message (`"Not authorized"`) to avoid leaking information about which part of the check failed.

### Client-side

`authService.js` checks the HTTP response status. Non-2xx responses throw an error with the server's `message` field. Pages catch this and display an inline error message (e.g., "Invalid credentials" below the login form).

`AuthGuard` handles the `isLoading` state by rendering nothing (or a loading spinner) while localStorage is being read on initial mount — this prevents a flash of the login redirect before auth state is restored.

---

## Testing Strategy

The test suite uses a dual approach: **example-based unit/integration tests** for concrete scenarios and **property-based tests** for universal invariants.

### Backend

**Test runner**: Jest  
**Property-based testing library**: `fast-check`  
**Test database**: In-memory MongoDB via `mongodb-memory-server`

#### Unit tests (example-based)

- `generateToken` utility: verify token is signed, contains expected claims, can be verified with the correct secret
- `authenticate` middleware: missing header → 401, non-Bearer scheme → 401, expired token → 401, valid token → `req.user` populated
- `authController.register`: duplicate email → 409, missing field → 400
- `authController.login`: unknown email → 401

#### Property-based tests

Each test runs a minimum of **100 iterations** via `fast-check`.

| Test | Property # | `fast-check` arbitraries |
|---|---|---|
| Valid registration never leaks password | Property 1 | `fc.record({ name: fc.string(), email: fc.emailAddress(), password: fc.string({ minLength: 8 }), role: fc.constantFrom('client','provider'), company: fc.string() })` |
| Invalid role values rejected | Property 2 | `fc.string().filter(s => s !== 'client' && s !== 'provider')` |
| Missing fields rejected | Property 3 | `fc.subarray(['name','email','password','role','company'], { minLength: 1 })` (fields to omit) |
| Passwords stored as hashes | Property 4 | `fc.string({ minLength: 8 })` |
| Per-user salting | Property 5 | `fc.string({ minLength: 8 })` |
| Short passwords rejected | Property 6 | `fc.string({ maxLength: 7 })` |
| Login returns token with claims | Property 7 | Register a random user, login, decode JWT |
| Token expiry ≤ 24h | Property 8 | Issue tokens for random users, check exp − iat |
| Incorrect passwords rejected | Property 9 | `fc.string().filter(s => s !== correctPassword)` |
| No password in responses | Property 10 | Any valid user's login + /me responses |
| Valid token grants /me access | Property 11 | Generate users, register, login, call /me |
| Invalid tokens rejected | Property 12 | `fc.string()` as bearer token |

Each property test is tagged with a comment:

```js
// Feature: project-scaffolding-auth, Property 1: Valid registration succeeds and returns safe user data
```

### Frontend

**Test runner**: Vitest  
**Component testing**: React Testing Library  
**Property-based testing library**: `fast-check`

#### Unit tests (example-based)

- `authService`: mock `fetch` / `axios`, verify correct request shape and response parsing
- `LoginPage`: renders fields, shows error on bad credentials (mock service)
- `RegisterPage`: renders all fields, role select has correct options

#### Property-based tests

| Test | Property # | Approach |
|---|---|---|
| Unauthenticated → redirect to /login | Property 13 | Generate null auth states, render `<AuthGuard>`, assert `<Navigate to="/login">` |
| Role mismatch → redirect to own dashboard | Property 14 | Generate `{ role: 'client' }` or `{ role: 'provider' }`, render guard for opposite route, assert correct redirect |
| Correct role → renders outlet | Property 15 | Generate user with matching role, render guard, assert outlet rendered |

#### Smoke tests

- Navigate to `/login` → login form visible
- Navigate to `/register` → register form visible
- `/server` and `/client` directories exist with expected structure
- Root `package.json` has `dev`, `server`, `client` scripts
