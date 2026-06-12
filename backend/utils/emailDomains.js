const pool = require("../config/db");

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function normalizeDomain(domain) {
    return String(domain || "")
        .trim()
        .toLowerCase()
        .replace(/^@+/, "");
}

function getEmailDomain(email) {
    const normalizedEmail = normalizeEmail(email);
    const parts = normalizedEmail.split("@");

    if (parts.length !== 2)
        return "";

    return normalizeDomain(parts[1]);
}

function configuredStudentDomains() {
    return String(process.env.STUDENT_EMAIL_DOMAINS || "school.com")
        .split(",")
        .map(normalizeDomain)
        .filter(Boolean);
}

async function isStudentEmail(email, db = pool) {
    const domain = getEmailDomain(email);

    if (!domain)
        return false;

    const [rows] = await db.query(
        `SELECT id
         FROM student_email_domains
         WHERE domain = ?
         AND is_active = 1
         LIMIT 1`,
        [domain]
    );

    return rows.length > 0;
}

module.exports = {
    normalizeEmail,
    normalizeDomain,
    getEmailDomain,
    configuredStudentDomains,
    isStudentEmail
};
