require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const apiBaseUrl = `${baseUrl}/api`;
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
    const response = await fetch(apiBaseUrl + pathname, options);
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

async function requestPage(pathname) {
    const response = await fetch(baseUrl + pathname);

    if (!response.ok)
        throw new Error(`GET ${pathname} failed: ${response.status} ${response.statusText}`);

    return response;
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
        "/admin/",
        "/admin/events/",
        "/admin/events/detail/",
        "/admin/assignments/",
        "/admin/users/",
        "/admin/cvs/",
        "/admin/registrations/"
    ];

    for (const page of pages) {
        const response = await requestPage(page);
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
    const studentToken = await login(studentEmail.toUpperCase());
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

    const { data: allUsers } = await request("/admin/users", {
        headers: authHeaders(adminToken)
    });
    assert(
        allUsers.some((user) => user.email === studentEmail && user.role === "student"),
        "Admin users overview missing integration student"
    );
    assert(
        allUsers.some((user) => user.email === companyEmail && user.role === "company"),
        "Admin users overview missing integration company"
    );

    const { data: searchedUsers } = await request(`/admin/users?q=${encodeURIComponent("Integration Student " + suffix)}&role=student&activity=without_cv`, {
        headers: authHeaders(adminToken)
    });
    assert(
        searchedUsers.length === 1 && searchedUsers[0].email === studentEmail,
        "Admin users search/filter did not return expected student"
    );

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

    const { data: bulkAssignmentData } = await request(`/admin/events/${eventId}/companies`, {
        method: "PUT",
        headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ company_ids: [companyId] })
    });
    assert(
        bulkAssignmentData.event.assigned_companies.some((company) => company.id === companyId),
        "Bulk company assignment did not include integration company"
    );

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
    let activeQrToken = qrData.token;

    const { data: scanData } = await request(`/qr/${activeQrToken}`, {
        headers: authHeaders(companyToken)
    });
    assert(scanData.scan_id, "Scan did not return scan id");
    assert(
        scanData.cv.startsWith("/cv/participation/"),
        "Scan did not return secure participation CV route"
    );
    assert(scanData.event.id === eventId, "Scan returned wrong event");

    const cvFileResponse = await fetch(apiBaseUrl + scanData.cv, {
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

    const { data: favoriteData } = await request(`/company/scans/${scanData.scan_id}/favorite`, {
        method: "PUT",
        headers: authHeaders(companyToken)
    });
    assert(favoriteData.scan.is_favorite, "Favorite endpoint did not mark scan as favorite");

    const { data: favoritesHistory } = await request("/company/scans?favorites=1", {
        headers: authHeaders(companyToken)
    });
    assert(
        favoritesHistory.some((scan) => scan.id === scanData.scan_id && scan.is_favorite),
        "Favorites-only history missing favorited scan"
    );

    const { data: unfavoriteData } = await request(`/company/scans/${scanData.scan_id}/favorite`, {
        method: "DELETE",
        headers: authHeaders(companyToken)
    });
    assert(!unfavoriteData.scan.is_favorite, "Unfavorite endpoint did not clear favorite");

    const { data: studentScans } = await request("/participations/me/scans", {
        headers: authHeaders(studentToken)
    });
    assert(
        studentScans.some((scan) => scan.id === scanData.scan_id && !scan.is_revoked),
        "Student scan list missing active company access"
    );

    const { data: revokeData } = await request(`/participations/me/scans/${scanData.scan_id}/revoke`, {
        method: "POST",
        headers: authHeaders(studentToken)
    });
    assert(revokeData.scan.is_revoked, "Student revoke did not mark scan as revoked");
    assert(revokeData.qr.token && revokeData.qr.token !== activeQrToken, "Student revoke did not rotate QR token");
    activeQrToken = revokeData.qr.token;

    const { data: revokedHistory } = await request("/company/scans", {
        headers: authHeaders(companyToken)
    });
    assert(
        !revokedHistory.some((scan) => scan.id === scanData.scan_id),
        "Student-revoked scan remained visible to company"
    );

    const revokedFileResponse = await fetch(apiBaseUrl + scanData.cv, {
        headers: authHeaders(companyToken)
    });
    assert(revokedFileResponse.status === 403, "Student-revoked CV file access was not blocked");

    const oldQrResponse = await fetch(apiBaseUrl + `/qr/${qrData.token}`, {
        headers: authHeaders(companyToken)
    });
    assert(oldQrResponse.status === 404, "Old QR token still worked after student revoke");

    const { data: restoredScanData } = await request(`/qr/${activeQrToken}`, {
        headers: authHeaders(companyToken)
    });
    assert(restoredScanData.scan_id === scanData.scan_id, "Restored scan did not reuse scan row");
    assert(!restoredScanData.is_revoked, "Fresh QR scan did not restore company access");

    const restoredFileResponse = await fetch(apiBaseUrl + scanData.cv, {
        headers: authHeaders(companyToken)
    });
    assert(restoredFileResponse.ok, "Company could not fetch CV after fresh QR restore");

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

    const { data: registrationsOverview } = await request("/admin/registrations", {
        headers: authHeaders(adminToken)
    });
    assert(
        registrationsOverview.student_participations.some((item) => item.id === scanData.participation_id),
        "Admin registrations overview missing student participation"
    );
    assert(
        registrationsOverview.company_assignments.some((item) => item.company_id === companyId),
        "Admin registrations overview missing company assignment"
    );

    const closedScanResponse = await fetch(apiBaseUrl + `/qr/${activeQrToken}`, {
        headers: authHeaders(companyToken)
    });
    assert(closedScanResponse.status === 403, "Closed event QR scan was not blocked");

    const closedFileResponse = await fetch(apiBaseUrl + scanData.cv, {
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
