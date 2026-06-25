import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function postUpdate(dealId, content, token) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/updates/${dealId}`,
      { content },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getUpdates(dealId, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/updates/${dealId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { postUpdate, getUpdates };
