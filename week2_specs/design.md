# Design Document: Provider Profile & RFP CRUD (Week 2)

## 1. Overview

Week 2 adds the two core content documents of the Dealtable marketplace on top of the Week 1 auth foundation. Feature A introduces the ProviderProfile — a structured, verifiable capability pitch stored as a single document per provider, created and maintained by authenticated provider-role users and readable by any authenticated user. Feature B introduces the Requirement (RFP) — a work request posted by client-role users that follows a defined lifecycle (open → sealed → closed), with full CRUD support for the open state and a dedicated close action. Both features rely entirely on the Week 1 `authenticate` middleware to establish `req.user`, and on the `authorize(...roles)` middleware for role gating. The global error handler, Mongoose validation pipeline, and axios/AuthContext patterns from Week 1 are reused without modification.

---

## 2. Data Models

### 2a. ProviderProfile Schema (Mongoose)

**Fields:**

| Field | Type | Constraints | Default |
|---|---|---|---|
| userId | ObjectId (ref: User) | required, unique, immutable | — |
| pitch | String | required, minlength: 100 | — |
| categories | [String] | required, each value must be a valid ServiceCategory, array length 1–5 | — |
| capacity | Number | required, integer, min: 1, max: 20 | — |
| teamSize | Number | required, integer, min: 1 | — |
| typicalBudgetMin | Number | required, min: 0 | — |
| typicalBudgetMax | Number | required, min: 0 | — |
| websiteUrl | String | optional, URL format validation (see below) | — |
| pitchComplete | Boolean | required, stored (not virtual) | false |
| timestamps | — | createdAt, updatedAt via `{ timestamps: true }` | — |

**ServiceCategory enum values:** `Web Development`, `Mobile Development`, `UI/UX Design`, `Digital Marketing`, `Content Writing`, `Consulting`, `Legal Services`, `Logistics`, `Manufacturing`, `Other`.

**pitchComplete — stored Boolean, not a Mongoose virtual:**
`pitchComplete` is a stored Boolean field rather than a Mongoose virtual because it must be queryable by future features (e.g. the Week 4 provider comparison matrix may filter on `pitchComplete: true`) and must be returned in all API responses without re-running validation logic on every read. Computing it on write and storing it is cheaper than re-evaluating six field constraints on every read, and avoids the complexity of serialising a virtual in all response paths.

**typicalBudgetMax ≥ typicalBudgetMin cross-field validation:**
Mongoose built-in validators operate on a single field in isolation and cannot reference sibling fields. This cross-field constraint is therefore enforced in the controller, not in the schema. The controller explicitly checks `typicalBudgetMax >= typicalBudgetMin` before calling the upsert and returns a 400 with a descriptive message if the condition is not met. This keeps the schema simple and avoids the fragile `this` context issues that arise with schema-level custom validators when `runValidators: true` is used with `findOneAndUpdate`.

**websiteUrl URL validation:**
If `websiteUrl` is present in the payload, the controller validates it against the regex `/^https?:\/\/.+\..+/` before upserting. An empty string is treated as "not provided" (the field is omitted from the update). A non-empty string that does not match the regex results in a 400 response.

**Upsert strategy — findOneAndUpdate with upsert:true:**
The profile endpoint uses `findOneAndUpdate({ userId }, updatePayload, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })` rather than a find-then-save pattern. This guarantees atomicity of the 1:1 constraint: a race condition where two concurrent requests both find "no document exists" and both call `new ProviderProfile().save()` would create two documents. With `upsert: true` and the unique index on `userId`, the second concurrent write fails with a duplicate key error (code 11000) rather than creating a second profile. `runValidators: true` ensures Mongoose field-level validators run on update as well as insert. `new: true` returns the updated document rather than the pre-update document.

**Determining 201 vs 200 from an upsert:**
`findOneAndUpdate` with `upsert: true` does not directly return whether an insert or update occurred. The controller calls `findOne({ userId })` before the upsert to check for existence, then uses that result: if no document existed before the upsert, respond 201; if one existed, respond 200. This pre-check is safe because the upsert itself is the atomic write — the pre-check is read-only and only used for response code selection, not for the write decision.

**Index:** Unique index on `userId`. This enforces the 1:1 guarantee at the database level and optimises all profile lookups by provider.

---

### 2b. Requirement Schema (Mongoose)

**Fields:**

| Field | Type | Constraints | Default |
|---|---|---|---|
| clientId | ObjectId (ref: User) | required, immutable | — |
| title | String | required, minlength: 10, maxlength: 200 | — |
| category | String | required, must be a valid ServiceCategory value | — |
| description | String | required, minlength: 50 | — |
| budgetMin | Number | required, min: 0 | — |
| budgetMax | Number | required, min: 0 | — |
| timeline | String | required, minlength: 5, maxlength: 100 | — |
| status | String | enum: ['open', 'sealed', 'closed'], required | 'open' |
| timestamps | — | createdAt, updatedAt via `{ timestamps: true }` | — |

**Status enum and 'sealed':**
The `status` field includes `'sealed'` in its enum now so that the Week 4 bidding feature can set it without a schema migration. No Week 2 endpoint sets or accepts `'sealed'` — controllers that modify status (close endpoint only) hardcode the target value as `'closed'`. Any payload field named `status` is stripped before processing in all Week 2 write endpoints.

**clientId population strategy:**
`clientId` stores a reference to the User document. It is not denormalised (i.e. name and company are not copied into the Requirement document) because denormalisation would require updating all Requirement documents if a user changes their name or company. The single-fetch and list endpoints use Mongoose `.populate('clientId', 'name company')` to join the user data at query time. The populated fields are included in the response alongside the requirement fields.

**budgetMax ≥ budgetMin cross-field validation:**
Same approach as ProviderProfile: enforced in the controller before the database write, not in the schema, for the same reasons.

**Bid_Count_Stub — controller-level append, not a schema field:**
`Bid_Count_Stub` is not stored on the Requirement document. It is appended by the controller as a hardcoded `bidCount: 0` on each item in list responses only. This avoids adding a field to the schema that has no backing data this week, keeps the schema accurate, and allows Week 3 to replace the hardcoded value with a real aggregation query without any schema migration or backward-compatibility concern.

**Index:** Index on `clientId` for the list-own-requirements query (`{ clientId: req.user.id }` with sort on `createdAt`).

---

## 3. API Route Design

| Method | Path | Middleware | Handler | Requirements |
|---|---|---|---|---|
| POST | /api/profiles/me | authenticate, authorize('provider') | upsertProfile | A1 |
| GET | /api/profiles/me | authenticate, authorize('provider') | getOwnProfile | A2 |
| PATCH | /api/profiles/me | authenticate, authorize('provider') | updateProfile | A3 |
| GET | /api/profiles/:userId | authenticate | getPublicProfile | A4 |
| POST | /api/requirements | authenticate, authorize('client') | createRequirement | B5 |
| GET | /api/requirements/mine | authenticate, authorize('client') | listOwnRequirements | B6 |
| GET | /api/requirements/:id | authenticate | getRequirement | B7 |
| PATCH | /api/requirements/:id | authenticate, authorize('client') | updateRequirement | B8 |
| POST | /api/requirements/:id/close | authenticate, authorize('client') | closeRequirement | B9 |

The `authenticate` middleware follows the Week 1 pattern (Bearer token extraction, `jwt.verify`, sets `req.user = { id, role }`). The `authorize(...roles)` middleware follows the Week 1 pattern (checks `req.user.role` against the allowed list, returns 403 if not matched).

> **Important — route registration order:** `/api/requirements/mine` MUST be registered before `/api/requirements/:id` in the Express router. Express uses first-match ordering: if `:id` is registered first, the literal string `"mine"` is matched as the value of the `:id` parameter, Mongoose attempts to cast it as an ObjectId, and throws a `CastError`. Registering the static segment `/mine` first ensures it is matched before the dynamic `:id` pattern.

---

## 4. Controller Logic

### 4a. profileController

**`computePitchComplete` utility:**
The pitchComplete computation logic is extracted into a standalone pure exported function `computePitchComplete(mergedProfile)` in `server/utils/pitchComplete.js`. Both `upsertProfile` and `updateProfile` import and call this function. The function takes a plain object with the six required profile fields and returns `true` if all pass their rules, `false` otherwise. Extracting it makes the computation independently unit-testable as specified in P2, and ensures both write paths use identical logic.

#### upsertProfile (POST /api/profiles/me)

1. Destructure `pitch`, `categories`, `capacity`, `teamSize`, `typicalBudgetMin`, `typicalBudgetMax`, `websiteUrl` from `req.body`.
2. Validate that all required fields (`pitch`, `categories`, `capacity`, `teamSize`, `typicalBudgetMin`, `typicalBudgetMax`) are present. If any are missing, return 400 with a message identifying the missing fields.
3. Validate `pitch.length >= 100`. If not, return 400.
4. Validate `categories` is a non-empty array of 1–5 values each drawn from the ServiceCategory enum. If not, return 400.
5. Validate `capacity` is an integer between 1 and 20 inclusive. If not, return 400.
6. Validate `teamSize` is an integer >= 1. If not, return 400.
7. Validate `typicalBudgetMin >= 0`. If not, return 400.
8. Validate `typicalBudgetMax >= typicalBudgetMin`. If not, return 400 with message "typicalBudgetMax must be greater than or equal to typicalBudgetMin".
9. If `websiteUrl` is present and non-empty, validate it matches `/^https?:\/\/.+\..+/`. If not, return 400.
10. Compute `pitchComplete` by calling `computePitchComplete({ pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax })` from `server/utils/pitchComplete.js`. Since all required fields have already been validated at this point in the success path, `pitchComplete` is always `true` on a successful upsert via this endpoint. (It can be `false` only via the PATCH endpoint if a partial update results in an invalid merged state.)
11. Perform a `findOne({ userId: req.user.id })` to determine whether a profile already exists. Store the boolean result as `isNew`.
12. Build the update payload object containing all validated fields plus `pitchComplete`.
13. Call `ProviderProfile.findOneAndUpdate({ userId: req.user.id }, { $set: updatePayload }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })`.
14. If the upsert throws a duplicate key error (code 11000), it means a concurrent request created the profile — treat this as an update, set `isNew = false`, and re-fetch the document.
15. Return the saved document. If `isNew` is true, respond with 201. If false, respond with 200.

#### getOwnProfile (GET /api/profiles/me)

1. Query `ProviderProfile.findOne({ userId: req.user.id })`.
2. If no document is found, return 404 with message "No profile found. Create your profile to get started.".
3. Return the document with 200.

#### updateProfile (PATCH /api/profiles/me)

1. Extract only the fields present in `req.body` from: `pitch`, `categories`, `capacity`, `teamSize`, `typicalBudgetMin`, `typicalBudgetMax`, `websiteUrl`. Fields not present in the payload are ignored entirely — they are not set to null or undefined.
2. For each field present in the payload, apply the same individual validation rules as in upsertProfile steps 3–9 (excluding cross-field budget validation at this stage). Return 400 if any supplied field fails its rule.
3. Fetch the existing profile with `ProviderProfile.findOne({ userId: req.user.id })`. If not found, return 404 with message "Profile not found.".
4. Cross-field budget validation: if both `typicalBudgetMin` and `typicalBudgetMax` are present in the payload, validate `typicalBudgetMax >= typicalBudgetMin`. If only one is present, validate the incoming value against the stored counterpart from the fetched profile document.
5. Build the update object using only the validated supplied fields (Mongoose `$set` semantics — only supplied keys are updated, all other keys retain their current values).
6. Recompute `pitchComplete` against the merged state: take the existing document's field values, overlay the incoming updates, then call `computePitchComplete(mergedProfile)`. Set `pitchComplete: true` if all required-field rules pass on the merged result, `false` if any fail.
7. Add `pitchComplete` to the update object.
8. Call `ProviderProfile.findOneAndUpdate({ userId: req.user.id }, { $set: updateObject }, { new: true, runValidators: true })`.
9. Return the updated profile document with 200.

#### getPublicProfile (GET /api/profiles/:userId)

1. Query `ProviderProfile.findOne({ userId: req.params.userId }).populate('userId', 'name company')`.
2. If no document is found (covers both "userId does not exist" and "userId exists but has no profile"), return 404 with message "Provider profile not found.".
3. Call `.toObject()` on the Mongoose document to convert it to a plain object. Spread the plain object fields, then include `name` and `company` from the populated userId reference.
4. Return with 200.

---

### 4b. requirementController

#### createRequirement (POST /api/requirements)

1. Destructure `title`, `category`, `description`, `budgetMin`, `budgetMax`, `timeline` from `req.body`. Ignore any `status` field in the payload.
2. Validate all required fields are present. Return 400 if any are missing.
3. Validate `title.length` is between 10 and 200 inclusive. Return 400 if not.
4. Validate `category` is a valid ServiceCategory value. Return 400 if not.
5. Validate `description.length >= 50`. Return 400 if not.
6. Validate `budgetMin >= 0`. Return 400 if not.
7. Validate `budgetMax >= budgetMin`. Return 400 if not.
8. Validate `timeline.length` is between 5 and 100 inclusive. Return 400 if not.
9. Create a new Requirement document with `clientId: req.user.id`, all validated fields, and `status: 'open'` (hardcoded — not taken from payload).
10. Save the document.
11. Return the saved document plus `bidCount: 0` appended to the response object. Respond with 201.

#### listOwnRequirements (GET /api/requirements/mine)

1. Query `Requirement.find({ clientId: req.user.id }).sort({ createdAt: -1 })`.
2. Map the result array: for each document, spread its fields and append `bidCount: 0`.
3. Return the mapped array with 200.

#### getRequirement (GET /api/requirements/:id)

1. Query `Requirement.findById(req.params.id).populate('clientId', 'name company')`.
2. If no document is found, return 404 with message "Requirement not found.".
3. Call `.toObject()` on the Mongoose document to convert it to a plain object. Spread the plain object fields, then include `clientName` and `clientCompany` from the populated clientId reference.
4. Return with 200.

#### updateRequirement (PATCH /api/requirements/:id)

The check order is mandatory: **404 → 403 → 409**. Rationale: checking ownership (403) before existence (404) would leak information — a non-owner would receive a 403 that implicitly confirms the resource exists. Checking existence first reveals nothing about ownership to a requester who has no right to know.

1. Query `Requirement.findById(req.params.id)`.
2. If no document is found, return 404 with message "Requirement not found.".
3. If `requirement.clientId.toString() !== req.user.id`, return 403 with message "Not authorised to update this requirement.".
4. If `requirement.status !== 'open'`, return 409 with message "Only open requirements can be updated.".
5. Extract only the fields present in `req.body` from: `title`, `category`, `description`, `budgetMin`, `budgetMax`, `timeline`. Ignore `status` and any other fields.
6. Validate each supplied field using the same rules as createRequirement steps 3–8. Return 400 if any fail.
7. For `budgetMax`/`budgetMin`: if only one is supplied, validate the incoming value against the stored counterpart (same approach as updateProfile step 3).
8. Apply the updates using `Object.assign(requirement, validatedFields)` and call `requirement.save()`.
9. Return the updated document with 200.

#### closeRequirement (POST /api/requirements/:id/close)

Same mandatory check order as updateRequirement: **404 → 403 → 409**.

1. Query `Requirement.findById(req.params.id)`.
2. If no document is found, return 404 with message "Requirement not found.".
3. If `requirement.clientId.toString() !== req.user.id`, return 403 with message "Not authorised to close this requirement.".
4. If `requirement.status === 'closed' || requirement.status === 'sealed'`, return 409 with message "Requirement is already closed or sealed.".
5. Set `requirement.status = 'closed'`.
6. Call `requirement.save()`.
7. Return the updated document with 200.

---

## 5. Frontend Architecture

### 5a. New Routes in App.jsx

Four new protected routes are added, all using AuthGuard Mode A (`requiredRole` set, redirects unauthenticated users to `/login` and wrong-role users to their own dashboard):

| Path | AuthGuard Mode | requiredRole | Component |
|---|---|---|---|
| /provider/profile | Mode A | "provider" | ProviderProfilePage |
| /client/requirements/new | Mode A | "client" | PostRequirementPage |
| /client/requirements | Mode A | "client" | MyRequirementsPage |
| /client/requirements/:id | Mode A | "client" | RequirementDetailPage |

Ownership enforcement on `/client/requirements/:id` is server-side only (per requirement F13.1). The route guard gates by client role; the server returns 403 if the authenticated client is not the owner, and the page surfaces that error via inline messaging.

### 5b. New Service Files

Both files follow the same axios + error-extraction pattern as `authService.js` from Week 1: axios calls with `Authorization: Bearer <token>` header (token read from AuthContext), non-2xx responses caught and `error.response.data.message` thrown as an Error.

**`client/src/services/profileService.js`**

| Function | API call |
|---|---|
| `upsertProfile(payload, token)` | POST /api/profiles/me |
| `getOwnProfile(token)` | GET /api/profiles/me |
| `updateProfile(payload, token)` | PATCH /api/profiles/me |
| `getPublicProfile(userId, token)` | GET /api/profiles/:userId |

**`client/src/services/requirementService.js`**

| Function | API call |
|---|---|
| `createRequirement(payload, token)` | POST /api/requirements |
| `listOwnRequirements(token)` | GET /api/requirements/mine |
| `getRequirement(id, token)` | GET /api/requirements/:id |
| `updateRequirement(id, payload, token)` | PATCH /api/requirements/:id |
| `closeRequirement(id, token)` | POST /api/requirements/:id/close |

### 5c. Page Components

#### ProviderProfilePage (`client/src/pages/ProviderProfilePage.jsx`)

- **Mount:** Calls `profileService.getOwnProfile(token)`. If the response is successful, sets form state with existing values and sets `pitchComplete` display state. If the response is a 404, initialises an empty form. Shows a loading indicator while the request is in flight.
- **Form fields (controlled):** pitch (textarea), categories (multi-select or checkbox group), capacity (number input), teamSize (number input), typicalBudgetMin (number input), typicalBudgetMax (number input), websiteUrl (text input, optional).
- **Submit handler:** Calls `profileService.upsertProfile(formData, token)`. On success, updates `pitchComplete` display state from the response. On error, displays the server error message inline.
- **Conditional rendering:** After a successful save, displays a visual indicator (e.g. a badge or banner) showing whether `pitchComplete` is `true` or `false`.

#### PostRequirementPage (`client/src/pages/PostRequirementPage.jsx`)

- **Mount:** No data fetch required. Form initialises empty.
- **Form fields (controlled):** title (text input), category (select from ServiceCategory values), description (textarea), budgetMin (number input), budgetMax (number input), timeline (text input).
- **Submit handler:** Calls `requirementService.createRequirement(formData, token)`. On success, navigates to `/client/requirements`. On error, displays the server error message inline without leaving the page.

#### MyRequirementsPage (`client/src/pages/MyRequirementsPage.jsx`)

- **Mount:** Calls `requirementService.listOwnRequirements(token)`. Stores the result array in state. Shows a loading indicator while in flight. Shows an empty-state message if the array is empty.
- **Rendering:** Renders each requirement as a row showing: title, category, status badge (colour-coded by status value), `bidCount` (will always be 0 this week), and a link to `/client/requirements/:id`.
- **No form fields.**

#### RequirementDetailPage (`client/src/pages/RequirementDetailPage.jsx`)

- **Mount:** Calls `requirementService.getRequirement(id, token)` where `id` comes from `useParams()`. Stores the document in state. Shows a loading indicator while in flight. If the server returns 404, displays a "not found" message. If 403, displays "You do not have permission to view this requirement."
- **Rendering:** Displays all requirement fields (title, category, description, budgetMin, budgetMax, timeline, status, client name and company).
- **Conditional rendering — editing:** When `status === 'open'`, the editable fields (title, category, description, budgetMin, budgetMax, timeline) are rendered as controlled inputs. When `status !== 'open'`, they are rendered as read-only text.
- **Update submit handler:** Calls `requirementService.updateRequirement(id, changedFields, token)`. On success, updates local document state from the response. On error (400/403/409), displays the server message inline.
- **Close action:** A "Close requirement" button is shown only when `status === 'open'`. On click, renders a confirmation dialog/modal. On confirmation, calls `requirementService.closeRequirement(id, token)`. On success, updates local state to reflect `status: 'closed'` and disables editing and the close button. On error, displays the server message inline.

### 5d. AuthGuard Changes

No new AuthGuard modes are needed. Existing Mode A (requiredRole set) is sufficient for all four new routes: it redirects unauthenticated users to `/login` and authenticated users with the wrong role to their own dashboard. Ownership enforcement for RequirementDetailPage is not performed at the route level — it is enforced server-side per requirements B8 and B9, and surfaced to the user via error messaging on the page (per approved requirement F13.1).

---

## 6. Key Design Decisions

1. **Bid_Count_Stub is a controller-level append, not a schema field.** Storing it on the document would mean maintaining a field that is always 0 this week with no backing data, and would require a schema change (or at minimum a data migration) when Week 3 replaces the stub with a real aggregate. Appending it in the controller costs nothing and leaves the schema accurate.

2. **pitchComplete is a stored Boolean, not a Mongoose virtual.** Virtuals are not included in query results by default, require `.toJSON({ virtuals: true })` configuration, and cannot be queried in database filters. Storing the computed value on write is cheap, keeps reads simple, and makes the field available for future filtering (e.g. "show only providers with a complete profile").

3. **findOneAndUpdate upsert is used instead of find-then-save for profiles.** A find-then-save pattern is not atomic: two concurrent POST requests that both find "no profile exists" would both attempt to insert, resulting in two documents. The unique index on `userId` combined with `upsert: true` makes the write atomic — only one insert can succeed.

4. **The 404→403→409 check order is mandatory in update/close controllers.** Returning 403 before 404 would confirm to a non-owner that the resource exists, leaking information. Always checking existence first (404) before ownership (403) before state (409) avoids this information disclosure.

5. **'sealed' is in the status enum but not settable via any Week 2 endpoint.** Including it now avoids a schema migration in Week 4. No controller this week accepts or sets `'sealed'` — the close endpoint hardcodes `'closed'` as the only settable status.

6. **Cross-field validation (typicalBudgetMax ≥ typicalBudgetMin, budgetMax ≥ budgetMin) is enforced in the controller, not in the schema.** Mongoose custom validators on a single field cannot safely reference sibling fields when `runValidators: true` is used with `findOneAndUpdate`, because `this` does not refer to the full document in that context. Controller-level validation is explicit, testable, and avoids this known Mongoose edge case.

7. **The global error handler must be extended to map `mongoose.Error.CastError` to a 400 response with message "Invalid ID format."** Week 2 introduces `:id` and `:userId` URL parameters that Mongoose attempts to cast to ObjectId. Without this handler, a request with a malformed ID string (e.g. `"abc"`) causes Mongoose to throw a `CastError` which falls through to the default 500 handler, exposing an internal error to the client. Mapping it to 400 gives the client a clear, actionable response. This extension is made to the existing `server/middleware/errorMiddleware.js` from Week 1.

---

## 7. Testing Strategy

All property-based tests use `fast-check` with a minimum of 100 runs per property. Backend tests use Jest + `mongodb-memory-server`. Frontend component tests use Vitest + React Testing Library.

### Profile Controller Properties

**P1 — Profile upsert idempotency**
- Invariant: Submitting a valid profile payload twice for the same provider never creates two ProviderProfile documents.
- Validates: A1.2, A1.3
- Arbitraries: `fc.record({ pitch: fc.string({ minLength: 100 }), categories: fc.subarray(SERVICE_CATEGORIES, { minLength: 1, maxLength: 5 }), capacity: fc.integer({ min: 1, max: 20 }), teamSize: fc.integer({ min: 1 }), typicalBudgetMin: fc.nat(), typicalBudgetMax: fc.nat() })` — filter to ensure `typicalBudgetMax >= typicalBudgetMin`; POST twice; assert `ProviderProfile.countDocuments({ userId }) === 1`.

**P2 — pitchComplete is false when any required field is missing or invalid**
- Invariant: For any profile save where at least one required field is missing or violates its constraint, pitchComplete is false on the stored document.
- Validates: A1.7
- Arbitraries: Generate valid profiles then randomly blank out or invalidate one required field (e.g. `fc.subarray(['pitch','categories','capacity','teamSize','typicalBudgetMin','typicalBudgetMax'], { minLength: 1 })` to select fields to corrupt). Since invalid saves return 400 and do not persist, this property is better tested by directly invoking the pitchComplete computation function as a unit test with property-based inputs.

**P3 — pitchComplete is true when all required fields are present and valid**
- Invariant: For any valid complete profile payload, the stored document has `pitchComplete === true`.
- Validates: A1.7
- Arbitraries: Same as P1 arbitraries (fully valid payload); assert `response.body.pitchComplete === true`.

**P4 — Non-provider role is rejected from profile endpoints**
- Invariant: Any request to POST/GET/PATCH /api/profiles/me from a user with role "client" returns 403.
- Validates: A1.1
- Arbitraries: Register a client user; attempt profile upsert; assert 403.

**P5 — getPublicProfile returns 404 for provider with no profile**
- Invariant: GET /api/profiles/:userId for a provider who has not created a profile returns 404.
- Validates: A4.2
- Arbitraries: Register provider users without creating profiles; assert 404 on GET.

### Requirement Controller Properties

**P6 — Status is always 'open' on creation regardless of payload**
- Invariant: For any requirement creation payload that includes a `status` field with any value, the stored document has `status === 'open'`.
- Validates: B5.4
- Arbitraries: `fc.record({ ...validRequirementFields, status: fc.string() })`; assert `response.body.status === 'open'`.

**P7 — Bid_Count_Stub is always 0 in list responses**
- Invariant: For any list-own-requirements response, every item in the array has `bidCount === 0`.
- Validates: B6.3
- Arbitraries: Create N requirements (`fc.integer({ min: 1, max: 10 })`); GET /api/requirements/mine; assert all items have `bidCount === 0`.

**P8 — 404→403→409 ordering in updateRequirement**
- Invariant 1: A request with a non-existent ID returns 404 regardless of who makes it.
- Invariant 2: A request with an existing ID from a non-owner returns 403 (not 404).
- Invariant 3: A request from the owner on a non-open requirement returns 409 (not 403 or 404).
- Validates: B8.1, B8.2, B8.5
- Arbitraries: For invariant 1, use `fc.hexaString({ minLength: 24, maxLength: 24 })` as fake ID. For invariant 2, create requirement as client A, attempt update as client B. For invariant 3, close a requirement first, then attempt update as owner.

**P9 — 404→403→409 ordering in closeRequirement**
- Same structure as P8, applied to POST /api/requirements/:id/close.
- Validates: B9.1, B9.3, B9.4

**P10 — Closed requirements reject all further mutations**
- Invariant: After a requirement is closed, both PATCH and POST /close return 409.
- Validates: B9.6, B8.2
- Arbitraries: Create and close a requirement; assert both mutation endpoints return 409.

**P11 — budgetMax ≥ budgetMin enforced on create and update**
- Invariant: Any create or update payload where `budgetMax < budgetMin` returns 400.
- Validates: B5.2, B8.4
- Arbitraries: `fc.tuple(fc.nat(), fc.nat()).filter(([a, b]) => b < a)` as [budgetMin, budgetMax].

### Frontend Component Tests

**P12 — AuthGuard Mode A redirects unauthenticated users from all four new routes**
- Invariant: Rendering any of the four new routes with a null user in AuthContext results in navigation to /login.
- Validates: F10.1, F11.1, F12.1, F13.1
- Follows the Week 1 pattern for AuthGuard property tests.

**P13 — ProviderProfilePage shows pitchComplete status after successful save**
- Invariant: When upsertProfile resolves with `pitchComplete: true`, the page displays a "complete" indicator; with `pitchComplete: false`, it displays an "incomplete" indicator.
- Validates: F10.5
- Approach: Mock `profileService.upsertProfile`; render page; submit; assert indicator state.
