const eventForm = document.querySelector('#eventForm');
const eventFormPanel = document.querySelector('#eventFormPanel');
const eventFormTitle = document.querySelector('#eventFormTitle');
const createEventButton = document.querySelector('#createEventButton');
const saveEventButton = document.querySelector('#saveEventButton');
const cancelEditButton = document.querySelector('#cancelEditButton');
const eventMessage = document.querySelector('#eventMessage');
const eventCount = document.querySelector('#eventCount');
const eventsList = document.querySelector('#eventsList');
const refreshEventsButton = document.querySelector('#refreshButton');
const logoutButtonEvents = document.querySelector('#logoutButton');

let currentEvents = [];

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

function resetEventForm() {
  eventForm.reset();
  document.querySelector('#eventId').value = '';
  eventFormTitle.textContent = 'Create event';
  saveEventButton.textContent = 'Create event';
  eventFormPanel.classList.add('hidden');
  createEventButton.classList.remove('hidden');
  cancelEditButton.classList.add('hidden');
}

function showEventForm(mode) {
  eventFormPanel.classList.remove('hidden');
  createEventButton.classList.add('hidden');
  cancelEditButton.classList.remove('hidden');

  if (mode === 'create') {
    eventForm.reset();
    document.querySelector('#eventId').value = '';
    eventFormTitle.textContent = 'Create event';
    saveEventButton.textContent = 'Create event';
  }
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
  showEventForm('edit');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildEventCard(event) {
  const card = document.createElement('article');
  card.className = 'list-card compact-row';

  const content = document.createElement('div');
  content.appendChild(CVQRAdmin.createStatusPill(event));

  const title = document.createElement('h3');
  title.textContent = event.name || 'Untitled event';
  content.appendChild(title);

  CVQRAdmin.appendMeta(content, CVQRAdmin.formatEventWindow(event));
  CVQRAdmin.appendMeta(content, 'Registration: ' + CVQR.formatDateTime(event.registration_opens_at) + ' - ' + CVQR.formatDateTime(event.registration_closes_at));
  CVQRAdmin.appendMeta(content, 'Companies assigned: ' + (event.companies_count || 0));
  CVQRAdmin.appendMeta(content, 'Student registrations: ' + (event.participations_count || 0));

  const actionRow = document.createElement('div');
  actionRow.className = 'button-row compact-actions';

  const detailsLink = document.createElement('a');
  detailsLink.className = 'button';
  detailsLink.href = '/admin/events/detail/?id=' + encodeURIComponent(event.id);
  detailsLink.textContent = 'Details';

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

  actionRow.append(detailsLink, editButton, lifecycleButton);
  card.append(content, actionRow);
  return card;
}

function renderEvents(events) {
  CVQRAdmin.setCount(eventCount, events.length, 'result');

  if (!events.length) {
    CVQRAdmin.renderEmpty(eventsList, 'No events found.');
    return;
  }

  eventsList.innerHTML = '';
  events.forEach(function (event) {
    eventsList.appendChild(buildEventCard(event));
  });
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
  const isClosing = action === 'close';
  const confirmed = await CVQR.confirmAction({
    title: (isClosing ? 'Close' : 'Open') + ' event?',
    message: isClosing
      ? 'Close "' + event.name + '"? Company users will lose app access to this event and its scanned CVs.'
      : 'Open "' + event.name + '" for registration and scanning?',
    confirmLabel: isClosing ? 'Close event' : 'Open event',
    variant: isClosing ? 'danger' : 'default'
  });

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

    const editEventId = new URLSearchParams(window.location.search).get('edit');
    if (editEventId) {
      const event = currentEvents.find(function (item) {
        return String(item.id) === String(editEventId);
      });

      if (event) {
        fillEventForm(event);
      }
    }
  } catch (error) {
    CVQR.showMessage(eventMessage, error.message, 'error');
  }
}

if (CVQRAdmin.requireAdmin()) {
  resetEventForm();
  loadEvents();
  eventForm.addEventListener('submit', saveEvent);
  createEventButton.addEventListener('click', function () {
    showEventForm('create');
  });
  cancelEditButton.addEventListener('click', resetEventForm);
  refreshEventsButton.addEventListener('click', loadEvents);
  logoutButtonEvents.addEventListener('click', CVQRAdmin.handleLogout);
}
