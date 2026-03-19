const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { getMyQR, scanQR } = require("../controllers/qrController");

router.get("/me", auth, getMyQR);  // Authenticated, student retrieves their own QR code
router.get("/:token", scanQR);     // Public, company scans a QR token to access a CV

module.exports = router;
