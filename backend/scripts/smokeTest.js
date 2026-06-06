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

        const assignCompanyRes = await call(adminController.assignCompanyToEvent, {
            user: { id: ids.adminId, role: "admin" },
            params: { eventId, companyId: ids.companyId }
        });
        assertStatus(assignCompanyRes, 200, "assign company");

        const companyUsersRes = await call(adminController.getCompanyUsers, {
            user: { id: ids.adminId, role: "admin" }
        });
        assertStatus(companyUsersRes, 200, "list company users");
        assert(
            companyUsersRes.body.some((company) => company.id === ids.companyId),
            "company user list should include company account"
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
        assert(scanRes.body.cv?.startsWith("/cv/participation/"), "scan should return secure participation CV URL");

        const companyHistoryRes = await call(companyController.getScans, {
            user: { id: ids.companyId, role: "company" }
        });
        assertStatus(companyHistoryRes, 200, "company scan history");
        assert(
            companyHistoryRes.body.some((scan) => scan.participation_id === scanRes.body.participation_id),
            "company history should include active-event scan"
        );

        const companyFileRes = await call(cvController.sendParticipationCvFile, {
            user: { id: ids.companyId, role: "company" },
            params: { participationId: scanRes.body.participation_id }
        });
        assertStatus(companyFileRes, 200, "company secure file access");
        assert(companyFileRes.sentFile?.endsWith(`smoke-${suffix}-v4.pdf`), "secure file should resolve latest version");

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

        const closedScanRes = await call(qrController.scanQR, {
            user: { id: ids.companyId, role: "company" },
            params: { token: qrRes.body.token }
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
