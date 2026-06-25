import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function extractErrorMessage(error) {
  return error.response?.data?.message || 'An unexpected error occurred';
}

async function createRequirement(payload, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/requirements`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function listOwnRequirements(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/requirements/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function getRequirement(id, token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/requirements/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function updateRequirement(id, payload, token) {
  try {
    const response = await axios.patch(`${BASE_URL}/api/requirements/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function closeRequirement(id, token) {
  try {
    const response = await axios.post(`${BASE_URL}/api/requirements/${id}/close`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

async function listOpenRequirements(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/requirements/open`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default { createRequirement, listOwnRequirements, listOpenRequirements, getRequirement, updateRequirement, closeRequirement };
