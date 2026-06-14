const usersMessage = document.querySelector('#usersMessage');
const userCount = document.querySelector('#userCount');
const usersList = document.querySelector('#usersList');
const userFilterForm = document.querySelector('#userFilterForm');
const userSearch = document.querySelector('#userSearch');
const roleFilter = document.querySelector('#roleFilter');
const activityFilter = document.querySelector('#activityFilter');
const refreshUsersButton = document.querySelector('#refreshButton');
const clearFiltersButton = document.querySelector('#clearFiltersButton');
const logoutButtonUsers = document.querySelector('#logoutButton');

function createRolePill(role) {
  const pill = document.createElement('span');
  pill.className = 'status-pill role-pill role-' + (role || 'unknown');
  pill.textContent = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
  return pill;
}

function addSummary(content, user) {
  if (user.role === 'student') {
    CVQRAdmin.appendMeta(content, user.cv_count > 0
      ? 'CV uploaded: ' + (user.latest_cv_name || 'Latest CV available')
      : 'No CV uploaded');
    CVQRAdmin.appendMeta(content, user.active_participations_count + ' active event registration' + (user.active_participations_count === 1 ? '' : 's'));
    CVQRAdmin.appendMeta(content, user.participations_count + ' total event registration' + (user.participations_count === 1 ? '' : 's'));
    return;
  }

  if (user.role === 'company') {
    CVQRAdmin.appendMeta(content, user.company_assignments_count + ' event assignment' + (user.company_assignments_count === 1 ? '' : 's'));
    CVQRAdmin.appendMeta(content, user.active_company_assignments_count + ' active assignment' + (user.active_company_assignments_count === 1 ? '' : 's'));
    CVQRAdmin.appendMeta(content, user.scan_count + ' scanned CV' + (user.scan_count === 1 ? '' : 's'));
    if (user.latest_scan_at) {
      CVQRAdmin.appendMeta(content, 'Last scan at ' + CVQR.formatDateTime(user.latest_scan_at));
    }
    return;
  }

  CVQRAdmin.appendMeta(content, 'Admin account');
}

function buildUserActions(user) {
  const actionRow = document.createElement('div');
  actionRow.className = 'button-row compact-actions';

  if (user.cv) {
    const openCvButton = document.createElement('button');
    openCvButton.type = 'button';
    openCvButton.className = 'button button-secondary';
    openCvButton.append(CVQRAdmin.createIcon('fa-solid fa-file-pdf'), 'Open CV');
    openCvButton.addEventListener('click', async function () {
      try {
        await CVQR.openAuthenticatedFile(user.cv);
      } catch (error) {
        CVQR.showMessage(usersMessage, error.message, 'error');
      }
    });
    actionRow.appendChild(openCvButton);
  }

  if (user.role === 'student' && user.participations_count > 0) {
    const registrationsLink = document.createElement('a');
    registrationsLink.className = 'button button-secondary';
    registrationsLink.href = '/admin/registrations/';
    registrationsLink.append(CVQRAdmin.createIcon('fa-solid fa-clipboard-list'), 'Registrations');
    actionRow.appendChild(registrationsLink);
  }

  if (user.role === 'company' && user.company_assignments_count > 0) {
    const companiesLink = document.createElement('a');
    companiesLink.className = 'button button-secondary';
    companiesLink.href = '/admin/registrations/';
    companiesLink.append(CVQRAdmin.createIcon('fa-solid fa-clipboard-list'), 'Registrations');
    actionRow.appendChild(companiesLink);
  }

  return actionRow;
}

function buildUserCard(user) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const heading = document.createElement('div');
  heading.className = 'inline-heading';

  const title = document.createElement('h3');
  title.textContent = user.name || 'Unnamed user';
  heading.append(title, createRolePill(user.role));
  content.appendChild(heading);

  CVQRAdmin.appendMeta(content, user.email);
  CVQRAdmin.appendMeta(content, 'Created at ' + CVQR.formatDateTime(user.created_at));
  addSummary(content, user);

  const actions = buildUserActions(user);
  if (actions.children.length > 0) {
    card.append(content, actions);
  } else {
    card.appendChild(content);
  }

  return card;
}

function renderUsers(users) {
  CVQRAdmin.setCount(userCount, users.length, 'result');

  if (!users.length) {
    CVQRAdmin.renderEmpty(usersList, 'No users match these filters.');
    return;
  }

  usersList.innerHTML = '';
  users.forEach(function (user) {
    usersList.appendChild(buildUserCard(user));
  });
}

function buildQueryString() {
  const params = new URLSearchParams();
  const search = userSearch.value.trim();
  const role = roleFilter.value;
  const activity = activityFilter.value;

  if (search) {
    params.set('q', search);
  }

  if (role) {
    params.set('role', role);
  }

  if (activity && activity !== 'all') {
    params.set('activity', activity);
  }

  const query = params.toString();
  return query ? '?' + query : '';
}

async function loadUsers() {
  CVQR.showMessage(usersMessage, '', 'error');

  try {
    const users = await CVQR.request('/admin/users' + buildQueryString(), {
      headers: CVQR.authHeaders()
    });
    renderUsers(users);
    CVQR.markRefreshed(refreshUsersButton);
  } catch (error) {
    CVQR.showMessage(usersMessage, error.message, 'error');
  }
}

function clearFilters() {
  userSearch.value = '';
  roleFilter.value = '';
  activityFilter.value = 'all';
  loadUsers();
}

if (CVQRAdmin.requireAdmin()) {
  loadUsers();

  userFilterForm.addEventListener('submit', function (event) {
    event.preventDefault();
    loadUsers();
  });
  roleFilter.addEventListener('change', loadUsers);
  activityFilter.addEventListener('change', loadUsers);
  refreshUsersButton.addEventListener('click', loadUsers);
  clearFiltersButton.addEventListener('click', clearFilters);
  logoutButtonUsers.addEventListener('click', CVQRAdmin.handleLogout);
}
