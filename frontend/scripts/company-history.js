const historyList = document.querySelector('#historyList');
const historyMessage = document.querySelector('#message');
const historyCount = document.querySelector('#historyCount');
const logoutButtonHistory = document.querySelector('#logoutButton');

function handleHistoryLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

function renderEmptyHistory() {
  historyList.innerHTML = '';

  const state = document.createElement('div');
  state.className = 'empty-state';
  state.textContent = 'No scanned CVs are currently available.';
  historyList.appendChild(state);
}

function appendMeta(card, text) {
  if (!text) {
    return;
  }

  const meta = document.createElement('p');
  meta.className = 'list-meta';
  meta.textContent = text;
  card.appendChild(meta);
}

function buildHistoryCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  const cvVersion = item.cv_version || {};

  title.textContent = item.student_name || 'Unknown student';
  content.appendChild(title);

  appendMeta(content, item.student_email);
  appendMeta(content, item.event ? [item.event.name, item.event.location].filter(Boolean).join(' - ') : '');
  appendMeta(content, cvVersion.original_name || item.original_name);
  appendMeta(content, cvVersion.version_number ? 'Version ' + cvVersion.version_number : '');
  appendMeta(content, 'Scanned at ' + CVQR.formatDateTime(item.scanned_at));

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'button button-secondary';
  openButton.textContent = 'Open CV';
  openButton.addEventListener('click', function () {
    CVQR.setLastScan({ scan: item });
    window.location.href = '06-company-cv-view.html';
  });

  actionRow.appendChild(openButton);
  card.append(content, actionRow);

  return card;
}

function renderHistory(rows) {
  historyCount.textContent = rows.length + ' result' + (rows.length === 1 ? '' : 's');

  if (!rows.length) {
    renderEmptyHistory();
    return;
  }

  historyList.innerHTML = '';

  rows.forEach(function (item) {
    historyList.appendChild(buildHistoryCard(item));
  });
}

async function loadHistory() {
  try {
    const rows = await CVQR.request('/company/scans', {
      headers: CVQR.authHeaders()
    });

    renderHistory(rows);
  } catch (error) {
    CVQR.showMessage(historyMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('company', '02-login.html')) {
  loadHistory();
  logoutButtonHistory.addEventListener('click', handleHistoryLogout);
}
