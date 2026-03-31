const companyViewMessage = document.querySelector('#message');
const lastScan = CVQR.getLastScan();

function loadScannedCv() {
  if (!lastScan || !lastScan.scan) {
    CVQR.showMessage(companyViewMessage, 'Er is nog geen scan geladen.', 'error');
    return;
  }

  const scan = lastScan.scan;
  const pdfUrl = CVQR.openPdfPath(scan.cv);

  document.querySelector('#studentName').textContent = scan.student_name || '-';
  document.querySelector('#studentEmail').textContent = scan.student_email || '-';
  document.querySelector('#fileName').textContent = scan.original_name || '-';
  document.querySelector('#scannedAt').textContent = CVQR.formatDateTime(scan.scanned_at);
  document.querySelector('#downloadLink').href = pdfUrl;
  document.querySelector('#pdfFrame').src = pdfUrl;
}

if (CVQR.requireRole('company', '02-login.html')) {
  loadScannedCv();
}
