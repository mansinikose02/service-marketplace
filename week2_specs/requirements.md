# Requirements Document

## Introduction

This document covers two interdependent features that build directly on the Week 1 authentication foundation. Feature A introduces the Provider Profile: a structured, verifiable capability pitch that every provider must complete before they can meaningfully participate in the marketplace. Feature B introduces the Requirement (RFP) CRUD lifecycle, allowing clients to post, manage, and close work requests that providers will eventually bid on. Together these two features establish the core content layer of Dealtable — the supply-side identity and the demand-side intake flow — and are designed so that Week 3 (bidding) and Week 4 (deal acceptance) can be layered on top without breaking changes.

---

## Glossary

- **ProviderProfile**: A single document, linked 1:1 to a Provider_User record, that captures the provider's structured capability pitch, including their service categories, team size, capacity, and budget expectations.
- **Requirement**: A document posted by a Client_User that describes a piece of work they need done, including title, category, description, budget range, and timeline. Commonly referred to as an RFP in the broader business context.
- **RFP**: Request for Proposal — used interchangeably with Requirement throughout this document and the wider Dealtable platform.
- **ServiceCategory**: A controlled enumeration of service verticals accepted by the platform. Valid values are: `Web Development`, `Mobile Development`, `UI/UX Design`, `Digital Marketing`, `Content Writing`, `Consulting`, `Legal Services`, `Logistics`, `Manufacturing`, `Other`.
- **pitchComplete**: A computed boolean attribute on a ProviderProfile. It is `true` if and only if all required ProviderProfile fields are present and individually valid at the time of the most recent save; `false` otherwise. It is recalculated on every create or update operation and stored on the document.
- **Bid_Count_Stub**: A numeric field included on each Requirement in list responses representing the total number of bids received. Its value will always be `0` in the current scope (Week 2); the field is defined now to prevent a breaking API change when bidding is introduced in Week 3.

---

## Requirements

### Requirement A1: Provider Profile Creation and Upsert

**User Story:** As a Provider_User, I want to create or update my structured capability profile, so that clients can evaluate my suitability for their requirements and I can accurately represent my capacity and specialisations.

#### Acceptance Criteria

1. THE Profile_Service SHALL permit only authenticated users whose role is "provider" to submit a profile; IF a user with any other role submits a profile, THEN THE Profile_Service SHALL return a 403 status with a descriptive error message.
2. WHEN an authenticated Provider_User submits a profile and no ProviderProfile exists for that provider, THE Profile_Service SHALL create a new ProviderProfile document linked to the Provider_User's record.
3. WHEN an authenticated Provider_User submits a profile and a ProviderProfile already exists for that provider, THE Profile_Service SHALL update the existing ProviderProfile in place and SHALL NOT create a second ProviderProfile document for the same provider.
4. THE Profile_Service SHALL require the following fields to be present and valid on every save: a pitch of at least 100 characters; a categories array containing between 1 and 5 values each drawn from ServiceCategory; a capacity value that is a whole number between 1 and 20 inclusive; a teamSize value that is a whole number of at least 1; a typicalBudgetMin value of at least 0; a typicalBudgetMax value that is greater than or equal to typicalBudgetMin.
5. IF any required field is absent or fails its validation rule on save, THEN THE Profile_Service SHALL return a 400 status with a descriptive error message identifying which field(s) are invalid.
6. WHERE a websiteUrl is provided, THE Profile_Service SHALL validate that the value conforms to a valid URL format; IF the value does not conform, THEN THE Profile_Service SHALL return a 400 status with a descriptive error message.
7. THE Profile_Service SHALL compute pitchComplete on every save: WHEN all required fields are present and valid, THE Profile_Service SHALL set pitchComplete to `true`; WHEN any required field is absent or invalid, THE Profile_Service SHALL set pitchComplete to `false`.
8. WHEN a profile is successfully saved, THE Profile_Service SHALL return the full ProviderProfile document, including the computed pitchComplete value, with a 201 status if a new ProviderProfile was created or a 200 status if an existing ProviderProfile was updated.

---

### Requirement A2: Provider Reads Own Profile

**User Story:** As a Provider_User, I want to fetch my own profile, so that I can review my current information and understand whether my pitch is considered complete.

#### Acceptance Criteria

1. WHEN an authenticated Provider_User requests their own profile and a ProviderProfile exists for that provider, THE Profile_Service SHALL return the full ProviderProfile document including the pitchComplete value.
2. WHEN an authenticated Provider_User requests their own profile and no ProviderProfile exists for that provider, THE Profile_Service SHALL return a 404 status with a message indicating that no profile has been created yet.
3. IF an unauthenticated user requests a provider's own-profile endpoint, THEN THE Profile_Service SHALL return a 401 status with a descriptive error message.

---

### Requirement A3: Provider Updates Own Profile

**User Story:** As a Provider_User, I want to update any subset of my profile fields, so that my capability pitch stays accurate as my business evolves.

#### Acceptance Criteria

1. WHEN an authenticated Provider_User submits a partial or full set of profile fields for update, THE Profile_Service SHALL apply only the supplied fields to the existing ProviderProfile document.
2. THE Profile_Service SHALL apply the same field validation rules on update as on creation; IF any supplied field fails its validation rule, THEN THE Profile_Service SHALL return a 400 status with a descriptive error message. Validation applies only to the subset of fields included in the update payload; fields not included retain their existing values and are not re-validated.
3. THE Profile_Service SHALL recompute pitchComplete after every update and persist the new value on the ProviderProfile document.
4. IF an authenticated Provider_User attempts to update a profile that does not yet exist, THEN THE Profile_Service SHALL return a 404 status with a descriptive error message.
5. IF a user whose role is not "provider" attempts to update a provider profile, THEN THE Profile_Service SHALL return a 403 status with a descriptive error message.

---

### Requirement A4: Any Authenticated User Reads a Provider's Public Profile

**User Story:** As an authenticated user (client or provider), I want to view any provider's public profile by their user ID, so that I can evaluate their capabilities and decide whether to invite them to bid or compare them to other providers.

#### Acceptance Criteria

1. WHEN an authenticated user requests a provider's public profile by the provider's user ID and a ProviderProfile exists for that provider, THE Profile_Service SHALL return the ProviderProfile fields together with the provider's name and company sourced from the Provider_User record.
2. WHEN an authenticated user requests a provider's public profile and no ProviderProfile exists for the specified provider, THE Profile_Service SHALL return a 404 status with a descriptive error message.
3. IF an unauthenticated user requests a provider's public profile, THEN THE Profile_Service SHALL return a 401 status with a descriptive error message.

---

### Requirement B5: Client Posts a Requirement

**User Story:** As a Client_User, I want to post a new requirement describing work I need done, so that providers can discover it and submit bids.

#### Acceptance Criteria

1. THE Requirement_Service SHALL permit only authenticated users whose role is "client" to post a requirement; IF a user with any other role attempts to post, THEN THE Requirement_Service SHALL return a 403 status with a descriptive error message.
2. THE Requirement_Service SHALL require the following fields to be present and valid on every new requirement: a title between 10 and 200 characters inclusive; a category that is exactly one value from ServiceCategory; a description of at least 50 characters; a budgetMin value of at least 0; a budgetMax value greater than or equal to budgetMin; a timeline between 5 and 100 characters inclusive.
3. IF any required field is absent or fails its validation rule, THEN THE Requirement_Service SHALL return a 400 status with a descriptive error message identifying which field(s) are invalid.
4. WHEN a new requirement is created, THE Requirement_Service SHALL set the status to "open" regardless of any status value provided by the client in the request payload.
5. WHEN a requirement is successfully created, THE Requirement_Service SHALL return the full Requirement document with a 201 status.

---

### Requirement B6: Client Lists Own Requirements

**User Story:** As a Client_User, I want to see a list of all the requirements I have posted, so that I can monitor their status and manage them over time.

#### Acceptance Criteria

1. WHEN an authenticated Client_User requests their own requirements list, THE Requirement_Service SHALL return all Requirement documents owned by that client and no documents owned by other clients.
2. THE Requirement_Service SHALL return the results ordered by creation date descending, with the most recently created requirement appearing first.
3. THE Requirement_Service SHALL include a Bid_Count_Stub field on each Requirement in the list response; its value SHALL be 0 in the current scope.
4. IF an unauthenticated user requests the requirements list endpoint, THEN THE Requirement_Service SHALL return a 401 status with a descriptive error message.

---

### Requirement B7: Any Authenticated User Fetches a Single Requirement

**User Story:** As an authenticated user, I want to fetch any single requirement by its ID, so that I can view its full details regardless of whether I am the posting client or a provider evaluating whether to bid.

#### Acceptance Criteria

1. WHEN an authenticated user requests a requirement by its ID and the Requirement document exists, THE Requirement_Service SHALL return the full Requirement document together with the posting client's name and company sourced from the Client_User record.
2. WHEN an authenticated user requests a requirement by its ID and no matching Requirement document exists, THE Requirement_Service SHALL return a 404 status with a descriptive error message.
3. IF an unauthenticated user requests a requirement by its ID, THEN THE Requirement_Service SHALL return a 401 status with a descriptive error message.

---

### Requirement B8: Client Updates an Open Requirement

**User Story:** As a Client_User, I want to edit the details of a requirement I have posted while it is still open, so that I can refine the scope, adjust the budget, or correct mistakes before providers submit bids.

#### Acceptance Criteria

1. THE Requirement_Service SHALL permit only the authenticated Client_User who owns the Requirement to update it; IF a different authenticated user attempts to update the Requirement, THEN THE Requirement_Service SHALL return a 403 status with a descriptive error message.
2. THE Requirement_Service SHALL only permit updates while the Requirement's status is "open"; IF the Requirement's status is not "open", THEN THE Requirement_Service SHALL return a 409 status with a descriptive error message.
3. THE Requirement_Service SHALL permit updates to the following fields only: title, category, description, budgetMin, budgetMax, and timeline; the status field SHALL NOT be updatable through this endpoint.
4. THE Requirement_Service SHALL apply the same field validation rules on update as on creation; IF any supplied field fails its validation rule, THEN THE Requirement_Service SHALL return a 400 status with a descriptive error message.
5. IF a Requirement with the specified ID does not exist, THEN THE Requirement_Service SHALL return a 404 status with a descriptive error message.
6. WHEN a requirement is successfully updated, THE Requirement_Service SHALL return the full updated Requirement document.

---

### Requirement B9: Client Closes a Requirement

**User Story:** As a Client_User, I want to close a requirement I have posted, so that I can formally cancel it and prevent further bids when it is no longer needed.

#### Acceptance Criteria

1. THE Requirement_Service SHALL permit only the authenticated Client_User who owns the Requirement to close it; IF a different authenticated user attempts to close the Requirement, THEN THE Requirement_Service SHALL return a 403 status with a descriptive error message.
2. WHEN an authenticated owning Client_User closes a Requirement whose status is "open", THE Requirement_Service SHALL set the Requirement's status to "closed".
3. IF the Requirement's status is already "closed" or "sealed" at the time of the close request, THEN THE Requirement_Service SHALL return a 409 status with a descriptive error message.
4. IF a Requirement with the specified ID does not exist, THEN THE Requirement_Service SHALL return a 404 status with a descriptive error message.
5. WHEN a requirement is successfully closed, THE Requirement_Service SHALL return the full updated Requirement document with status "closed".
6. WHILE a Requirement's status is "closed", THE Requirement_Service SHALL reject any further update or close requests for that Requirement with a 409 status.

---

### Requirement F10: Provider Profile Setup Page

**User Story:** As a Provider_User, I want a dedicated profile setup page in the application, so that I can create or update my capability pitch and see at a glance whether my profile is considered complete.

#### Acceptance Criteria

1. THE Auth_Guard SHALL permit only authenticated Provider_Users to access the provider profile setup page; WHEN an unauthenticated user or a non-provider user attempts to access the page, THE Auth_Guard SHALL redirect the user to the appropriate route.
2. WHEN an authenticated Provider_User loads the profile setup page and a ProviderProfile exists, THE Profile_Page SHALL pre-populate all form fields with the current profile values.
3. WHEN an authenticated Provider_User loads the profile setup page and no ProviderProfile exists, THE Profile_Page SHALL display an empty form ready for initial input.
4. WHEN a Provider_User submits the profile form, THE Profile_Page SHALL call the profile create/upsert endpoint and display any validation errors returned by the server inline with the relevant form fields.
5. WHEN a profile is successfully saved, THE Profile_Page SHALL display the current pitchComplete status visually so the provider can see whether their profile meets the completeness threshold.

---

### Requirement F11: Client Post Requirement Page

**User Story:** As a Client_User, I want a page where I can fill in and submit a new requirement, so that I can quickly post work I need done without navigating away from a clear, focused form.

#### Acceptance Criteria

1. THE Auth_Guard SHALL permit only authenticated Client_Users to access the post requirement page; WHEN an unauthenticated user or a non-client user attempts to access the page, THE Auth_Guard SHALL redirect the user to the appropriate route.
2. WHEN a Client_User submits the requirement form with valid data, THE Post_Requirement_Page SHALL call the post-requirement endpoint and, upon a successful response, redirect the user to the "my requirements" list page.
3. WHEN the post-requirement endpoint returns validation errors, THE Post_Requirement_Page SHALL display those errors inline with the relevant form fields without navigating away.

---

### Requirement F12: Client My Requirements List Page

**User Story:** As a Client_User, I want a page listing all my posted requirements, so that I can monitor their statuses and navigate to individual requirements to manage them.

#### Acceptance Criteria

1. THE Auth_Guard SHALL permit only authenticated Client_Users to access the my requirements list page; WHEN an unauthenticated user or a non-client user attempts to access the page, THE Auth_Guard SHALL redirect the user to the appropriate route.
2. WHEN an authenticated Client_User loads the my requirements list page, THE Requirements_List_Page SHALL fetch and display all of the client's own Requirement documents.
3. THE Requirements_List_Page SHALL display a status badge on each requirement row showing its current status.
4. THE Requirements_List_Page SHALL display the Bid_Count_Stub on each requirement row.
5. WHEN a Client_User selects a requirement row, THE Requirements_List_Page SHALL navigate to the requirement detail page for that requirement.

---

### Requirement F13: Client Requirement Detail and Edit Page

**User Story:** As a Client_User, I want a detail page for each of my requirements where I can view the full content, edit the updatable fields while it is open, and close the requirement when I no longer need it.

#### Acceptance Criteria

1. THE Auth_Guard SHALL permit only authenticated Client_Users to access the requirement detail/edit page; WHEN an unauthenticated user or a non-client user attempts to access the page, THE Auth_Guard SHALL redirect the user to the appropriate route. Ownership enforcement is applied by the server per B8 and B9 and surfaced to the user via error messaging on the page.
2. WHEN an authenticated owning Client_User loads the requirement detail page, THE Requirement_Detail_Page SHALL display all fields of the Requirement document.
3. WHILE a Requirement's status is "open", THE Requirement_Detail_Page SHALL allow the Client_User to edit the updatable fields (title, category, description, budgetMin, budgetMax, and timeline) inline and submit changes to the update endpoint.
4. WHEN the update endpoint returns validation errors, THE Requirement_Detail_Page SHALL display those errors inline with the relevant fields without discarding the user's edits.
5. THE Requirement_Detail_Page SHALL provide a "Close requirement" action; WHEN a Client_User activates this action, THE Requirement_Detail_Page SHALL present a confirmation step before calling the close endpoint.
6. WHEN the close endpoint returns successfully, THE Requirement_Detail_Page SHALL update the displayed status to "closed" and disable any further editing or closing actions.
