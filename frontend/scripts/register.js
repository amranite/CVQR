const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#message');
const registrationSuccessMessage = 'Account created successfully. You can now log in.';

async function handleRegisterSubmit(event) {
  event.preventDefault();

  CVQR.showMessage(registerMessage, '', 'error');

  const payload = {
    name: document.querySelector('#name').value.trim(),
    email: document.querySelector('#email').value.trim(),
    password: document.querySelector('#password').value
  };

  try {
    await CVQR.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    registerForm.reset();
    sessionStorage.setItem('cvqr_registration_success_message', registrationSuccessMessage);
    window.location.href = '/login/';
  } catch (error) {
    CVQR.showMessage(registerMessage, error.message, 'error');
  }
}

registerForm.addEventListener('submit', handleRegisterSubmit);
