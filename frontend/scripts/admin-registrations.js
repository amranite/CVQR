const registrationsMessage = document.querySelector('#registrationsMessage');
const registrationTotalCount = document.querySelector('#registrationTotalCount');
const studentRegistrationCount = document.querySelector('#studentRegistrationCount');
const companyAssignmentCount = document.querySelector('#companyAssignmentCount');
const studentRegistrationsSection = document.querySelector('#studentRegistrationsSection');
const companyAssignmentsSection = document.querySelector('#companyAssignmentsSection');
const studentRegistrationsList = document.querySelector('#studentRegistrationsList');
const companyAssignmentsList = document.querySelector('#companyAssignmentsList');
const registrationFilterForm = document.querySelector('#registrationFilterForm');
const registrationSearch = document.querySelector('#registrationSearch');
const recordTypeFilter = document.querySelector('#recordTypeFilter');
const eventStatusFilter = document.querySelector('#eventStatusFilter');
const clearRegistrationFiltersButton = document.querySelector('#clearRegistrationFiltersButton');
const refreshRegistrationsButton = document.querySelector('#refreshButton');
const logoutButtonRegistrations = document.querySelector('#logoutButton');

let registrationData = {
  student_participations: [],
  company_assignments: []
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

function activeType() {
  return recordTypeFilter.value || 'all';
}

function activeStatus() {
  return eventStatusFilter.value || 'all';
}

function matchesSearch(item, fields) {
  const query = normalize(registrationSearch.value.trim());

  if (!query) {
    return true;
  }

  return fields.some(function (field) {
    return normalize(item[field]).includes(query);
  });
}

function matchesStatus(item) {
  const status = activeStatus();
  return status === 'all' || item.event_status === status;
}

function eventLabel(item) {
  return [
    item.event_name,
    item.event_location
  ].filter(function (value) {
    return Boolean(value);
  }).join(' - ') || 'Unknown event';
}

function buildStudentRegistrationCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  content.appendChild(CVQRAdmin.createStatusPill({
    status: item.event_status,
    starts_at: item.starts_at,
    ends_at: item.ends_at
  }));

  const title = document.createElement('h3');
  title.textContent = item.student_name || 'Unknown student';
  content.appendChild(title);
  CVQRAdmin.appendMeta(content, item.student_email);
  CVQRAdmin.appendMeta(content, eventLabel(item));
  CVQRAdmin.appendMeta(content, item.original_name || 'No CV selected');
  CVQRAdmin.appendMeta(content, item.active_qr_token ? 'Active QR token present' : 'No active QR token');
  CVQRAdmin.appendMeta(content, 'Registered at ' + CVQR.formatDateTime(item.registered_at));

  const action = document.createElement('a');
  action.className = 'button button-secondary';
  action.href = '/admin/events/detail/?id=' + encodeURIComponent(item.event_id);
  action.textContent = 'Event details';

  card.append(content, action);
  return card;
}

function buildCompanyAssignmentCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  content.appendChild(CVQRAdmin.createStatusPill({
    status: item.event_status,
    starts_at: item.starts_at,
    ends_at: item.ends_at
  }));

  const title = document.createElement('h3');
  title.textContent = item.company_name || 'Unknown company';
  content.appendChild(title);
  CVQRAdmin.appendMeta(content, item.company_email);
  CVQRAdmin.appendMeta(content, eventLabel(item));
  CVQRAdmin.appendMeta(content, 'Event: ' + CVQR.formatDateTime(item.starts_at) + ' - ' + CVQR.formatDateTime(item.ends_at));
  CVQRAdmin.appendMeta(content, 'Assigned at ' + CVQR.formatDateTime(item.assigned_at));

  const action = document.createElement('a');
  action.className = 'button button-secondary';
  action.href = '/admin/events/detail/?id=' + encodeURIComponent(item.event_id);
  action.textContent = 'Event details';

  card.append(content, action);
  return card;
}

function renderStudentRegistrations(items) {
  CVQRAdmin.setCount(studentRegistrationCount, items.length, 'result');

  if (!items.length) {
    CVQRAdmin.renderEmpty(studentRegistrationsList, 'No student participations match these filters.');
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
    CVQRAdmin.renderEmpty(companyAssignmentsList, 'No company assignments match these filters.');
    return;
  }

  companyAssignmentsList.innerHTML = '';
  items.forEach(function (item) {
    companyAssignmentsList.appendChild(buildCompanyAssignmentCard(item));
  });
}

function filterStudentParticipations() {
  if (activeType() === 'companies') {
    return [];
  }

  return registrationData.student_participations.filter(function (item) {
    return matchesStatus(item) && matchesSearch(item, [
      'student_name',
      'student_email',
      'event_name',
      'event_location',
      'original_name',
      'active_qr_token'
    ]);
  });
}

function filterCompanyAssignments() {
  if (activeType() === 'students') {
    return [];
  }

  return registrationData.company_assignments.filter(function (item) {
    return matchesStatus(item) && matchesSearch(item, [
      'company_name',
      'company_email',
      'event_name',
      'event_location'
    ]);
  });
}

function renderFilteredRegistrations() {
  const students = filterStudentParticipations();
  const companies = filterCompanyAssignments();
  const type = activeType();

  studentRegistrationsSection.classList.toggle('hidden', type === 'companies');
  companyAssignmentsSection.classList.toggle('hidden', type === 'students');
  CVQRAdmin.setCount(registrationTotalCount, students.length + companies.length, 'result');
  renderStudentRegistrations(students);
  renderCompanyAssignments(companies);
}

async function loadRegistrations() {
  CVQR.showMessage(registrationsMessage, '', 'error');

  try {
    const data = await CVQR.request('/admin/registrations', {
      headers: CVQR.authHeaders()
    });

    registrationData = {
      student_participations: data.student_participations || [],
      company_assignments: data.company_assignments || []
    };
    renderFilteredRegistrations();
    CVQR.markRefreshed(refreshRegistrationsButton);
  } catch (error) {
    CVQR.showMessage(registrationsMessage, error.message, 'error');
  }
}

function clearFilters() {
  registrationSearch.value = '';
  recordTypeFilter.value = 'all';
  eventStatusFilter.value = 'all';
  renderFilteredRegistrations();
}

if (CVQRAdmin.requireAdmin()) {
  loadRegistrations();
  registrationFilterForm.addEventListener('submit', function (event) {
    event.preventDefault();
    renderFilteredRegistrations();
  });
  recordTypeFilter.addEventListener('change', renderFilteredRegistrations);
  eventStatusFilter.addEventListener('change', renderFilteredRegistrations);
  clearRegistrationFiltersButton.addEventListener('click', clearFilters);
  refreshRegistrationsButton.addEventListener('click', loadRegistrations);
  logoutButtonRegistrations.addEventListener('click', CVQRAdmin.handleLogout);
}
