const companyViewMessage = document.querySelector('#message');
const openPdfButton = document.querySelector('#openPdfButton');
const logoutButtonView = document.querySelector('#logoutButton');
const lastScan = CVQR.getLastScan();

let cvPath = '';
let previewUrl = '';

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value || '-';
  }
}

function handleViewLogout() {
  revokePreviewUrl();
  CVQR.clearSession();
  window.location.href = '/login/';
}

function revokePreviewUrl() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
}

async function loadPdfPreview(path) {
  revokePreviewUrl();

  try {
    previewUrl = await CVQR.getAuthenticatedFileUrl(path);
    document.querySelector('#pdfFrame').src = previewUrl;
    openPdfButton.disabled = false;
  } catch (error) {
    openPdfButton.disabled = true;
    CVQR.showMessage(companyViewMessage, error.message, 'error');
  }
}

async function loadScannedCv() {
  if (!lastScan || !lastScan.scan) {
    CVQR.showMessage(companyViewMessage, 'No scan has been loaded yet.', 'error');
    openPdfButton.disabled = true;
    return;
  }

  const scan = lastScan.scan;
  const cvVersion = scan.cv_version || {};
  cvPath = scan.cv || '';

  setText('#studentName', scan.student_name);
  setText('#studentEmail', scan.student_email);
  setText('#eventName', scan.event ? scan.event.name : '');
  setText('#eventLocation', scan.event ? scan.event.location : '');
  setText('#fileName', cvVersion.original_name || scan.original_name);
  setText('#versionNumber', cvVersion.version_number ? String(cvVersion.version_number) : '');
  setText('#scannedAt', CVQR.formatDateTime(scan.scanned_at));

  if (!cvPath) {
    openPdfButton.disabled = true;
    CVQR.showMessage(companyViewMessage, 'No CV file is available for this scan.', 'error');
    return;
  }

  await loadPdfPreview(cvPath);
}

async function openPdf() {
  if (!cvPath) {
    return;
  }

  try {
    await CVQR.openAuthenticatedFile(cvPath);
  } catch (error) {
    CVQR.showMessage(companyViewMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('company', '/login/')) {
  openPdfButton.addEventListener('click', openPdf);
  logoutButtonView.addEventListener('click', handleViewLogout);
  window.addEventListener('beforeunload', revokePreviewUrl);
  loadScannedCv();
}
