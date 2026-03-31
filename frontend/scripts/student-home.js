const studentHomeMessage = document.querySelector('#message');
const uploadForm = document.querySelector('#uploadForm');
const logoutButtonHome = document.querySelector('#logoutButton');

function handleLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

async function redirectIfCvExists() {
  try {
    await CVQR.request('/cv/me', {
      headers: CVQR.authHeaders()
    });

    window.location.href = '04-student-cv.html';
  } catch (error) {
    if (error.message !== 'No CV found') {
      CVQR.showMessage(studentHomeMessage, error.message, 'error');
    }
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

    window.location.href = '04-student-cv.html';
  } catch (error) {
    CVQR.showMessage(studentHomeMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('student', '02-login.html')) {
  redirectIfCvExists();
  uploadForm.addEventListener('submit', handleUploadSubmit);
  logoutButtonHome.addEventListener('click', handleLogout);
}
