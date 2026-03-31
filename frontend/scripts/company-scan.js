const scanForm = document.querySelector('#scanForm');
const companyScanMessage = document.querySelector('#message');
const logoutButtonCompany = document.querySelector('#logoutButton');
const startCameraButton = document.querySelector('#startCameraButton');
const stopCameraButton = document.querySelector('#stopCameraButton');
const pickImageButton = document.querySelector('#pickImageButton');
const imageInput = document.querySelector('#imageInput');
const video = document.querySelector('#cameraVideo');
const canvas = document.querySelector('#scannerCanvas');
const cameraPlaceholder = document.querySelector('#cameraPlaceholder');

let stream = null;
let scanTimer = null;
let detector = null;

function handleCompanyLogout() {
  stopCamera();
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

function showCamera() {
  video.classList.remove('hidden');
  cameraPlaceholder.classList.add('hidden');
}

function hideCamera() {
  video.classList.add('hidden');
  cameraPlaceholder.classList.remove('hidden');
}

function stopCamera() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }

  if (stream) {
    stream.getTracks().forEach(function (track) {
      track.stop();
    });
    stream = null;
  }

  video.srcObject = null;
  hideCamera();
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

async function detectFromVideoFrame() {
  if (!detector || video.readyState < 2) {
    return;
  }

  try {
    const codes = await detector.detect(video);

    if (codes.length && codes[0].rawValue) {
      stopCamera();
      await openByToken(codes[0].rawValue);
    }
  } catch (error) {
    CVQR.showMessage(companyScanMessage, 'Live scannen lukt niet in deze browser. Gebruik een QR-afbeelding of token.', 'error');
    stopCamera();
  }
}

async function startCamera() {
  CVQR.showMessage(companyScanMessage, '', 'error');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    CVQR.showMessage(companyScanMessage, 'Camera is niet beschikbaar in deze browser. Gebruik een QR-afbeelding of token.', 'error');
    return;
  }

  if (!('BarcodeDetector' in window)) {
    CVQR.showMessage(companyScanMessage, 'Live QR-scan wordt niet ondersteund in deze browser. Gebruik een QR-afbeelding of token.', 'error');
    return;
  }

  try {
    detector = new BarcodeDetector({ formats: ['qr_code'] });

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        }
      });
    } catch (error) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    video.srcObject = stream;
    showCamera();

    scanTimer = setInterval(function () {
      detectFromVideoFrame();
    }, 700);
  } catch (error) {
    CVQR.showMessage(companyScanMessage, 'Camera of live QR-scan kon niet gestart worden. Gebruik een QR-afbeelding of token.', 'error');
    stopCamera();
  }
}

async function readSelectedImage(file) {
  if (!file) {
    return;
  }

  CVQR.showMessage(companyScanMessage, '', 'error');

  if (!('BarcodeDetector' in window)) {
    CVQR.showMessage(companyScanMessage, 'QR-afbeelding lezen wordt niet ondersteund in deze browser. Gebruik een token of URL.', 'error');
    return;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const localDetector = new BarcodeDetector({ formats: ['qr_code'] });
    const codes = await localDetector.detect(bitmap);

    if (!codes.length || !codes[0].rawValue) {
      throw new Error('Geen QR-code gevonden in de gekozen afbeelding.');
    }

    await openByToken(codes[0].rawValue);
  } catch (error) {
    CVQR.showMessage(companyScanMessage, error.message, 'error');
  } finally {
    imageInput.value = '';
  }
}

function handleScanSubmit(event) {
  event.preventDefault();
  CVQR.showMessage(companyScanMessage, '', 'error');
  openByToken(document.querySelector('#token').value);
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
