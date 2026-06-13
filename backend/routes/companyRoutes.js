const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");
const {
    favoriteScan,
    getEvents,
    getScans,
    unfavoriteScan
} = require("../controllers/companyController");

router.get("/events", auth, allowRoles("company"), getEvents);
router.get("/scans", auth, allowRoles("company"), getScans);
router.put("/scans/:scanId/favorite", auth, allowRoles("company"), favoriteScan);
router.delete("/scans/:scanId/favorite", auth, allowRoles("company"), unfavoriteScan);

module.exports = router;
