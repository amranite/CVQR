const adminList = document.querySelector('#cvList');
const adminMessage = document.querySelector('#message');
const cvCount = document.querySelector('#cvCount');
const logoutButtonAdmin = document.querySelector('#logoutButton');
const refreshButton = document.querySelector('#refreshButton');
const eventForm = document.querySelector('#eventForm');
const eventFormTitle = document.querySelector('#eventFormTitle');
const saveEventButton = document.querySelector('#saveEventButton');
const cancelEditButton = document.querySelector('#cancelEditButton');
const eventMessage = document.querySelector('#eventMessage');
const eventDetailsMessage = document.querySelector('#eventDetailsMessage');
const eventCount = document.querySelector('#eventCount');
const eventsList = document.querySelector('#eventsList');
const selectedEventName = document.querySelector('#selectedEventName');
const participationsList = document.querySelector('#participationsList');
const scansList = document.querySelector('#scansList');

let currentEvents = [];
let companyUsers = [];
let selectedEventId = null;

function handleAdminLogout() {
  CVQR.clearSession();
  window.location.href = '02-login.html';
}

function appendMeta(container, text) {
  if (!text) {
    return;
  }

  const meta = document.createElement('p');
  meta.className = 'list-meta';
  meta.textContent = text;
  container.appendChild(meta);
}

function formatEventWindow(event) {
  return [
    event.location,
    CVQR.formatDateTime(event.starts_at),
    CVQR.formatDateTime(event.ends_at)
  ].filter(function (value) {
    return value && value !== '-';
  }).join(' - ');
}

function toDateTimeInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16).replace(' ', 'T');
  }

  const pad = function (number) {
    return String(number).padStart(2, '0');
  };

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + 'T' + [pad(date.getHours()), pad(date.getMinutes())].join(':');
}

function fromDateTimeInput(value) {
  return value ? value.replace('T', ' ') + ':00' : '';
}

function getEventFormPayload() {
  const formData = new FormData(eventForm);

  return {
    name: formData.get('name'),
    location: formData.get('location'),
    registration_opens_at: fromDateTimeInput(formData.get('registration_opens_at')),
    registration_closes_at: fromDateTimeInput(formData.get('registration_closes_at')),
    starts_at: fromDateTimeInput(formData.get('starts_at')),
    ends_at: fromDateTimeInput(formData.get('ends_at'))
  };
}

function renderEmpty(container, message) {
  container.innerHTML = '';

  const state = document.createElement('div');
  state.className = 'empty-state';
  state.textContent = message;
  container.appendChild(state);
}

function resetEventForm() {
  eventForm.reset();
  document.querySelector('#eventId').value = '';
  eventFormTitle.textContent = 'Create event';
  saveEventButton.textContent = 'Create event';
  cancelEditButton.classList.add('hidden');
}

function fillEventForm(event) {
  document.querySelector('#eventId').value = String(event.id);
  document.querySelector('#eventName').value = event.name || '';
  document.querySelector('#eventLocation').value = event.location || '';
  document.querySelector('#registrationOpensAt').value = toDateTimeInput(event.registration_opens_at);
  document.querySelector('#registrationClosesAt').value = toDateTimeInput(event.registration_closes_at);
  document.querySelector('#startsAt').value = toDateTimeInput(event.starts_at);
  document.querySelector('#endsAt').value = toDateTimeInput(event.ends_at);
  eventFormTitle.textContent = 'Edit event';
  saveEventButton.textContent = 'Save event';
  cancelEditButton.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = 'eyebrow';
  badge.textContent = status || 'draft';
  return badge;
}

function buildEventCard(event) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const content = document.createElement('div');
  content.appendChild(renderStatusBadge(event.status));

  const title = document.createElement('h3');
  title.textContent = event.name || 'Untitled event';
  content.appendChild(title);

  appendMeta(content, formatEventWindow(event));
  appendMeta(content, 'Registration: ' + CVQR.formatDateTime(event.registration_opens_at) + ' - ' + CVQR.formatDateTime(event.registration_closes_at));
  appendMeta(content, 'Companies assigned: ' + (event.companies_count || 0));
  appendMeta(content, 'Registrations: ' + (event.participations_count || 0));

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row';

  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'button button-secondary';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', function () {
    loadEventDetails(event);
  });

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'button button-secondary';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', function () {
    fillEventForm(event);
  });

  const lifecycleButton = document.createElement('button');
  lifecycleButton.type = 'button';
  lifecycleButton.className = event.status === 'open' ? 'button button-danger' : 'button';
  lifecycleButton.textContent = event.status === 'open' ? 'Close event' : 'Open event';
  lifecycleButton.addEventListener('click', function () {
    changeEventStatus(event, event.status === 'open' ? 'close' : 'open');
  });

  actionRow.append(detailsButton, editButton, lifecycleButton);

  const assignmentForm = document.createElement('form');
  assignmentForm.className = 'stack-form';

  const inputWrapper = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = 'Company user';
  label.setAttribute('for', 'companyId-' + event.id);

  const select = document.createElement('select');
  select.id = 'companyId-' + event.id;
  select.name = 'companyId';
  select.required = true;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = companyUsers.length ? 'Select a company user' : 'No company users available';
  select.appendChild(placeholder);

  companyUsers.forEach(function (company) {
    const option = document.createElement('option');
    option.value = company.id;
    option.textContent = company.name + ' - ' + company.email;
    select.appendChild(option);
  });

  select.disabled = companyUsers.length === 0;

  inputWrapper.append(label, select);

  const assignmentActions = document.createElement('div');
  assignmentActions.className = 'button-row';

  const assignButton = document.createElement('button');
  assignButton.type = 'submit';
  assignButton.className = 'button';
  assignButton.textContent = 'Assign';
  assignButton.disabled = companyUsers.length === 0;

  const unassignButton = document.createElement('button');
  unassignButton.type = 'button';
  unassignButton.className = 'button button-secondary';
  unassignButton.textContent = 'Unassign';
  unassignButton.disabled = companyUsers.length === 0;
  unassignButton.addEventListener('click', function () {
    if (select.value) {
      assignCompany(event.id, select.value, 'DELETE');
    }
  });

  assignmentActions.append(assignButton, unassignButton);
  assignmentForm.append(inputWrapper, assignmentActions);
  assignmentForm.addEventListener('submit', function (submitEvent) {
    submitEvent.preventDefault();
    assignCompany(event.id, select.value, 'POST');
  });

  card.append(content, actionRow, assignmentForm);
  return card;
}

function renderEvents(events) {
  eventCount.textContent = events.length + ' result' + (events.length === 1 ? '' : 's');

  if (!events.length) {
    renderEmpty(eventsList, 'No events found.');
    return;
  }

  eventsList.innerHTML = '';
  events.forEach(function (event) {
    eventsList.appendChild(buildEventCard(event));
  });
}

function buildCvCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const content = document.createElement('div');
  const latestVersion = item.latest_version || {};

  const title = document.createElement('h3');
  title.textContent = item.student_name || item.name || '-';
  content.appendChild(title);

  appendMeta(content, item.student_email || item.email || '-');
  appendMeta(content, latestVersion.original_name || item.original_name || '-');
  appendMeta(content, latestVersion.version_number ? 'Version ' + latestVersion.version_number : '');
  appendMeta(content, 'Versions retained: ' + (item.versions_count || 0));
  appendMeta(content, 'Uploaded at ' + CVQR.formatDateTime(latestVersion.uploaded_at || item.uploaded_at));
  appendMeta(content, 'Last updated ' + CVQR.formatDateTime(item.updated_at));

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row';

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
  cvCount.textContent = rows.length + ' result' + (rows.length === 1 ? '' : 's');

  if (!rows.length) {
    renderEmpty(adminList, 'No CV uploads yet.');
    return;
  }

  adminList.innerHTML = '';
  rows.forEach(function (item) {
    adminList.appendChild(buildCvCard(item));
  });
}

function buildParticipationCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = item.student_name || 'Unknown student';
  content.appendChild(title);

  appendMeta(content, item.student_email);
  appendMeta(content, item.original_name || 'No CV selected');
  appendMeta(content, item.version_number ? 'Version ' + item.version_number : '');
  appendMeta(content, item.active_qr_token ? 'QR token: ' + item.active_qr_token : 'No active QR token');
  appendMeta(content, 'Registered at ' + CVQR.formatDateTime(item.registered_at));

  card.appendChild(content);
  return card;
}

function buildScanCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = item.student_name || 'Unknown student';
  content.appendChild(title);

  appendMeta(content, item.student_email);
  appendMeta(content, 'Company: ' + [item.company_name, item.company_email].filter(Boolean).join(' - '));
  appendMeta(content, 'Scanned at ' + CVQR.formatDateTime(item.scanned_at));
  appendMeta(content, item.scanned_qr_token ? 'QR token: ' + item.scanned_qr_token : '');

  card.appendChild(content);
  return card;
}

function renderEventDetails(event, participations, scans) {
  selectedEventName.textContent = event.name + ' - ' + formatEventWindow(event);

  if (!participations.length) {
    renderEmpty(participationsList, 'No registered students yet.');
  } else {
    participationsList.innerHTML = '';
    participations.forEach(function (item) {
      participationsList.appendChild(buildParticipationCard(item));
    });
  }

  if (!scans.length) {
    renderEmpty(scansList, 'No scans recorded yet.');
  } else {
    scansList.innerHTML = '';
    scans.forEach(function (item) {
      scansList.appendChild(buildScanCard(item));
    });
  }
}

async function openAdminCv(path) {
  try {
    await CVQR.openAuthenticatedFile(path);
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

async function deleteStudentCv(studentId, studentName) {
  const confirmed = window.confirm('Delete CV for ' + studentName + '?');

  if (!confirmed) {
    return;
  }

  try {
    await CVQR.request('/admin/cv/' + studentId, {
      method: 'DELETE',
      headers: CVQR.authHeaders()
    });

    CVQR.showMessage(adminMessage, 'CV deleted.', 'success');
    await loadAdminList();
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

async function saveEvent(event) {
  event.preventDefault();
  CVQR.showMessage(eventMessage, '', 'error');

  const eventId = document.querySelector('#eventId').value;
  const payload = getEventFormPayload();

  try {
    const data = await CVQR.request(eventId ? '/admin/events/' + eventId : '/admin/events', {
      method: eventId ? 'PUT' : 'POST',
      headers: CVQR.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    CVQR.showMessage(eventMessage, data.message || 'Event saved.', 'success');
    resetEventForm();
    await loadEvents();
  } catch (error) {
    CVQR.showMessage(eventMessage, error.message, 'error');
  }
}

async function changeEventStatus(event, action) {
  const confirmed = window.confirm((action === 'open' ? 'Open' : 'Close') + ' event "' + event.name + '"?');

  if (!confirmed) {
    return;
  }

  try {
    const data = await CVQR.request('/admin/events/' + event.id + '/' + action, {
      method: 'POST',
      headers: CVQR.authHeaders()
    });

    CVQR.showMessage(eventMessage, data.message || 'Event updated.', 'success');
    await loadEvents();

    if (selectedEventId === event.id) {
      const updatedEvent = currentEvents.find(function (item) {
        return item.id === event.id;
      });

      if (updatedEvent) {
        await loadEventDetails(updatedEvent);
      }
    }
  } catch (error) {
    CVQR.showMessage(eventMessage, error.message, 'error');
  }
}

async function assignCompany(eventId, companyId, method) {
  try {
    const data = await CVQR.request('/admin/events/' + eventId + '/companies/' + companyId, {
      method,
      headers: CVQR.authHeaders()
    });

    CVQR.showMessage(eventMessage, data.message || 'Company assignment updated.', 'success');
    await loadEvents();
  } catch (error) {
    CVQR.showMessage(eventMessage, error.message, 'error');
  }
}

async function loadEvents() {
  try {
    currentEvents = await CVQR.request('/admin/events', {
      headers: CVQR.authHeaders()
    });

    renderEvents(currentEvents);
  } catch (error) {
    CVQR.showMessage(eventMessage, error.message, 'error');
  }
}

async function loadCompanies() {
  try {
    companyUsers = await CVQR.request('/admin/companies', {
      headers: CVQR.authHeaders()
    });
  } catch (error) {
    CVQR.showMessage(eventMessage, error.message, 'error');
  }
}

async function loadEventDetails(event) {
  selectedEventId = event.id;
  CVQR.showMessage(eventDetailsMessage, '', 'error');

  try {
    const participations = await CVQR.request('/admin/events/' + event.id + '/participations', {
      headers: CVQR.authHeaders()
    });
    const scans = await CVQR.request('/admin/events/' + event.id + '/scans', {
      headers: CVQR.authHeaders()
    });

    renderEventDetails(event, participations, scans);
  } catch (error) {
    CVQR.showMessage(eventDetailsMessage, error.message, 'error');
  }
}

async function loadAdminList() {
  CVQR.showMessage(adminMessage, '', 'error');

  try {
    const rows = await CVQR.request('/admin/cvs', {
      headers: CVQR.authHeaders()
    });

    renderCvList(rows);
  } catch (error) {
    CVQR.showMessage(adminMessage, error.message, 'error');
  }
}

async function refreshAdminDashboard() {
  await Promise.all([
    loadCompanies(),
    loadAdminList()
  ]);
  await loadEvents();
}

if (CVQR.requireRole('admin', '02-login.html')) {
  refreshAdminDashboard();
  eventForm.addEventListener('submit', saveEvent);
  cancelEditButton.addEventListener('click', resetEventForm);
  refreshButton.addEventListener('click', refreshAdminDashboard);
  logoutButtonAdmin.addEventListener('click', handleAdminLogout);
}
