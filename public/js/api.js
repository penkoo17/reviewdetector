const API_BASE =
  window.location.protocol === 'file:' || window.location.port === '5500'
    ? 'http://localhost:3000'
    : '';

async function requestJson(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Terjadi kesalahan (HTTP ${response.status})`);
  }
  return data;
}

export const apiClient = {
  getHealth() {
    return requestJson('/api/health');
  },

  analyzeProduct(payload) {
    return requestJson('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getReportsHistory() {
    return requestJson('/api/reports');
  },

  getReportById(id) {
    return requestJson(`/api/reports/${encodeURIComponent(id)}`);
  },

  deleteReportById(id) {
    return requestJson(`/api/reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getExportCsvUrl(id) {
    return `${API_BASE}/api/reports/${encodeURIComponent(id)}/export-csv`;
  },
};
