const API_BASE = '/api';

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
