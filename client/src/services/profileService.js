import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function upsertProfile(payload, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/profiles/me`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getOwnProfile(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function updateProfile(payload, token) {
  try {
    const response = await axios.patch(`${BASE_URL}/api/profiles/me`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getPublicProfile(userId, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/profiles/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { upsertProfile, getOwnProfile, updateProfile, getPublicProfile };
