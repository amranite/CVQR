const registrationsMessage = document.querySelector('#registrationsMessage');
const studentRegistrationCount = document.querySelector('#studentRegistrationCount');
const companyAssignmentCount = document.querySelector('#companyAssignmentCount');
const studentRegistrationsList = document.querySelector('#studentRegistrationsList');
const companyAssignmentsList = document.querySelector('#companyAssignmentsList');
const refreshRegistrationsButton = document.querySelector('#refreshButton');
const logoutButtonRegistrations = document.querySelector('#logoutButton');

function buildStudentRegistrationCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = item.student_name || 'Unknown student';
  content.appendChild(title);
  CVQRAdmin.appendMeta(content, item.student_email);
  CVQRAdmin.appendMeta(content, item.event_name + ' - ' + item.event_location);
  CVQRAdmin.appendMeta(content, item.original_name || 'No CV selected');
  CVQRAdmin.appendMeta(content, item.active_qr_token ? 'Active QR token present' : 'No active QR token');
  CVQRAdmin.appendMeta(content, 'Registered at ' + CVQR.formatDateTime(item.registered_at));

  const action = document.createElement('a');
  action.className = 'button button-secondary';
  action.href = '/admin/events/detail/?id=' + encodeURIComponent(item.event_id);
  action.textContent = 'Event';

  card.append(content, action);
  return card;
}

function buildCompanyAssignmentCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = item.company_name || 'Unknown company';
  content.appendChild(title);
  CVQRAdmin.appendMeta(content, item.company_email);
  CVQRAdmin.appendMeta(content, item.event_name + ' - ' + item.event_location);
  CVQRAdmin.appendMeta(content, 'Event: ' + CVQR.formatDateTime(item.starts_at) + ' - ' + CVQR.formatDateTime(item.ends_at));
  CVQRAdmin.appendMeta(content, 'Assigned at ' + CVQR.formatDateTime(item.assigned_at));

  const action = document.createElement('a');
  action.className = 'button button-secondary';
  action.href = '/admin/events/detail/?id=' + encodeURIComponent(item.event_id);
  action.textContent = 'Event';

  card.append(content, action);
  return card;
}

function renderStudentRegistrations(items) {
  CVQRAdmin.setCount(studentRegistrationCount, items.length, 'result');

  if (!items.length) {
    CVQRAdmin.renderEmpty(studentRegistrationsList, 'No student participations yet.');
    return;
  }

  studentRegistrationsList.innerHTML = '';
  items.forEach(function (item) {
    studentRegistrationsList.appendChild(buildStudentRegistrationCard(item));
  });
}

function renderCompanyAssignments(items) {
  CVQRAdmin.setCount(companyAssignmentCount, items.length, 'result');

  if (!items.length) {
    CVQRAdmin.renderEmpty(companyAssignmentsList, 'No company assignments yet.');
    return;
  }

  companyAssignmentsList.innerHTML = '';
  items.forEach(function (item) {
    companyAssignmentsList.appendChild(buildCompanyAssignmentCard(item));
  });
}

async function loadRegistrations() {
  CVQR.showMessage(registrationsMessage, '', 'error');

  try {
    const data = await CVQR.request('/admin/registrations', {
      headers: CVQR.authHeaders()
    });

    renderStudentRegistrations(data.student_participations);
    renderCompanyAssignments(data.company_assignments);
  } catch (error) {
    CVQR.showMessage(registrationsMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  loadRegistrations();
  refreshRegistrationsButton.addEventListener('click', loadRegistrations);
  logoutButtonRegistrations.addEventListener('click', CVQRAdmin.handleLogout);
}
