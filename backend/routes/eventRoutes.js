const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getOpenEvents } = require("../controllers/eventController");

router.get("/open", auth, requireRole("student"), getOpenEvents);

module.exports = router;
