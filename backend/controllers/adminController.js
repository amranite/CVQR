const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

function deleteFileIfExists(fileName) {
    return new Promise((resolve, reject) => {
        const fullPath = path.join(__dirname, "..", "uploads", fileName);

        fs.unlink(fullPath, (err) => {
            if (err && err.code !== "ENOENT") {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

// GET /admin/cvs
exports.getAllCvs = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                cvs.id AS cv_id,
                cvs.user_id AS student_id,
                users.name,
                users.email,
                cvs.original_name,
                cvs.uploaded_at,
                cvs.updated_at,
                CONCAT('/uploads/', cvs.file_path) AS cv
             FROM cvs
             JOIN users ON users.id = cvs.user_id
             ORDER BY cvs.uploaded_at DESC`
        );

        res.json(rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /admin/cv/:studentId
exports.deleteStudentCv = async (req, res) => {
    const { studentId } = req.params;

    try {
        const [rows] = await pool.query(
            "SELECT id, file_path FROM cvs WHERE user_id = ?",
            [studentId]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: "No CV found" });

        await pool.query(
            "DELETE FROM cvs WHERE user_id = ?",
            [studentId]
        );

        for (const row of rows) {
            await deleteFileIfExists(row.file_path);
        }

        res.json({ message: "CV deleted" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};