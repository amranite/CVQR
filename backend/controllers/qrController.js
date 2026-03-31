const pool = require("../config/db");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

// GET /qr/me
exports.getMyQR = async (req, res) => {
    try {
        const studentId = req.user.id;

        const [rows] = await pool.query(
            `SELECT qr_tokens.token, qr_tokens.expires_at
             FROM qr_tokens
             JOIN cvs ON cvs.id = qr_tokens.cv_id
             WHERE cvs.user_id = ?
             ORDER BY qr_tokens.created_at DESC
             LIMIT 1`,
            [studentId]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: "No QR code found" });

        const qrUrl = `http://localhost:3000/qr/${rows[0].token}`;
        const qrImage = await QRCode.toDataURL(qrUrl);

        res.json({
            qrUrl,
            qrImage,
            expires_at: rows[0].expires_at
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

function getOptionalUser(req) {
    const header = req.headers.authorization;

    if (!header)
        return null;

    const parts = header.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer")
        return null;

    try {
        return jwt.verify(parts[1], SECRET);
    } catch {
        return null;
    }
}

// GET /qr/:token
exports.scanQR = async (req, res) => {
    const { token } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT
                qr_tokens.token,
                qr_tokens.expires_at,
                cvs.id AS cv_id,
                cvs.file_path,
                cvs.original_name,
                users.id AS student_id,
                users.name AS student_name,
                users.email AS student_email
             FROM qr_tokens
             JOIN cvs ON cvs.id = qr_tokens.cv_id
             JOIN users ON users.id = cvs.user_id
             WHERE qr_tokens.token = ?
             AND qr_tokens.expires_at > NOW()
             LIMIT 1`,
            [token]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: "QR expired or invalid" });

        const row = rows[0];
        const optionalUser = getOptionalUser(req);

        if (optionalUser && optionalUser.role === "company") {
            await pool.query(
                `INSERT INTO scan_logs (company_id, cv_id, scanned_at)
                 VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE scanned_at = NOW()`,
                [optionalUser.id, row.cv_id]
            );
        }

        res.json({
            message: "QR valid",
            cv: `/uploads/${row.file_path}`,
            original_name: row.original_name,
            student_id: row.student_id,
            student_name: row.student_name,
            student_email: row.student_email,
            expires_at: row.expires_at
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};