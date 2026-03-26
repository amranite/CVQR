const pool = require("../config/db");

// GET /company/scans
// Returns all CVs this company has previously scanned, with student info and download path.
// Companies can only see CVs they physically scanned — scan_logs enforces this boundary.
exports.getScannedCVs = async (req, res) => {
    try {
        const companyId = req.user.id;

        // Join scan_logs to cvs and users to return full CV context per scanned entry
        const [rows] = await pool.query(
            `SELECT cvs.id AS cv_id, cvs.original_name, cvs.file_path,
                    users.name AS student_name, users.email AS student_email,
                    scan_logs.scanned_at
             FROM scan_logs
             JOIN cvs ON cvs.id = scan_logs.cv_id
             JOIN users ON users.id = cvs.user_id
             WHERE scan_logs.company_id = ?
             ORDER BY scan_logs.scanned_at DESC`,
            [companyId]
        );

        // Map file_path to the public-facing download URL
        const scans = rows.map(row => ({
            cv_id: row.cv_id,
            original_name: row.original_name,
            cv: `/uploads/${row.file_path}`,
            student_name: row.student_name,
            student_email: row.student_email,
            scanned_at: row.scanned_at
        }));

        res.json(scans);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
