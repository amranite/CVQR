const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { listAllCVs, deleteCVByUser } = require("../controllers/adminController");

// All admin routes require a valid JWT and the "admin" role
router.get("/cvs", auth, requireRole("admin"), listAllCVs);               // List all uploaded CVs
router.delete("/cv/:userId", auth, requireRole("admin"), deleteCVByUser); // Delete a student's CV

module.exports = router;
