const studentHomeMessage = document.querySelector('#message');
const uploadForm = document.querySelector('#uploadForm');
const logoutButtonHome = document.querySelector('#logoutButton');
const refreshButton = document.querySelector('#refreshButton');
const openCurrentCvButton = document.querySelector('#openCurrentCvButton');
const openEventsList = document.querySelector('#openEventsList');
const participationDetails = document.querySelector('#participationDetails');
const qrPanel = document.querySelector('#qrPanel');
const generateQrButton = document.querySelector('#generateQrButton');

let latestCvPath = '';

function handleLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
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

function renderCv(cv) {
  const latestVersion = cv && cv.latest_version ? cv.latest_version : null;
  latestCvPath = latestVersion ? '/cv/version/' + latestVersion.id + '/file' : '';

  setText('#currentFileName', latestVersion ? latestVersion.original_name : '-');
  setText('#currentVersion', latestVersion ? String(latestVersion.version_number) : '-');
  setText('#currentUploadedAt', latestVersion ? CVQR.formatDateTime(latestVersion.uploaded_at) : '-');

  openCurrentCvButton.classList.toggle('hidden', !latestCvPath);
}

function renderParticipation(participation) {
  if (!participation) {
    participationDetails.className = 'empty-state';
    participationDetails.textContent = 'No active registration.';
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
  status.textContent = participation.cv
    ? 'CV selected for this participation.'
    : 'Upload a CV to activate the QR code.';

  participationDetails.append(title, meta, status);
}

function renderQr(participation, qr) {
  const qrImage = document.querySelector('#qrImage');

  qrPanel.classList.toggle('hidden', !participation);

  if (!participation) {
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
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.textContent = 'You already have an active event registration.';
    openEventsList.appendChild(state);
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

    actionRow.appendChild(button);
    card.append(title, meta, actionRow);
    openEventsList.appendChild(card);
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
    const events = await CVQR.request('/events/open', {
      headers: CVQR.authHeaders()
    });
    const qr = participation ? await requestOptional('/participations/me/qr') : null;

    renderCv(cv);
    renderParticipation(participation);
    renderOpenEvents(events, participation);
    renderQr(participation, qr);
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

async function registerForEvent(eventId) {
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

if (CVQR.requireRole('student', '02-login.html')) {
  loadDashboard();
  uploadForm.addEventListener('submit', handleUploadSubmit);
  logoutButtonHome.addEventListener('click', handleLogout);
  refreshButton.addEventListener('click', loadDashboard);
  generateQrButton.addEventListener('click', handleGenerateQr);
  openCurrentCvButton.addEventListener('click', openCurrentCv);
  openEventsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-event-id]');

    if (button) {
      registerForEvent(button.dataset.eventId);
    }
  });
}
