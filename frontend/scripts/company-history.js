const historyList = document.querySelector('#historyList');
const historyMessage = document.querySelector('#message');
const historyCount = document.querySelector('#historyCount');
const logoutButtonHistory = document.querySelector('#logoutButton');
const showAllButton = document.querySelector('#showAllButton');
const showFavoritesButton = document.querySelector('#showFavoritesButton');

let favoritesOnly = false;

function handleHistoryLogout() {
  CVQR.clearSession();
  window.location.href = '/login/';
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

function updateFilterButtons() {
  showAllButton.classList.toggle('is-active', !favoritesOnly);
  showFavoritesButton.classList.toggle('is-active', favoritesOnly);
}

function buildFavoriteButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-secondary favorite-button';
  button.classList.toggle('is-favorite', Boolean(item.is_favorite));
  button.innerHTML = item.is_favorite
    ? '<i class="fa-solid fa-star"></i><span>Favorited</span>'
    : '<i class="fa-regular fa-star"></i><span>Favorite</span>';

  button.addEventListener('click', function () {
    toggleFavorite(item);
  });

  return button;
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
  if (item.favorited_at) {
    appendMeta(content, 'Favorited at ' + CVQR.formatDateTime(item.favorited_at));
  }

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'button button-secondary';
  openButton.textContent = 'Open CV';
  openButton.addEventListener('click', function () {
    CVQR.setLastScan({ scan: item });
    window.location.href = '/company/cv/';
  });

  actionRow.append(openButton, buildFavoriteButton(item));
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
  CVQR.showMessage(historyMessage, '', 'error');
  updateFilterButtons();

  try {
    const rows = await CVQR.request('/company/scans' + (favoritesOnly ? '?favorites=1' : ''), {
      headers: CVQR.authHeaders()
    });

    renderHistory(rows);
  } catch (error) {
    CVQR.showMessage(historyMessage, error.message, 'error');
  }
}

async function toggleFavorite(item) {
  if (!item.id) {
    CVQR.showMessage(historyMessage, 'This scan cannot be favorited yet.', 'error');
    return;
  }

  try {
    await CVQR.request('/company/scans/' + item.id + '/favorite', {
      method: item.is_favorite ? 'DELETE' : 'PUT',
      headers: CVQR.authHeaders()
    });

    CVQR.showMessage(
      historyMessage,
      item.is_favorite ? 'Removed from favorites.' : 'Added to favorites.',
      'success'
    );
    await loadHistory();
  } catch (error) {
    CVQR.showMessage(historyMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('company', '/login/')) {
  loadHistory();
  showAllButton.addEventListener('click', function () {
    favoritesOnly = false;
    loadHistory();
  });
  showFavoritesButton.addEventListener('click', function () {
    favoritesOnly = true;
    loadHistory();
  });
  logoutButtonHistory.addEventListener('click', handleHistoryLogout);
}
