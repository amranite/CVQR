const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");
const { getScans } = require("../controllers/companyController");

router.get("/scans", auth, allowRoles("company"), getScans);

module.exports = router;