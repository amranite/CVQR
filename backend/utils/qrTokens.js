const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db");
const { HttpError } = require("./httpError");

function buildQrUrl(token) {
    return `${process.env.BASE_URL}/qr/${token}`;
}

async function buildQrPayload(token) {
    const qrUrl = buildQrUrl(token);
    const qrImage = await QRCode.toDataURL(qrUrl);

    return {
        qrUrl,
        qrImage
    };
}

async function getActiveQrTokenForParticipation(participationId, db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM qr_tokens
         WHERE participation_id = ?
         AND revoked_at IS NULL
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [participationId]
    );

    return rows[0] || null;
}

async function getQrTokenForScan(token, db = pool) {
    const [rows] = await db.query(
        `SELECT
            qr_tokens.*,
            participations.student_id,
            participations.event_id,
            participations.selected_cv_id
         FROM qr_tokens
         JOIN participations ON participations.id = qr_tokens.participation_id
         WHERE qr_tokens.token = ?
         AND qr_tokens.revoked_at IS NULL
         LIMIT 1`,
        [token]
    );

    return rows[0] || null;
}

async function assertActiveQrToken(token, db = pool) {
    const qrToken = await getQrTokenForScan(token, db);

    if (!qrToken)
        throw new HttpError(404, "QR expired or invalid", "QR_INVALID");

    if (!qrToken.selected_cv_id)
        throw new HttpError(409, "Participation has no selected CV", "PARTICIPATION_HAS_NO_CV");

    return qrToken;
}

async function revokeActiveQrTokens(participationId, reason = "replaced", db = pool) {
    await db.query(
        `UPDATE qr_tokens
         SET revoked_at = NOW(),
             revoked_reason = ?
         WHERE participation_id = ?
         AND revoked_at IS NULL`,
        [reason, participationId]
    );
}

async function createQrTokenForParticipation(participationId, db = pool) {
    const token = uuidv4();

    const [result] = await db.query(
        "INSERT INTO qr_tokens (participation_id, token) VALUES (?, ?)",
        [participationId, token]
    );

    const [rows] = await db.query(
        "SELECT * FROM qr_tokens WHERE id = ? LIMIT 1",
        [result.insertId]
    );

    return rows[0];
}

async function rotateQrTokenForParticipation(participationId, reason = "replaced", db = pool) {
    await revokeActiveQrTokens(participationId, reason, db);
    return createQrTokenForParticipation(participationId, db);
}

async function getOrCreateActiveQrTokenForParticipation(participationId, db = pool) {
    const existing = await getActiveQrTokenForParticipation(participationId, db);

    if (existing)
        return existing;

    return createQrTokenForParticipation(participationId, db);
}

module.exports = {
    buildQrUrl,
    buildQrPayload,
    getActiveQrTokenForParticipation,
    getQrTokenForScan,
    assertActiveQrToken,
    revokeActiveQrTokens,
    createQrTokenForParticipation,
    rotateQrTokenForParticipation,
    getOrCreateActiveQrTokenForParticipation
};
