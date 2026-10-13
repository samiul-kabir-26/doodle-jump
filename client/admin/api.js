export const adminApi = {
  async request(path, options = {}) {
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      (options.method || 'GET').toUpperCase()
    );

    const headers = {
      ...(options.headers || {})
    };

    if (isMutating) {
      headers['X-Requested-With'] = 'dj-admin';
    }

    if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(`/api/v1/admin${path}`, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
      throw new Error('Unauthenticated');
    }

    if (res.status === 204) {
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || `Request failed with ${res.status}`);
    }

    return data;
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },

  put(path, body) {
    return this.request(path, { method: 'PUT', body });
  },

  patch(path, body) {
    return this.request(path, { method: 'PATCH', body });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },

  uploadAsset(file, slot = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (slot) formData.append('slot', slot);

    return this.request('/assets', {
      method: 'POST',
      body: formData
    });
  }
};
