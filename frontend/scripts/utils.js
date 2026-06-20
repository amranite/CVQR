(function () {
  const DISMISSABLE_MESSAGE_TYPES = new Set(['success', 'info']);
  const MESSAGE_DISMISS_DELAY = 10000;
  const MESSAGE_FADE_DELAY = 180;
  const MESSAGE_STATE_CLASSES = new Set(['hidden', 'error', 'success', 'info', 'is-hiding', 'is-dismissable']);

  function apiBase() {
    return (window.CVQR_CONFIG && window.CVQR_CONFIG.API_BASE_URL) || 'http://localhost:3000';
  }

  function apiUrl(path) {
    const base = apiBase().replace(/\/$/, '');
    return base.endsWith('/api') ? base + path : base + '/api' + path;
  }

  function bindRefreshCurrentLinks() {
    document.querySelectorAll('[data-refresh-current]').forEach(function (link) {
      link.href = window.location.href;
      link.addEventListener('click', function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }

        event.preventDefault();
        window.location.reload();
      });
    });
  }

  function bindHeaderMenus() {
    document.querySelectorAll('.header-actions').forEach(function (nav, index) {
      const headerInner = nav.closest('.header-inner');

      if (!headerInner || nav.dataset.menuBound === 'true') {
        return;
      }

      const button = document.createElement('button');
      const menuId = nav.id || 'header-actions-' + index;

      nav.id = menuId;
      nav.dataset.menuBound = 'true';
      nav.classList.add('is-collapsible');

      button.type = 'button';
      button.className = 'header-menu-toggle';
      button.setAttribute('aria-controls', menuId);
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span class="visually-hidden">Toggle navigation</span>';

      button.addEventListener('click', function () {
        const isOpen = nav.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(isOpen));
      });

      nav.addEventListener('click', function (event) {
        if (event.target.closest('a')) {
          nav.classList.remove('is-open');
          button.setAttribute('aria-expanded', 'false');
        }
      });

      headerInner.insertBefore(button, nav);
    });
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
    const response = await fetch(apiUrl(path), options || {});
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

  function getMessageBaseClass(element) {
    if (!element.dataset.messageBaseClass) {
      const baseClasses = Array.from(element.classList).filter(function (className) {
        return !MESSAGE_STATE_CLASSES.has(className);
      });

      if (!baseClasses.includes('message')) {
        baseClasses.unshift('message');
      }

      element.dataset.messageBaseClass = baseClasses.join(' ');
    }

    return element.dataset.messageBaseClass || 'message';
  }

  function clearMessageTimers(element) {
    if (element.cvqrMessageTimer) {
      window.clearTimeout(element.cvqrMessageTimer);
      element.cvqrMessageTimer = null;
    }

    if (element.cvqrMessageFadeTimer) {
      window.clearTimeout(element.cvqrMessageFadeTimer);
      element.cvqrMessageFadeTimer = null;
    }
  }

  function resetMessageClass(element, type, hidden) {
    element.className = getMessageBaseClass(element);

    if (hidden) {
      element.classList.add('hidden');
      return;
    }

    element.classList.add(type || 'error');
  }

  function showMessage(element, message, type) {
    if (!element) {
      return;
    }

    clearMessageTimers(element);
    element.style.removeProperty('--message-duration');

    if (!message) {
      element.textContent = '';
      resetMessageClass(element, type, true);
      return;
    }

    const resolvedType = type || 'error';
    const shouldDismiss = DISMISSABLE_MESSAGE_TYPES.has(resolvedType);
    const text = document.createElement('span');

    text.className = 'message-text';
    text.textContent = message;

    element.textContent = '';
    resetMessageClass(element, resolvedType, false);
    element.appendChild(text);

    if (!shouldDismiss) {
      return;
    }

    const timer = document.createElement('span');
    timer.className = 'message-timer';
    timer.setAttribute('aria-hidden', 'true');

    element.classList.add('is-dismissable');
    element.style.setProperty('--message-duration', MESSAGE_DISMISS_DELAY + 'ms');
    element.appendChild(timer);

    element.cvqrMessageTimer = window.setTimeout(function () {
      element.classList.add('is-hiding');
      element.cvqrMessageFadeTimer = window.setTimeout(function () {
        showMessage(element, '', resolvedType);
      }, MESSAGE_FADE_DELAY);
    }, MESSAGE_DISMISS_DELAY);
  }

  function ensureRefreshControl(button) {
    if (!button.parentNode) {
      return null;
    }

    if (button.parentElement && button.parentElement.classList.contains('refresh-control')) {
      return button.parentElement;
    }

    const control = document.createElement('span');
    control.className = 'refresh-control';
    button.parentNode.insertBefore(control, button);
    control.appendChild(button);
    return control;
  }

  function markRefreshed(button, refreshedAt) {
    if (!button) {
      return;
    }

    const control = ensureRefreshControl(button);

    if (!control) {
      return;
    }

    let feedback = control.querySelector('.refresh-feedback');

    if (!feedback || !feedback.isConnected) {
      feedback = document.createElement('span');
      feedback.className = 'refresh-feedback';
      feedback.setAttribute('aria-live', 'polite');
      control.appendChild(feedback);
    }

    feedback.textContent = 'Last refresh: ' + new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(refreshedAt || new Date());
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

    if (trimmed.includes('/api/qr/')) {
      return trimmed.split('/api/qr/')[1].split(/[?#]/)[0];
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
    return apiUrl(relativePath);
  }

  async function getAuthenticatedFileUrl(relativePath) {
    const response = await fetch(apiUrl(relativePath), {
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

  let confirmDialog = null;

  function ensureConfirmDialog() {
    if (confirmDialog) {
      return confirmDialog;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop hidden';

    const dialog = document.createElement('section');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirmDialogTitle');

    const title = document.createElement('h2');
    title.id = 'confirmDialogTitle';

    const message = document.createElement('p');
    message.className = 'section-text';

    const actions = document.createElement('div');
    actions.className = 'button-row confirm-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button button-secondary';

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';

    actions.append(cancelButton, confirmButton);
    dialog.append(title, message, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    confirmDialog = {
      backdrop,
      title,
      message,
      cancelButton,
      confirmButton,
      resolver: null,
      previousFocus: null,
      keyHandler: null
    };

    return confirmDialog;
  }

  function closeConfirmDialog(result) {
    const dialog = ensureConfirmDialog();

    dialog.backdrop.classList.add('hidden');

    if (dialog.keyHandler) {
      document.removeEventListener('keydown', dialog.keyHandler);
    }

    if (dialog.resolver) {
      dialog.resolver(result);
    }

    dialog.resolver = null;
    dialog.keyHandler = null;

    if (dialog.previousFocus && typeof dialog.previousFocus.focus === 'function') {
      dialog.previousFocus.focus();
    }
  }

  function confirmAction(options) {
    const dialog = ensureConfirmDialog();
    const settings = options || {};

    if (dialog.resolver) {
      closeConfirmDialog(false);
    }

    dialog.title.textContent = settings.title || 'Confirm action';
    dialog.message.textContent = settings.message || 'Do you want to continue?';
    dialog.cancelButton.textContent = settings.cancelLabel || 'Cancel';
    dialog.confirmButton.textContent = settings.confirmLabel || 'Confirm';
    dialog.confirmButton.className = settings.variant === 'danger' ? 'button button-danger' : 'button';
    dialog.previousFocus = document.activeElement;

    return new Promise(function (resolve) {
      dialog.resolver = resolve;

      dialog.keyHandler = function (event) {
        if (event.key === 'Escape') {
          closeConfirmDialog(false);
        }
      };

      dialog.cancelButton.onclick = function () {
        closeConfirmDialog(false);
      };

      dialog.confirmButton.onclick = function () {
        closeConfirmDialog(true);
      };

      dialog.backdrop.onclick = function (event) {
        if (event.target === dialog.backdrop) {
          closeConfirmDialog(false);
        }
      };

      document.addEventListener('keydown', dialog.keyHandler);
      dialog.backdrop.classList.remove('hidden');
      dialog.cancelButton.focus();
    });
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
    markRefreshed,
    requireRole,
    redirectByRole,
    formatDateTime,
    formatDate,
    apiUrl,
    extractToken,
    setLastScan,
    getLastScan,
    openPdfPath,
    getAuthenticatedFileUrl,
    openAuthenticatedFile,
    confirmAction
  };

  bindRefreshCurrentLinks();
  bindHeaderMenus();
})();
