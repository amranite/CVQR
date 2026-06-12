require("dotenv").config();

const pool = require("../config/db");

async function columnExists(tableName, columnName) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );

    return Number(rows[0].count) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
    if (await columnExists(tableName, columnName))
        return false;

    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    return true;
}

async function syncSchema() {
    const changes = [];

    if (await addColumnIfMissing("scan_logs", "favorited_at", "DATETIME DEFAULT NULL"))
        changes.push("scan_logs.favorited_at");

    if (await addColumnIfMissing("scan_logs", "student_revoked_at", "DATETIME DEFAULT NULL"))
        changes.push("scan_logs.student_revoked_at");

    if (await addColumnIfMissing("scan_logs", "student_restored_at", "DATETIME DEFAULT NULL"))
        changes.push("scan_logs.student_restored_at");

    if (changes.length === 0) {
        console.log("Schema is already up to date.");
        return;
    }

    console.log(`Schema updated: ${changes.join(", ")}`);
}

if (require.main === module) {
    syncSchema()
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}

module.exports = {
    syncSchema
};
