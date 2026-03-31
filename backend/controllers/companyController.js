const pool = require("../config/db");

// GET /company/scans
exports.getScans = async (req, res) => {
    try {
        const companyId = req.user.id;

        const [rows] = await pool.query(
            `SELECT
                scan_logs.id,
                scan_logs.scanned_at,
                cvs.id AS cv_id,
                cvs.user_id AS student_id,
                users.name AS student_name,
                users.email AS student_email,
                cvs.original_name,
                CONCAT('/uploads/', cvs.file_path) AS cv
             FROM scan_logs
             JOIN cvs ON cvs.id = scan_logs.cv_id
             JOIN users ON users.id = cvs.user_id
             WHERE scan_logs.company_id = ?
             ORDER BY scan_logs.scanned_at DESC`,
            [companyId]
        );

        res.json(rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};