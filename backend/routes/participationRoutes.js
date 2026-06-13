const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
    generateMyParticipationQr,
    getMyParticipation,
    getMyParticipationQr,
    getMyParticipationScans,
    revokeCompanyScanAccess,
    registerForEvent
} = require("../controllers/participationController");

router.get("/me", auth, requireRole("student"), getMyParticipation);
router.post("/", auth, requireRole("student"), registerForEvent);
router.get("/me/qr", auth, requireRole("student"), getMyParticipationQr);
router.post("/me/qr", auth, requireRole("student"), generateMyParticipationQr);
router.get("/me/scans", auth, requireRole("student"), getMyParticipationScans);
router.post("/me/scans/:scanId/revoke", auth, requireRole("student"), revokeCompanyScanAccess);

module.exports = router;
