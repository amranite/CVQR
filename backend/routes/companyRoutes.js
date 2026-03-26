const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getScannedCVs } = require("../controllers/companyController");

// All company routes are company-only
router.get("/scans", auth, requireRole("company"), getScannedCVs); // List all CVs this company has scanned

module.exports = router;
