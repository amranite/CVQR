const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");
const { getEvents, getScans } = require("../controllers/companyController");

router.get("/events", auth, allowRoles("company"), getEvents);
router.get("/scans", auth, allowRoles("company"), getScans);

module.exports = router;
