import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function submitReview(payload, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/reviews`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getProviderReviews(providerId, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/reviews/provider/${providerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { submitReview, getProviderReviews };
