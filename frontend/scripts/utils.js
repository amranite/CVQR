(function () {
  function apiBase() {
    return (window.CVQR_CONFIG && window.CVQR_CONFIG.API_BASE_URL) || 'http://localhost:3000';
  }

  function getToken() {
    return localStorage.getItem('cvqr_token') || '';
  }

  function setToken(token) {
    localStorage.setItem('cvqr_token', token);
  }

  function clearSession() {
    localStorage.removeItem('cvqr_token');
    localStorage.removeItem('cvqr_role');
    localStorage.removeItem('cvqr_last_scan');
  }

  function parseJwt(token) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch (error) {
      return null;
    }
  }

  function getRole() {
    const stored = localStorage.getItem('cvqr_role');
    if (stored) return stored;
    const token = getToken();
    const payload = parseJwt(token);
    if (payload && payload.role) {
      localStorage.setItem('cvqr_role', payload.role);
      return payload.role;
    }
    return '';
  }

  function setRole(role) {
    localStorage.setItem('cvqr_role', role);
  }

  function authHeaders(extra) {
    const headers = Object.assign({}, extra || {});
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function jsonRequest(path, options) {
    const response = await fetch(`${apiBase()}${path}`, options || {});
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      throw new Error((data && (data.error || data.message)) || 'Request failed');
    }
    return data;
  }

  function showMessage(el, message, isError) {
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
    el.classList.toggle('error-box', !!isError);
    el.classList.toggle('success-box', !isError);
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function relativeScannedAt(dateString) {
    if (!dateString) return 'Scanned recently';
    const now = new Date();
    const date = new Date(dateString);
    const sameDay = now.toDateString() === date.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const sameYesterday = yesterday.toDateString() === date.toDateString();
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
    if (sameDay) return `Scanned today · ${time}`;
    if (sameYesterday) return `Scanned yesterday · ${time}`;
    return `Scanned ${formatDate(dateString)} · ${time}`;
  }

  function requireRole(expectedRole, redirectPage) {
    const token = getToken();
    const role = getRole();
    if (!token || !role || (expectedRole && role !== expectedRole)) {
      window.location.href = redirectPage || '02-login.html';
      return false;
    }
    return true;
  }

  window.CVQR = {
    apiBase,
    getToken,
    setToken,
    clearSession,
    parseJwt,
    getRole,
    setRole,
    authHeaders,
    jsonRequest,
    showMessage,
    formatDate,
    formatDateTime,
    relativeScannedAt,
    requireRole
  };
})();
