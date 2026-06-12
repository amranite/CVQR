require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { uploadDir } = require("../utils/cvFiles");

const DEMO_PASSWORD = "DemoPassword123!";
const DEMO_FILE_PREFIX = "demo-cvqr";

const DEMO_USERS = [
    { key: "admin", name: "Demo Admin", email: "admin.demo@cvqr.local", role: "admin" },
    { key: "student1", name: "Alex Peeters", email: "student1@school.com", role: "student" },
    { key: "student2", name: "Maya Janssens", email: "student2@school.com", role: "student" },
    { key: "student3", name: "Noah Dubois", email: "student3@school.com", role: "student" },
    { key: "student4", name: "Lina Vermeulen", email: "student4@school.com", role: "student" },
    { key: "company1", name: "GitHub Brussels HR", email: "github.brussels@example.com", role: "company" },
    { key: "company2", name: "GitHub Antwerp HR", email: "github.antwerp@example.com", role: "company" },
    { key: "company3", name: "Unassigned Company Demo", email: "unassigned.company@example.com", role: "company" }
];

const DEMO_EVENT_NAMES = [
    "Demo Business Meets Students - Brussels",
    "Demo Business Meets Students - Antwerp",
    "Demo Business Meets Students - Past Edition"
];

function mysqlDate(offsetMs) {
    return new Date(Date.now() + offsetMs)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
}

function day(days) {
    return days * 24 * 60 * 60 * 1000;
}

function hour(hours) {
    return hours * 60 * 60 * 1000;
}

function buildPdf(label) {
    const safeLabel = String(label).replace(/[()\\]/g, "");
    const stream = `BT
/F1 20 Tf
72 720 Td
(${safeLabel}) Tj
ET
`;
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        `<< /Length ${Buffer.byteLength(stream)} >>
stream
${stream}endstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`;

    return Buffer.from(pdf);
}

async function writeDemoPdf(fileName, label) {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buildPdf(label));
}

async function deleteFiles(fileNames) {
    await Promise.all(fileNames.map(async (fileName) => {
        try {
            if (path.basename(fileName) !== fileName) {
                return;
            }

            await fs.unlink(path.join(uploadDir, fileName));
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }));
}

async function removeExistingDemoData() {
    const demoEmails = DEMO_USERS.map((user) => user.email);

    const [fileRows] = await pool.query(
        `SELECT DISTINCT cv_versions.file_path
         FROM cv_versions
         JOIN cvs ON cvs.id = cv_versions.cv_id
         JOIN users ON users.id = cvs.student_id
         WHERE users.email IN (${demoEmails.map(() => "?").join(",")})
         OR cv_versions.file_path LIKE ?`,
        [...demoEmails, `${DEMO_FILE_PREFIX}-%`]
    );

    await pool.query(
        `DELETE FROM events WHERE name IN (${DEMO_EVENT_NAMES.map(() => "?").join(",")})`,
        DEMO_EVENT_NAMES
    );

    await pool.query(
        `DELETE FROM users WHERE email IN (${demoEmails.map(() => "?").join(",")})`,
        demoEmails
    );

    await deleteFiles(fileRows.map((row) => row.file_path).filter(Boolean));
}

async function insertUsers() {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const usersByKey = {};

    for (const user of DEMO_USERS) {
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [user.name, user.email, passwordHash, user.role]
        );

        usersByKey[user.key] = {
            ...user,
            id: result.insertId
        };
    }

    return usersByKey;
}

async function insertEvents(adminId) {
    const eventDefinitions = [
        {
            key: "live",
            name: DEMO_EVENT_NAMES[0],
            location: "Brussels",
            status: "open",
            registration_opens_at: mysqlDate(-day(14)),
            registration_closes_at: mysqlDate(day(2)),
            starts_at: mysqlDate(-hour(2)),
            ends_at: mysqlDate(hour(6)),
            closed_at: null
        },
        {
            key: "future",
            name: DEMO_EVENT_NAMES[1],
            location: "Antwerp",
            status: "open",
            registration_opens_at: mysqlDate(-day(1)),
            registration_closes_at: mysqlDate(day(13)),
            starts_at: mysqlDate(day(14)),
            ends_at: mysqlDate(day(14) + hour(6)),
            closed_at: null
        },
        {
            key: "closed",
            name: DEMO_EVENT_NAMES[2],
            location: "Ghent",
            status: "closed",
            registration_opens_at: mysqlDate(-day(45)),
            registration_closes_at: mysqlDate(-day(31)),
            starts_at: mysqlDate(-day(30)),
            ends_at: mysqlDate(-day(30) + hour(6)),
            closed_at: mysqlDate(-day(29))
        }
    ];

    const eventsByKey = {};

    for (const event of eventDefinitions) {
        const [result] = await pool.query(
            `INSERT INTO events (
                name,
                location,
                status,
                registration_opens_at,
                registration_closes_at,
                starts_at,
                ends_at,
                closed_at,
                created_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                event.name,
                event.location,
                event.status,
                event.registration_opens_at,
                event.registration_closes_at,
                event.starts_at,
                event.ends_at,
                event.closed_at,
                adminId
            ]
        );

        eventsByKey[event.key] = {
            ...event,
            id: result.insertId
        };
    }

    return eventsByKey;
}

async function assignCompanies(users, events) {
    const assignments = [
        [events.live.id, users.company1.id],
        [events.future.id, users.company2.id],
        [events.closed.id, users.company1.id]
    ];

    for (const [eventId, companyId] of assignments) {
        await pool.query(
            "INSERT INTO event_companies (event_id, company_id, assigned_by) VALUES (?, ?, ?)",
            [eventId, companyId, users.admin.id]
        );
    }
}

async function createCvWithVersions(studentId, key, originalBaseName, versionCount) {
    const [cvResult] = await pool.query(
        "INSERT INTO cvs (student_id) VALUES (?)",
        [studentId]
    );
    const cvId = cvResult.insertId;

    for (let version = 1; version <= versionCount; version += 1) {
        const fileName = `${DEMO_FILE_PREFIX}-${key}-v${version}.pdf`;
        const originalName = `${originalBaseName} v${version}.pdf`;

        await writeDemoPdf(fileName, originalName);
        await pool.query(
            `INSERT INTO cv_versions (cv_id, file_path, original_name, version_number, uploaded_at)
             VALUES (?, ?, ?, ?, ?)`,
            [cvId, fileName, originalName, version, mysqlDate(-day(versionCount - version))]
        );
    }

    return cvId;
}

async function createParticipation(studentId, eventId, cvId) {
    const [result] = await pool.query(
        "INSERT INTO participations (student_id, event_id, selected_cv_id) VALUES (?, ?, ?)",
        [studentId, eventId, cvId]
    );

    return result.insertId;
}

async function createQrToken(participationId, token) {
    const [result] = await pool.query(
        "INSERT INTO qr_tokens (participation_id, token) VALUES (?, ?)",
        [participationId, token]
    );

    return result.insertId;
}

async function seedDemo() {
    await removeExistingDemoData();

    const users = await insertUsers();
    const events = await insertEvents(users.admin.id);

    await assignCompanies(users, events);

    const alexCvId = await createCvWithVersions(users.student1.id, "alex", "Alex Peeters Resume", 3);
    const mayaCvId = await createCvWithVersions(users.student2.id, "maya", "Maya Janssens Resume", 1);
    const noahCvId = await createCvWithVersions(users.student3.id, "noah", "Noah Dubois Resume", 2);

    const alexLiveParticipationId = await createParticipation(users.student1.id, events.live.id, alexCvId);
    const mayaLiveParticipationId = await createParticipation(users.student2.id, events.live.id, mayaCvId);
    const noahFutureParticipationId = await createParticipation(users.student3.id, events.future.id, noahCvId);
    const noahClosedParticipationId = await createParticipation(users.student3.id, events.closed.id, noahCvId);

    const alexQrId = await createQrToken(alexLiveParticipationId, "demo-live-alex-token");
    const mayaQrId = await createQrToken(mayaLiveParticipationId, "demo-live-maya-token");
    await createQrToken(noahFutureParticipationId, "demo-future-noah-token");
    const noahClosedQrId = await createQrToken(noahClosedParticipationId, "demo-closed-noah-token");

    await pool.query(
        `INSERT INTO scan_logs (company_id, event_id, participation_id, qr_token_id, scanned_at, favorited_at)
         VALUES
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?)`,
        [
            users.company1.id, events.live.id, alexLiveParticipationId, alexQrId, mysqlDate(-hour(1)), mysqlDate(-hour(0.95)),
            users.company1.id, events.live.id, mayaLiveParticipationId, mayaQrId, mysqlDate(-hour(0.5)), null,
            users.company1.id, events.closed.id, noahClosedParticipationId, noahClosedQrId, mysqlDate(-day(29)), null
        ]
    );

    console.log("Demo data seeded.");
    console.log("");
    console.log("Demo credentials:");
    DEMO_USERS.forEach((user) => {
        console.log(`${user.role.padEnd(7)} ${user.email.padEnd(34)} ${DEMO_PASSWORD}`);
    });
    console.log("");
    console.log("Useful demo QR tokens:");
    console.log("student1 live event:", "demo-live-alex-token");
    console.log("student2 live event:", "demo-live-maya-token");
    console.log("student3 future event:", "demo-future-noah-token");
}

if (require.main === module) {
    seedDemo()
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}

module.exports = {
    seedDemo
};
