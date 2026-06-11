const dashboardMessage = document.querySelector('#dashboardMessage');
const refreshDashboardButton = document.querySelector('#refreshButton');
const logoutButtonDashboard = document.querySelector('#logoutButton');
const eventsMetric = document.querySelector('#eventsMetric');
const eventsHint = document.querySelector('#eventsHint');
const companiesMetric = document.querySelector('#companiesMetric');
const companiesHint = document.querySelector('#companiesHint');
const cvsMetric = document.querySelector('#cvsMetric');
const cvsHint = document.querySelector('#cvsHint');
const registrationsMetric = document.querySelector('#registrationsMetric');
const registrationsHint = document.querySelector('#registrationsHint');
const priorityEventsList = document.querySelector('#priorityEventsList');

function setMetric(metric, hint, value, text) {
  metric.textContent = String(value);
  hint.textContent = text;
}

function buildPriorityEventCard(event) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  content.appendChild(CVQRAdmin.createStatusPill(event));

  const title = document.createElement('h3');
  title.textContent = event.name || 'Untitled event';
  content.appendChild(title);
  CVQRAdmin.appendMeta(content, CVQRAdmin.formatEventWindow(event));
  CVQRAdmin.appendMeta(content, (event.participations_count || 0) + ' student registrations');
  CVQRAdmin.appendMeta(content, (event.companies_count || 0) + ' assigned companies');

  const action = document.createElement('a');
  action.className = 'button button-secondary';
  action.href = '/admin/events/detail/?id=' + encodeURIComponent(event.id);
  action.append(CVQRAdmin.createIcon('fa-solid fa-arrow-right'), 'Details');

  card.append(content, action);
  return card;
}

function renderPriorityEvents(events) {
  const priorityEvents = events
    .filter(function (event) {
      return event.status === 'open' && CVQRAdmin.eventTiming(event) !== 'past';
    })
    .slice(0, 4);

  if (!priorityEvents.length) {
    CVQRAdmin.renderEmpty(priorityEventsList, 'No live or upcoming open events.');
    return;
  }

  priorityEventsList.innerHTML = '';
  priorityEvents.forEach(function (event) {
    priorityEventsList.appendChild(buildPriorityEventCard(event));
  });
}

async function loadDashboard() {
  CVQR.showMessage(dashboardMessage, '', 'error');

  try {
    const [events, companies, cvs, registrations] = await Promise.all([
      CVQR.request('/admin/events', { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/companies', { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/cvs', { headers: CVQR.authHeaders() }),
      CVQR.request('/admin/registrations', { headers: CVQR.authHeaders() })
    ]);

    const liveEvents = events.filter(function (event) {
      return CVQRAdmin.eventTiming(event) === 'live';
    }).length;

    setMetric(eventsMetric, eventsHint, events.length, liveEvents + ' live');
    setMetric(companiesMetric, companiesHint, companies.length, 'company accounts');
    setMetric(cvsMetric, cvsHint, cvs.length, 'student CV records');
    setMetric(
      registrationsMetric,
      registrationsHint,
      registrations.student_participations.length,
      registrations.company_assignments.length + ' company assignments'
    );

    renderPriorityEvents(events);
  } catch (error) {
    CVQR.showMessage(dashboardMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  loadDashboard();
  refreshDashboardButton.addEventListener('click', loadDashboard);
  logoutButtonDashboard.addEventListener('click', CVQRAdmin.handleLogout);
}
