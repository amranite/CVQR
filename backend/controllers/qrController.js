const pool = require("../config/db");
const {
    assertCompanyCanAccessEvent,
    getOpenParticipationForStudent
} = require("../utils/eventAccess");
const { getLatestCvVersionForParticipation } = require("../utils/cvVersions");
const {
    assertActiveQrToken,
    buildQrPayload,
    getActiveQrTokenForParticipation
} = require("../utils/qrTokens");
const { isHttpError } = require("../utils/httpError");

function handleControllerError(res, err) {
    if (isHttpError(err))
        return res.status(err.status).json({ error: err.message, code: err.code });

    res.status(500).json({ error: err.message });
}

async function getStudentParticipationQr(studentId) {
    const participation = await getOpenParticipationForStudent(studentId);

    if (!participation)
        return null;

    const qrToken = await getActiveQrTokenForParticipation(participation.id);

    if (!qrToken)
        return null;

    return {
        participation,
        qrToken
    };
}

async function getScanDetails(qrToken) {
    const [rows] = await pool.query(
        `SELECT
            participations.id AS participation_id,
            participations.event_id,
            users.id AS student_id,
            users.name AS student_name,
            users.email AS student_email,
            events.name AS event_name,
            events.location AS event_location
         FROM participations
         JOIN users ON users.id = participations.student_id
         JOIN events ON events.id = participations.event_id
         WHERE participations.id = ?
         LIMIT 1`,
        [qrToken.participation_id]
    );

    return rows[0] || null;
}

async function logCompanyScan(companyId, qrToken, scanDetails) {
    await pool.query(
        `INSERT INTO scan_logs (
            company_id,
            event_id,
            participation_id,
            qr_token_id,
            scanned_at
         ) VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
            event_id = VALUES(event_id),
            qr_token_id = VALUES(qr_token_id),
            scanned_at = NOW()`,
        [
            companyId,
            scanDetails.event_id,
            scanDetails.participation_id,
            qrToken.id
        ]
    );

    const [rows] = await pool.query(
        `SELECT id, scanned_at, favorited_at
         FROM scan_logs
         WHERE company_id = ?
         AND participation_id = ?
         LIMIT 1`,
        [companyId, scanDetails.participation_id]
    );

    return rows[0] || null;
}

// GET /qr/me
// Student retrieves the active QR code for their current open participation.
exports.getMyQR = async (req, res) => {
    try {
        const result = await getStudentParticipationQr(req.user.id);

        if (!result)
            return res.status(404).json({ error: "No QR code found" });

        res.json({
            participation_id: result.participation.id,
            token: result.qrToken.token,
            created_at: result.qrToken.created_at,
            ...(await buildQrPayload(result.qrToken.token))
        });

    } catch (err) {
        handleControllerError(res, err);
    }
};

// GET /qr/:token
// Company-only scan endpoint. The company must be assigned to the active event.
exports.scanQR = async (req, res) => {
    const { token } = req.params;

    try {
        const qrToken = await assertActiveQrToken(token);
        await assertCompanyCanAccessEvent(req.user.id, qrToken.event_id);

        const latestVersion = await getLatestCvVersionForParticipation(qrToken.participation_id);

        if (!latestVersion)
            return res.status(404).json({ error: "CV version not found" });

        const scanDetails = await getScanDetails(qrToken);

        if (!scanDetails)
            return res.status(404).json({ error: "Participation not found" });

        const scanLog = await logCompanyScan(req.user.id, qrToken, scanDetails);

        res.json({
            message: "QR valid",
            scan_id: scanLog ? scanLog.id : null,
            scanned_at: scanLog ? scanLog.scanned_at : null,
            favorited_at: scanLog ? scanLog.favorited_at : null,
            is_favorite: Boolean(scanLog && scanLog.favorited_at),
            participation_id: scanDetails.participation_id,
            event: {
                id: scanDetails.event_id,
                name: scanDetails.event_name,
                location: scanDetails.event_location
            },
            cv: `/cv/participation/${scanDetails.participation_id}/file`,
            cv_version: {
                id: latestVersion.id,
                original_name: latestVersion.original_name,
                version_number: latestVersion.version_number,
                uploaded_at: latestVersion.uploaded_at
            },
            original_name: latestVersion.original_name,
            student_id: scanDetails.student_id,
            student_name: scanDetails.student_name,
            student_email: scanDetails.student_email
        });

    } catch (err) {
        handleControllerError(res, err);
    }
};
