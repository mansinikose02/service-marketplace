import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function generateRequirement(roughIdea, token) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/generate-requirement`,
      { roughIdea },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function matchProviders(requirementId, token) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/match-providers`,
      { requirementId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function analyseBids(requirementId, token) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/analyse-bids`,
      { requirementId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function reviewProposal(payload, token) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/review-proposal`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { generateRequirement, matchProviders, analyseBids, reviewProposal };
