const API_BASE = '/api';

async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Ensures HTTP-only cookie is sent
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(`${API_BASE}${url}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Stats
  getStats: () => request('/logs/stats'),

  // Devices
  getDevices: () => request('/devices'),
  createDevice: (payload) => request('/devices', { method: 'POST', body: payload }),
  updateDevice: (id, payload) => request(`/devices/${id}`, { method: 'PUT', body: payload }),
  rotateDeviceKey: (id) => request(`/devices/${id}/rotate-key`, { method: 'POST' }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: 'DELETE' }),

  // Remote Unlock
  triggerUnlock: (deviceId) => request('/unlock', { method: 'POST', body: { device_id: deviceId } }),
  getUnlockStatus: (commandId) => request(`/unlock/status/${commandId}`),

  // Users / Fingerprint mappings
  getUsers: (deviceId) => request(`/users${deviceId ? `?device_id=${deviceId}` : ''}`),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Access Logs
  getLogs: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return request(`/logs${qs ? `?${qs}` : ''}`);
  },
};
