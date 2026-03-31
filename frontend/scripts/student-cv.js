const studentCvMessage = document.querySelector('#message');
const replaceForm = document.querySelector('#replaceForm');
const deleteButton = document.querySelector('#deleteButton');
const logoutButtonCv = document.querySelector('#logoutButton');

function handleStudentLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

function fillCvData(cvData, qrData) {
  const filePath = cvData.file_path ? '/uploads/' + cvData.file_path : '';
  const qrUrl = qrData.qrUrl || (cvData.token ? CVQR.apiBase() + '/qr/' + cvData.token : '');

  document.querySelector('#fileName').textContent = cvData.original_name || '-';
  document.querySelector('#uploadedAt').textContent = CVQR.formatDateTime(cvData.uploaded_at);
  document.querySelector('#updatedAt').textContent = cvData.updated_at ? CVQR.formatDateTime(cvData.updated_at) : '-';
  document.querySelector('#expiresAt').textContent = CVQR.formatDateTime(qrData.expires_at || cvData.expires_at);
  document.querySelector('#qrImage').src = qrData.qrImage || '';
  document.querySelector('#qrUrl').textContent = qrUrl || '-';
  document.querySelector('#qrToken').textContent = CVQR.extractToken(qrUrl || cvData.token || '');

  if (filePath) {
    document.querySelector('#downloadLink').href = CVQR.openPdfPath(filePath);
  }
}

async function loadCv() {
  try {
    const cvData = await CVQR.request('/cv/me', {
      headers: CVQR.authHeaders()
    });

    const qrData = await CVQR.request('/qr/me', {
      headers: CVQR.authHeaders()
    });

    fillCvData(cvData, qrData);
  } catch (error) {
    if (/No CV found|No QR code found/i.test(error.message)) {
      window.location.href = '03-student-home.html';
      return;
    }

    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

async function handleReplaceSubmit(event) {
  event.preventDefault();
  CVQR.showMessage(studentCvMessage, '', 'error');

  const formData = new FormData(replaceForm);

  try {
    const data = await CVQR.request('/cv', {
      method: 'PUT',
      headers: CVQR.authHeaders(),
      body: formData
    });

    CVQR.showMessage(studentCvMessage, data.message || 'CV vervangen', 'success');
    replaceForm.reset();
    await loadCv();
  } catch (error) {
    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

async function handleDeleteClick() {
  const confirmed = window.confirm('Wil je je CV verwijderen?');

  if (!confirmed) {
    return;
  }

  CVQR.showMessage(studentCvMessage, '', 'error');

  try {
    await CVQR.request('/cv', {
      method: 'DELETE',
      headers: CVQR.authHeaders()
    });

    window.location.href = '03-student-home.html';
  } catch (error) {
    CVQR.showMessage(studentCvMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('student', '02-login.html')) {
  loadCv();
  replaceForm.addEventListener('submit', handleReplaceSubmit);
  deleteButton.addEventListener('click', handleDeleteClick);
  logoutButtonCv.addEventListener('click', handleStudentLogout);
}
