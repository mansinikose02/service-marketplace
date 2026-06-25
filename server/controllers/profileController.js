'use strict';

const ProviderProfile = require('../models/ProviderProfile');
const { computePitchComplete, VALID_CATEGORIES } = require('../utils/pitchComplete');

const WEBSITE_URL_REGEX = /^https?:\/\/.+\..+/;

// ─── Shared field validator ───────────────────────────────────────────────────

/**
 * Validates a single profile field value against its rule.
 * Returns an error message string if invalid, or null if valid.
 */
function validateProfileField(fieldName, value) {
  switch (fieldName) {
    case 'pitch':
      if (typeof value !== 'string' || value.length < 100) {
        return 'Pitch must be a string of at least 100 characters';
      }
      break;
    case 'categories':
      if (
        !Array.isArray(value) ||
        value.length < 1 ||
        value.length > 5 ||
        !value.every((cat) => VALID_CATEGORIES.includes(cat))
      ) {
        return 'categories must be an array of 1–5 valid ServiceCategory values';
      }
      break;
    case 'capacity':
      if (!Number.isInteger(value) || value < 1 || value > 20) {
        return 'capacity must be a whole number between 1 and 20 inclusive';
      }
      break;
    case 'teamSize':
      if (!Number.isInteger(value) || value < 1) {
        return 'teamSize must be a whole number of at least 1';
      }
      break;
    case 'typicalBudgetMin':
      if (typeof value !== 'number' || value < 0) {
        return 'typicalBudgetMin must be a number of at least 0';
      }
      break;
    case 'typicalBudgetMax':
      if (typeof value !== 'number' || value < 0) {
        return 'typicalBudgetMax must be a number of at least 0';
      }
      break;
    case 'websiteUrl':
      if (value !== '' && !WEBSITE_URL_REGEX.test(value)) {
        return 'websiteUrl must be a valid URL starting with http:// or https://';
      }
      break;
    default:
      break;
  }
  return null;
}

// ─── Task 5: upsertProfile ────────────────────────────────────────────────────

async function upsertProfile(req, res, next) {
  try {
    const { pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax, websiteUrl } = req.body;

    // Step 1–2: validate all required fields are present
    const requiredFields = { pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax };
    const missingFields = Object.entries(requiredFields)
      .filter(([, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Steps 3–8: validate each required field individually
    for (const [fieldName, value] of Object.entries(requiredFields)) {
      const error = validateProfileField(fieldName, value);
      if (error) return res.status(400).json({ message: error });
    }

    // Step 8: cross-field budget validation
    if (typicalBudgetMax < typicalBudgetMin) {
      return res.status(400).json({ message: 'typicalBudgetMax must be greater than or equal to typicalBudgetMin' });
    }

    // Step 9: optional websiteUrl validation
    if (websiteUrl !== undefined && websiteUrl !== '') {
      const urlError = validateProfileField('websiteUrl', websiteUrl);
      if (urlError) return res.status(400).json({ message: urlError });
    }

    // Step 10: compute pitchComplete (always true at this point — all required fields passed)
    const pitchComplete = computePitchComplete({ pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax });

    // Step 11: check whether a profile already exists to determine response status
    const existingProfile = await ProviderProfile.findOne({ userId: req.user.id });
    const isNew = !existingProfile;

    // Step 12: build update payload
    const updatePayload = { pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax, pitchComplete };
    if (websiteUrl !== undefined) updatePayload.websiteUrl = websiteUrl;

    // Step 13–14: atomic upsert — unique index on userId prevents duplicate documents
    let savedProfile;
    try {
      savedProfile = await ProviderProfile.findOneAndUpdate(
        { userId: req.user.id },
        { $set: updatePayload },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    } catch (upsertError) {
      // A concurrent request created the profile between our findOne and the upsert
      if (upsertError.code === 11000) {
        savedProfile = await ProviderProfile.findOne({ userId: req.user.id });
        return res.status(200).json(savedProfile);
      }
      throw upsertError;
    }

    // Step 15: 201 if new profile created, 200 if existing profile updated
    return res.status(isNew ? 201 : 200).json(savedProfile);
  } catch (error) {
    next(error);
  }
}

// ─── Task 6: getOwnProfile ────────────────────────────────────────────────────

async function getOwnProfile(req, res, next) {
  try {
    const profile = await ProviderProfile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({ message: 'No profile found. Create your profile to get started.' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
}

// ─── Task 7: updateProfile ────────────────────────────────────────────────────

async function updateProfile(req, res, next) {
  try {
    const allowedFields = ['pitch', 'categories', 'capacity', 'teamSize', 'typicalBudgetMin', 'typicalBudgetMax', 'websiteUrl'];

    // Step 1: extract only fields present in req.body from the allowed set
    const suppliedFields = {};
    for (const fieldName of allowedFields) {
      if (req.body[fieldName] !== undefined) {
        suppliedFields[fieldName] = req.body[fieldName];
      }
    }

    // Step 2: validate each supplied field individually (excluding cross-field budget check)
    for (const [fieldName, value] of Object.entries(suppliedFields)) {
      if (fieldName === 'typicalBudgetMax') continue; // cross-field check comes after fetching stored doc
      const error = validateProfileField(fieldName, value);
      if (error) return res.status(400).json({ message: error });
    }
    // Validate typicalBudgetMax value in isolation (≥ 0), excluding cross-field check
    if (suppliedFields.typicalBudgetMax !== undefined) {
      if (typeof suppliedFields.typicalBudgetMax !== 'number' || suppliedFields.typicalBudgetMax < 0) {
        return res.status(400).json({ message: 'typicalBudgetMax must be a number of at least 0' });
      }
    }

    // Step 3: fetch existing profile — MUST come before cross-field check
    const existingProfile = await ProviderProfile.findOne({ userId: req.user.id });
    if (!existingProfile) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    // Step 4: cross-field budget validation using stored counterpart when only one value is supplied
    const incomingMin = suppliedFields.typicalBudgetMin;
    const incomingMax = suppliedFields.typicalBudgetMax;
    const storedMin = existingProfile.typicalBudgetMin;
    const storedMax = existingProfile.typicalBudgetMax;

    if (incomingMin !== undefined && incomingMax !== undefined) {
      if (incomingMax < incomingMin) {
        return res.status(400).json({ message: 'typicalBudgetMax must be greater than or equal to typicalBudgetMin' });
      }
    } else if (incomingMin !== undefined) {
      if (incomingMin > storedMax) {
        return res.status(400).json({ message: 'typicalBudgetMin cannot exceed the existing typicalBudgetMax' });
      }
    } else if (incomingMax !== undefined) {
      if (incomingMax < storedMin) {
        return res.status(400).json({ message: 'typicalBudgetMax must be greater than or equal to the existing typicalBudgetMin' });
      }
    }

    // Step 5: build $set object from validated supplied fields only
    const updateObject = { ...suppliedFields };

    // Step 6: compute pitchComplete against the merged state
    const mergedProfile = { ...existingProfile.toObject(), ...suppliedFields };
    const pitchComplete = computePitchComplete(mergedProfile);

    // Step 7: add pitchComplete to the update object
    updateObject.pitchComplete = pitchComplete;

    // Step 8: apply the update
    const updatedProfile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updateObject },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedProfile);
  } catch (error) {
    next(error);
  }
}

// ─── Task 8: getPublicProfile ─────────────────────────────────────────────────

async function getPublicProfile(req, res, next) {
  try {
    const profile = await ProviderProfile.findOne({ userId: req.params.userId })
      .populate('userId', 'name company');

    if (!profile) {
      return res.status(404).json({ message: 'Provider profile not found.' });
    }

    // Call .toObject() before spreading to ensure a plain object (avoids Mongoose getter issues)
    const plainProfile = profile.toObject();
    const { name, company } = plainProfile.userId;

    const responseBody = {
      ...plainProfile,
      name,
      company,
      userId: plainProfile.userId._id,
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
}

module.exports = { upsertProfile, getOwnProfile, updateProfile, getPublicProfile };
