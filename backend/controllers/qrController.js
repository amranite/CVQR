const pool = require("../config/db");
const QRCode = require("qrcode");

// GET /qr/me
// Returns the QR code for the student's current CV.
// Useful for displaying the QR on the student's profile screen.
exports.getMyQR = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Find the most recent QR token linked to this student's CV
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

        // Build the URL the QR code encodes and generate the image
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

// GET /qr/:token
// Public endpoint, no authentication required.
// This is what a company hits after scanning a student's QR code.
// Returns the CV file path if the token is valid and not expired.
exports.scanQR = async (req, res) => {
    const { token } = req.params;

    try {
        // Look up the token and join to the CV, only match if not expired
        const [rows] = await pool.query(
            `SELECT qr_tokens.*, cvs.file_path, cvs.original_name
             FROM qr_tokens
             JOIN cvs ON cvs.id = qr_tokens.cv_id
             WHERE qr_tokens.token = ?
             AND qr_tokens.expires_at > NOW()`,
            [token]
        );

        // No result means the token doesn't exist or has expired
        if (rows.length === 0)
            return res.status(404).json({ error: "QR expired or invalid" });

        res.json({
            message: "QR valid",
            cv: `/uploads/${rows[0].file_path}`, // relative path to access the PDF
            original_name: rows[0].original_name
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
