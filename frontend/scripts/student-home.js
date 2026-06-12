const studentHomeMessage = document.querySelector('#message');
const uploadForm = document.querySelector('#uploadForm');
const logoutButtonHome = document.querySelector('#logoutButton');
const refreshButton = document.querySelector('#refreshButton');
const registrationRefreshButton = document.querySelector('#registrationRefreshButton');
const openCurrentCvButton = document.querySelector('#openCurrentCvButton');
const openEventsList = document.querySelector('#openEventsList');
const participationDetails = document.querySelector('#participationDetails');
const qrPanel = document.querySelector('#qrPanel');
const registrationPanel = document.querySelector('#registrationPanel');
const companyAccessPanel = document.querySelector('#companyAccessPanel');
const companyAccessCount = document.querySelector('#companyAccessCount');
const companyAccessList = document.querySelector('#companyAccessList');
const refreshCompanyAccessButton = document.querySelector('#refreshCompanyAccessButton');
const generateQrButton = document.querySelector('#generateQrButton');
const cvGuidance = document.querySelector('#cvGuidance');

let latestCvPath = '';

function handleLogout() {
  CVQR.clearSession();
  window.location.href = '/login/';
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value || '-';
  }
}

async function requestOptional(path) {
  try {
    return await CVQR.request(path, {
      headers: CVQR.authHeaders()
    });
  } catch (error) {
    if (/not found|no cv|no open participation|no qr code/i.test(error.message)) {
      return null;
    }

    throw error;
  }
}

function renderCv(cv, participation) {
  const latestVersion = cv && cv.latest_version ? cv.latest_version : null;
  latestCvPath = latestVersion ? '/cv/version/' + latestVersion.id + '/file' : '';

  setText('#currentFileName', latestVersion ? latestVersion.original_name : '-');
  setText('#currentVersion', latestVersion ? String(latestVersion.version_number) : '-');
  setText('#currentUploadedAt', latestVersion ? CVQR.formatDateTime(latestVersion.uploaded_at) : '-');

  openCurrentCvButton.classList.toggle('hidden', !latestCvPath);

  if (!latestVersion && participation) {
    cvGuidance.textContent = 'Upload your CV to generate your event QR code.';
  } else if (!latestVersion) {
    cvGuidance.textContent = 'Upload your CV before or after registering for an open event.';
  } else if (participation) {
    cvGuidance.textContent = 'Your latest CV is ready for this event workflow.';
  } else {
    cvGuidance.textContent = 'Your CV is ready. Register for an open event to generate a QR code.';
  }
}

function renderParticipation(participation) {
  if (!participation) {
    participationDetails.className = 'empty-state hidden';
    participationDetails.textContent = '';
    return;
  }

  participationDetails.className = 'list-card';
  participationDetails.innerHTML = '';

  const title = document.createElement('h3');
  title.textContent = participation.event.name;

  const meta = document.createElement('p');
  meta.className = 'list-meta';
  meta.textContent = [
    participation.event.location,
    CVQR.formatDateTime(participation.event.starts_at),
    CVQR.formatDateTime(participation.event.ends_at)
  ].filter(function (value) {
    return value && value !== '-';
  }).join(' - ');

  const status = document.createElement('p');
  status.className = 'list-meta';
  status.textContent = participation.cv
    ? 'CV selected for this participation.'
    : latestCvPath
      ? 'Activate your QR code to link this CV to the event.'
      : 'Upload a CV to activate the QR code.';

  participationDetails.append(title, meta, status);
}

function renderQr(participation, qr) {
  const qrImage = document.querySelector('#qrImage');
  const canShowQrPanel = Boolean(participation && (qr || latestCvPath || participation.cv));

  qrPanel.classList.toggle('hidden', !canShowQrPanel);
  registrationPanel.classList.toggle('hidden', Boolean(participation));

  if (!canShowQrPanel) {
    qrImage.src = '';
    qrImage.classList.add('hidden');
    document.querySelector('#qrUrl').textContent = '-';
    return;
  }

  const hasQr = Boolean(qr && qr.qrImage);

  generateQrButton.textContent = hasQr ? 'Check QR' : 'Activate QR';
  qrImage.src = hasQr ? qr.qrImage : '';
  qrImage.classList.toggle('hidden', !hasQr);
  document.querySelector('#qrUrl').textContent = qr && qr.qrUrl ? qr.qrUrl : '-';
}

function renderOpenEvents(events, participation) {
  openEventsList.innerHTML = '';

  if (participation) {
    return;
  }

  if (!events || events.length === 0) {
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.textContent = 'No events are open for registration.';
    openEventsList.appendChild(state);
    return;
  }

  events.forEach(function (event) {
    const card = document.createElement('article');
    card.className = 'list-card';

    const title = document.createElement('h3');
    title.textContent = event.name;

    const meta = document.createElement('p');
    meta.className = 'list-meta';
    meta.textContent = [
      event.location,
      CVQR.formatDateTime(event.starts_at),
      CVQR.formatDateTime(event.ends_at)
    ].filter(function (value) {
      return value && value !== '-';
    }).join(' - ');

    const actionRow = document.createElement('div');
    actionRow.className = 'button-row';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = 'Register';
    button.dataset.eventId = event.id;
    button.dataset.eventName = event.name;

    actionRow.appendChild(button);
    card.append(title, meta, actionRow);
    openEventsList.appendChild(card);
  });
}

function setCompanyAccessCount(count) {
  companyAccessCount.textContent = count + ' result' + (count === 1 ? '' : 's');
}

function buildCompanyAccessCard(scan) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = scan.company && scan.company.name ? scan.company.name : 'Unknown company';
  content.appendChild(title);

  const email = scan.company && scan.company.email ? scan.company.email : '';
  const status = scan.is_revoked ? 'Access revoked' : 'Access active';

  if (email) {
    const emailMeta = document.createElement('p');
    emailMeta.className = 'list-meta';
    emailMeta.textContent = email;
    content.appendChild(emailMeta);
  }

  const scannedAt = document.createElement('p');
  scannedAt.className = 'list-meta';
  scannedAt.textContent = 'Scanned at ' + CVQR.formatDateTime(scan.scanned_at);
  content.appendChild(scannedAt);

  const statusMeta = document.createElement('p');
  statusMeta.className = 'list-meta';
  statusMeta.textContent = status;
  content.appendChild(statusMeta);

  if (scan.student_revoked_at) {
    const revokedAt = document.createElement('p');
    revokedAt.className = 'list-meta';
    revokedAt.textContent = 'Revoked at ' + CVQR.formatDateTime(scan.student_revoked_at);
    content.appendChild(revokedAt);
  }

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row compact-actions';

  const revokeButton = document.createElement('button');
  revokeButton.type = 'button';
  revokeButton.className = scan.is_revoked ? 'button button-secondary' : 'button button-danger';
  revokeButton.textContent = scan.is_revoked ? 'Revoked' : 'Revoke access';
  revokeButton.disabled = Boolean(scan.is_revoked);
  revokeButton.dataset.scanId = scan.id;
  revokeButton.dataset.companyName = title.textContent;

  actionRow.appendChild(revokeButton);
  card.append(content, actionRow);
  return card;
}

function renderCompanyAccess(scans, participation) {
  const canShow = Boolean(participation);
  companyAccessPanel.classList.toggle('hidden', !canShow);
  companyAccessList.innerHTML = '';

  if (!canShow) {
    setCompanyAccessCount(0);
    return;
  }

  setCompanyAccessCount(scans ? scans.length : 0);

  if (!scans || scans.length === 0) {
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.textContent = 'No company has scanned your QR code yet.';
    companyAccessList.appendChild(state);
    return;
  }

  scans.forEach(function (scan) {
    companyAccessList.appendChild(buildCompanyAccessCard(scan));
  });
}

async function loadDashboard(options) {
  const settings = options || {};

  if (!settings.preserveMessage) {
    CVQR.showMessage(studentHomeMessage, '', 'error');
  }

  try {
    const cv = await requestOptional('/cv/me');
    const participation = await requestOptional('/participations/me');
    const events = participation
      ? []
      : await CVQR.request('/events/open', {
        headers: CVQR.authHeaders()
      });
    const qr = participation ? await requestOptional('/participations/me/qr') : null;
    const scans = participation ? await requestOptional('/participations/me/scans') : [];

    renderCv(cv, participation);
    renderParticipation(participation);
    renderOpenEvents(events, participation);
    renderQr(participation, qr);
    renderCompanyAccess(scans, participation);
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

async function handleUploadSubmit(event) {
  event.preventDefault();
  CVQR.showMessage(studentHomeMessage, '', 'error');

  const formData = new FormData(uploadForm);

  try {
    await CVQR.request('/cv/upload', {
      method: 'POST',
      headers: CVQR.authHeaders(),
      body: formData
    });

    uploadForm.reset();
    await loadDashboard({ preserveMessage: true });
    CVQR.showMessage(studentHomeMessage, 'CV version uploaded.', 'success');
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

async function registerForEvent(eventId, eventName) {
  const confirmed = await CVQR.confirmAction({
    title: 'Register for event?',
    message: 'Register for "' + (eventName || 'this event') + '"? You can only have one active event registration.',
    confirmLabel: 'Register',
    variant: 'default'
  });

  if (!confirmed) {
    return;
  }

  try {
    const data = await CVQR.request('/participations', {
      method: 'POST',
      headers: CVQR.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ event_id: eventId })
    });

    await loadDashboard({ preserveMessage: true });
    CVQR.showMessage(studentHomeMessage, data.message || 'Event registration created.', 'success');
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

async function handleGenerateQr() {
  try {
    const data = await CVQR.request('/participations/me/qr', {
      method: 'POST',
      headers: CVQR.authHeaders()
    });

    await loadDashboard({ preserveMessage: true });
    CVQR.showMessage(studentHomeMessage, data.message || 'QR code is ready.', 'success');
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

async function openCurrentCv() {
  if (!latestCvPath) {
    return;
  }

  try {
    await CVQR.openAuthenticatedFile(latestCvPath);
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

async function revokeCompanyAccess(scanId, companyName) {
  const confirmed = await CVQR.confirmAction({
    title: 'Revoke company access?',
    message: 'Revoke access for ' + (companyName || 'this company') + '? Your QR code will be refreshed, and the company can only regain access if you show the new QR code.',
    confirmLabel: 'Revoke access',
    variant: 'danger'
  });

  if (!confirmed) {
    return;
  }

  try {
    const data = await CVQR.request('/participations/me/scans/' + encodeURIComponent(scanId) + '/revoke', {
      method: 'POST',
      headers: CVQR.authHeaders()
    });

    await loadDashboard({ preserveMessage: true });
    CVQR.showMessage(studentHomeMessage, data.message || 'Company access revoked.', 'success');
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('student', '/login/')) {
  loadDashboard();
  uploadForm.addEventListener('submit', handleUploadSubmit);
  logoutButtonHome.addEventListener('click', handleLogout);
  refreshButton.addEventListener('click', loadDashboard);
  registrationRefreshButton.addEventListener('click', loadDashboard);
  refreshCompanyAccessButton.addEventListener('click', loadDashboard);
  generateQrButton.addEventListener('click', handleGenerateQr);
  openCurrentCvButton.addEventListener('click', openCurrentCv);
  openEventsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-event-id]');

    if (button) {
      registerForEvent(button.dataset.eventId, button.dataset.eventName);
    }
  });
  companyAccessList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-scan-id]');

    if (button && !button.disabled) {
      revokeCompanyAccess(button.dataset.scanId, button.dataset.companyName);
    }
  });
}
