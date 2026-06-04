const pool = require("../config/db");
const { HttpError } = require("./httpError");

const REGISTRATION_WINDOW_SQL = `
    events.status = 'open'
    AND events.registration_opens_at <= NOW()
    AND events.registration_closes_at >= NOW()
    AND events.closed_at IS NULL
`;

const ACTIVE_EVENT_SQL = `
    events.status = 'open'
    AND events.starts_at <= NOW()
    AND events.ends_at >= NOW()
    AND events.closed_at IS NULL
`;

async function getRegisterableEvents(db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM events
         WHERE ${REGISTRATION_WINDOW_SQL}
         ORDER BY starts_at ASC, name ASC`
    );

    return rows;
}

async function getRegisterableEventById(eventId, db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM events
         WHERE id = ?
         AND ${REGISTRATION_WINDOW_SQL}
         LIMIT 1`,
        [eventId]
    );

    return rows[0] || null;
}

async function getActiveEventById(eventId, db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM events
         WHERE id = ?
         AND ${ACTIVE_EVENT_SQL}
         LIMIT 1`,
        [eventId]
    );

    return rows[0] || null;
}

async function assertRegisterableEvent(eventId, db = pool) {
    const event = await getRegisterableEventById(eventId, db);

    if (!event)
        throw new HttpError(404, "Event is not open for registration", "EVENT_NOT_REGISTERABLE");

    return event;
}

async function assertActiveEvent(eventId, db = pool) {
    const event = await getActiveEventById(eventId, db);

    if (!event)
        throw new HttpError(403, "Event is not active", "EVENT_NOT_ACTIVE");

    return event;
}

async function getCompanyEventAssignment(companyId, eventId, db = pool) {
    const [rows] = await db.query(
        `SELECT event_companies.*
         FROM event_companies
         JOIN users ON users.id = event_companies.company_id
         WHERE event_companies.company_id = ?
         AND event_companies.event_id = ?
         AND users.role = 'company'
         LIMIT 1`,
        [companyId, eventId]
    );

    return rows[0] || null;
}

async function assertCompanyAssignedToEvent(companyId, eventId, db = pool) {
    const assignment = await getCompanyEventAssignment(companyId, eventId, db);

    if (!assignment)
        throw new HttpError(403, "Company is not assigned to this event", "COMPANY_NOT_ASSIGNED");

    return assignment;
}

async function assertCompanyCanAccessEvent(companyId, eventId, db = pool) {
    const event = await assertActiveEvent(eventId, db);
    const assignment = await assertCompanyAssignedToEvent(companyId, eventId, db);

    return { event, assignment };
}

async function getOpenParticipationForStudent(studentId, db = pool) {
    const [rows] = await db.query(
        `SELECT participations.*
         FROM participations
         JOIN events ON events.id = participations.event_id
         WHERE participations.student_id = ?
         AND events.status = 'open'
         AND events.closed_at IS NULL
         ORDER BY participations.registered_at DESC
         LIMIT 1`,
        [studentId]
    );

    return rows[0] || null;
}

async function assertNoOpenParticipationForStudent(studentId, db = pool) {
    const participation = await getOpenParticipationForStudent(studentId, db);

    if (participation)
        throw new HttpError(409, "Student already has a participation in an open event", "OPEN_PARTICIPATION_EXISTS");
}

module.exports = {
    getRegisterableEvents,
    getRegisterableEventById,
    getActiveEventById,
    assertRegisterableEvent,
    assertActiveEvent,
    getCompanyEventAssignment,
    assertCompanyAssignedToEvent,
    assertCompanyCanAccessEvent,
    getOpenParticipationForStudent,
    assertNoOpenParticipationForStudent
};
