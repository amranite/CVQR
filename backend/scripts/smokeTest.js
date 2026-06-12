require("dotenv").config();

const pool = require("../config/db");
const adminController = require("../controllers/adminController");
const companyController = require("../controllers/companyController");
const cvController = require("../controllers/cvController");
const eventController = require("../controllers/eventController");
const participationController = require("../controllers/participationController");
const qrController = require("../controllers/qrController");

function makeRes() {
    return {
        statusCode: 200,
        body: null,
        headers: {},
        sentFile: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        setHeader(key, value) {
            this.headers[key] = value;
        },
        sendFile(filePath) {
            this.sentFile = filePath;
            return this;
        }
    };
}

async function call(handler, req) {
    const res = makeRes();
    await handler(req, res);
    return res;
}

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function assertStatus(res, status, label) {
    assert(
        res.statusCode === status,
        `${label}: expected ${status}, got ${res.statusCode} ${JSON.stringify(res.body)}`
    );
}

function mysqlDate(offsetMs) {
    return new Date(Date.now() + offsetMs)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
}

async function createUsers(suffix) {
    const [result] = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES
            ('Smoke Admin', ?, 'x', 'admin'),
            ('Smoke Student', ?, 'x', 'student'),
            ('Smoke Company', ?, 'x', 'company'),
            ('Other Company', ?, 'x', 'company')`,
        [
            `smoke-admin-${suffix}@example.com`,
            `smoke-student-${suffix}@school.com`,
            `smoke-company-${suffix}@example.com`,
            `smoke-other-${suffix}@example.com`
        ]
    );

    return {
        adminId: result.insertId,
        studentId: result.insertId + 1,
        companyId: result.insertId + 2,
        otherCompanyId: result.insertId + 3
    };
}

async function cleanup(ids, eventIds) {
    if (eventIds.length > 0) {
        await pool.query(
            `DELETE FROM events WHERE id IN (${eventIds.map(() => "?").join(",")})`,
            eventIds
        );
    }

    await pool.query(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?)",
        [ids.adminId, ids.studentId, ids.companyId, ids.otherCompanyId]
    );
}

async function run() {
    const suffix = Date.now();
    const ids = await createUsers(suffix);
    const eventIds = [];

    try {
        const createEventRes = await call(adminController.createEvent, {
            user: { id: ids.adminId, role: "admin" },
            body: {
                name: "Smoke Event",
                location: "Brussels",
                registration_opens_at: mysqlDate(-7 * 24 * 60 * 60 * 1000),
                registration_closes_at: mysqlDate(7 * 24 * 60 * 60 * 1000),
                starts_at: mysqlDate(-7 * 24 * 60 * 60 * 1000),
                ends_at: mysqlDate(7 * 24 * 60 * 60 * 1000)
            }
        });
        assertStatus(createEventRes, 201, "create event");
        const eventId = createEventRes.body.event.id;
        eventIds.push(eventId);

        const openEventRes = await call(adminController.openEvent, {
            user: { id: ids.adminId, role: "admin" },
            params: { eventId }
        });
        assertStatus(openEventRes, 200, "open event");

        const assignCompanyRes = await call(adminController.updateEventCompanies, {
            user: { id: ids.adminId, role: "admin" },
            params: { eventId },
            body: { company_ids: [ids.companyId] }
        });
        assertStatus(assignCompanyRes, 200, "assign company");
        assert(
            assignCompanyRes.body.event.assigned_companies.some((company) => company.id === ids.companyId),
            "bulk company assignment should include company account"
        );

        const eventDetailsRes = await call(adminController.getEventDetails, {
            user: { id: ids.adminId, role: "admin" },
            params: { eventId }
        });
        assertStatus(eventDetailsRes, 200, "event details");
        assert(
            eventDetailsRes.body.assigned_companies.some((company) => company.id === ids.companyId),
            "event details should include assigned company"
        );

        const companyUsersRes = await call(adminController.getCompanyUsers, {
            user: { id: ids.adminId, role: "admin" }
        });
        assertStatus(companyUsersRes, 200, "list company users");
        assert(
            companyUsersRes.body.some((company) => company.id === ids.companyId),
            "company user list should include company account"
        );

        const allUsersRes = await call(adminController.getUsers, {
            user: { id: ids.adminId, role: "admin" },
            query: {}
        });
        assertStatus(allUsersRes, 200, "list all users");
        assert(
            allUsersRes.body.some((user) => user.id === ids.adminId && user.role === "admin"),
            "admin user overview should include admin account"
        );
        assert(
            allUsersRes.body.some((user) => user.id === ids.studentId && user.role === "student"),
            "admin user overview should include student account"
        );
        assert(
            allUsersRes.body.some((user) => user.id === ids.companyId && user.role === "company"),
            "admin user overview should include company account"
        );

        const searchedUsersRes = await call(adminController.getUsers, {
            user: { id: ids.adminId, role: "admin" },
            query: {
                q: `smoke-student-${suffix}`,
                role: "student",
                activity: "without_cv"
            }
        });
        assertStatus(searchedUsersRes, 200, "search student users");
        assert(
            searchedUsersRes.body.length === 1 && searchedUsersRes.body[0].id === ids.studentId,
            "admin user search/filter should find the matching student without a CV"
        );

        const companyEventsRes = await call(companyController.getEvents, {
            user: { id: ids.companyId, role: "company" }
        });
        assertStatus(companyEventsRes, 200, "company assigned events");
        assert(
            companyEventsRes.body.some((event) => event.id === eventId && event.is_active),
            "company assigned events should include active event"
        );

        const otherCompanyEventsRes = await call(companyController.getEvents, {
            user: { id: ids.otherCompanyId, role: "company" }
        });
        assertStatus(otherCompanyEventsRes, 200, "unassigned company events");
        assert(
            !otherCompanyEventsRes.body.some((event) => event.id === eventId),
            "unassigned company should not see event assignment"
        );

        const openEventsRes = await call(eventController.getOpenEvents, {
            user: { id: ids.studentId, role: "student" }
        });
        assertStatus(openEventsRes, 200, "list open events");
        assert(openEventsRes.body.some((event) => event.id === eventId), "open event was not listed");

        const uploadCvRes = await call(cvController.uploadCV, {
            user: { id: ids.studentId, role: "student" },
            file: {
                filename: `smoke-${suffix}-v1.pdf`,
                originalname: "smoke-v1.pdf"
            }
        });
        assertStatus(uploadCvRes, 200, "upload CV");
        assert(!uploadCvRes.body.qrUrl && !uploadCvRes.body.qrImage, "CV upload should not return QR data");

        for (let i = 2; i <= 4; i++) {
            const versionRes = await call(cvController.replaceCV, {
                user: { id: ids.studentId, role: "student" },
                file: {
                    filename: `smoke-${suffix}-v${i}.pdf`,
                    originalname: `smoke-v${i}.pdf`
                }
            });
            assertStatus(versionRes, 200, `upload CV version ${i}`);
        }

        const myCvRes = await call(cvController.getMyCV, {
            user: { id: ids.studentId, role: "student" }
        });
        assertStatus(myCvRes, 200, "get my CV");
        assert(myCvRes.body.versions.length === 3, "CV retention should keep 3 versions");
        assert(myCvRes.body.latest_version.version_number === 4, "latest CV version should be version 4");

        const registerRes = await call(participationController.registerForEvent, {
            user: { id: ids.studentId, role: "student" },
            body: { event_id: eventId }
        });
        assertStatus(registerRes, 201, "register for event");
        assert(registerRes.body.participation.qr?.token, "registration with CV should create QR");

        const qrRes = await call(participationController.getMyParticipationQr, {
            user: { id: ids.studentId, role: "student" }
        });
        assertStatus(qrRes, 200, "get participation QR");

        const unassignedScanRes = await call(qrController.scanQR, {
            user: { id: ids.otherCompanyId, role: "company" },
            params: { token: qrRes.body.token }
        });
        assertStatus(unassignedScanRes, 403, "unassigned company scan");

        const scanRes = await call(qrController.scanQR, {
            user: { id: ids.companyId, role: "company" },
            params: { token: qrRes.body.token }
        });
        assertStatus(scanRes, 200, "assigned company scan");
        assert(scanRes.body.scan_id, "scan should return scan log id");
        assert(scanRes.body.cv?.startsWith("/cv/participation/"), "scan should return secure participation CV URL");

        const companyHistoryRes = await call(companyController.getScans, {
            user: { id: ids.companyId, role: "company" }
        });
        assertStatus(companyHistoryRes, 200, "company scan history");
        assert(
            companyHistoryRes.body.some((scan) => scan.participation_id === scanRes.body.participation_id),
            "company history should include active-event scan"
        );

        const favoriteScanRes = await call(companyController.favoriteScan, {
            user: { id: ids.companyId, role: "company" },
            params: { scanId: scanRes.body.scan_id }
        });
        assertStatus(favoriteScanRes, 200, "favorite scan");
        assert(favoriteScanRes.body.scan.is_favorite, "favorite scan should mark scan as favorite");

        const favoritesHistoryRes = await call(companyController.getScans, {
            user: { id: ids.companyId, role: "company" },
            query: { favorites: "1" }
        });
        assertStatus(favoritesHistoryRes, 200, "favorite scan history");
        assert(
            favoritesHistoryRes.body.some((scan) => scan.id === scanRes.body.scan_id && scan.is_favorite),
            "favorites-only history should include favorited scan"
        );

        const unfavoriteScanRes = await call(companyController.unfavoriteScan, {
            user: { id: ids.companyId, role: "company" },
            params: { scanId: scanRes.body.scan_id }
        });
        assertStatus(unfavoriteScanRes, 200, "unfavorite scan");
        assert(!unfavoriteScanRes.body.scan.is_favorite, "unfavorite should clear favorite state");

        const companyFileRes = await call(cvController.sendParticipationCvFile, {
            user: { id: ids.companyId, role: "company" },
            params: { participationId: scanRes.body.participation_id }
        });
        assertStatus(companyFileRes, 200, "company secure file access");
        assert(companyFileRes.sentFile?.endsWith(`smoke-${suffix}-v4.pdf`), "secure file should resolve latest version");

        const studentScansRes = await call(participationController.getMyParticipationScans, {
            user: { id: ids.studentId, role: "student" }
        });
        assertStatus(studentScansRes, 200, "student company access list");
        assert(
            studentScansRes.body.some((scan) => scan.id === scanRes.body.scan_id && !scan.is_revoked),
            "student company access list should include active scan"
        );

        const revokeScanRes = await call(participationController.revokeCompanyScanAccess, {
            user: { id: ids.studentId, role: "student" },
            params: { scanId: scanRes.body.scan_id }
        });
        assertStatus(revokeScanRes, 200, "student revoke company access");
        assert(revokeScanRes.body.scan.is_revoked, "revoke should mark scan as revoked");
        assert(revokeScanRes.body.qr?.token, "revoke should return refreshed QR token");
        assert(revokeScanRes.body.qr.token !== qrRes.body.token, "revoke should rotate QR token");

        const revokedHistoryRes = await call(companyController.getScans, {
            user: { id: ids.companyId, role: "company" }
        });
        assertStatus(revokedHistoryRes, 200, "revoked company history");
        assert(
            !revokedHistoryRes.body.some((scan) => scan.id === scanRes.body.scan_id),
            "company history should hide student-revoked scan"
        );

        const revokedFileRes = await call(cvController.sendParticipationCvFile, {
            user: { id: ids.companyId, role: "company" },
            params: { participationId: scanRes.body.participation_id }
        });
        assertStatus(revokedFileRes, 403, "revoked company secure file access");

        const oldQrAfterRevokeRes = await call(qrController.scanQR, {
            user: { id: ids.companyId, role: "company" },
            params: { token: qrRes.body.token }
        });
        assertStatus(oldQrAfterRevokeRes, 404, "old QR after student revoke");

        const restoredScanRes = await call(qrController.scanQR, {
            user: { id: ids.companyId, role: "company" },
            params: { token: revokeScanRes.body.qr.token }
        });
        assertStatus(restoredScanRes, 200, "restore scan with refreshed QR");
        assert(restoredScanRes.body.scan_id === scanRes.body.scan_id, "restore scan should update existing scan row");
        assert(!restoredScanRes.body.is_revoked, "fresh QR scan should restore company access");

        const restoredFileRes = await call(cvController.sendParticipationCvFile, {
            user: { id: ids.companyId, role: "company" },
            params: { participationId: scanRes.body.participation_id }
        });
        assertStatus(restoredFileRes, 200, "restored company secure file access");

        const registrationsRes = await call(adminController.getRegistrationsOverview, {
            user: { id: ids.adminId, role: "admin" }
        });
        assertStatus(registrationsRes, 200, "registrations overview");
        assert(
            registrationsRes.body.student_participations.some((participation) => participation.id === scanRes.body.participation_id),
            "registrations overview should include student participation"
        );
        assert(
            registrationsRes.body.company_assignments.some((assignment) => assignment.company_id === ids.companyId),
            "registrations overview should include company assignment"
        );

        const deleteOpenCvRes = await call(cvController.deleteCV, {
            user: { id: ids.studentId, role: "student" }
        });
        assertStatus(deleteOpenCvRes, 409, "block deleting CV used by open participation");

        const closeEventRes = await call(adminController.closeEvent, {
            user: { id: ids.adminId, role: "admin" },
            params: { eventId }
        });
        assertStatus(closeEventRes, 200, "close event");

        const closedHistoryRes = await call(companyController.getScans, {
            user: { id: ids.companyId, role: "company" }
        });
        assertStatus(closedHistoryRes, 200, "closed event company history");
        assert(
            !closedHistoryRes.body.some((scan) => scan.participation_id === scanRes.body.participation_id),
            "company history should hide closed-event scans"
        );

        const closedCompanyEventsRes = await call(companyController.getEvents, {
            user: { id: ids.companyId, role: "company" }
        });
        assertStatus(closedCompanyEventsRes, 200, "closed company assigned events");
        assert(
            !closedCompanyEventsRes.body.some((event) => event.id === eventId),
            "company assigned events should hide closed event"
        );

        const closedScanRes = await call(qrController.scanQR, {
            user: { id: ids.companyId, role: "company" },
            params: { token: revokeScanRes.body.qr.token }
        });
        assertStatus(closedScanRes, 403, "closed event QR scan");

        console.log("Backend smoke test passed");
    } finally {
        await cleanup(ids, eventIds);
        await pool.end();
    }
}

if (require.main === module) {
    run().catch(async (err) => {
        console.error(err);
        try {
            await pool.end();
        } catch {
            // Pool may already be closed.
        }
        process.exit(1);
    });
}

module.exports = {
    run
};
