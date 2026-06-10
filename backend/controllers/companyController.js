const pool = require("../config/db");

// GET /company/events
// Returns the logged-in company user's assigned, non-closed events. The
// frontend uses is_active to decide whether scanner controls should be shown.
exports.getEvents = async (req, res) => {
    try {
        const companyId = req.user.id;

        const [rows] = await pool.query(
            `SELECT
                events.id,
                events.name,
                events.location,
                events.status,
                events.registration_opens_at,
                events.registration_closes_at,
                events.starts_at,
                events.ends_at,
                event_companies.assigned_at,
                (
                    events.status = 'open'
                    AND events.starts_at <= NOW()
                    AND events.ends_at >= NOW()
                    AND events.closed_at IS NULL
                ) AS is_active,
                (
                    events.status = 'open'
                    AND events.starts_at > NOW()
                    AND events.closed_at IS NULL
                ) AS is_future
             FROM event_companies
             JOIN events ON events.id = event_companies.event_id
             WHERE event_companies.company_id = ?
             AND events.closed_at IS NULL
             AND events.status <> 'closed'
             ORDER BY events.starts_at ASC, events.name ASC`,
            [companyId]
        );

        res.json(rows.map((row) => ({
            id: row.id,
            name: row.name,
            location: row.location,
            status: row.status,
            registration_opens_at: row.registration_opens_at,
            registration_closes_at: row.registration_closes_at,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            assigned_at: row.assigned_at,
            is_active: Boolean(row.is_active),
            is_future: Boolean(row.is_future)
        })));

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /company/scans
// Returns scans for the logged-in company only while the event is still active
// and the company remains assigned to that event.
exports.getScans = async (req, res) => {
    try {
        const companyId = req.user.id;

        const [rows] = await pool.query(
            `SELECT
                scan_logs.id,
                scan_logs.scanned_at,
                scan_logs.event_id,
                events.name AS event_name,
                events.location AS event_location,
                participations.id AS participation_id,
                students.id AS student_id,
                students.name AS student_name,
                students.email AS student_email,
                latest_versions.id AS cv_version_id,
                latest_versions.original_name,
                latest_versions.version_number,
                latest_versions.uploaded_at,
                CONCAT('/cv/participation/', participations.id, '/file') AS cv
             FROM scan_logs
             JOIN events ON events.id = scan_logs.event_id
             JOIN event_companies ON event_companies.event_id = events.id
                AND event_companies.company_id = scan_logs.company_id
             JOIN participations ON participations.id = scan_logs.participation_id
             JOIN users students ON students.id = participations.student_id
             LEFT JOIN (
                SELECT cv_versions.*
                FROM cv_versions
                JOIN (
                    SELECT cv_id, MAX(version_number) AS max_version
                    FROM cv_versions
                    GROUP BY cv_id
                ) latest ON latest.cv_id = cv_versions.cv_id
                    AND latest.max_version = cv_versions.version_number
             ) latest_versions ON latest_versions.cv_id = participations.selected_cv_id
             WHERE scan_logs.company_id = ?
             AND events.status = 'open'
             AND events.starts_at <= NOW()
             AND events.ends_at >= NOW()
             AND events.closed_at IS NULL
             ORDER BY scan_logs.scanned_at DESC`,
            [companyId]
        );

        res.json(rows.map((row) => ({
            id: row.id,
            scanned_at: row.scanned_at,
            event: {
                id: row.event_id,
                name: row.event_name,
                location: row.event_location
            },
            participation_id: row.participation_id,
            student_id: row.student_id,
            student_name: row.student_name,
            student_email: row.student_email,
            cv: row.cv,
            cv_version: row.cv_version_id
                ? {
                    id: row.cv_version_id,
                    original_name: row.original_name,
                    version_number: row.version_number,
                    uploaded_at: row.uploaded_at
                }
                : null,

            // Temporary compatibility fields for the current frontend.
            original_name: row.original_name
        })));

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
