const pool = require("../config/db");
const {
    assertCvNotUsedByOpenParticipation,
    getCvVersions,
    getLatestCvVersion,
    getStudentCv
} = require("../utils/cvVersions");
const { deleteFileIfExists } = require("../utils/cvFiles");
const { isHttpError } = require("../utils/httpError");

const EVENT_STATUSES = new Set(["draft", "open", "closed"]);
const EVENT_FIELDS = [
    "name",
    "location",
    "registration_opens_at",
    "registration_closes_at",
    "starts_at",
    "ends_at"
];

function handleControllerError(res, err) {
    if (isHttpError(err))
        return res.status(err.status).json({ error: err.message, code: err.code });

    res.status(500).json({ error: err.message });
}

function requireValue(body, field) {
    if (body[field] === undefined || body[field] === null || body[field] === "")
        throw Object.assign(new Error(`${field} is required`), { status: 400 });

    return body[field];
}

function handleValidationError(res, err) {
    if (err.status)
        return res.status(err.status).json({ error: err.message });

    return handleControllerError(res, err);
}

function mapCvListRow(row) {
    return {
        cv_id: row.cv_id,
        student_id: row.student_id,
        student_name: row.student_name,
        student_email: row.student_email,
        created_at: row.created_at,
        updated_at: row.updated_at,
        versions_count: row.versions_count,
        latest_version: row.latest_version_id
            ? {
                id: row.latest_version_id,
                file_path: row.file_path,
                original_name: row.original_name,
                version_number: row.version_number,
                uploaded_at: row.uploaded_at
            }
            : null,

        // Temporary compatibility fields for the current admin frontend.
        name: row.student_name,
        email: row.student_email,
        original_name: row.original_name,
        uploaded_at: row.uploaded_at,
        cv: row.file_path ? `/cv/version/${row.latest_version_id}/file` : null
    };
}

async function getEventById(eventId, db = pool) {
    const [rows] = await db.query(
        "SELECT * FROM events WHERE id = ? LIMIT 1",
        [eventId]
    );

    return rows[0] || null;
}

async function assertEventExists(eventId, db = pool) {
    const event = await getEventById(eventId, db);

    if (!event) {
        const err = new Error("Event not found");
        err.status = 404;
        throw err;
    }

    return event;
}

async function assertCompanyUser(companyId, db = pool) {
    const [rows] = await db.query(
        "SELECT id, name, email, role FROM users WHERE id = ? AND role = 'company' LIMIT 1",
        [companyId]
    );

    if (rows.length === 0) {
        const err = new Error("Company user not found");
        err.status = 404;
        throw err;
    }

    return rows[0];
}

async function getEventSummaryById(eventId, db = pool) {
    const [rows] = await db.query(
        `SELECT
            events.*,
            creators.name AS created_by_name,
            COUNT(DISTINCT participations.id) AS participations_count,
            COUNT(DISTINCT event_companies.id) AS companies_count
         FROM events
         LEFT JOIN users creators ON creators.id = events.created_by
         LEFT JOIN participations ON participations.event_id = events.id
         LEFT JOIN event_companies ON event_companies.event_id = events.id
         WHERE events.id = ?
         GROUP BY events.id, creators.name
         LIMIT 1`,
        [eventId]
    );

    return rows[0] || null;
}

async function getAssignedCompaniesForEvent(eventId, db = pool) {
    const [rows] = await db.query(
        `SELECT
            users.id,
            users.name,
            users.email,
            event_companies.assigned_at
         FROM event_companies
         JOIN users ON users.id = event_companies.company_id
         WHERE event_companies.event_id = ?
         ORDER BY users.name ASC, users.email ASC`,
        [eventId]
    );

    return rows;
}

// GET /admin/cvs
exports.getAllCvs = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                cvs.id AS cv_id,
                cvs.student_id,
                students.name AS student_name,
                students.email AS student_email,
                cvs.created_at,
                cvs.updated_at,
                COUNT(cv_versions.id) AS versions_count,
                latest_versions.id AS latest_version_id,
                latest_versions.file_path,
                latest_versions.original_name,
                latest_versions.version_number,
                latest_versions.uploaded_at
             FROM cvs
             JOIN users students ON students.id = cvs.student_id
             LEFT JOIN cv_versions ON cv_versions.cv_id = cvs.id
             LEFT JOIN (
                SELECT cv_versions.*
                FROM cv_versions
                JOIN (
                    SELECT cv_id, MAX(version_number) AS max_version
                    FROM cv_versions
                    GROUP BY cv_id
                ) latest ON latest.cv_id = cv_versions.cv_id
                    AND latest.max_version = cv_versions.version_number
             ) latest_versions ON latest_versions.cv_id = cvs.id
             GROUP BY
                cvs.id,
                cvs.student_id,
                students.name,
                students.email,
                cvs.created_at,
                cvs.updated_at,
                latest_versions.id,
                latest_versions.file_path,
                latest_versions.original_name,
                latest_versions.version_number,
                latest_versions.uploaded_at
             ORDER BY COALESCE(latest_versions.uploaded_at, cvs.created_at) DESC`
        );

        res.json(rows.map(mapCvListRow));

    } catch (err) {
        handleControllerError(res, err);
    }
};

// DELETE /admin/cv/:studentId
exports.deleteStudentCv = async (req, res) => {
    const { studentId } = req.params;
    const connection = await pool.getConnection();

    try {
        const cv = await getStudentCv(studentId, connection);

        if (!cv)
            return res.status(404).json({ error: "No CV found" });

        await assertCvNotUsedByOpenParticipation(cv.id, connection);

        const latestVersion = await getLatestCvVersion(cv.id, connection);
        const versions = await getCvVersions(cv.id, connection);

        await connection.beginTransaction();

        await connection.query(
            `UPDATE participations
             JOIN events ON events.id = participations.event_id
             SET participations.selected_cv_id = NULL
             WHERE participations.selected_cv_id = ?
             AND NOT (
                events.status = 'open'
                AND events.closed_at IS NULL
             )`,
            [cv.id]
        );

        await connection.query(
            "DELETE FROM cvs WHERE id = ? AND student_id = ?",
            [cv.id, studentId]
        );

        await connection.commit();

        for (const version of versions) {
            await deleteFileIfExists(version.file_path);
        }

        res.json({
            message: "CV deleted",
            deleted_latest_version: latestVersion || null
        });

    } catch (err) {
        await connection.rollback();
        handleControllerError(res, err);
    } finally {
        connection.release();
    }
};

// GET /admin/companies
// Returns company user accounts that can be assigned to events.
exports.getCompanyUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                users.id,
                users.name,
                users.email,
                users.created_at,
                COUNT(event_companies.id) AS assigned_events_count
             FROM users
             LEFT JOIN event_companies ON event_companies.company_id = users.id
             WHERE users.role = 'company'
             GROUP BY users.id, users.name, users.email, users.created_at
             ORDER BY users.name ASC, users.email ASC`
        );

        res.json(rows);

    } catch (err) {
        handleControllerError(res, err);
    }
};

// GET /admin/events
exports.getEvents = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                events.*,
                creators.name AS created_by_name,
                COUNT(DISTINCT participations.id) AS participations_count,
                COUNT(DISTINCT event_companies.id) AS companies_count
             FROM events
             LEFT JOIN users creators ON creators.id = events.created_by
             LEFT JOIN participations ON participations.event_id = events.id
             LEFT JOIN event_companies ON event_companies.event_id = events.id
             GROUP BY events.id, creators.name
             ORDER BY events.starts_at DESC, events.id DESC`
        );

        res.json(rows);

    } catch (err) {
        handleControllerError(res, err);
    }
};

// GET /admin/events/:eventId
exports.getEventDetails = async (req, res) => {
    const { eventId } = req.params;

    try {
        const event = await getEventSummaryById(eventId);

        if (!event)
            return res.status(404).json({ error: "Event not found" });

        const assignedCompanies = await getAssignedCompaniesForEvent(eventId);

        res.json({
            ...event,
            assigned_companies: assignedCompanies
        });

    } catch (err) {
        handleControllerError(res, err);
    }
};

// POST /admin/events
exports.createEvent = async (req, res) => {
    try {
        const body = req.body;
        const status = body.status || "draft";

        if (!EVENT_STATUSES.has(status))
            return res.status(400).json({ error: "Invalid event status" });

        const values = [
            requireValue(body, "name"),
            requireValue(body, "location"),
            status,
            requireValue(body, "registration_opens_at"),
            requireValue(body, "registration_closes_at"),
            requireValue(body, "starts_at"),
            requireValue(body, "ends_at"),
            req.user.id
        ];

        const [result] = await pool.query(
            `INSERT INTO events (
                name,
                location,
                status,
                registration_opens_at,
                registration_closes_at,
                starts_at,
                ends_at,
                created_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            values
        );

        const event = await getEventById(result.insertId);

        res.status(201).json({
            message: "Event created",
            event
        });

    } catch (err) {
        handleValidationError(res, err);
    }
};

// PUT /admin/events/:eventId
exports.updateEvent = async (req, res) => {
    const { eventId } = req.params;

    try {
        await assertEventExists(eventId);

        const fields = EVENT_FIELDS.filter((field) => req.body[field] !== undefined);

        if (fields.length === 0)
            return res.status(400).json({ error: "No event fields provided" });

        const setSql = fields.map((field) => `${field} = ?`).join(", ");
        const values = fields.map((field) => req.body[field]);

        await pool.query(
            `UPDATE events
             SET ${setSql}
             WHERE id = ?`,
            [...values, eventId]
        );

        const event = await getEventById(eventId);

        res.json({
            message: "Event updated",
            event
        });

    } catch (err) {
        handleValidationError(res, err);
    }
};

// POST /admin/events/:eventId/open
exports.openEvent = async (req, res) => {
    const { eventId } = req.params;

    try {
        await assertEventExists(eventId);

        await pool.query(
            `UPDATE events
             SET status = 'open',
                 closed_at = NULL
             WHERE id = ?`,
            [eventId]
        );

        const event = await getEventById(eventId);

        res.json({
            message: "Event opened",
            event
        });

    } catch (err) {
        handleValidationError(res, err);
    }
};

// POST /admin/events/:eventId/close
exports.closeEvent = async (req, res) => {
    const { eventId } = req.params;

    try {
        await assertEventExists(eventId);

        await pool.query(
            `UPDATE events
             SET status = 'closed',
                 closed_at = NOW()
             WHERE id = ?`,
            [eventId]
        );

        const event = await getEventById(eventId);

        res.json({
            message: "Event closed",
            event
        });

    } catch (err) {
        handleValidationError(res, err);
    }
};

// POST /admin/events/:eventId/companies/:companyId
exports.assignCompanyToEvent = async (req, res) => {
    const { eventId, companyId } = req.params;

    try {
        const event = await assertEventExists(eventId);
        const company = await assertCompanyUser(companyId);

        await pool.query(
            `INSERT INTO event_companies (event_id, company_id, assigned_by)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                assigned_by = VALUES(assigned_by),
                assigned_at = NOW()`,
            [eventId, companyId, req.user.id]
        );

        res.json({
            message: "Company assigned to event",
            event,
            company
        });

    } catch (err) {
        handleValidationError(res, err);
    }
};

// DELETE /admin/events/:eventId/companies/:companyId
exports.unassignCompanyFromEvent = async (req, res) => {
    const { eventId, companyId } = req.params;

    try {
        await assertEventExists(eventId);
        await assertCompanyUser(companyId);

        const [result] = await pool.query(
            `DELETE FROM event_companies
             WHERE event_id = ?
             AND company_id = ?`,
            [eventId, companyId]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ error: "Company assignment not found" });

        res.json({ message: "Company unassigned from event" });

    } catch (err) {
        handleValidationError(res, err);
    }
};

// PUT /admin/events/:eventId/companies
exports.updateEventCompanies = async (req, res) => {
    const { eventId } = req.params;
    const companyIds = Array.isArray(req.body.company_ids) ? req.body.company_ids : null;
    const connection = await pool.getConnection();

    try {
        if (!companyIds)
            return res.status(400).json({ error: "company_ids must be an array" });

        const normalizedCompanyIds = [...new Set(companyIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

        if (normalizedCompanyIds.length !== companyIds.length)
            return res.status(400).json({ error: "company_ids must contain only company user IDs" });

        await connection.beginTransaction();
        await assertEventExists(eventId, connection);

        if (normalizedCompanyIds.length > 0) {
            const [validCompanies] = await connection.query(
                "SELECT id FROM users WHERE role = 'company' AND id IN (?)",
                [normalizedCompanyIds]
            );
            const validCompanyIds = new Set(validCompanies.map((company) => Number(company.id)));

            if (validCompanyIds.size !== normalizedCompanyIds.length) {
                const err = new Error("One or more company users could not be found");
                err.status = 400;
                throw err;
            }
        }

        await connection.query(
            "DELETE FROM event_companies WHERE event_id = ?",
            [eventId]
        );

        if (normalizedCompanyIds.length > 0) {
            await connection.query(
                `INSERT INTO event_companies (event_id, company_id, assigned_by)
                 VALUES ?`,
                [normalizedCompanyIds.map((companyId) => [eventId, companyId, req.user.id])]
            );
        }

        await connection.commit();

        const event = await getEventSummaryById(eventId);
        const assignedCompanies = await getAssignedCompaniesForEvent(eventId);

        res.json({
            message: "Company assignments updated",
            event: {
                ...event,
                assigned_companies: assignedCompanies
            }
        });

    } catch (err) {
        await connection.rollback();
        handleValidationError(res, err);
    } finally {
        connection.release();
    }
};

// GET /admin/registrations
exports.getRegistrationsOverview = async (req, res) => {
    try {
        const [studentParticipations] = await pool.query(
            `SELECT
                participations.id,
                participations.registered_at,
                participations.updated_at,
                events.id AS event_id,
                events.name AS event_name,
                events.location AS event_location,
                events.status AS event_status,
                events.starts_at,
                events.ends_at,
                students.id AS student_id,
                students.name AS student_name,
                students.email AS student_email,
                latest_versions.original_name,
                latest_versions.version_number,
                latest_versions.uploaded_at,
                active_qr_tokens.token AS active_qr_token
             FROM participations
             JOIN events ON events.id = participations.event_id
             JOIN users students ON students.id = participations.student_id
             LEFT JOIN cvs ON cvs.id = participations.selected_cv_id
             LEFT JOIN (
                SELECT cv_versions.*
                FROM cv_versions
                JOIN (
                    SELECT cv_id, MAX(version_number) AS max_version
                    FROM cv_versions
                    GROUP BY cv_id
                ) latest ON latest.cv_id = cv_versions.cv_id
                    AND latest.max_version = cv_versions.version_number
             ) latest_versions ON latest_versions.cv_id = cvs.id
             LEFT JOIN qr_tokens active_qr_tokens
                ON active_qr_tokens.participation_id = participations.id
                AND active_qr_tokens.revoked_at IS NULL
             ORDER BY events.starts_at DESC, students.name ASC`
        );

        const [companyAssignments] = await pool.query(
            `SELECT
                event_companies.id,
                event_companies.assigned_at,
                events.id AS event_id,
                events.name AS event_name,
                events.location AS event_location,
                events.status AS event_status,
                events.starts_at,
                events.ends_at,
                companies.id AS company_id,
                companies.name AS company_name,
                companies.email AS company_email
             FROM event_companies
             JOIN events ON events.id = event_companies.event_id
             JOIN users companies ON companies.id = event_companies.company_id
             ORDER BY events.starts_at DESC, companies.name ASC`
        );

        res.json({
            student_participations: studentParticipations,
            company_assignments: companyAssignments
        });

    } catch (err) {
        handleControllerError(res, err);
    }
};

// GET /admin/events/:eventId/participations
exports.getEventParticipations = async (req, res) => {
    const { eventId } = req.params;

    try {
        await assertEventExists(eventId);

        const [rows] = await pool.query(
            `SELECT
                participations.id,
                participations.registered_at,
                participations.updated_at,
                students.id AS student_id,
                students.name AS student_name,
                students.email AS student_email,
                cvs.id AS cv_id,
                latest_versions.id AS latest_version_id,
                latest_versions.original_name,
                latest_versions.version_number,
                latest_versions.uploaded_at,
                active_qr_tokens.token AS active_qr_token
             FROM participations
             JOIN users students ON students.id = participations.student_id
             LEFT JOIN cvs ON cvs.id = participations.selected_cv_id
             LEFT JOIN (
                SELECT cv_versions.*
                FROM cv_versions
                JOIN (
                    SELECT cv_id, MAX(version_number) AS max_version
                    FROM cv_versions
                    GROUP BY cv_id
                ) latest ON latest.cv_id = cv_versions.cv_id
                    AND latest.max_version = cv_versions.version_number
             ) latest_versions ON latest_versions.cv_id = cvs.id
             LEFT JOIN qr_tokens active_qr_tokens
                ON active_qr_tokens.participation_id = participations.id
                AND active_qr_tokens.revoked_at IS NULL
             WHERE participations.event_id = ?
             ORDER BY students.name ASC, participations.registered_at ASC`,
            [eventId]
        );

        res.json(rows);

    } catch (err) {
        handleValidationError(res, err);
    }
};

// GET /admin/events/:eventId/scans
exports.getEventScans = async (req, res) => {
    const { eventId } = req.params;

    try {
        await assertEventExists(eventId);

        const [rows] = await pool.query(
            `SELECT
                scan_logs.id,
                scan_logs.scanned_at,
                companies.id AS company_id,
                companies.name AS company_name,
                companies.email AS company_email,
                participations.id AS participation_id,
                students.id AS student_id,
                students.name AS student_name,
                students.email AS student_email,
                qr_tokens.token AS scanned_qr_token
             FROM scan_logs
             JOIN users companies ON companies.id = scan_logs.company_id
             JOIN participations ON participations.id = scan_logs.participation_id
             JOIN users students ON students.id = participations.student_id
             JOIN qr_tokens ON qr_tokens.id = scan_logs.qr_token_id
             WHERE scan_logs.event_id = ?
             ORDER BY scan_logs.scanned_at DESC`,
            [eventId]
        );

        res.json(rows);

    } catch (err) {
        handleValidationError(res, err);
    }
};
