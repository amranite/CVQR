const assignmentsMessage = document.querySelector('#assignmentsMessage');
const assignmentCount = document.querySelector('#assignmentCount');
const assignmentsList = document.querySelector('#assignmentsList');
const refreshAssignmentsButton = document.querySelector('#refreshButton');
const logoutButtonAssignments = document.querySelector('#logoutButton');

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

async function loadAssignmentsPage() {
  CVQR.showMessage(assignmentsMessage, '', 'error');

  try {
    const registrations = await CVQR.request('/admin/registrations', {
      headers: CVQR.authHeaders()
    });

    renderAssignments(registrations.company_assignments);
  } catch (error) {
    CVQR.showMessage(assignmentsMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  loadAssignmentsPage();
  refreshAssignmentsButton.addEventListener('click', loadAssignmentsPage);
  logoutButtonAssignments.addEventListener('click', CVQRAdmin.handleLogout);
}
