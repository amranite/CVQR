const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadCV, getMyCV, replaceCV, deleteCV } = require("../controllers/cvController");

// All CV routes are student-only
router.post("/upload", auth, requireRole("student"), upload.single("cv"), uploadCV); // Upload a new CV
router.get("/me", auth, requireRole("student"), getMyCV);                            // Get current CV info
router.put("/", auth, requireRole("student"), upload.single("cv"), replaceCV);       // Replace existing CV with a new file
router.delete("/", auth, requireRole("student"), deleteCV);                          // Delete CV

module.exports = router;
