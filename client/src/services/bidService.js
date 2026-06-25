import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function submitBid(requirementId, payload, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/bids/${requirementId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getBidsForRequirement(requirementId, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/bids/${requirementId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getMyBids(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/bids/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { submitBid, getBidsForRequirement, getMyBids };
