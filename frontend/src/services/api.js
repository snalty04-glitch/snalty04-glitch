// API Base URL - Change this to your server's URL for production/mobile
const getApiBase = () => {
  // When running as a Capacitor native app, use the full server URL
  if (window.Capacitor?.isNativePlatform()) {
    return 'https://YOUR-SERVER-URL.com/api'; // Replace with your deployed backend URL
  }
  // For web development (Vite proxy handles it)
  return '/api';
};

const getSocketUrl = () => {
  if (window.Capacitor?.isNativePlatform()) {
    return 'https://YOUR-SERVER-URL.com'; // Replace with your deployed backend URL
  }
  return window.location.origin;
};

const API_BASE = getApiBase();
export { getSocketUrl };

const api = {
  async request(method, path, data = null) {
    const token = localStorage.getItem('token');
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${path}`, config);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Request failed');
    }

    return { data: responseData };
  },

  get(path) {
    return this.request('GET', path);
  },

  post(path, data) {
    return this.request('POST', path, data);
  },

  put(path, data) {
    return this.request('PUT', path, data);
  },

  delete(path) {
    return this.request('DELETE', path);
  },

  async upload(path, formData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'Upload failed');
    }
    return { data: responseData };
  }
};

export default api;
