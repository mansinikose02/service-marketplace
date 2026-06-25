'use strict';

const VALID_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Digital Marketing',
  'Content Writing',
  'Consulting',
  'Legal Services',
  'Logistics',
  'Manufacturing',
  'Other',
];

/**
 * Determines whether a provider profile has all required fields present and valid.
 * This is a pure function with no side effects — safe to call from controllers,
 * models, and tests without any setup.
 *
 * @param {Object} profile - Plain object with profile field values
 * @returns {boolean} true if all six required fields pass their rules, false otherwise
 */
function computePitchComplete(profile) {
  if (!profile) return false;

  const { pitch, categories, capacity, teamSize, typicalBudgetMin, typicalBudgetMax } = profile;

  if (!pitch || typeof pitch !== 'string' || pitch.length < 100) return false;

  if (
    !Array.isArray(categories) ||
    categories.length < 1 ||
    categories.length > 5 ||
    !categories.every((cat) => VALID_CATEGORIES.includes(cat))
  ) {
    return false;
  }

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return false;

  if (!Number.isInteger(teamSize) || teamSize < 1) return false;

  if (typeof typicalBudgetMin !== 'number' || typicalBudgetMin < 0) return false;

  if (typeof typicalBudgetMax !== 'number' || typicalBudgetMax < typicalBudgetMin) return false;

  return true;
}

module.exports = { VALID_CATEGORIES, computePitchComplete };
