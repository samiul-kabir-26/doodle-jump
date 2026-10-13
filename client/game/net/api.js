export const api = {
  baseUrl: '',

  async fetchConfig(previewDraft = false) {
    const url = previewDraft ? '/api/v1/config?preview=draft' : '/api/v1/config';
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Config fetch failed with ${res.status}`);
    }
    return res.json();
  },

  async identify({ launchToken = null, nickname = null, deviceId = null }) {
    const res = await fetch('/api/v1/players/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ launchToken, nickname, deviceId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Player identification failed');
    }
    return data;
  },

  async startSession(playerToken, clientInfo = null) {
    const res = await fetch('/api/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`
      },
      body: JSON.stringify({ client: clientInfo })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to start session');
    }
    return data;
  },

  async postSessionEvents(sessionId, playerToken, events) {
    const res = await fetch(`/api/v1/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`
      },
      body: JSON.stringify({ events })
    });
    return res.json();
  },

  async endSession(sessionId, playerToken, endPayload) {
    const res = await fetch(`/api/v1/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`
      },
      body: JSON.stringify(endPayload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to end session');
    }
    return data;
  },

  async fetchLeaderboard({ period = 'all', limit = 50, offset = 0 } = {}) {
    const res = await fetch(`/api/v1/leaderboard?period=${period}&limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  async fetchMeLeaderboard(period, playerToken) {
    const res = await fetch(`/api/v1/leaderboard/me?period=${period}`, {
      headers: {
        Authorization: `Bearer ${playerToken}`
      }
    });
    if (!res.ok) return null;
    return res.json();
  }
};
