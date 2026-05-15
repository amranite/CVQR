const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getMyQR, scanQR } = require("../controllers/qrController");

router.get("/me", auth, requireRole("student"), getMyQR);        // Student retrieves their own QR code
router.get("/:token", scanQR);                                   // Anyone can scan; company scans are logged if authenticated

module.exports = router;
