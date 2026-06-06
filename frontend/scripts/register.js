const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#message');

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
    CVQR.showMessage(registerMessage, 'Account created. Log in now.', 'success');
    setTimeout(function () {
      window.location.href = '02-login.html';
    }, 800);
  } catch (error) {
    CVQR.showMessage(registerMessage, error.message, 'error');
  }
}

registerForm.addEventListener('submit', handleRegisterSubmit);
