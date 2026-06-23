# Implementation Plan: Provider Profile & RFP CRUD (Week 2)

## Overview

27 tasks across 9 groups implementing Feature A (Provider Profile) and Feature B (Requirement/RFP CRUD) on top of the Week 1 auth foundation. No implementation code is written until tasks.md is approved.

---

## GROUP 1 — SERVER SETUP EXTENSION

### Task 1: Extend the global error handler to handle CastError

**Files:** `server/middleware/errorMiddleware.js`

**Steps:**
1. Open the existing error handler middleware.
2. Before the existing `ValidationError` check, add a check for `err instanceof mongoose.Error.CastError`.
3. If the error is a `CastError`, respond with status 400 and `{ message: 'Invalid ID format.' }`.
4. Ensure `mongoose` is imported at the top of the file.
5. Verify the existing `ValidationError` → 400 and code 11000 → 409 and default → 500 mappings are unchanged.

**Requirements:** B7, B8, B9 (all `:id` parameter routes depend on this)
**Depends on:** none

---

### Task 2: Create the computePitchComplete utility

**Files:** `server/utils/pitchComplete.js`

**Steps:**
1. Create the file `server/utils/pitchComplete.js`.
2. Define and export a constant array `VALID_CATEGORIES` containing all ten ServiceCategory values: `'Web Development'`, `'Mobile Development'`, `'UI/UX Design'`, `'Digital Marketing'`, `'Content Writing'`, `'Consulting'`, `'Legal Services'`, `'Logistics'`, `'Manufacturing'`, `'Other'`.
3. Define and export a pure function `computePitchComplete(profile)` that accepts a plain object.
4. Inside `computePitchComplete`, evaluate all six rules in sequence:
   - `profile.pitch` exists and `profile.pitch.length >= 100`
   - `Array.isArray(profile.categories)` and `profile.categories.length >= 1` and `profile.categories.length <= 5` and every element is in `VALID_CATEGORIES`
   - `Number.isInteger(profile.capacity)` and `profile.capacity >= 1` and `profile.capacity <= 20`
   - `Number.isInteger(profile.teamSize)` and `profile.teamSize >= 1`
   - `typeof profile.typicalBudgetMin === 'number'` and `profile.typicalBudgetMin >= 0`
   - `typeof profile.typicalBudgetMax === 'number'` and `profile.typicalBudgetMax >= profile.typicalBudgetMin`
5. Return `true` if all six pass, `false` if any fail or if a field is absent.
6. No imports, no side effects, no database or express references.

**Requirements:** A1, A3
**Depends on:** none

---

## GROUP 2 — MONGOOSE MODELS

### Task 3: Create the ProviderProfile model

**Files:** `server/models/ProviderProfile.js`

**Steps:**
1. Import `mongoose` and `VALID_CATEGORIES` from `server/utils/pitchComplete.js`.
2. Define a Mongoose schema with the following fields:
   - `userId`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, immutable: true }`
   - `pitch`: `{ type: String, required: true, minlength: 100 }`
   - `categories`: `{ type: [String], required: true, validate: { validator: arr => arr.length >= 1 && arr.length <= 5 && arr.every(v => VALID_CATEGORIES.includes(v)), message: 'categories must contain 1–5 valid ServiceCategory values' } }`
   - `capacity`: `{ type: Number, required: true, min: 1, max: 20 }`
   - `teamSize`: `{ type: Number, required: true, min: 1 }`
   - `typicalBudgetMin`: `{ type: Number, required: true, min: 0 }`
   - `typicalBudgetMax`: `{ type: Number, required: true, min: 0 }`
   - `websiteUrl`: `{ type: String }` — optional, no schema-level URL validation (controller handles it)
   - `pitchComplete`: `{ type: Boolean, required: true, default: false }`
3. Add `{ timestamps: true }` as the schema options second argument.
4. Add a unique index on `userId` using `schema.index({ userId: 1 }, { unique: true })`.
5. Export the model as `ProviderProfile`.

**Requirements:** A1, A2, A3, A4
**Depends on:** Task 2

---

### Task 4: Create the Requirement model

**Files:** `server/models/Requirement.js`

**Steps:**
1. Import `mongoose` and `VALID_CATEGORIES` from `server/utils/pitchComplete.js`.
2. Define a Mongoose schema with the following fields:
   - `clientId`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true }`
   - `title`: `{ type: String, required: true, minlength: 10, maxlength: 200 }`
   - `category`: `{ type: String, required: true, enum: VALID_CATEGORIES }`
   - `description`: `{ type: String, required: true, minlength: 50 }`
   - `budgetMin`: `{ type: Number, required: true, min: 0 }`
   - `budgetMax`: `{ type: Number, required: true, min: 0 }`
   - `timeline`: `{ type: String, required: true, minlength: 5, maxlength: 100 }`
   - `status`: `{ type: String, enum: ['open', 'sealed', 'closed'], required: true, default: 'open' }`
3. Add `{ timestamps: true }` as the schema options second argument.
4. Add a non-unique index on `clientId` for query performance: `schema.index({ clientId: 1 })`.
5. Export the model as `Requirement`.

**Requirements:** B5, B6, B7, B8, B9
**Depends on:** Task 2

---

## GROUP 3 — PROFILE CONTROLLER

### Task 5: upsertProfile handler

**Files:** `server/controllers/profileController.js`

**Steps:**
1. Create `server/controllers/profileController.js`.
2. Import `ProviderProfile` from `../models/ProviderProfile`, `computePitchComplete` and `VALID_CATEGORIES` from `../utils/pitchComplete`.
3. Implement and export `upsertProfile` as an async function following this exact step order:
   1. Destructure `pitch`, `categories`, `capacity`, `teamSize`, `typicalBudgetMin`, `typicalBudgetMax`, `websiteUrl` from `req.body`.
   2. Check all six required fields are present and non-null; return 400 with a message naming any missing fields.
   3. Validate `pitch.length >= 100`; return 400 if not.
   4. Validate `categories` is an array of length 1–5 with every element in `VALID_CATEGORIES`; return 400 if not.
   5. Validate `capacity` is an integer between 1 and 20 inclusive; return 400 if not.
   6. Validate `teamSize` is an integer >= 1; return 400 if not.
   7. Validate `typicalBudgetMin >= 0`; return 400 if not.
   8. Validate `typicalBudgetMax >= typicalBudgetMin`; return 400 with message `'typicalBudgetMax must be greater than or equal to typicalBudgetMin'` if not.
   9. If `websiteUrl` is present and non-empty string, validate against `/^https?:\/\/.+\..+/`; return 400 if no match.
   10. Call `computePitchComplete({ pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax })` and store as `pitchComplete`.
   11. Call `ProviderProfile.findOne({ userId: req.user.id })`; store `!existingDoc` as `isNew`.
   12. Build `updatePayload` object: all validated fields plus `pitchComplete`. Include `websiteUrl` only if it was provided.
   13. Call `ProviderProfile.findOneAndUpdate({ userId: req.user.id }, { $set: updatePayload }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })` inside a try/catch.
   14. If the caught error has `code === 11000`: set `isNew = false` and re-fetch the document with `findOne({ userId: req.user.id })`.
   15. Respond with status `isNew ? 201 : 200` and the saved document as the response body.
4. Wrap the handler in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** A1
**Depends on:** Task 2, Task 3

---

### Task 6: getOwnProfile handler

**Files:** `server/controllers/profileController.js`

**Steps:**
1. Add and export `getOwnProfile` as an async function to the existing `profileController.js`.
2. Call `ProviderProfile.findOne({ userId: req.user.id })`.
3. If the result is null, return 404 with `{ message: 'No profile found. Create your profile to get started.' }`.
4. Return 200 with the found document.
5. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** A2
**Depends on:** Task 3, Task 5

---

### Task 7: updateProfile handler

**Files:** `server/controllers/profileController.js`

**Steps:**
1. Add and export `updateProfile` as an async function to the existing `profileController.js`.
2. Follow this exact step order — do not reorder:
   1. Build `suppliedFields` object: iterate over `['pitch', 'categories', 'capacity', 'teamSize', 'typicalBudgetMin', 'typicalBudgetMax', 'websiteUrl']` and include only keys that are present in `req.body`.
   2. For each key in `suppliedFields`, apply the same individual validation rules as Task 5 steps 3–9 (excluding cross-field budget check at this point). Return 400 on any failure.
   3. Call `ProviderProfile.findOne({ userId: req.user.id })`; return 404 with `{ message: 'Profile not found.' }` if null. This step must come before cross-field validation so the stored counterpart is available.
   4. Cross-field budget validation:
      - If both `typicalBudgetMin` and `typicalBudgetMax` are in `suppliedFields`: validate `typicalBudgetMax >= typicalBudgetMin`; return 400 if not.
      - If only `typicalBudgetMin` is supplied: validate `suppliedFields.typicalBudgetMin <= existingProfile.typicalBudgetMax`; return 400 if not.
      - If only `typicalBudgetMax` is supplied: validate `suppliedFields.typicalBudgetMax >= existingProfile.typicalBudgetMin`; return 400 if not.
   5. Build `updateObject` containing only the keys from `suppliedFields`.
   6. Compute the merged state: `const mergedProfile = { ...existingProfile.toObject(), ...suppliedFields }`. Call `computePitchComplete(mergedProfile)` and store the result.
   7. Add `pitchComplete` to `updateObject`.
   8. Call `ProviderProfile.findOneAndUpdate({ userId: req.user.id }, { $set: updateObject }, { new: true, runValidators: true })`.
   9. Return 200 with the updated profile document.
3. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** A3
**Depends on:** Task 2, Task 3, Task 5

---

### Task 8: getPublicProfile handler

**Files:** `server/controllers/profileController.js`

**Steps:**
1. Add and export `getPublicProfile` as an async function to the existing `profileController.js`.
2. Call `ProviderProfile.findOne({ userId: req.params.userId }).populate('userId', 'name company')`.
3. If the result is null, return 404 with `{ message: 'Provider profile not found.' }`. This covers both "no user with that ID" and "user exists but has no profile" — no distinction is made per requirement A4.2.
4. Call `.toObject()` on the Mongoose document to produce a plain object.
5. Destructure `name` and `company` from the populated `userId` field of the plain object.
6. Build the response: spread all profile fields from the plain object, include `name` and `company` at the top level, omit the raw `userId` object.
7. Return 200 with the constructed response object.
8. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** A4
**Depends on:** Task 3, Task 5

---

## GROUP 4 — REQUIREMENT CONTROLLER

### Task 9: createRequirement handler

**Files:** `server/controllers/requirementController.js`

**Steps:**
1. Create `server/controllers/requirementController.js`.
2. Import `Requirement` from `../models/Requirement` and `VALID_CATEGORIES` from `../utils/pitchComplete`.
3. Implement and export `createRequirement` as an async function:
   1. Destructure `title`, `category`, `description`, `budgetMin`, `budgetMax`, `timeline` from `req.body`. Do not read or assign `status` from the payload at any point.
   2. Check all six required fields are present and non-null; return 400 with a descriptive message if any are missing.
   3. Validate `title.length` is between 10 and 200 inclusive; return 400 if not.
   4. Validate `category` is in `VALID_CATEGORIES`; return 400 if not.
   5. Validate `description.length >= 50`; return 400 if not.
   6. Validate `budgetMin >= 0`; return 400 if not.
   7. Validate `budgetMax >= budgetMin`; return 400 if not.
   8. Validate `timeline.length` is between 5 and 100 inclusive; return 400 if not.
   9. Create and save a new `Requirement` document with `clientId: req.user.id`, all validated fields, and `status: 'open'` (hardcoded — not from payload).
   10. Call `.toObject()` on the saved document, spread its fields, append `bidCount: 0`. Return 201 with this object.
4. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** B5
**Depends on:** Task 4

---

### Task 10: listOwnRequirements handler

**Files:** `server/controllers/requirementController.js`

**Steps:**
1. Add and export `listOwnRequirements` as an async function to the existing `requirementController.js`.
2. Call `Requirement.find({ clientId: req.user.id }).sort({ createdAt: -1 })`.
3. Map the result array: for each document, call `.toObject()`, spread the plain object fields, and append `bidCount: 0`.
4. Return 200 with the mapped array.
5. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** B6
**Depends on:** Task 4, Task 9

---

### Task 11: getRequirement handler

**Files:** `server/controllers/requirementController.js`

**Steps:**
1. Add and export `getRequirement` as an async function to the existing `requirementController.js`.
2. Call `Requirement.findById(req.params.id).populate('clientId', 'name company')`.
3. If the result is null, return 404 with `{ message: 'Requirement not found.' }`.
4. Call `.toObject()` on the document to produce a plain object.
5. Destructure `name` and `company` from the populated `clientId` field of the plain object.
6. Build the response: spread all requirement fields, include `clientName: name` and `clientCompany: company` at the top level, omit the raw `clientId` object.
7. Return 200 with the constructed response object.
8. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** B7
**Depends on:** Task 4, Task 9

---

### Task 12: updateRequirement handler

**Files:** `server/controllers/requirementController.js`

**Steps:**
1. Add and export `updateRequirement` as an async function to the existing `requirementController.js`.
2. Follow this mandatory check order — do not reorder for any reason (rationale: checking ownership before existence leaks whether the resource exists to non-owners):
   1. Call `Requirement.findById(req.params.id)`.
   2. If null, return 404 with `{ message: 'Requirement not found.' }`.
   3. If `requirement.clientId.toString() !== req.user.id`, return 403 with `{ message: 'Not authorised to update this requirement.' }`.
   4. If `requirement.status !== 'open'`, return 409 with `{ message: 'Only open requirements can be updated.' }`.
3. Build `suppliedFields`: iterate over `['title', 'category', 'description', 'budgetMin', 'budgetMax', 'timeline']`; include only keys present in `req.body`. Explicitly exclude `status` and any other keys not in this list.
4. Validate each supplied field using the same rules as Task 9 steps 3–8. Return 400 on any failure.
5. Cross-field budget validation: apply the same one-or-both-supplied logic as Task 7 step 4, using the stored `requirement` document as the counterpart.
6. Apply updates: `Object.assign(requirement, suppliedFields)` then `await requirement.save()`.
7. Return 200 with the updated document.
8. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** B8
**Depends on:** Task 4, Task 9

---

### Task 13: closeRequirement handler

**Files:** `server/controllers/requirementController.js`

**Steps:**
1. Add and export `closeRequirement` as an async function to the existing `requirementController.js`.
2. Follow this mandatory check order (same rationale as Task 12):
   1. Call `Requirement.findById(req.params.id)`.
   2. If null, return 404 with `{ message: 'Requirement not found.' }`.
   3. If `requirement.clientId.toString() !== req.user.id`, return 403 with `{ message: 'Not authorised to close this requirement.' }`.
   4. If `requirement.status === 'closed' || requirement.status === 'sealed'`, return 409 with `{ message: 'Requirement is already closed or sealed.' }`.
3. Set `requirement.status = 'closed'`.
4. Call `await requirement.save()`.
5. Return 200 with the updated document.
6. Wrap in try/catch; pass unexpected errors to `next(err)`.

**Requirements:** B9
**Depends on:** Task 4, Task 9

---

## GROUP 5 — ROUTES

### Task 14: Profile routes

**Files:** `server/routes/profileRoutes.js`, `server/server.js`

**Steps:**
1. Create `server/routes/profileRoutes.js`.
2. Import `express`, `authenticate` from `../middleware/authenticate`, `authorize` from `../middleware/authorize`, and all four handlers from `../controllers/profileController`.
3. Create an Express router.
4. Register routes:
   - `POST /me` → `authenticate, authorize('provider'), upsertProfile`
   - `GET /me` → `authenticate, authorize('provider'), getOwnProfile`
   - `PATCH /me` → `authenticate, authorize('provider'), updateProfile`
   - `GET /:userId` → `authenticate, getPublicProfile`
5. Export the router.
6. In `server/server.js`, import `profileRoutes` and mount with `app.use('/api/profiles', profileRoutes)`.

**Requirements:** A1, A2, A3, A4
**Depends on:** Task 5, Task 6, Task 7, Task 8

---

### Task 15: Requirement routes

**Files:** `server/routes/requirementRoutes.js`, `server/server.js`

**Steps:**
1. Create `server/routes/requirementRoutes.js`.
2. Import `express`, `authenticate`, `authorize`, and all five handlers from `../controllers/requirementController`.
3. Create an Express router.
4. Register routes in this exact order — `/mine` MUST appear before `/:id` to prevent Express matching the literal string `'mine'` as an ObjectId parameter (which causes a CastError):
   - `POST /` → `authenticate, authorize('client'), createRequirement`
   - `GET /mine` → `authenticate, authorize('client'), listOwnRequirements`
   - `GET /:id` → `authenticate, getRequirement`
   - `PATCH /:id` → `authenticate, authorize('client'), updateRequirement`
   - `POST /:id/close` → `authenticate, authorize('client'), closeRequirement`
5. Export the router.
6. In `server/server.js`, import `requirementRoutes` and mount with `app.use('/api/requirements', requirementRoutes)`.

**Requirements:** B5, B6, B7, B8, B9
**Depends on:** Task 9, Task 10, Task 11, Task 12, Task 13

---

## GROUP 6 — FRONTEND SERVICES

### Task 16: profileService.js

**Files:** `client/src/services/profileService.js`

**Steps:**
1. Create `client/src/services/profileService.js`.
2. Import `axios` and read the base URL from `import.meta.env.VITE_API_URL` (default to `'http://localhost:5000'`). Follow the Week 1 axios + error-extraction pattern: all functions attach `Authorization: Bearer <token>` header and catch errors by throwing `new Error(error.response?.data?.message || 'An error occurred')`.
3. Implement and export the following four functions:
   - `upsertProfile(payload, token)` — POST `/api/profiles/me` with `payload` body; return `response.data`.
   - `getOwnProfile(token)` — GET `/api/profiles/me`; return `response.data`.
   - `updateProfile(payload, token)` — PATCH `/api/profiles/me` with `payload` body; return `response.data`.
   - `getPublicProfile(userId, token)` — GET `/api/profiles/${userId}`; return `response.data`.

**Requirements:** A1, A2, A3, A4
**Depends on:** Task 14

---

### Task 17: requirementService.js

**Files:** `client/src/services/requirementService.js`

**Steps:**
1. Create `client/src/services/requirementService.js`.
2. Same axios + error-extraction pattern as Task 16.
3. Implement and export the following five functions:
   - `createRequirement(payload, token)` — POST `/api/requirements` with `payload` body; return `response.data`.
   - `listOwnRequirements(token)` — GET `/api/requirements/mine`; return `response.data`.
   - `getRequirement(id, token)` — GET `/api/requirements/${id}`; return `response.data`.
   - `updateRequirement(id, payload, token)` — PATCH `/api/requirements/${id}` with `payload` body; return `response.data`.
   - `closeRequirement(id, token)` — POST `/api/requirements/${id}/close`; return `response.data`.

**Requirements:** B5, B6, B7, B8, B9
**Depends on:** Task 15

---

## GROUP 7 — FRONTEND PAGES

### Task 18: ProviderProfilePage

**Files:** `client/src/pages/ProviderProfilePage.jsx`

**Steps:**
1. Create the component. Import `useAuth` from `AuthContext`, `profileService`, and React hooks.
2. On mount: call `profileService.getOwnProfile(token)`. On success, populate all form state fields with existing values and set `pitchComplete` display state. On 404, leave form fields empty. Show a loading indicator while the request is in flight.
3. Declare controlled state for: `pitch`, `categories` (array), `capacity`, `teamSize`, `typicalBudgetMin`, `typicalBudgetMax`, `websiteUrl`, `isLoading`, `error`, `pitchComplete` (null on initial load, boolean after save).
4. Render a form with the following fields:
   - `pitch`: textarea
   - `categories`: multi-select or set of checkboxes, one per VALID_CATEGORIES value
   - `capacity`: number input
   - `teamSize`: number input
   - `typicalBudgetMin`: number input
   - `typicalBudgetMax`: number input
   - `websiteUrl`: text input (optional, labelled clearly)
5. On submit: call `profileService.upsertProfile(formData, token)`. On success, update `pitchComplete` state from `response.pitchComplete`. On error, set `error` state to the server message.
6. After a successful save, render a visual indicator showing whether `pitchComplete` is `true` (e.g. green "Profile complete" badge) or `false` (e.g. amber "Profile incomplete" badge).
7. Render the `error` state as an inline message below the form if set.

**Requirements:** F10
**Depends on:** Task 16

---

### Task 19: PostRequirementPage

**Files:** `client/src/pages/PostRequirementPage.jsx`

**Steps:**
1. Create the component. Import `useAuth`, `requirementService`, `useNavigate`, and React hooks.
2. No data fetch on mount; form initialises with all fields empty.
3. Declare controlled state for: `title`, `category`, `description`, `budgetMin`, `budgetMax`, `timeline`, `isLoading`, `error`.
4. Render a form with:
   - `title`: text input
   - `category`: select element with one `<option>` per VALID_CATEGORIES value
   - `description`: textarea
   - `budgetMin`: number input
   - `budgetMax`: number input
   - `timeline`: text input
5. On submit: call `requirementService.createRequirement(formData, token)`. On success, call `navigate('/client/requirements')`. On error, set `error` state to the server message and do not navigate.
6. Render the `error` state as an inline message below the form if set.

**Requirements:** F11
**Depends on:** Task 17

---

### Task 20: MyRequirementsPage

**Files:** `client/src/pages/MyRequirementsPage.jsx`

**Steps:**
1. Create the component. Import `useAuth`, `requirementService`, `Link`, and React hooks.
2. On mount: call `requirementService.listOwnRequirements(token)`. Store the result in `requirements` state. Show a loading indicator while in flight. Show an empty-state message (e.g. "You have no requirements yet.") if the array is empty.
3. Declare state for: `requirements` (array), `isLoading`, `error`.
4. Render the list as a table or card list. Each row displays:
   - `title`
   - `category`
   - `status` as a colour-coded badge (e.g. green for `'open'`, grey for `'closed'`, amber for `'sealed'`)
   - `bidCount` (always 0 this week)
   - A `<Link to={/client/requirements/${req._id}}>` wrapping the title or a "View" action
5. Render errors inline if the fetch fails.

**Requirements:** F12
**Depends on:** Task 17

---

### Task 21: RequirementDetailPage

**Files:** `client/src/pages/RequirementDetailPage.jsx`

**Steps:**
1. Create the component. Import `useAuth`, `requirementService`, `useParams`, and React hooks.
2. On mount: call `requirementService.getRequirement(id, token)` where `id` comes from `useParams()`. Store the document in `requirement` state. Show a loading indicator while in flight.
   - If the server returns 404: display "Requirement not found."
   - If the server returns 403: display "You do not have permission to view this requirement."
3. Declare state for: `requirement`, `isLoading`, `editFields` (object for controlled edit inputs), `editError`, `closeError`, `showCloseConfirm`.
4. Display all requirement fields read-only: title, category, description, budgetMin, budgetMax, timeline, status, clientName, clientCompany.
5. When `requirement.status === 'open'`:
   - Render controlled inputs for: title, category, description, budgetMin, budgetMax, timeline (pre-populated from `requirement`).
   - Provide a "Save changes" button. On click: call `requirementService.updateRequirement(id, editFields, token)`. On success, update `requirement` state from the response. On error, set `editError` state to the server message.
   - Render `editError` inline below the edit form if set.
   - Render a "Close requirement" button.
6. When `requirement.status !== 'open'`: render all fields as read-only text; hide edit inputs and the Close button.
7. "Close requirement" button behaviour:
   - On click: set `showCloseConfirm = true` to render a confirmation step (e.g. "Are you sure? This cannot be undone." with Confirm and Cancel buttons).
   - On confirm: call `requirementService.closeRequirement(id, token)`. On success, update `requirement.status` to `'closed'` in local state (disabling edit inputs and both buttons). On error, set `closeError` state to the server message.
   - On cancel: set `showCloseConfirm = false`.
8. Render `closeError` inline below the close action if set.

**Requirements:** F13
**Depends on:** Task 17

---

## GROUP 8 — ROUTING

### Task 22: Register new routes in App.jsx

**Files:** `client/src/App.jsx`

**Steps:**
1. Open `client/src/App.jsx`.
2. Import `ProviderProfilePage`, `PostRequirementPage`, `MyRequirementsPage`, `RequirementDetailPage`.
3. Add four new `<Route>` entries, each wrapped in an `<AuthGuard>` with Mode A (`requiredRole` set):
   - `<Route element={<AuthGuard requiredRole="provider" />}>` containing `<Route path="/provider/profile" element={<ProviderProfilePage />} />`
   - `<Route element={<AuthGuard requiredRole="client" />}>` containing:
     - `<Route path="/client/requirements/new" element={<PostRequirementPage />} />`
     - `<Route path="/client/requirements" element={<MyRequirementsPage />} />`
     - `<Route path="/client/requirements/:id" element={<RequirementDetailPage />} />`
4. Ownership enforcement for `/client/requirements/:id` is server-side only — the AuthGuard gates by client role, not by document ownership.

**Requirements:** F10, F11, F12, F13
**Depends on:** Task 18, Task 19, Task 20, Task 21

---

## GROUP 9 — TESTS

### Task 23: Backend test setup verification

**Files:** `server/tests/setup.js`

**Steps:**
1. Confirm `process.env.NODE_ENV = 'test'` is the first line of `server/tests/setup.js`, before any imports.
2. Confirm `MongoMemoryServer` is started before all tests and the connection is closed after all tests (Week 1 pattern).
3. Confirm the rate limiter `skip` condition (`process.env.NODE_ENV === 'test'`) is active — this allows property-based tests that make 100+ requests to run without being blocked.
4. No new setup code is needed if Week 1 setup already satisfies these conditions; this task is a verification step.

**Requirements:** (test infrastructure)
**Depends on:** Task 1

---

### Task 24: Profile controller property tests

**Files:** `server/tests/profileController.test.js`

**Steps:**
1. Create `server/tests/profileController.test.js`.
2. Import `supertest`, `fast-check` (`fc`), `ProviderProfile`, `computePitchComplete` from `../utils/pitchComplete`, and test helpers for registering users and obtaining tokens.
3. Implement the following properties — all are required, none are optional, minimum 100 runs each:

   **P1 — Profile upsert idempotency:**
   - Invariant: POSTing a valid profile payload twice for the same provider never creates two ProviderProfile documents.
   - Arbitraries: `fc.record({ pitch: fc.string({ minLength: 100 }), categories: fc.subarray(VALID_CATEGORIES, { minLength: 1, maxLength: 5 }), capacity: fc.integer({ min: 1, max: 20 }), teamSize: fc.integer({ min: 1, max: 100 }), typicalBudgetMin: fc.nat(), typicalBudgetMax: fc.nat() })` filtered so `typicalBudgetMax >= typicalBudgetMin`.
   - POST profile twice with the same provider token; assert `ProviderProfile.countDocuments({ userId }) === 1`.
   - Validates: A1.2, A1.3

   **P2 — computePitchComplete returns false when any required field is missing or invalid:**
   - Invariant: For any profile object missing at least one required field or with an invalid value, `computePitchComplete` returns `false`.
   - Test `computePitchComplete` directly as a pure function — do not hit the HTTP layer.
   - Arbitraries: Generate a valid profile object then use `fc.subarray(['pitch','categories','capacity','teamSize','typicalBudgetMin','typicalBudgetMax'], { minLength: 1 })` to select fields to corrupt (set to `null` or an out-of-range value).
   - Assert return value is `false`.
   - Validates: A1.7

   **P3 — computePitchComplete returns true for fully valid profiles and POST responds with pitchComplete true:**
   - Invariant: For any valid complete profile payload, `computePitchComplete` returns `true` and the POST response body has `pitchComplete === true`.
   - Arbitraries: Same as P1 arbitraries (fully valid payload).
   - Assert `response.body.pitchComplete === true`.
   - Validates: A1.7

   **P4 — Non-provider role is rejected from profile endpoints:**
   - Invariant: POST/GET/PATCH `/api/profiles/me` from a client-role user returns 403.
   - Register a client user; attempt each profile endpoint; assert 403 on all.
   - Validates: A1.1

   **P5 — getPublicProfile returns 404 for provider with no profile:**
   - Invariant: GET `/api/profiles/:userId` for a provider who has not created a profile returns 404.
   - Register provider users without creating profiles; assert 404.
   - Validates: A4.2

**Requirements:** A1, A3, A4
**Depends on:** Task 5, Task 6, Task 7, Task 8, Task 14, Task 23

---

### Task 25: Requirement controller property tests

**Files:** `server/tests/requirementController.test.js`

**Steps:**
1. Create `server/tests/requirementController.test.js`.
2. Import `supertest`, `fc`, `Requirement`, and test helpers.
3. Implement the following properties — all are required, none are optional, minimum 100 runs each:

   **P6 — Status is always 'open' on creation regardless of payload:**
   - Invariant: Any creation payload that includes a `status` field with any string value results in a stored document with `status === 'open'`.
   - Arbitraries: `fc.record({ ...validRequirementFields, status: fc.string() })`.
   - Assert `response.body.status === 'open'`.
   - Validates: B5.4

   **P7 — Bid_Count_Stub is always 0 in list responses:**
   - Invariant: Every item in a GET `/api/requirements/mine` response has `bidCount === 0`.
   - Arbitraries: `fc.integer({ min: 1, max: 10 })` for number of requirements to create; create them; assert all items have `bidCount === 0`.
   - Validates: B6.3

   **P8 — 404→403→409 ordering in updateRequirement:**
   Test three invariants as separate `fc.assert` blocks within this property group:
   - Invariant 1 (non-existent ID → 404): Arbitraries: `fc.hexaString({ minLength: 24, maxLength: 24 })`; make PATCH request as a valid client user; assert 404.
   - Invariant 2 (existing ID, non-owner → 403): Register clients A and B; create requirement as A; attempt PATCH as B; assert 403 (confirming 404 is not returned).
   - Invariant 3 (owner, non-open status → 409): Create requirement as client; close it; attempt PATCH as owner; assert 409 (confirming 403 is not returned).
   - Validates: B8.1, B8.2, B8.5

   **P9 — 404→403→409 ordering in closeRequirement:**
   Same three-invariant structure as P8, applied to POST `/:id/close`.
   - Validates: B9.1, B9.3, B9.4

   **P10 — Closed requirements reject all further mutations:**
   - Invariant: After closing a requirement, both PATCH and POST `/close` return 409.
   - Create requirement; close it; attempt both mutations; assert 409 on both.
   - Validates: B9.6, B8.2

   **P11 — budgetMax ≥ budgetMin enforced on create and update:**
   - Invariant: Any payload where `budgetMax < budgetMin` returns 400 on both create and update.
   - Arbitraries: `fc.tuple(fc.nat(), fc.nat()).filter(([a, b]) => b < a)` mapped to `[budgetMin, budgetMax]`.
   - Validates: B5.2, B8.4

**Requirements:** B5, B6, B7, B8, B9
**Depends on:** Task 9, Task 10, Task 11, Task 12, Task 13, Task 15, Task 23

---

### Task 26: Frontend component property tests

**Files:** `client/src/tests/Week2Pages.test.jsx`

**Steps:**
1. Create `client/src/tests/Week2Pages.test.jsx` (or extend the existing `AuthGuard.test.jsx` if preferred).
2. Import `vitest`, `@testing-library/react`, `fast-check`, `MemoryRouter`, `AuthContext`, and the components under test.
3. Implement the following properties — all are required, none are optional, minimum 100 runs each:

   **P12 — AuthGuard Mode A redirects unauthenticated users from all four new routes:**
   - Invariant: Rendering any of the four new routes (`/provider/profile`, `/client/requirements/new`, `/client/requirements`, `/client/requirements/:id`) with `user: null` in AuthContext results in navigation to `/login`.
   - Arbitraries: `fc.constantFrom('/provider/profile', '/client/requirements/new', '/client/requirements', '/client/requirements/abc123')`.
   - Wrap the route in `MemoryRouter` with the given initial entry; provide `AuthContext` value with `user: null, isLoading: false`; assert `<Navigate to="/login" />` is rendered or the current location becomes `/login`.
   - Validates: F10.1, F11.1, F12.1, F13.1

   **P13 — ProviderProfilePage shows correct pitchComplete indicator after save:**
   - Invariant: When `profileService.upsertProfile` resolves with `pitchComplete: true`, the page renders a "complete" indicator; when it resolves with `pitchComplete: false`, the page renders an "incomplete" indicator.
   - Arbitraries: `fc.boolean()` for the `pitchComplete` value.
   - Mock `profileService.upsertProfile` to return `{ pitchComplete: generatedBoolean }`; render `ProviderProfilePage`; fill and submit the form; assert the correct indicator is shown.
   - Validates: F10.5

**Requirements:** F10, F11, F12, F13
**Depends on:** Task 18, Task 19, Task 20, Task 21, Task 22

---

### Task 27: Integration smoke tests

**Files:** `server/tests/week2.smoke.test.js`

**Steps:**
1. Create `server/tests/week2.smoke.test.js`.
2. Implement Flow A (Provider Profile):
   1. Register a new provider user via POST `/api/auth/register`; obtain token.
   2. POST `/api/profiles/me` with a fully valid payload; assert 201 and `pitchComplete === true`.
   3. GET `/api/profiles/me`; assert 200 and that the returned profile matches the created payload.
   4. PATCH `/api/profiles/me` with a single field update (e.g. update `capacity` to a different valid value).
   5. GET `/api/profiles/me` again; assert the updated field reflects the patched value and `pitchComplete` is still `true`.
3. Implement Flow B (Requirement CRUD):
   1. Register a new client user; obtain token.
   2. POST `/api/requirements` with a fully valid payload; assert 201 and `status === 'open'` and `bidCount === 0`.
   3. GET `/api/requirements/mine`; assert 200, the requirement appears in the list, and `bidCount === 0` on the item.
   4. GET `/api/requirements/:id` for the created requirement; assert 200 and presence of `clientName` and `clientCompany` fields.
   5. PATCH `/api/requirements/:id` to update the `title`; assert 200 and the new title is returned.
   6. POST `/api/requirements/:id/close`; assert 200 and `status === 'closed'`.
   7. PATCH `/api/requirements/:id` after closing; assert 409.

**Requirements:** A1, A2, A3, B5, B6, B7, B8, B9
**Depends on:** Task 14, Task 15, Task 23

---

## Notes

- All property-based tests (P1–P13) are **required**. None are optional.
- Tasks must be executed in dependency order. Group 1 must complete before Groups 2–9. Models must exist before controllers. Controllers must exist before routes. Routes must exist before service files. Service files must exist before page components.
- The `computePitchComplete` function in `server/utils/pitchComplete.js` is the single source of truth for pitchComplete logic — both `upsertProfile` and `updateProfile` import it.
- The mandatory 404→403→409 check order in `updateRequirement` and `closeRequirement` is a security requirement, not a style preference.
- `/api/requirements/mine` must be registered before `/api/requirements/:id` in the Express router — this is a correctness requirement, not a preference.
- Coding constraints (apply when implementing): comments only where logic is non-obvious; full descriptive variable names; standard idiomatic MERN patterns; no invented abstractions.
