require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const suffix = Date.now();
const password = "IntegrationPass123!";
const adminEmail = `integration-admin-${suffix}@example.com`;
const studentEmail = `integration-student-${suffix}@school.com`;
const companyEmail = `integration-company-${suffix}@example.com`;
const uploadDir = path.join(__dirname, "../uploads");

const createdUserIds = [];
const createdEventIds = [];
const uploadedFiles = [];

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function mysqlDate(offsetMs) {
    return new Date(Date.now() + offsetMs)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
}

async function request(pathname, options = {}) {
    const response = await fetch(baseUrl + pathname, options);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = data && (data.error || data.message)
            ? data.error || data.message
            : response.statusText;
        throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status} ${message}`);
    }

    return { response, data };
}

function authHeaders(token, extra = {}) {
    return {
        ...extra,
        Authorization: `Bearer ${token}`
    };
}

async function register(name, email) {
    await request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });
}

async function login(email) {
    const { data } = await request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    assert(data.token, `No token returned for ${email}`);
    return data.token;
}

async function seedAdmin() {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        [`Integration Admin ${suffix}`, adminEmail, passwordHash]
    );
    createdUserIds.push(result.insertId);
    return result.insertId;
}

async function rememberRegisteredUsers() {
    const [rows] = await pool.query(
        "SELECT id FROM users WHERE email IN (?, ?)",
        [studentEmail, companyEmail]
    );
    rows.forEach((row) => createdUserIds.push(row.id));
}

async function rememberUploadedFiles(studentEmailValue) {
    const [rows] = await pool.query(
        `SELECT cv_versions.file_path
         FROM cv_versions
         JOIN cvs ON cvs.id = cv_versions.cv_id
         JOIN users ON users.id = cvs.student_id
         WHERE users.email = ?`,
        [studentEmailValue]
    );
    rows.forEach((row) => uploadedFiles.push(row.file_path));
}

async function cleanup() {
    try {
        await rememberUploadedFiles(studentEmail);
    } catch {
    }

    if (createdEventIds.length > 0) {
        await pool.query(
            `DELETE FROM events WHERE id IN (${createdEventIds.map(() => "?").join(",")})`,
            createdEventIds
        );
    }

    if (createdUserIds.length > 0) {
        await pool.query(
            `DELETE FROM users WHERE id IN (${createdUserIds.map(() => "?").join(",")})`,
            createdUserIds
        );
    }

    await Promise.all(uploadedFiles.map(async (fileName) => {
        try {
            await fs.unlink(path.join(uploadDir, fileName));
        } catch {
        }
    }));

    await pool.end();
}

async function assertStaticPagesLoad() {
    const pages = [
        "/",
        "/register/",
        "/login/",
        "/student/",
        "/student/cv/",
        "/company/",
        "/company/cv/",
        "/company/history/",
        "/admin/"
    ];

    for (const page of pages) {
        const { response } = await request(page);
        assert(response.status === 200, `${page} did not return 200`);
    }
}

async function uploadStudentCv(studentToken) {
    const pdfBody = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
    const formData = new FormData();
    formData.append(
        "cv",
        new Blob([pdfBody], { type: "application/pdf" }),
        `integration-${suffix}.pdf`
    );

    const { data } = await request("/cv/upload", {
        method: "POST",
        headers: authHeaders(studentToken),
        body: formData
    });

    assert(
        data.cv.latest_version.original_name === `integration-${suffix}.pdf`,
        "CV upload returned wrong latest version"
    );
}

async function run() {
    const adminId = await seedAdmin();

    await register(`Integration Student ${suffix}`, studentEmail);
    await register(`Integration Company ${suffix}`, companyEmail);
    await rememberRegisteredUsers();

    const adminToken = await login(adminEmail);
    const studentToken = await login(studentEmail);
    const companyToken = await login(companyEmail);

    await assertStaticPagesLoad();

    const { data: adminCvs } = await request("/admin/cvs", {
        headers: authHeaders(adminToken)
    });
    assert(Array.isArray(adminCvs), "Admin CV list did not return an array");

    const { data: companyUsers } = await request("/admin/companies", {
        headers: authHeaders(adminToken)
    });
    const companyUser = companyUsers.find((company) => company.email === companyEmail);
    assert(companyUser, "Admin company user list did not include integration company");
    const companyId = companyUser.id;

    const { data: createEventData } = await request("/admin/events", {
        method: "POST",
        headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({
            name: `Integration Event ${suffix}`,
            location: "Brussels",
            registration_opens_at: mysqlDate(-24 * 60 * 60 * 1000),
            registration_closes_at: mysqlDate(24 * 60 * 60 * 1000),
            starts_at: mysqlDate(-60 * 60 * 1000),
            ends_at: mysqlDate(24 * 60 * 60 * 1000)
        })
    });
    const eventId = createEventData.event.id;
    createdEventIds.push(eventId);
    assert(createEventData.event.created_by === adminId, "Created event does not reference admin");

    await request(`/admin/events/${eventId}/open`, {
        method: "POST",
        headers: authHeaders(adminToken)
    });

    await request(`/admin/events/${eventId}/companies/${companyId}`, {
        method: "POST",
        headers: authHeaders(adminToken)
    });

    const { data: assignedEvents } = await request("/company/events", {
        headers: authHeaders(companyToken)
    });
    assert(
        assignedEvents.some((event) => event.id === eventId && event.is_active),
        "Company assigned events missing active event"
    );

    await uploadStudentCv(studentToken);

    const { data: openEvents } = await request("/events/open", {
        headers: authHeaders(studentToken)
    });
    assert(openEvents.some((event) => event.id === eventId), "Open event not visible to student");

    const { data: participationData } = await request("/participations", {
        method: "POST",
        headers: authHeaders(studentToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ event_id: eventId })
    });
    assert(participationData.participation.qr.token, "Participation did not return QR token");

    const { data: qrData } = await request("/participations/me/qr", {
        headers: authHeaders(studentToken)
    });
    assert(
        qrData.token === participationData.participation.qr.token,
        "Student QR token mismatch"
    );

    const { data: scanData } = await request(`/qr/${qrData.token}`, {
        headers: authHeaders(companyToken)
    });
    assert(
        scanData.cv.startsWith("/cv/participation/"),
        "Scan did not return secure participation CV route"
    );
    assert(scanData.event.id === eventId, "Scan returned wrong event");

    const cvFileResponse = await fetch(baseUrl + scanData.cv, {
        headers: authHeaders(companyToken)
    });
    assert(cvFileResponse.ok, "Company could not fetch scanned CV file");

    const { data: historyData } = await request("/company/scans", {
        headers: authHeaders(companyToken)
    });
    assert(
        historyData.some((scan) => scan.participation_id === scanData.participation_id),
        "Company history missing active scan"
    );

    const { data: participations } = await request(`/admin/events/${eventId}/participations`, {
        headers: authHeaders(adminToken)
    });
    assert(
        participations.some((item) => item.id === scanData.participation_id),
        "Admin participations missing student"
    );

    const { data: scans } = await request(`/admin/events/${eventId}/scans`, {
        headers: authHeaders(adminToken)
    });
    assert(
        scans.some((item) => item.participation_id === scanData.participation_id),
        "Admin scans missing company scan"
    );

    await request(`/admin/events/${eventId}/close`, {
        method: "POST",
        headers: authHeaders(adminToken)
    });

    const { data: closedHistory } = await request("/company/scans", {
        headers: authHeaders(companyToken)
    });
    assert(
        !closedHistory.some((scan) => scan.participation_id === scanData.participation_id),
        "Closed event scan remained visible to company"
    );

    const { data: closedAssignedEvents } = await request("/company/events", {
        headers: authHeaders(companyToken)
    });
    assert(
        !closedAssignedEvents.some((event) => event.id === eventId),
        "Closed event remained visible in company assigned events"
    );

    const closedScanResponse = await fetch(baseUrl + `/qr/${qrData.token}`, {
        headers: authHeaders(companyToken)
    });
    assert(closedScanResponse.status === 403, "Closed event QR scan was not blocked");

    const closedFileResponse = await fetch(baseUrl + scanData.cv, {
        headers: authHeaders(companyToken)
    });
    assert(closedFileResponse.status === 403, "Closed event CV file access was not blocked");

    console.log("HTTP integration test passed");
}

if (require.main === module) {
    run()
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(cleanup);
}

module.exports = {
    run
};
