import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function acceptBid(bidId, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/deals/accept/${bidId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getMyDeals(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/deals/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getDeal(id, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/deals/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function markCompleted(id, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/deals/${id}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { acceptBid, getMyDeals, getDeal, markCompleted };
