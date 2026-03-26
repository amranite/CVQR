const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getMyQR, scanQR } = require("../controllers/qrController");

router.get("/me", auth, requireRole("student"), getMyQR);        // Student retrieves their own QR code
router.get("/:token", auth, requireRole("company"), scanQR);     // Company scans a QR token to access a CV

module.exports = router;
