const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#message');
const existingToken = CVQR.getToken();
const existingRole = CVQR.getRole();
const registrationSuccessKey = 'cvqr_registration_success_message';

function getRegistrationSuccessMessage() {
  return sessionStorage.getItem(registrationSuccessKey) || '';
}

function clearRegistrationSuccessMessage() {
  sessionStorage.removeItem(registrationSuccessKey);
}

function redirectIfLoggedIn() {
  if (existingToken && existingRole) {
    clearRegistrationSuccessMessage();
    CVQR.redirectByRole(existingRole);
    return true;
  }

  return false;
}

function showRegistrationSuccessMessage() {
  const message = getRegistrationSuccessMessage();

  if (message) {
    CVQR.showMessage(loginMessage, message, 'success');
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  CVQR.showMessage(loginMessage, '', 'error');

  const payload = {
    email: document.querySelector('#email').value.trim(),
    password: document.querySelector('#password').value
  };

  try {
    const data = await CVQR.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const payloadData = CVQR.parseJwt(data.token) || {};

    clearRegistrationSuccessMessage();
    CVQR.setToken(data.token);
    CVQR.setRole(payloadData.role || '');
    CVQR.redirectByRole(payloadData.role || '');
  } catch (error) {
    CVQR.showMessage(loginMessage, error.message, 'error');
  }
}

window.addEventListener('pagehide', clearRegistrationSuccessMessage);

if (!redirectIfLoggedIn()) {
  showRegistrationSuccessMessage();
  loginForm.addEventListener('submit', handleLoginSubmit);
}
