const adminList = document.querySelector('#cvList');
const adminMessage = document.querySelector('#message');
const cvCount = document.querySelector('#cvCount');
const logoutButtonAdminCvs = document.querySelector('#logoutButton');
const refreshCvsButton = document.querySelector('#refreshButton');

function buildCvCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const latestVersion = item.latest_version || {};

  const title = document.createElement('h3');
  title.textContent = item.student_name || item.name || '-';
  content.appendChild(title);

  CVQRAdmin.appendMeta(content, item.student_email || item.email || '-');
  CVQRAdmin.appendMeta(content, latestVersion.original_name || item.original_name || '-');
  CVQRAdmin.appendMeta(content, latestVersion.version_number ? 'Version ' + latestVersion.version_number : '');
  CVQRAdmin.appendMeta(content, 'Versions retained: ' + (item.versions_count || 0));
  CVQRAdmin.appendMeta(content, 'Uploaded at ' + CVQR.formatDateTime(latestVersion.uploaded_at || item.uploaded_at));
  CVQRAdmin.appendMeta(content, 'Last updated ' + CVQR.formatDateTime(item.updated_at));

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row compact-actions';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'button button-secondary';
  openButton.textContent = 'Open PDF';
  openButton.disabled = !item.cv;
  openButton.addEventListener('click', function () {
    openAdminCv(item.cv);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'button button-danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', function () {
    deleteStudentCv(item.student_id, title.textContent);
  });

  actionRow.append(openButton, deleteButton);
  card.append(content, actionRow);
  return card;
}

function renderCvList(rows) {
  CVQRAdmin.setCount(cvCount, rows.length, 'result');

  if (!rows.length) {
    CVQRAdmin.renderEmpty(adminList, 'No CV uploads yet.');
    return;
  }

  adminList.innerHTML = '';
  rows.forEach(function (item) {
    adminList.appendChild(buildCvCard(item));
  });
}

async function openAdminCv(path) {
  try {
    await CVQR.openAuthenticatedFile(path);
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

async function deleteStudentCv(studentId, studentName) {
  const confirmed = await CVQR.confirmAction({
    title: 'Delete CV?',
    message: 'Delete CV for ' + studentName + '? This removes the retained versions from the app.',
    confirmLabel: 'Delete CV',
    variant: 'danger'
  });

  if (!confirmed) {
    return;
  }

  try {
    await CVQR.request('/admin/cv/' + studentId, {
      method: 'DELETE',
      headers: CVQR.authHeaders()
    });

    CVQR.showMessage(adminMessage, 'CV deleted.', 'success');
    await loadAdminCvs();
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

async function loadAdminCvs() {
  CVQR.showMessage(adminMessage, '', 'error');

  try {
    const rows = await CVQR.request('/admin/cvs', {
      headers: CVQR.authHeaders()
    });

    renderCvList(rows);
    CVQR.markRefreshed(refreshCvsButton);
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  loadAdminCvs();
  refreshCvsButton.addEventListener('click', loadAdminCvs);
  logoutButtonAdminCvs.addEventListener('click', CVQRAdmin.handleLogout);
}
