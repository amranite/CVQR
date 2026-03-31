const historyList = document.querySelector('#historyList');
const historyMessage = document.querySelector('#message');
const historyCount = document.querySelector('#historyCount');
const logoutButtonHistory = document.querySelector('#logoutButton');

function handleHistoryLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

function renderEmptyHistory() {
  historyList.innerHTML = '<div class="empty-state">Er zijn nog geen gescande CV\'s.</div>';
}

function buildHistoryCard(item) {
  return `
    <article class="list-card">
      <div>
        <h3>${item.student_name}</h3>
        <p class="list-meta">${item.student_email}</p>
        <p class="list-meta">${item.original_name}</p>
        <p class="list-meta">Gescand op ${CVQR.formatDateTime(item.scanned_at)}</p>
      </div>
      <div class="button-row">
        <button type="button" class="button button-secondary" data-cv="${item.cv}" data-name="${item.student_name}" data-email="${item.student_email}" data-file="${item.original_name}" data-scanned="${item.scanned_at}">Open CV</button>
      </div>
    </article>
  `;
}

function bindHistoryButtons() {
  const buttons = historyList.querySelectorAll('button[data-cv]');

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      CVQR.setLastScan({
        scan: {
          cv: button.dataset.cv,
          original_name: button.dataset.file,
          student_name: button.dataset.name,
          student_email: button.dataset.email,
          scanned_at: button.dataset.scanned
        }
      });

      window.location.href = '06-company-cv-view.html';
    });
  });
}

async function loadHistory() {
  try {
    const rows = await CVQR.request('/company/scans', {
      headers: CVQR.authHeaders()
    });

    historyCount.textContent = rows.length + ' resultaat' + (rows.length === 1 ? '' : 'en');

    if (!rows.length) {
      renderEmptyHistory();
      return;
    }

    historyList.innerHTML = rows.map(buildHistoryCard).join('');
    bindHistoryButtons();
  } catch (error) {
    CVQR.showMessage(historyMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('company', '02-login.html')) {
  loadHistory();
  logoutButtonHistory.addEventListener('click', handleHistoryLogout);
}
