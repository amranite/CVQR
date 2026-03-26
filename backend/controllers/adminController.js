const pool = require("../config/db");

// GET /admin/cvs
// Returns all CVs in the system with the owning student's name and email.
// Useful for event oversight — admins can see every CV that has been uploaded.
exports.listAllCVs = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT cvs.id, cvs.original_name, cvs.uploaded_at,
                    users.id AS student_id, users.name, users.email
             FROM cvs
             JOIN users ON users.id = cvs.user_id
             ORDER BY cvs.uploaded_at DESC`
        );

        res.json(rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /admin/cv/:userId
// Deletes the CV belonging to the given student.
// The associated QR token is removed automatically via ON DELETE CASCADE.
exports.deleteCVByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const [result] = await pool.query(
            "DELETE FROM cvs WHERE user_id = ?",
            [userId]
        );

        // affectedRows === 0 means the student either doesn't exist or has no CV
        if (result.affectedRows === 0)
            return res.status(404).json({ error: "No CV found for this user" });

        res.json({ message: "CV deleted by admin" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
