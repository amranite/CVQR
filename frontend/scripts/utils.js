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

  function parseJwt(token) {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(normalized));
    } catch (error) {
      return null;
    }
  }

  function getRole() {
    const storedRole = localStorage.getItem('cvqr_role');

    if (storedRole) {
      return storedRole;
    }

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

  function clearSession() {
    localStorage.removeItem('cvqr_token');
    localStorage.removeItem('cvqr_role');
    localStorage.removeItem('cvqr_last_scan');
  }

  function authHeaders(extraHeaders) {
    const headers = Object.assign({}, extraHeaders || {});
    const token = getToken();

    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    return headers;
  }

  async function request(path, options) {
    const response = await fetch(apiBase() + path, options || {});
    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      throw new Error((data && (data.message || data.error)) || 'Request failed');
    }

    return data;
  }

  function showMessage(element, message, type) {
    if (!element) {
      return;
    }

    if (!message) {
      element.textContent = '';
      element.className = 'message hidden';
      return;
    }

    element.textContent = message;
    element.className = 'message ' + (type || 'error');
  }

  function requireRole(expectedRole, redirectPage) {
    const token = getToken();
    const role = getRole();

    if (!token || !role || (expectedRole && role !== expectedRole)) {
      window.location.href = redirectPage || '/login/';
      return false;
    }

    return true;
  }

  function redirectByRole(role) {
    if (role === 'student') {
      window.location.href = '/student/';
      return;
    }

    if (role === 'company') {
      window.location.href = '/company/';
      return;
    }

    if (role === 'admin') {
      window.location.href = '/admin/';
      return;
    }

    window.location.href = '/login/';
  }

  function formatDateTime(value) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatDate(value) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function extractToken(value) {
    const trimmed = (value || '').trim();

    if (!trimmed) {
      return '';
    }

    if (trimmed.includes('/qr/')) {
      return trimmed.split('/qr/')[1].split(/[?#]/)[0];
    }

    return trimmed;
  }

  function setLastScan(data) {
    localStorage.setItem('cvqr_last_scan', JSON.stringify(data));
  }

  function getLastScan() {
    try {
      return JSON.parse(localStorage.getItem('cvqr_last_scan') || 'null');
    } catch (error) {
      return null;
    }
  }

  function openPdfPath(relativePath) {
    return apiBase() + relativePath;
  }

  async function getAuthenticatedFileUrl(relativePath) {
    const response = await fetch(apiBase() + relativePath, {
      headers: authHeaders()
    });

    if (!response.ok) {
      let message = 'File could not be opened';

      try {
        const data = await response.json();
        message = data.message || data.error || message;
      } catch (error) {
      }

      throw new Error(message);
    }

    return URL.createObjectURL(await response.blob());
  }

  async function openAuthenticatedFile(relativePath) {
    const objectUrl = await getAuthenticatedFileUrl(relativePath);
    window.open(objectUrl, '_blank', 'noopener');

    window.setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
    }, 60000);
  }

  window.CVQR = {
    apiBase,
    getToken,
    setToken,
    parseJwt,
    getRole,
    setRole,
    clearSession,
    authHeaders,
    request,
    showMessage,
    requireRole,
    redirectByRole,
    formatDateTime,
    formatDate,
    extractToken,
    setLastScan,
    getLastScan,
    openPdfPath,
    getAuthenticatedFileUrl,
    openAuthenticatedFile
  };
})();
