const adminList = document.querySelector('#cvList');
const adminMessage = document.querySelector('#message');
const cvCount = document.querySelector('#cvCount');
const logoutButtonAdmin = document.querySelector('#logoutButton');

function handleAdminLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

function renderEmptyCvList() {
  adminList.innerHTML = '<div class="empty-state">Er zijn nog geen uploads.</div>';
}

function buildAdminCard(item) {
  const studentName = item.student_name || item.name || '-';
  const studentEmail = item.student_email || item.email || '-';

  return `
    <article class="list-card">
      <div>
        <h3>${studentName}</h3>
        <p class="list-meta">${studentEmail}</p>
        <p class="list-meta">${item.original_name || '-'}</p>
        <p class="list-meta">Geüpload op ${CVQR.formatDateTime(item.uploaded_at)}</p>
      </div>
      <div class="button-row">
        <a class="button button-secondary" href="${CVQR.openPdfPath(item.cv)}" target="_blank" rel="noopener">Open PDF</a>
        <button type="button" class="button button-danger" data-studentid="${item.student_id}" data-name="${studentName}">Verwijderen</button>
      </div>
    </article>
  `;
}

function bindDeleteButtons() {
  const buttons = adminList.querySelectorAll('button[data-studentid]');

  buttons.forEach(function (button) {
    button.addEventListener('click', async function () {
      const confirmed = window.confirm('CV verwijderen van ' + button.dataset.name + '?');

      if (!confirmed) {
        return;
      }

      try {
        await CVQR.request('/admin/cv/' + button.dataset.studentid, {
          method: 'DELETE',
          headers: CVQR.authHeaders()
        });

        CVQR.showMessage(adminMessage, 'CV verwijderd.', 'success');
        await loadAdminList();
      } catch (error) {
        CVQR.showMessage(adminMessage, error.message, 'error');
      }
    });
  });
}

async function loadAdminList() {
  CVQR.showMessage(adminMessage, '', 'error');

  try {
    const rows = await CVQR.request('/admin/cvs', {
      headers: CVQR.authHeaders()
    });

    cvCount.textContent = rows.length + ' resultaat' + (rows.length === 1 ? '' : 'en');

    if (!rows.length) {
      renderEmptyCvList();
      return;
    }

    adminList.innerHTML = rows.map(buildAdminCard).join('');
    bindDeleteButtons();
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

if (CVQR.requireRole('admin', '02-login.html')) {
  loadAdminList();
  logoutButtonAdmin.addEventListener('click', handleAdminLogout);
}
