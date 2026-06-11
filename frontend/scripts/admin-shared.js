(function () {
  function handleLogout() {
    CVQR.clearSession();
    window.location.href = '/login/';
  }

  function requireAdmin() {
    return CVQR.requireRole('admin', '/login/');
  }

  function appendMeta(container, text) {
    if (!text) {
      return;
    }

    const meta = document.createElement('p');
    meta.className = 'list-meta';
    meta.textContent = text;
    container.appendChild(meta);
  }

  function renderEmpty(container, message) {
    container.innerHTML = '';

    const state = document.createElement('div');
    state.className = 'empty-state';
    state.textContent = message;
    container.appendChild(state);
  }

  function setCount(element, count, label) {
    if (!element) {
      return;
    }

    element.textContent = count + ' ' + label + (count === 1 ? '' : 's');
  }

  function formatEventWindow(event) {
    return [
      event.location,
      CVQR.formatDateTime(event.starts_at),
      CVQR.formatDateTime(event.ends_at)
    ].filter(function (value) {
      return value && value !== '-';
    }).join(' - ');
  }

  function eventTiming(event) {
    if (!event || event.status !== 'open') {
      return 'inactive';
    }

    const now = Date.now();
    const startsAt = new Date(event.starts_at).getTime();
    const endsAt = new Date(event.ends_at).getTime();

    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      return 'inactive';
    }

    if (startsAt <= now && now <= endsAt) {
      return 'live';
    }

    if (startsAt > now) {
      return 'upcoming';
    }

    return 'past';
  }

  function statusLabel(event) {
    const timing = eventTiming(event);

    if (timing === 'live') {
      return 'Live';
    }

    if (timing === 'upcoming') {
      return 'Upcoming';
    }

    if (timing === 'past' && event.status === 'open') {
      return 'Past';
    }

    if (event.status) {
      return event.status.charAt(0).toUpperCase() + event.status.slice(1);
    }

    return 'Draft';
  }

  function statusClass(event) {
    const timing = eventTiming(event);

    if (timing === 'live') {
      return 'status-pill status-live';
    }

    if (timing === 'upcoming') {
      return 'status-pill status-upcoming';
    }

    if (event.status === 'closed') {
      return 'status-pill status-closed';
    }

    if (event.status === 'open') {
      return 'status-pill status-open';
    }

    return 'status-pill status-draft';
  }

  function createStatusPill(event) {
    const pill = document.createElement('span');
    pill.className = statusClass(event);

    if (eventTiming(event) === 'live') {
      const dot = document.createElement('span');
      dot.className = 'live-dot';
      dot.setAttribute('aria-hidden', 'true');
      pill.appendChild(dot);
    }

    const text = document.createElement('span');
    text.textContent = statusLabel(event);
    pill.appendChild(text);
    return pill;
  }

  function createIcon(className) {
    const icon = document.createElement('i');
    icon.className = className;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  function detailItem(label, value) {
    const wrapper = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');

    term.textContent = label;
    description.textContent = value || '-';
    wrapper.append(term, description);
    return wrapper;
  }

  window.CVQRAdmin = {
    handleLogout,
    requireAdmin,
    appendMeta,
    renderEmpty,
    setCount,
    formatEventWindow,
    eventTiming,
    statusLabel,
    createStatusPill,
    createIcon,
    detailItem
  };
})();
