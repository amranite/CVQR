const companiesMessage = document.querySelector('#companiesMessage');
const companyCount = document.querySelector('#companyCount');
const assignmentCount = document.querySelector('#assignmentCount');
const companiesList = document.querySelector('#companiesList');
const assignmentsList = document.querySelector('#assignmentsList');
const refreshCompaniesButton = document.querySelector('#refreshButton');
const logoutButtonCompanies = document.querySelector('#logoutButton');

function buildCompanyCard(company) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = company.name || 'Unnamed company';
  content.appendChild(title);
  CVQRAdmin.appendMeta(content, company.email);
  CVQRAdmin.appendMeta(content, (company.assigned_events_count || 0) + ' event assignment' + (Number(company.assigned_events_count) === 1 ? '' : 's'));
  CVQRAdmin.appendMeta(content, 'Created at ' + CVQR.formatDateTime(company.created_at));

  card.appendChild(content);
  return card;
}

function buildAssignmentCard(item) {
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

function renderCompanies(companies) {
  CVQRAdmin.setCount(companyCount, companies.length, 'result');

  if (!companies.length) {
    CVQRAdmin.renderEmpty(companiesList, 'No company accounts yet.');
    return;
  }

  companiesList.innerHTML = '';
  companies.forEach(function (company) {
    companiesList.appendChild(buildCompanyCard(company));
  });
}

function renderAssignments(assignments) {
  CVQRAdmin.setCount(assignmentCount, assignments.length, 'result');

  if (!assignments.length) {
    CVQRAdmin.renderEmpty(assignmentsList, 'No company event assignments yet.');
    return;
  }

  assignmentsList.innerHTML = '';
  assignments.forEach(function (item) {
    assignmentsList.appendChild(buildAssignmentCard(item));
  });
}

async function loadCompaniesPage() {
  CVQR.showMessage(companiesMessage, '', 'error');

  try {
    const [companies, registrations] = await Promise.all([
      CVQR.request('/admin/companies', { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/registrations', { headers: CVQR.authHeaders() })
    ]);

    renderCompanies(companies);
    renderAssignments(registrations.company_assignments);
  } catch (error) {
    CVQR.showMessage(companiesMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  loadCompaniesPage();
  refreshCompaniesButton.addEventListener('click', loadCompaniesPage);
  logoutButtonCompanies.addEventListener('click', CVQRAdmin.handleLogout);
}
