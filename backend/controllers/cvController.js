const pool = require("../config/db");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

// POST /cv/upload
// Handles the full CV upload flow for a student:
// saves the file, creates a CV record, generates a QR token, and returns the QR code.
exports.uploadCV = async (req, res) => {
    try {
        // req.user is set by the auth middleware after verifying the JWT
        const studentId = req.user.id;

        // req.file is set by the upload middleware (multer) after saving the file to disk
        const filePath = req.file.filename;       // the generated filename on disk (UUID-based)
        const originalName = req.file.originalname; // the original filename the student uploaded

        // Generate a unique token for the QR code
        const token = uuidv4();

        // Set the QR token to expire 72 hours from now
        const expires = new Date();
        expires.setHours(expires.getHours() + 72);

        // Insert the CV record and get its new ID
        const [cvResult] = await pool.query(
            "INSERT INTO cvs (user_id, file_path, original_name) VALUES (?, ?, ?)",
            [studentId, filePath, originalName]
        );

        const cvId = cvResult.insertId;

        // Link the QR token to the CV record
        await pool.query(
            "INSERT INTO qr_tokens (cv_id, token, expires_at) VALUES (?, ?, ?)",
            [cvId, token, expires]
        );

        // Build the public URL that the QR code will point to
        const qrUrl = `http://localhost:3000/qr/${token}`;

        // Generate a QR code image as a base64 data URL
        const qrImage = await QRCode.toDataURL(qrUrl);

        res.json({
            message: "CV uploaded",
            cv: { id: cvId, original_name: originalName },
            qrUrl,
            qrImage,
            expires_at: expires
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /cv/me
// Returns the student's most recently uploaded CV along with its QR token info.
exports.getMyCV = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Join cvs and qr_tokens to return all relevant info in one response
        const [rows] = await pool.query(
            `SELECT cvs.*, qr_tokens.token, qr_tokens.expires_at
             FROM cvs
             JOIN qr_tokens ON qr_tokens.cv_id = cvs.id
             WHERE cvs.user_id = ?
             ORDER BY cvs.uploaded_at DESC
             LIMIT 1`,
            [studentId]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: "No CV found" });

        res.json(rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /cv
// Replaces the student's existing CV with a new file and refreshes the QR token.
exports.replaceCV = async (req, res) => {
    try {
        const studentId = req.user.id;
        const filePath = req.file.filename;
        const originalName = req.file.originalname;

        // Generate a fresh token so old QR codes stop working after a replacement
        const token = uuidv4();
        const expires = new Date();
        expires.setHours(expires.getHours() + 72);

        // Find the student's existing CV
        const [existing] = await pool.query(
            "SELECT id FROM cvs WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1",
            [studentId]
        );

        if (existing.length === 0)
            return res.status(404).json({ error: "No CV to replace" });

        const cvId = existing[0].id;

        // Update the CV record with the new file details
        await pool.query(
            "UPDATE cvs SET file_path = ?, original_name = ?, updated_at = NOW() WHERE id = ?",
            [filePath, originalName, cvId]
        );

        // Refresh the QR token so the new one points to the updated CV
        await pool.query(
            "UPDATE qr_tokens SET token = ?, expires_at = ? WHERE cv_id = ?",
            [token, expires, cvId]
        );

        const qrUrl = `http://localhost:3000/qr/${token}`;
        const qrImage = await QRCode.toDataURL(qrUrl);

        res.json({
            message: "CV replaced",
            qrUrl,
            qrImage,
            expires_at: expires
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /cv
// Deletes the student's CV. The associated QR token is removed automatically
// via the ON DELETE CASCADE foreign key set on the qr_tokens table.
exports.deleteCV = async (req, res) => {
    try {
        const studentId = req.user.id;

        const [result] = await pool.query(
            "DELETE FROM cvs WHERE user_id = ?",
            [studentId]
        );

        // affectedRows === 0 means no CV existed for this student
        if (result.affectedRows === 0)
            return res.status(404).json({ error: "No CV found" });

        res.json({ message: "CV deleted" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
