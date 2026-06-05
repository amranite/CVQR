const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");
const {
    assignCompanyToEvent,
    closeEvent,
    createEvent,
    deleteStudentCv,
    getAllCvs,
    getEventParticipations,
    getEventScans,
    getEvents,
    openEvent,
    unassignCompanyFromEvent,
    updateEvent
} = require("../controllers/adminController");

router.get("/cvs", auth, allowRoles("admin"), getAllCvs);
router.delete("/cv/:studentId", auth, allowRoles("admin"), deleteStudentCv);

router.get("/events", auth, allowRoles("admin"), getEvents);
router.post("/events", auth, allowRoles("admin"), createEvent);
router.put("/events/:eventId", auth, allowRoles("admin"), updateEvent);
router.post("/events/:eventId/open", auth, allowRoles("admin"), openEvent);
router.post("/events/:eventId/close", auth, allowRoles("admin"), closeEvent);
router.post("/events/:eventId/companies/:companyId", auth, allowRoles("admin"), assignCompanyToEvent);
router.delete("/events/:eventId/companies/:companyId", auth, allowRoles("admin"), unassignCompanyFromEvent);
router.get("/events/:eventId/participations", auth, allowRoles("admin"), getEventParticipations);
router.get("/events/:eventId/scans", auth, allowRoles("admin"), getEventScans);

module.exports = router;
