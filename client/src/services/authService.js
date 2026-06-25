import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function register(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function login(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getMe(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { register, login, getMe };
