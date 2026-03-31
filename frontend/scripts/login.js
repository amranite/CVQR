const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#message');
const existingToken = CVQR.getToken();
const existingRole = CVQR.getRole();

function redirectIfLoggedIn() {
  if (existingToken && existingRole) {
    CVQR.redirectByRole(existingRole);
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

    CVQR.setToken(data.token);
    CVQR.setRole(payloadData.role || '');
    CVQR.redirectByRole(payloadData.role || '');
  } catch (error) {
    CVQR.showMessage(loginMessage, error.message, 'error');
  }
}

redirectIfLoggedIn();
loginForm.addEventListener('submit', handleLoginSubmit);
