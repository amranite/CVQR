const eventDetailMessage = document.querySelector('#eventDetailMessage');
const eventTitle = document.querySelector('#eventTitle');
const eventSubtitle = document.querySelector('#eventSubtitle');
const eventSummary = document.querySelector('#eventSummary');
const editEventLink = document.querySelector('#editEventLink');
const lifecycleDetailButton = document.querySelector('#lifecycleButton');
const assignmentSummary = document.querySelector('#assignmentSummary');
const assignmentMessage = document.querySelector('#assignmentMessage');
const companiesChecklist = document.querySelector('#companiesChecklist');
const saveAssignmentsButton = document.querySelector('#saveAssignmentsButton');
const selectAllCompaniesButton = document.querySelector('#selectAllCompaniesButton');
const clearCompaniesButton = document.querySelector('#clearCompaniesButton');
const participationCount = document.querySelector('#participationCount');
const participationsList = document.querySelector('#participationsList');
const scanCount = document.querySelector('#scanCount');
const scansList = document.querySelector('#scansList');
const logoutButtonEventDetail = document.querySelector('#logoutButton');

const eventId = new URLSearchParams(window.location.search).get('id');
let currentEvent = null;
let companyUsers = [];

function renderEventSummary(event) {
  eventTitle.textContent = event.name || 'Event detail';
  eventSubtitle.textContent = CVQRAdmin.formatEventWindow(event);
  editEventLink.href = '/admin/events/?edit=' + encodeURIComponent(event.id);
  lifecycleDetailButton.className = event.status === 'open' ? 'button button-danger' : 'button';
  lifecycleDetailButton.textContent = event.status === 'open' ? 'Close event' : 'Open event';

  eventSummary.innerHTML = '';
  const statusItem = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = 'Status';
  description.appendChild(CVQRAdmin.createStatusPill(event));
  statusItem.append(term, description);

  eventSummary.append(
    statusItem,
    CVQRAdmin.detailItem('Location', event.location),
    CVQRAdmin.detailItem('Registration', CVQR.formatDateTime(event.registration_opens_at) + ' - ' + CVQR.formatDateTime(event.registration_closes_at)),
    CVQRAdmin.detailItem('Event time', CVQR.formatDateTime(event.starts_at) + ' - ' + CVQR.formatDateTime(event.ends_at)),
    CVQRAdmin.detailItem('Students', String(event.participations_count || 0)),
    CVQRAdmin.detailItem('Companies', String(event.companies_count || 0))
  );
}

function buildCompanyCheckbox(company, assignedIds) {
  const label = document.createElement('label');
  label.className = 'checkbox-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = String(company.id);
  checkbox.checked = assignedIds.has(Number(company.id));

  const body = document.createElement('span');
  const name = document.createElement('strong');
  const meta = document.createElement('small');
  name.textContent = company.name || 'Unnamed company';
  meta.textContent = company.email;

  body.append(name, meta);
  label.append(checkbox, body);
  return label;
}

function renderCompanyAssignments(event, companies) {
  const assignedIds = new Set((event.assigned_companies || []).map(function (company) {
    return Number(company.id);
  }));

  assignmentSummary.textContent = assignedIds.size + ' of ' + companies.length + ' company account' + (companies.length === 1 ? '' : 's') + ' assigned.';

  if (!companies.length) {
    CVQRAdmin.renderEmpty(companiesChecklist, 'No company accounts are available yet.');
    return;
  }

  companiesChecklist.innerHTML = '';
  companies.forEach(function (company) {
    companiesChecklist.appendChild(buildCompanyCheckbox(company, assignedIds));
  });
}

function buildParticipationCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const title = document.createElement('h3');
  title.textContent = item.student_name || 'Unknown student';
  card.appendChild(title);
  CVQRAdmin.appendMeta(card, item.student_email);
  CVQRAdmin.appendMeta(card, item.original_name || 'No CV selected');
  CVQRAdmin.appendMeta(card, item.version_number ? 'Version ' + item.version_number : '');
  CVQRAdmin.appendMeta(card, item.active_qr_token ? 'QR token: ' + item.active_qr_token : 'No active QR token');
  CVQRAdmin.appendMeta(card, 'Registered at ' + CVQR.formatDateTime(item.registered_at));
  return card;
}

function renderParticipations(items) {
  CVQRAdmin.setCount(participationCount, items.length, 'result');

  if (!items.length) {
    CVQRAdmin.renderEmpty(participationsList, 'No registered students yet.');
    return;
  }

  participationsList.innerHTML = '';
  items.forEach(function (item) {
    participationsList.appendChild(buildParticipationCard(item));
  });
}

function buildScanCard(item) {
  const card = document.createElement('article');
  card.className = 'list-card';

  const title = document.createElement('h3');
  title.textContent = item.student_name || 'Unknown student';
  card.appendChild(title);
  CVQRAdmin.appendMeta(card, item.student_email);
  CVQRAdmin.appendMeta(card, 'Company: ' + [item.company_name, item.company_email].filter(Boolean).join(' - '));
  CVQRAdmin.appendMeta(card, 'Scanned at ' + CVQR.formatDateTime(item.scanned_at));
  CVQRAdmin.appendMeta(card, item.scanned_qr_token ? 'QR token: ' + item.scanned_qr_token : '');
  return card;
}

function renderScans(items) {
  CVQRAdmin.setCount(scanCount, items.length, 'result');

  if (!items.length) {
    CVQRAdmin.renderEmpty(scansList, 'No scans recorded yet.');
    return;
  }

  scansList.innerHTML = '';
  items.forEach(function (item) {
    scansList.appendChild(buildScanCard(item));
  });
}

function selectedCompanyIds() {
  return Array.from(companiesChecklist.querySelectorAll('input[type="checkbox"]:checked')).map(function (checkbox) {
    return Number(checkbox.value);
  });
}

async function changeEventStatus() {
  if (!currentEvent) {
    return;
  }

  const action = currentEvent.status === 'open' ? 'close' : 'open';
  const isClosing = action === 'close';
  const confirmed = await CVQR.confirmAction({
    title: (isClosing ? 'Close' : 'Open') + ' event?',
    message: isClosing
      ? 'Close "' + currentEvent.name + '"? Company users will lose app access to this event and its scanned CVs.'
      : 'Open "' + currentEvent.name + '" for registration and scanning?',
    confirmLabel: isClosing ? 'Close event' : 'Open event',
    variant: isClosing ? 'danger' : 'default'
  });

  if (!confirmed) {
    return;
  }

  try {
    const data = await CVQR.request('/admin/events/' + currentEvent.id + '/' + action, {
      method: 'POST',
      headers: CVQR.authHeaders()
    });
    CVQR.showMessage(eventDetailMessage, data.message || 'Event updated.', 'success');
    await loadEventDetail();
  } catch (error) {
    CVQR.showMessage(eventDetailMessage, error.message, 'error');
  }
}

async function saveCompanyAssignments() {
  if (!currentEvent) {
    return;
  }

  saveAssignmentsButton.disabled = true;
  CVQR.showMessage(assignmentMessage, '', 'error');

  try {
    const data = await CVQR.request('/admin/events/' + currentEvent.id + '/companies', {
      method: 'PUT',
      headers: CVQR.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ company_ids: selectedCompanyIds() })
    });

    await loadEventDetail({ preserveAssignmentMessage: true });
    CVQR.showMessage(assignmentMessage, data.message || 'Company assignments updated.', 'success');
  } catch (error) {
    CVQR.showMessage(assignmentMessage, error.message, 'error');
  } finally {
    saveAssignmentsButton.disabled = false;
  }
}

async function loadEventDetail(options) {
  const settings = options || {};
  CVQR.showMessage(eventDetailMessage, '', 'error');

  if (!settings.preserveAssignmentMessage) {
    CVQR.showMessage(assignmentMessage, '', 'error');
  }

  if (!eventId) {
    CVQR.showMessage(eventDetailMessage, 'Missing event ID.', 'error');
    return;
  }

  try {
    const [event, companies, participations, scans] = await Promise.all([
      CVQR.request('/admin/events/' + eventId, { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/companies', { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/events/' + eventId + '/participations', { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/events/' + eventId + '/scans', { headers: CVQR.authHeaders() })
    ]);

    currentEvent = event;
    companyUsers = companies;
    renderEventSummary(event);
    renderCompanyAssignments(event, companyUsers);
    renderParticipations(participations);
    renderScans(scans);
  } catch (error) {
    CVQR.showMessage(eventDetailMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  loadEventDetail();
  lifecycleDetailButton.addEventListener('click', changeEventStatus);
  saveAssignmentsButton.addEventListener('click', saveCompanyAssignments);
  selectAllCompaniesButton.addEventListener('click', function () {
    companiesChecklist.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      checkbox.checked = true;
    });
  });
  clearCompaniesButton.addEventListener('click', function () {
    companiesChecklist.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      checkbox.checked = false;
    });
  });
  logoutButtonEventDetail.addEventListener('click', CVQRAdmin.handleLogout);
}
