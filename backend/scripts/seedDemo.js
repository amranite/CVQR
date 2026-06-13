require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { configuredStudentDomains } = require("../utils/emailDomains");
const { uploadDir } = require("../utils/cvFiles");

const DEMO_PASSWORD = "DemoPassword123!";
const DEMO_FILE_PREFIX = "demo-cvqr";

const LEGACY_DEMO_EMAILS = [
    "github.brussels@example.com",
    "github.antwerp@example.com",
    "unassigned.company@example.com"
];

const LEGACY_DEMO_EVENT_NAMES = [
    "Demo Business Meets Students - Brussels",
    "Demo Business Meets Students - Antwerp",
    "Demo Business Meets Students - Past Edition"
];

const DEMO_USERS = [
    { key: "admin", name: "Demo Admin", email: "admin.demo@cvqr.local", role: "admin" },

    { key: "student1", name: "Emma Van den Broeck", email: "student1@school.com", role: "student" },
    { key: "student2", name: "Jonas De Smet", email: "student2@school.com", role: "student" },
    { key: "student3", name: "Lina Vermeulen", email: "student3@school.com", role: "student" },
    { key: "student4", name: "Noah Dubois", email: "student4@school.com", role: "student" },
    { key: "student5", name: "Sara Willems", email: "student5@school.com", role: "student" },
    { key: "student6", name: "Karim Benali", email: "student6@school.com", role: "student" },
    { key: "student7", name: "Amelie Laurent", email: "student7@school.com", role: "student" },

    { key: "flexso", name: "Flexso Talent Team", email: "flexso.recruiting@example.com", role: "company" },
    { key: "delaware", name: "Delaware Talent Team", email: "delaware.recruiting@example.com", role: "company" },
    { key: "deloitte", name: "Deloitte Campus Team", email: "deloitte.recruiting@example.com", role: "company" },
    { key: "easi", name: "Easi Recruitment Team", email: "easi.recruiting@example.com", role: "company" },
    { key: "smals", name: "Smals Public Sector Team", email: "smals.recruiting@example.com", role: "company" },
    { key: "gumption", name: "Gumption Talent Team", email: "gumption.recruiting@example.com", role: "company" }
];

const DEMO_EVENTS = [
    {
        key: "talentSprint",
        name: "Talent Sprint",
        location: "Brussels",
        status: "open",
        registrationOpensOffset: -day(14),
        registrationClosesOffset: day(2),
        startsOffset: -hour(2),
        endsOffset: hour(6),
        closedOffset: null
    },
    {
        key: "launchpadConnect",
        name: "Launchpad Connect",
        location: "Ghent",
        status: "open",
        registrationOpensOffset: -day(1),
        registrationClosesOffset: day(14),
        startsOffset: day(14),
        endsOffset: day(14) + hour(6),
        closedOffset: null
    },
    {
        key: "portfolioClinic",
        name: "Portfolio Clinic",
        location: "Aalst",
        status: "draft",
        registrationOpensOffset: day(18),
        registrationClosesOffset: day(28),
        startsOffset: day(30),
        endsOffset: day(30) + hour(4),
        closedOffset: null
    },
    {
        key: "insightEvening",
        name: "Insight Evening",
        location: "Dilbeek",
        status: "draft",
        registrationOpensOffset: day(35),
        registrationClosesOffset: day(43),
        startsOffset: day(45),
        endsOffset: day(45) + hour(3),
        closedOffset: null
    },
    {
        key: "careerMatchReplay",
        name: "Career Match Replay",
        location: "Schaerbeek",
        status: "closed",
        registrationOpensOffset: -day(52),
        registrationClosesOffset: -day(38),
        startsOffset: -day(37),
        endsOffset: -day(37) + hour(6),
        closedOffset: -day(36)
    },
    {
        key: "finalInterviewLab",
        name: "Final Interview Lab",
        location: "Sint-Niklaas",
        status: "closed",
        registrationOpensOffset: -day(85),
        registrationClosesOffset: -day(72),
        startsOffset: -day(70),
        endsOffset: -day(70) + hour(5),
        closedOffset: -day(69)
    }
];

const DEMO_ASSIGNMENTS = [
    { eventKey: "talentSprint", companyKeys: ["flexso", "delaware", "deloitte"] },
    { eventKey: "launchpadConnect", companyKeys: ["delaware", "easi"] },
    { eventKey: "portfolioClinic", companyKeys: ["smals"] },
    { eventKey: "insightEvening", companyKeys: ["smals"] },
    { eventKey: "careerMatchReplay", companyKeys: ["flexso", "smals"] },
    { eventKey: "finalInterviewLab", companyKeys: ["easi"] }
];

const DEMO_CVS = [
    {
        studentKey: "student1",
        fileKey: "emma",
        title: "Emma Van den Broeck - Data Analyst CV",
        versions: [
            {
                uploadedOffset: -day(24),
                focus: "First career-fair version focused on internships.",
                highlights: [
                    "Bachelor Applied Computer Science, data track.",
                    "Built SQL dashboards for a student association.",
                    "Python, SQL, Power BI, Excel."
                ]
            },
            {
                uploadedOffset: -day(12),
                focus: "Added analytics project work and clearer skills.",
                highlights: [
                    "Cleaned and modeled survey data for 1,200 responses.",
                    "Improved dashboard load time by reducing duplicate queries.",
                    "Dutch, English, French."
                ]
            },
            {
                uploadedOffset: -day(2),
                focus: "Latest concise version for live company scans.",
                highlights: [
                    "Targets junior data analyst and BI consultant roles.",
                    "Highlights stakeholder reporting and presentation skills.",
                    "Available for internship from February."
                ]
            }
        ]
    },
    {
        studentKey: "student2",
        fileKey: "jonas",
        title: "Jonas De Smet - Full Stack Developer CV",
        versions: [
            {
                uploadedOffset: -day(18),
                focus: "Initial full-stack resume.",
                highlights: [
                    "JavaScript, Node.js, Express, MySQL.",
                    "Built a volunteer scheduling app.",
                    "Comfortable with Git and REST APIs."
                ]
            },
            {
                uploadedOffset: -day(3),
                focus: "Updated with QR project and backend security notes.",
                highlights: [
                    "Implemented role-based access for a school project.",
                    "Added integration tests for an HTTP API.",
                    "Looking for software engineering internship."
                ]
            }
        ]
    },
    {
        studentKey: "student3",
        fileKey: "lina",
        title: "Lina Vermeulen - Cloud Consultant CV",
        versions: [
            {
                uploadedOffset: -day(5),
                focus: "Future event CV prepared before the event starts.",
                highlights: [
                    "Interested in cloud operations and integration consulting.",
                    "Worked with Docker Compose and CI exercises.",
                    "Strong written communication and documentation habits."
                ]
            }
        ]
    },
    {
        studentKey: "student5",
        fileKey: "sara",
        title: "Sara Willems - UX Research CV",
        versions: [
            {
                uploadedOffset: -day(7),
                focus: "CV uploaded, but no event registration yet.",
                highlights: [
                    "User interview planning and usability testing.",
                    "Can demonstrate the admin filter for students with CV but no registration.",
                    "Figma, accessibility basics, survey analysis."
                ]
            }
        ]
    },
    {
        studentKey: "student6",
        fileKey: "karim",
        title: "Karim Benali - Cybersecurity CV",
        versions: [
            {
                uploadedOffset: -day(50),
                focus: "Past event version.",
                highlights: [
                    "Network security labs and Linux administration.",
                    "Participated in a closed event whose audit records remain visible to admins.",
                    "Security monitoring and incident response interests."
                ]
            },
            {
                uploadedOffset: -day(39),
                focus: "Past event final version.",
                highlights: [
                    "Added log-analysis project and hardening checklist.",
                    "Company access should disappear after event closure.",
                    "Latest retained version for the closed participation."
                ]
            }
        ]
    }
];

const DEMO_PARTICIPATIONS = [
    { key: "emmaLive", studentKey: "student1", eventKey: "talentSprint", cvStudentKey: "student1", registeredOffset: -hour(5) },
    { key: "jonasLive", studentKey: "student2", eventKey: "talentSprint", cvStudentKey: "student2", registeredOffset: -hour(4.5) },
    { key: "linaFuture", studentKey: "student3", eventKey: "launchpadConnect", cvStudentKey: "student3", registeredOffset: -hour(6) },
    { key: "amelieFutureNoCv", studentKey: "student7", eventKey: "launchpadConnect", cvStudentKey: null, registeredOffset: -hour(3) },
    { key: "karimClosed", studentKey: "student6", eventKey: "careerMatchReplay", cvStudentKey: "student6", registeredOffset: -day(40) }
];

const DEMO_QR_TOKENS = [
    {
        key: "emmaOld",
        participationKey: "emmaLive",
        token: "demo-emma-old-token",
        createdOffset: -hour(4),
        revokedOffset: -hour(1),
        revokedReason: "student_revoked_company_access"
    },
    {
        key: "emmaCurrent",
        participationKey: "emmaLive",
        token: "demo-emma-current-token",
        createdOffset: -hour(1),
        revokedOffset: null,
        revokedReason: null
    },
    {
        key: "jonasCurrent",
        participationKey: "jonasLive",
        token: "demo-jonas-current-token",
        createdOffset: -hour(4),
        revokedOffset: null,
        revokedReason: null
    },
    {
        key: "linaFuture",
        participationKey: "linaFuture",
        token: "demo-lina-future-token",
        createdOffset: -hour(6),
        revokedOffset: null,
        revokedReason: null
    },
    {
        key: "karimClosed",
        participationKey: "karimClosed",
        token: "demo-karim-closed-token",
        createdOffset: -day(39),
        revokedOffset: null,
        revokedReason: null
    }
];

const DEMO_SCANS = [
    {
        companyKey: "flexso",
        eventKey: "talentSprint",
        participationKey: "emmaLive",
        qrKey: "emmaCurrent",
        scannedOffset: -hour(0.9),
        favoritedOffset: -hour(0.85),
        studentRevokedOffset: null,
        studentRestoredOffset: null
    },
    {
        companyKey: "deloitte",
        eventKey: "talentSprint",
        participationKey: "emmaLive",
        qrKey: "emmaOld",
        scannedOffset: -hour(2.8),
        favoritedOffset: null,
        studentRevokedOffset: -hour(1.1),
        studentRestoredOffset: null
    },
    {
        companyKey: "delaware",
        eventKey: "talentSprint",
        participationKey: "jonasLive",
        qrKey: "jonasCurrent",
        scannedOffset: -hour(0.7),
        favoritedOffset: -hour(0.65),
        studentRevokedOffset: null,
        studentRestoredOffset: null
    },
    {
        companyKey: "deloitte",
        eventKey: "talentSprint",
        participationKey: "jonasLive",
        qrKey: "jonasCurrent",
        scannedOffset: -hour(1.4),
        favoritedOffset: null,
        studentRevokedOffset: -hour(1),
        studentRestoredOffset: -hour(0.4)
    },
    {
        companyKey: "flexso",
        eventKey: "careerMatchReplay",
        participationKey: "karimClosed",
        qrKey: "karimClosed",
        scannedOffset: -day(37) + hour(1),
        favoritedOffset: -day(37) + hour(1.2),
        studentRevokedOffset: null,
        studentRestoredOffset: null
    }
];

function day(days) {
    return days * 24 * 60 * 60 * 1000;
}

function hour(hours) {
    return hours * 60 * 60 * 1000;
}

function mysqlDate(offsetMs) {
    return new Date(Date.now() + offsetMs)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
}

function placeholders(values) {
    return values.map(() => "?").join(",");
}

function escapePdfText(value) {
    return String(value || "").replace(/([()\\])/g, "\\$1");
}

function buildPdfLines(profile, versionNumber, version) {
    return [
        profile.title,
        `Demo CV version ${versionNumber}`,
        "",
        version.focus,
        "",
        "Highlights:",
        ...version.highlights.map((highlight) => `- ${highlight}`),
        "",
        "Generated by backend/scripts/seedDemo.js for CVQR demos."
    ];
}

function buildPdf(lines) {
    const streamLines = ["BT", "/F1 18 Tf", "72 730 Td"];

    lines.forEach((line, index) => {
        if (index === 1) {
            streamLines.push("/F1 11 Tf");
        }

        if (index > 0) {
            streamLines.push("0 -18 Td");
        }

        streamLines.push(`(${escapePdfText(line)}) Tj`);
    });

    streamLines.push("ET");
    const stream = `${streamLines.join("\n")}\n`;
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

async function writeDemoPdf(fileName, lines) {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buildPdf(lines));
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
    const demoEmails = Array.from(new Set([
        ...DEMO_USERS.map((user) => user.email),
        ...LEGACY_DEMO_EMAILS
    ]));
    const demoEventNames = Array.from(new Set([
        ...DEMO_EVENTS.map((event) => event.name),
        ...LEGACY_DEMO_EVENT_NAMES
    ]));

    const [fileRows] = await pool.query(
        `SELECT DISTINCT cv_versions.file_path
         FROM cv_versions
         LEFT JOIN cvs ON cvs.id = cv_versions.cv_id
         LEFT JOIN users ON users.id = cvs.student_id
         WHERE users.email IN (${placeholders(demoEmails)})
         OR cv_versions.file_path LIKE ?`,
        [...demoEmails, `${DEMO_FILE_PREFIX}-%`]
    );

    await pool.query(
        `DELETE FROM events WHERE name IN (${placeholders(demoEventNames)})`,
        demoEventNames
    );

    await pool.query(
        `DELETE FROM users WHERE email IN (${placeholders(demoEmails)})`,
        demoEmails
    );

    await deleteFiles(fileRows.map((row) => row.file_path).filter(Boolean));
}

async function ensureStudentEmailDomains() {
    for (const domain of configuredStudentDomains()) {
        await pool.query(
            `INSERT INTO student_email_domains (domain, is_active)
             VALUES (?, 1)
             ON DUPLICATE KEY UPDATE
                is_active = VALUES(is_active)`,
            [domain]
        );
    }
}

async function insertUsers() {
    const usersByKey = {};

    for (const user of DEMO_USERS) {
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
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
    const eventsByKey = {};

    for (const event of DEMO_EVENTS) {
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
                mysqlDate(event.registrationOpensOffset),
                mysqlDate(event.registrationClosesOffset),
                mysqlDate(event.startsOffset),
                mysqlDate(event.endsOffset),
                event.closedOffset === null ? null : mysqlDate(event.closedOffset),
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
    for (const assignment of DEMO_ASSIGNMENTS) {
        for (const companyKey of assignment.companyKeys) {
            await pool.query(
                "INSERT INTO event_companies (event_id, company_id, assigned_by) VALUES (?, ?, ?)",
                [events[assignment.eventKey].id, users[companyKey].id, users.admin.id]
            );
        }
    }
}

async function createCvWithVersions(users, profile) {
    const [cvResult] = await pool.query(
        "INSERT INTO cvs (student_id) VALUES (?)",
        [users[profile.studentKey].id]
    );
    const cvId = cvResult.insertId;

    for (let index = 0; index < profile.versions.length; index += 1) {
        const versionNumber = index + 1;
        const version = profile.versions[index];
        const fileName = `${DEMO_FILE_PREFIX}-${profile.fileKey}-v${versionNumber}.pdf`;
        const originalName = `${profile.title} v${versionNumber}.pdf`;

        await writeDemoPdf(fileName, buildPdfLines(profile, versionNumber, version));
        await pool.query(
            `INSERT INTO cv_versions (cv_id, file_path, original_name, version_number, uploaded_at)
             VALUES (?, ?, ?, ?, ?)`,
            [cvId, fileName, originalName, versionNumber, mysqlDate(version.uploadedOffset)]
        );
    }

    return cvId;
}

async function createCvs(users) {
    const cvsByStudentKey = {};

    for (const profile of DEMO_CVS) {
        cvsByStudentKey[profile.studentKey] = await createCvWithVersions(users, profile);
    }

    return cvsByStudentKey;
}

async function createParticipations(users, events, cvsByStudentKey) {
    const participationsByKey = {};

    for (const participation of DEMO_PARTICIPATIONS) {
        const [result] = await pool.query(
            `INSERT INTO participations (student_id, event_id, selected_cv_id, registered_at)
             VALUES (?, ?, ?, ?)`,
            [
                users[participation.studentKey].id,
                events[participation.eventKey].id,
                participation.cvStudentKey ? cvsByStudentKey[participation.cvStudentKey] : null,
                mysqlDate(participation.registeredOffset)
            ]
        );

        participationsByKey[participation.key] = {
            ...participation,
            id: result.insertId
        };
    }

    return participationsByKey;
}

async function createQrTokens(participations) {
    const qrTokensByKey = {};

    for (const qrToken of DEMO_QR_TOKENS) {
        const [result] = await pool.query(
            `INSERT INTO qr_tokens (
                participation_id,
                token,
                created_at,
                revoked_at,
                revoked_reason
             ) VALUES (?, ?, ?, ?, ?)`,
            [
                participations[qrToken.participationKey].id,
                qrToken.token,
                mysqlDate(qrToken.createdOffset),
                qrToken.revokedOffset === null ? null : mysqlDate(qrToken.revokedOffset),
                qrToken.revokedReason
            ]
        );

        qrTokensByKey[qrToken.key] = {
            ...qrToken,
            id: result.insertId
        };
    }

    return qrTokensByKey;
}

async function createScanLogs(users, events, participations, qrTokens) {
    for (const scan of DEMO_SCANS) {
        await pool.query(
            `INSERT INTO scan_logs (
                company_id,
                event_id,
                participation_id,
                qr_token_id,
                scanned_at,
                favorited_at,
                student_revoked_at,
                student_restored_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                users[scan.companyKey].id,
                events[scan.eventKey].id,
                participations[scan.participationKey].id,
                qrTokens[scan.qrKey].id,
                mysqlDate(scan.scannedOffset),
                scan.favoritedOffset === null ? null : mysqlDate(scan.favoritedOffset),
                scan.studentRevokedOffset === null ? null : mysqlDate(scan.studentRevokedOffset),
                scan.studentRestoredOffset === null ? null : mysqlDate(scan.studentRestoredOffset)
            ]
        );
    }
}

function printSummary() {
    console.log("Demo data seeded.");
    console.log("");
    console.log("Password for every demo account:");
    console.log(DEMO_PASSWORD);
    console.log("");
    console.log("Demo accounts:");
    DEMO_USERS.forEach((user) => {
        console.log(`${user.role.padEnd(7)} ${user.email.padEnd(38)} ${user.name}`);
    });
    console.log("");
    console.log("Useful QR tokens:");
    console.log("student1 live current:", "demo-emma-current-token");
    console.log("student1 revoked old:", "demo-emma-old-token");
    console.log("student2 live current:", "demo-jonas-current-token");
    console.log("student3 future event:", "demo-lina-future-token");
    console.log("student6 closed event:", "demo-karim-closed-token");
    console.log("");
    console.log("Recommended reset:");
    console.log("npm run db:clean -- --yes");
    console.log("npm run db:seed");
}

async function seedDemo() {
    await removeExistingDemoData();
    await ensureStudentEmailDomains();

    const users = await insertUsers();
    const events = await insertEvents(users.admin.id);

    await assignCompanies(users, events);

    const cvsByStudentKey = await createCvs(users);
    const participations = await createParticipations(users, events, cvsByStudentKey);
    const qrTokens = await createQrTokens(participations);

    await createScanLogs(users, events, participations, qrTokens);
    printSummary();
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
