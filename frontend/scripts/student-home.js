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

    renderCv(cv, participation);
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

if (CVQR.requireRole('student', '/login/')) {
  loadDashboard();
  uploadForm.addEventListener('submit', handleUploadSubmit);
  logoutButtonHome.addEventListener('click', handleLogout);
  refreshButton.addEventListener('click', loadDashboard);
  registrationRefreshButton.addEventListener('click', loadDashboard);
  generateQrButton.addEventListener('click', handleGenerateQr);
  openCurrentCvButton.addEventListener('click', openCurrentCv);
  openEventsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-event-id]');

    if (button) {
      registerForEvent(button.dataset.eventId, button.dataset.eventName);
    }
  });
}
