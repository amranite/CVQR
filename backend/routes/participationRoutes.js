const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
    generateMyParticipationQr,
    getMyParticipation,
    getMyParticipationQr,
    registerForEvent
} = require("../controllers/participationController");

router.get("/me", auth, requireRole("student"), getMyParticipation);
router.post("/", auth, requireRole("student"), registerForEvent);
router.get("/me/qr", auth, requireRole("student"), getMyParticipationQr);
router.post("/me/qr", auth, requireRole("student"), generateMyParticipationQr);

module.exports = router;
