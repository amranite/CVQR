require("dotenv").config();

const pool = require("../config/db");
const { configuredStudentDomains } = require("../utils/emailDomains");

async function tableExists(tableName) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
        [tableName]
    );

    return Number(rows[0].count) > 0;
}

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

async function createStudentEmailDomainsTableIfMissing() {
    if (await tableExists("student_email_domains"))
        return false;

    await pool.query(
        `CREATE TABLE student_email_domains (
            id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
            domain     VARCHAR(255) NOT NULL,
            is_active  TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_student_email_domains_domain (domain),
            KEY idx_student_email_domains_active (is_active)
        )`
    );

    return true;
}

async function seedConfiguredStudentDomains() {
    const domains = configuredStudentDomains();
    const inserted = [];

    for (const domain of domains) {
        const [result] = await pool.query(
            `INSERT INTO student_email_domains (domain, is_active)
             VALUES (?, 1)
             ON DUPLICATE KEY UPDATE
                domain = VALUES(domain)`,
            [domain]
        );

        if (result.affectedRows === 1)
            inserted.push(domain);
    }

    return inserted;
}

async function syncSchema() {
    const changes = [];

    if (await createStudentEmailDomainsTableIfMissing())
        changes.push("student_email_domains");

    const seededDomains = await seedConfiguredStudentDomains();
    seededDomains.forEach((domain) => changes.push(`student_email_domains:${domain}`));

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
