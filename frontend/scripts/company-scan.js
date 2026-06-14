const scanForm = document.querySelector('#scanForm');
const companyScanMessage = document.querySelector('#message');
const logoutButtonCompany = document.querySelector('#logoutButton');
const startCameraButton = document.querySelector('#startCameraButton');
const stopCameraButton = document.querySelector('#stopCameraButton');
const pickImageButton = document.querySelector('#pickImageButton');
const imageInput = document.querySelector('#imageInput');
const tokenInput = document.querySelector('#token');
const scannerPanel = document.querySelector('#scannerPanel');
const tokenPanel = document.querySelector('#tokenPanel');
const accessNotice = document.querySelector('#accessNotice');
const assignmentSection = document.querySelector('#assignmentSection');
const assignmentSummary = document.querySelector('#assignmentSummary');
const companyEventsList = document.querySelector('#companyEventsList');

let html5QrCode = null;
let scannerRunning = false;
let hasActiveEventAssignment = false;

const scannerCameraConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.3333333
};

function getRearCameraId(cameras) {
  for (let i = 0; i < cameras.length; i += 1) {
    const label = (cameras[i].label || '').toLowerCase();

    if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
      return cameras[i].id;
    }
  }

  return '';
}

function getCameraStartTarget(cameras) {
  const rearCameraId = getRearCameraId(cameras);

  if (rearCameraId) {
    return rearCameraId;
  }

  return { facingMode: 'environment' };
}

function handleCompanyLogout() {
  stopCamera();
  CVQR.clearSession();
  window.location.href = '/login/';
}

async function openByToken(rawValue) {
  if (!hasActiveEventAssignment) {
    CVQR.showMessage(companyScanMessage, "Please wait until you're assigned to an active event.", 'error');
    return;
  }

  const token = CVQR.extractToken(rawValue);

  if (!token) {
    CVQR.showMessage(companyScanMessage, 'Enter a valid token or URL.', 'error');
    return;
  }

  try {
    const data = await CVQR.request('/qr/' + encodeURIComponent(token), {
      headers: CVQR.authHeaders()
    });

    if (data && !data.scanned_at) {
      data.scanned_at = new Date().toISOString();
    }

    CVQR.setLastScan({ scan: data });
    window.location.href = '/company/cv/';
  } catch (error) {
    CVQR.showMessage(companyScanMessage, error.message, 'error');
  }
}

function handleScanSuccess(decodedText) {
  if (!hasActiveEventAssignment) {
    return;
  }

  tokenInput.value = decodedText;
  stopCamera().finally(function () {
    openByToken(decodedText);
  });
}

function handleScanError() {
}

async function startCamera() {
  CVQR.showMessage(companyScanMessage, '', 'error');

  if (!hasActiveEventAssignment) {
    CVQR.showMessage(companyScanMessage, "Please wait until you're assigned to an active event.", 'error');
    return;
  }

  if (typeof Html5Qrcode === 'undefined') {
    CVQR.showMessage(companyScanMessage, 'The QR scanner library is not loaded.', 'error');
    return;
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    if (scannerRunning) {
      return;
    }

    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || !cameras.length) {
      CVQR.showMessage(companyScanMessage, 'No camera was found on this device.', 'error');
      return;
    }

    await html5QrCode.start(
      getCameraStartTarget(cameras),
      scannerCameraConfig,
      handleScanSuccess,
      handleScanError
    );

    scannerRunning = true;
  } catch (error) {
    CVQR.showMessage(companyScanMessage, 'The camera could not be started. Check camera permissions or try again.', 'error');
  }
}

async function stopCamera() {
  if (!html5QrCode || !scannerRunning) {
    return;
  }

  try {
    await html5QrCode.stop();
    await html5QrCode.clear();
  } catch (error) {
  } finally {
    scannerRunning = false;
  }
}

async function readSelectedImage(file) {
  if (!file) {
    return;
  }

  CVQR.showMessage(companyScanMessage, '', 'error');

  if (!hasActiveEventAssignment) {
    CVQR.showMessage(companyScanMessage, "Please wait until you're assigned to an active event.", 'error');
    imageInput.value = '';
    return;
  }

  if (typeof Html5Qrcode === 'undefined') {
    CVQR.showMessage(companyScanMessage, 'The QR scanner library is not loaded.', 'error');
    imageInput.value = '';
    return;
  }

  try {
    await stopCamera();

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('reader');
    }

    const decodedText = await html5QrCode.scanFile(file, true);
    tokenInput.value = decodedText;
    await openByToken(decodedText);
  } catch (error) {
    CVQR.showMessage(companyScanMessage, 'No QR code was found in the selected image.', 'error');
  } finally {
    imageInput.value = '';
  }
}

function handleScanSubmit(event) {
  event.preventDefault();
  CVQR.showMessage(companyScanMessage, '', 'error');
  openByToken(tokenInput.value);
}

function setScannerAvailability(isAvailable) {
  hasActiveEventAssignment = isAvailable;
  scannerPanel.classList.toggle('hidden', !isAvailable);
  tokenPanel.classList.toggle('hidden', !isAvailable);
  accessNotice.classList.toggle('hidden', isAvailable);
  startCameraButton.disabled = !isAvailable;
  stopCameraButton.disabled = !isAvailable;
  pickImageButton.disabled = !isAvailable;
  tokenInput.disabled = !isAvailable;

  if (!isAvailable) {
    stopCamera();
  }
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

function renderCompanyEvent(event) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = event.name || 'Assigned event';
  content.appendChild(title);

  appendMeta(content, event.location);
  appendMeta(content, 'Event: ' + CVQR.formatDateTime(event.starts_at) + ' - ' + CVQR.formatDateTime(event.ends_at));
  appendMeta(content, 'Status: ' + (event.status || 'draft'));

  if (event.is_active) {
    appendMeta(content, 'Scanner available now.');
  } else if (event.is_future) {
    appendMeta(content, 'Assigned for a future event.');
  } else {
    appendMeta(content, 'Assigned, but not currently scannable.');
  }

  card.appendChild(content);
  return card;
}

function renderCompanyEvents(events) {
  const activeEvents = events.filter(function (event) {
    return event.is_active;
  });

  setScannerAvailability(activeEvents.length > 0);

  if (!events.length) {
    assignmentSection.classList.add('hidden');
    companyEventsList.innerHTML = '';
    accessNotice.innerHTML = "<div class=\"empty-state\">Welcome. Please wait until you're assigned to an event.</div>";
    return;
  }

  assignmentSection.classList.remove('hidden');
  assignmentSummary.textContent = activeEvents.length > 0
    ? 'Scanner access is available for ' + activeEvents.length + ' active event' + (activeEvents.length === 1 ? '.' : 's.')
    : 'You have assigned events, but none are currently scannable.';

  if (activeEvents.length > 0) {
    accessNotice.innerHTML = '';
  } else {
    accessNotice.innerHTML = '<div class="empty-state">You are assigned to an event, but scanner access opens when the event is live.</div>';
  }

  companyEventsList.innerHTML = '';
  events.forEach(function (event) {
    companyEventsList.appendChild(renderCompanyEvent(event));
  });
}

async function loadCompanyEvents() {
  try {
    const events = await CVQR.request('/company/events', {
      headers: CVQR.authHeaders()
    });

    renderCompanyEvents(events);
  } catch (error) {
    setScannerAvailability(false);
    assignmentSection.classList.add('hidden');
    accessNotice.classList.remove('hidden');
    accessNotice.innerHTML = '<div class="empty-state">Event assignment could not be loaded.</div>';
  }
}

if (CVQR.requireRole('company', '/login/')) {
  setScannerAvailability(false);
  loadCompanyEvents();
  scanForm.addEventListener('submit', handleScanSubmit);
  startCameraButton.addEventListener('click', startCamera);
  stopCameraButton.addEventListener('click', stopCamera);
  pickImageButton.addEventListener('click', function () {
    imageInput.click();
  });
  imageInput.addEventListener('change', function (event) {
    readSelectedImage(event.target.files[0]);
  });
  logoutButtonCompany.addEventListener('click', handleCompanyLogout);
  window.addEventListener('beforeunload', stopCamera);
}
