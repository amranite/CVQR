const pool = require("../config/db");
const {
    assertNoOpenParticipationForStudent,
    assertRegisterableEvent,
    getOpenParticipationForStudent
} = require("../utils/eventAccess");
const {
    getLatestCvVersion,
    getStudentCv
} = require("../utils/cvVersions");
const {
    buildQrPayload,
    getActiveQrTokenForParticipation,
    getOrCreateActiveQrTokenForParticipation
} = require("../utils/qrTokens");
const { HttpError, isHttpError } = require("../utils/httpError");

function handleControllerError(res, err) {
    if (isHttpError(err))
        return res.status(err.status).json({ error: err.message, code: err.code });

    if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ error: "Student is already registered for this event" });

    res.status(500).json({ error: err.message });
}

async function getParticipationDetails(participationId, db = pool) {
    const [rows] = await db.query(
        `SELECT
            participations.id,
            participations.student_id,
            participations.event_id,
            participations.selected_cv_id,
            participations.registered_at,
            participations.updated_at,
            events.name AS event_name,
            events.location AS event_location,
            events.status AS event_status,
            events.registration_opens_at,
            events.registration_closes_at,
            events.starts_at,
            events.ends_at,
            events.closed_at,
            cv_versions.id AS latest_version_id,
            cv_versions.file_path,
            cv_versions.original_name,
            cv_versions.version_number,
            cv_versions.uploaded_at,
            qr_tokens.id AS qr_token_id,
            qr_tokens.token AS qr_token,
            qr_tokens.created_at AS qr_created_at
         FROM participations
         JOIN events ON events.id = participations.event_id
         LEFT JOIN (
            SELECT cv_versions.*
            FROM cv_versions
            JOIN (
                SELECT cv_id, MAX(version_number) AS max_version
                FROM cv_versions
                GROUP BY cv_id
            ) latest ON latest.cv_id = cv_versions.cv_id
                AND latest.max_version = cv_versions.version_number
         ) cv_versions ON cv_versions.cv_id = participations.selected_cv_id
         LEFT JOIN qr_tokens ON qr_tokens.participation_id = participations.id
            AND qr_tokens.revoked_at IS NULL
         WHERE participations.id = ?
         LIMIT 1`,
        [participationId]
    );

    return rows[0] || null;
}

async function getCurrentParticipationDetails(studentId, db = pool) {
    const participation = await getOpenParticipationForStudent(studentId, db);

    if (!participation)
        return null;

    return getParticipationDetails(participation.id, db);
}

async function mapParticipationResponse(row, includeQrImage = false) {
    if (!row)
        return null;

    let qr = null;

    if (row.qr_token) {
        const payload = includeQrImage
            ? await buildQrPayload(row.qr_token)
            : { qrUrl: `${process.env.BASE_URL}/qr/${row.qr_token}` };

        qr = {
            id: row.qr_token_id,
            token: row.qr_token,
            created_at: row.qr_created_at,
            ...payload
        };
    }

    return {
        id: row.id,
        student_id: row.student_id,
        registered_at: row.registered_at,
        updated_at: row.updated_at,
        event: {
            id: row.event_id,
            name: row.event_name,
            location: row.event_location,
            status: row.event_status,
            registration_opens_at: row.registration_opens_at,
            registration_closes_at: row.registration_closes_at,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            closed_at: row.closed_at
        },
        cv: row.selected_cv_id
            ? {
                id: row.selected_cv_id,
                latest_version: row.latest_version_id
                    ? {
                        id: row.latest_version_id,
                        file_path: row.file_path,
                        original_name: row.original_name,
                        version_number: row.version_number,
                        uploaded_at: row.uploaded_at
                    }
                    : null
            }
            : null,
        qr
    };
}

async function selectStudentCvForParticipation(studentId, participationId, db = pool) {
    const cv = await getStudentCv(studentId, db);

    if (!cv)
        throw new HttpError(409, "Upload a CV before generating a QR code", "CV_REQUIRED");

    const latestVersion = await getLatestCvVersion(cv.id, db);

    if (!latestVersion)
        throw new HttpError(409, "Upload a CV version before generating a QR code", "CV_VERSION_REQUIRED");

    await db.query(
        `UPDATE participations
         SET selected_cv_id = ?
         WHERE id = ?
         AND student_id = ?
         AND selected_cv_id IS NULL`,
        [cv.id, participationId, studentId]
    );

    return cv;
}

// GET /participations/me
// Returns the student's participation in the currently open event, if any.
exports.getMyParticipation = async (req, res) => {
    try {
        const participation = await getCurrentParticipationDetails(req.user.id);

        if (!participation)
            return res.status(404).json({ error: "No open participation found" });

        res.json(await mapParticipationResponse(participation));

    } catch (err) {
        handleControllerError(res, err);
    }
};

// POST /participations
// Self-registers the student for a registerable event. If the student already
// has a CV version, it is selected immediately and a participation QR is issued.
exports.registerForEvent = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const studentId = req.user.id;
        const eventId = req.body.event_id;

        if (!eventId)
            return res.status(400).json({ error: "event_id is required" });

        await connection.beginTransaction();

        await assertRegisterableEvent(eventId, connection);
        await assertNoOpenParticipationForStudent(studentId, connection);

        const cv = await getStudentCv(studentId, connection);
        const latestVersion = cv ? await getLatestCvVersion(cv.id, connection) : null;

        const [result] = await connection.query(
            `INSERT INTO participations (student_id, event_id, selected_cv_id)
             VALUES (?, ?, ?)`,
            [studentId, eventId, latestVersion ? cv.id : null]
        );

        if (latestVersion)
            await getOrCreateActiveQrTokenForParticipation(result.insertId, connection);

        await connection.commit();

        const participation = await getParticipationDetails(result.insertId);

        res.status(201).json({
            message: "Participation created",
            participation: await mapParticipationResponse(participation, true)
        });

    } catch (err) {
        await connection.rollback();
        handleControllerError(res, err);
    } finally {
        connection.release();
    }
};

// GET /participations/me/qr
// Returns the current participation QR if one already exists.
exports.getMyParticipationQr = async (req, res) => {
    try {
        const participation = await getOpenParticipationForStudent(req.user.id);

        if (!participation)
            return res.status(404).json({ error: "No open participation found" });

        const qrToken = await getActiveQrTokenForParticipation(participation.id);

        if (!qrToken)
            return res.status(404).json({ error: "No QR code found for this participation" });

        res.json({
            participation_id: participation.id,
            token: qrToken.token,
            created_at: qrToken.created_at,
            ...(await buildQrPayload(qrToken.token))
        });

    } catch (err) {
        handleControllerError(res, err);
    }
};

// POST /participations/me/qr
// Selects the student's CV for the current open participation if needed, then
// creates or returns the active QR token for that participation.
exports.generateMyParticipationQr = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const studentId = req.user.id;
        const participation = await getOpenParticipationForStudent(studentId, connection);

        if (!participation)
            return res.status(404).json({ error: "No open participation found" });

        await connection.beginTransaction();

        if (!participation.selected_cv_id)
            await selectStudentCvForParticipation(studentId, participation.id, connection);

        const qrToken = await getOrCreateActiveQrTokenForParticipation(participation.id, connection);

        await connection.commit();

        const details = await getParticipationDetails(participation.id);

        res.json({
            message: "Participation QR ready",
            participation: await mapParticipationResponse(details, true),
            qr: {
                participation_id: participation.id,
                token: qrToken.token,
                created_at: qrToken.created_at,
                ...(await buildQrPayload(qrToken.token))
            }
        });

    } catch (err) {
        await connection.rollback();
        handleControllerError(res, err);
    } finally {
        connection.release();
    }
};
