const pool = require("../config/db");
const { deleteFileIfExists } = require("./cvFiles");
const { HttpError } = require("./httpError");

const MAX_RETAINED_VERSIONS = 3;

async function getStudentCv(studentId, db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM cvs
         WHERE student_id = ?
         LIMIT 1`,
        [studentId]
    );

    return rows[0] || null;
}

async function getOrCreateStudentCv(studentId, db = pool) {
    const existing = await getStudentCv(studentId, db);

    if (existing)
        return existing;

    const [result] = await db.query(
        "INSERT INTO cvs (student_id) VALUES (?)",
        [studentId]
    );

    const [rows] = await db.query(
        "SELECT * FROM cvs WHERE id = ? LIMIT 1",
        [result.insertId]
    );

    return rows[0];
}

async function getCvVersions(cvId, db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM cv_versions
         WHERE cv_id = ?
         ORDER BY version_number DESC`,
        [cvId]
    );

    return rows;
}

async function getLatestCvVersion(cvId, db = pool) {
    const [rows] = await db.query(
        `SELECT *
         FROM cv_versions
         WHERE cv_id = ?
         ORDER BY version_number DESC
         LIMIT 1`,
        [cvId]
    );

    return rows[0] || null;
}

async function getLatestCvVersionForStudent(studentId, db = pool) {
    const [rows] = await db.query(
        `SELECT cv_versions.*
         FROM cvs
         JOIN cv_versions ON cv_versions.cv_id = cvs.id
         WHERE cvs.student_id = ?
         ORDER BY cv_versions.version_number DESC
         LIMIT 1`,
        [studentId]
    );

    return rows[0] || null;
}

async function getLatestCvVersionForParticipation(participationId, db = pool) {
    const [rows] = await db.query(
        `SELECT cv_versions.*
         FROM participations
         JOIN cv_versions ON cv_versions.cv_id = participations.selected_cv_id
         WHERE participations.id = ?
         ORDER BY cv_versions.version_number DESC
         LIMIT 1`,
        [participationId]
    );

    return rows[0] || null;
}

async function getCvVersionById(versionId, db = pool) {
    const [rows] = await db.query(
        `SELECT
            cv_versions.*,
            cvs.student_id
         FROM cv_versions
         JOIN cvs ON cvs.id = cv_versions.cv_id
         WHERE cv_versions.id = ?
         LIMIT 1`,
        [versionId]
    );

    return rows[0] || null;
}

async function assertStudentOwnsCv(studentId, cvId, db = pool) {
    const [rows] = await db.query(
        `SELECT id
         FROM cvs
         WHERE id = ?
         AND student_id = ?
         LIMIT 1`,
        [cvId, studentId]
    );

    if (rows.length === 0)
        throw new HttpError(403, "CV does not belong to this student", "CV_NOT_OWNED_BY_STUDENT");
}

async function assertCvNotUsedByOpenParticipation(cvId, db = pool) {
    const [rows] = await db.query(
        `SELECT participations.id
         FROM participations
         JOIN events ON events.id = participations.event_id
         WHERE participations.selected_cv_id = ?
         AND events.status = 'open'
         AND events.closed_at IS NULL
         LIMIT 1`,
        [cvId]
    );

    if (rows.length > 0)
        throw new HttpError(409, "CV is used by an open participation", "CV_USED_BY_OPEN_PARTICIPATION");
}

async function getNextVersionNumber(cvId, db = pool) {
    const [rows] = await db.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
         FROM cv_versions
         WHERE cv_id = ?`,
        [cvId]
    );

    return rows[0].next_version;
}

async function pruneOldCvVersions(cvId, db = pool) {
    const [oldVersions] = await db.query(
        `SELECT *
         FROM cv_versions
         WHERE cv_id = ?
         ORDER BY version_number DESC
         LIMIT 18446744073709551615 OFFSET ?`,
        [cvId, MAX_RETAINED_VERSIONS]
    );

    for (const version of oldVersions) {
        await db.query("DELETE FROM cv_versions WHERE id = ?", [version.id]);
        await deleteFileIfExists(version.file_path);
    }

    return oldVersions;
}

async function addCvVersion(studentId, file, db = pool) {
    if (!file)
        throw new HttpError(400, "CV file is required", "CV_FILE_REQUIRED");

    const cv = await getOrCreateStudentCv(studentId, db);
    const nextVersion = await getNextVersionNumber(cv.id, db);

    const [result] = await db.query(
        `INSERT INTO cv_versions (cv_id, file_path, original_name, version_number)
         VALUES (?, ?, ?, ?)`,
        [cv.id, file.filename, file.originalname, nextVersion]
    );

    await pruneOldCvVersions(cv.id, db);

    const [versions] = await db.query(
        "SELECT * FROM cv_versions WHERE id = ? LIMIT 1",
        [result.insertId]
    );

    return {
        cv,
        version: versions[0]
    };
}

module.exports = {
    MAX_RETAINED_VERSIONS,
    getStudentCv,
    getOrCreateStudentCv,
    getCvVersions,
    getLatestCvVersion,
    getLatestCvVersionForStudent,
    getLatestCvVersionForParticipation,
    getCvVersionById,
    assertStudentOwnsCv,
    assertCvNotUsedByOpenParticipation,
    addCvVersion,
    pruneOldCvVersions
};
