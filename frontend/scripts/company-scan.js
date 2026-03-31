const scanForm = document.querySelector('#scanForm');
const companyScanMessage = document.querySelector('#message');
const logoutButtonCompany = document.querySelector('#logoutButton');
const startCameraButton = document.querySelector('#startCameraButton');
const stopCameraButton = document.querySelector('#stopCameraButton');
const pickImageButton = document.querySelector('#pickImageButton');
const imageInput = document.querySelector('#imageInput');
const tokenInput = document.querySelector('#token');

let html5QrCode = null;
let scannerRunning = false;

function handleCompanyLogout() {
  stopCamera();
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

async function openByToken(rawValue) {
  const token = CVQR.extractToken(rawValue);

  if (!token) {
    CVQR.showMessage(companyScanMessage, 'Voer een geldige token of URL in.', 'error');
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
    window.location.href = '06-company-cv-view.html';
  } catch (error) {
    CVQR.showMessage(companyScanMessage, error.message, 'error');
  }
}

function handleScanSuccess(decodedText) {
  tokenInput.value = decodedText;
  stopCamera().finally(function () {
    openByToken(decodedText);
  });
}

function handleScanError() {
}

async function startCamera() {
  CVQR.showMessage(companyScanMessage, '', 'error');

  if (typeof Html5Qrcode === 'undefined') {
    CVQR.showMessage(companyScanMessage, 'De QR scanner library is niet geladen.', 'error');
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
      CVQR.showMessage(companyScanMessage, 'Geen camera gevonden op dit toestel.', 'error');
      return;
    }

    let cameraId = cameras[0].id;

    for (let i = 0; i < cameras.length; i += 1) {
      const label = (cameras[i].label || '').toLowerCase();

      if (label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('front')) {
        cameraId = cameras[i].id;
        break;
      }
    }

    await html5QrCode.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.3333333
      },
      handleScanSuccess,
      handleScanError
    );

    scannerRunning = true;
  } catch (error) {
    CVQR.showMessage(companyScanMessage, 'Camera kon niet gestart worden. Controleer camerarechten of probeer opnieuw.', 'error');
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

  if (typeof Html5Qrcode === 'undefined') {
    CVQR.showMessage(companyScanMessage, 'De QR scanner library is niet geladen.', 'error');
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
    CVQR.showMessage(companyScanMessage, 'Geen QR-code gevonden in de gekozen afbeelding.', 'error');
  } finally {
    imageInput.value = '';
  }
}

function handleScanSubmit(event) {
  event.preventDefault();
  CVQR.showMessage(companyScanMessage, '', 'error');
  openByToken(tokenInput.value);
}

if (CVQR.requireRole('company', '02-login.html')) {
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