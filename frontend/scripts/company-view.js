const companyViewMessage = document.querySelector('#message');
const openPdfButton = document.querySelector('#openPdfButton');
const favoriteButton = document.querySelector('#favoriteButton');
const logoutButtonView = document.querySelector('#logoutButton');
const lastScan = CVQR.getLastScan();

let cvPath = '';
let previewUrl = '';
let currentScan = null;

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

function getScanId(scan) {
  return scan ? scan.id || scan.scan_id : null;
}

function updateFavoriteButton() {
  const isFavorite = Boolean(currentScan && currentScan.is_favorite);

  favoriteButton.disabled = !currentScan || !getScanId(currentScan);
  favoriteButton.classList.toggle('is-favorite', isFavorite);
  favoriteButton.innerHTML = isFavorite
    ? '<i class="fa-solid fa-star"></i><span>Favorited</span>'
    : '<i class="fa-regular fa-star"></i><span>Favorite</span>';
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

  currentScan = lastScan.scan;
  const cvVersion = currentScan.cv_version || {};
  cvPath = currentScan.cv || '';

  setText('#studentName', currentScan.student_name);
  setText('#studentEmail', currentScan.student_email);
  setText('#eventName', currentScan.event ? currentScan.event.name : '');
  setText('#eventLocation', currentScan.event ? currentScan.event.location : '');
  setText('#fileName', cvVersion.original_name || currentScan.original_name);
  setText('#versionNumber', cvVersion.version_number ? String(cvVersion.version_number) : '');
  setText('#scannedAt', CVQR.formatDateTime(currentScan.scanned_at));
  updateFavoriteButton();

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

async function toggleFavorite() {
  const scanId = getScanId(currentScan);

  if (!scanId) {
    CVQR.showMessage(companyViewMessage, 'This scan cannot be favorited yet.', 'error');
    return;
  }

  try {
    const data = await CVQR.request('/company/scans/' + scanId + '/favorite', {
      method: currentScan.is_favorite ? 'DELETE' : 'PUT',
      headers: CVQR.authHeaders()
    });

    currentScan.is_favorite = data.scan.is_favorite;
    currentScan.favorited_at = data.scan.favorited_at;
    currentScan.id = data.scan.id;
    CVQR.setLastScan({ scan: currentScan });
    updateFavoriteButton();
    CVQR.showMessage(
      companyViewMessage,
      currentScan.is_favorite ? 'Added to favorites.' : 'Removed from favorites.',
      'success'
    );
  } catch (error) {
    CVQR.showMessage(companyViewMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('company', '/login/')) {
  openPdfButton.addEventListener('click', openPdf);
  favoriteButton.addEventListener('click', toggleFavorite);
  logoutButtonView.addEventListener('click', handleViewLogout);
  window.addEventListener('beforeunload', revokePreviewUrl);
  loadScannedCv();
}
