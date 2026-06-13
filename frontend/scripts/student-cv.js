const studentCvMessage = document.querySelector('#message');
const replaceForm = document.querySelector('#replaceForm');
const deleteButton = document.querySelector('#deleteButton');
const logoutButtonCv = document.querySelector('#logoutButton');
const downloadButton = document.querySelector('#downloadButton');
const generateQrButtonCv = document.querySelector('#generateQrButton');
const qrMessage = document.querySelector('#qrMessage');
const replaceMessage = document.querySelector('#replaceMessage');
const versionsList = document.querySelector('#versionsList');

let latestCvFilePath = '';

function handleStudentLogout() {
  CVQR.clearSession();
  window.location.href = '/login/';
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value || '-';
  }
}

function capitalize(value) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
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

function renderCv(cvData) {
  const latestVersion = cvData && cvData.latest_version ? cvData.latest_version : null;
  latestCvFilePath = latestVersion ? '/cv/version/' + latestVersion.id + '/file' : '';

  setText('#fileName', latestVersion ? latestVersion.original_name : '-');
  setText('#versionNumber', latestVersion ? String(latestVersion.version_number) : '-');
  setText('#uploadedAt', latestVersion ? CVQR.formatDateTime(latestVersion.uploaded_at) : '-');
  setText('#updatedAt', cvData ? CVQR.formatDateTime(cvData.updated_at) : '-');

  downloadButton.disabled = !latestCvFilePath;
  renderVersions(cvData && cvData.versions ? cvData.versions : []);
}

function renderVersions(versions) {
  versionsList.innerHTML = '';

  if (!versions.length) {
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.textContent = 'No CV versions found.';
    versionsList.appendChild(state);
    return;
  }

  versions.forEach(function (version) {
    const card = document.createElement('article');
    card.className = 'list-card compact-row';

    const title = document.createElement('h3');
    title.textContent = 'Version ' + version.version_number;

    const meta = document.createElement('p');
    meta.className = 'list-meta';
    meta.textContent = [
      version.original_name,
      CVQR.formatDateTime(version.uploaded_at)
    ].filter(function (value) {
      return value && value !== '-';
    }).join(' - ');

    const actionRow = document.createElement('div');
    actionRow.className = 'button-row compact-actions';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'button button-secondary';
    openButton.textContent = 'Open';
    openButton.dataset.filePath = '/cv/version/' + version.id + '/file';

    actionRow.appendChild(openButton);
    card.append(title, meta, actionRow);
    versionsList.appendChild(card);
  });
}

function renderParticipation(participation, qrData) {
  setText('#eventName', participation && participation.event ? participation.event.name : '-');
  setText('#eventLocation', participation && participation.event ? participation.event.location : '-');
  setText('#eventStatus', participation && participation.event ? capitalize(participation.event.status) : '-');

  const qr = qrData || (participation && participation.qr ? participation.qr : null);
  const qrUrl = qr && qr.qrUrl ? qr.qrUrl : '';
  const token = qr && qr.token ? qr.token : CVQR.extractToken(qrUrl);
  const qrImage = document.querySelector('#qrImage');

  qrImage.src = qr && qr.qrImage ? qr.qrImage : '';
  qrImage.classList.toggle('hidden', !(qr && qr.qrImage));
  document.querySelector('#qrUrl').textContent = qrUrl || '-';
  document.querySelector('#qrToken').textContent = token || '-';
  generateQrButtonCv.disabled = !participation;
}

async function loadCv() {
  try {
    const cvData = await requestOptional('/cv/me');

    if (!cvData) {
      window.location.href = '/student/';
      return;
    }

    const participation = await requestOptional('/participations/me');
    const qrData = participation ? await requestOptional('/participations/me/qr') : null;

    renderCv(cvData);
    renderParticipation(participation, qrData);
  } catch (error) {
    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

async function handleReplaceSubmit(event) {
  event.preventDefault();
  CVQR.showMessage(studentCvMessage, '', 'error');
  CVQR.showMessage(replaceMessage, '', 'error');

  const formData = new FormData(replaceForm);

  try {
    const data = await CVQR.request('/cv', {
      method: 'PUT',
      headers: CVQR.authHeaders(),
      body: formData
    });

    replaceForm.reset();
    await loadCv();
    CVQR.showMessage(replaceMessage, data.message || 'CV version uploaded.', 'success');
  } catch (error) {
    CVQR.showMessage(replaceMessage, error.message, 'error');
  }
}

async function handleDeleteClick() {
  const confirmed = await CVQR.confirmAction({
    title: 'Delete CV?',
    message: 'Delete your CV and retained versions from the app?',
    confirmLabel: 'Delete CV',
    variant: 'danger'
  });

  if (!confirmed) {
    return;
  }

  CVQR.showMessage(studentCvMessage, '', 'error');

  try {
    await CVQR.request('/cv', {
      method: 'DELETE',
      headers: CVQR.authHeaders()
    });

    window.location.href = '/student/';
  } catch (error) {
    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

async function handleDownloadLatest() {
  if (!latestCvFilePath) {
    return;
  }

  try {
    await CVQR.openAuthenticatedFile(latestCvFilePath);
  } catch (error) {
    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

async function handleGenerateQr() {
  CVQR.showMessage(qrMessage, '', 'error');

  try {
    const data = await CVQR.request('/participations/me/qr', {
      method: 'POST',
      headers: CVQR.authHeaders()
    });

    await loadCv();
    CVQR.showMessage(qrMessage, data.message || 'QR code is ready.', 'success');
  } catch (error) {
    CVQR.showMessage(qrMessage, error.message, 'error');
  }
}

async function openVersionFile(filePath) {
  try {
    await CVQR.openAuthenticatedFile(filePath);
  } catch (error) {
    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('student', '/login/')) {
  loadCv();
  replaceForm.addEventListener('submit', handleReplaceSubmit);
  deleteButton.addEventListener('click', handleDeleteClick);
  logoutButtonCv.addEventListener('click', handleStudentLogout);
  downloadButton.addEventListener('click', handleDownloadLatest);
  generateQrButtonCv.addEventListener('click', handleGenerateQr);
  versionsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-file-path]');

    if (button) {
      openVersionFile(button.dataset.filePath);
    }
  });
}
