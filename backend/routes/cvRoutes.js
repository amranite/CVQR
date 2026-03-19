const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadCV, getMyCV, replaceCV, deleteCV } = require("../controllers/cvController");

// All CV routes require authentication (auth middleware runs first on each)
router.post("/upload", auth, upload.single("cv"), uploadCV); // Upload a new CV
router.get("/me", auth, getMyCV);                            // Get current CV info
router.put("/", auth, upload.single("cv"), replaceCV);       // Replace existing CV with a new file
router.delete("/", auth, deleteCV);                          // Delete CV

module.exports = router;
