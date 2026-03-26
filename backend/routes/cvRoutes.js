const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadCV, getMyCV, replaceCV, deleteCV } = require("../controllers/cvController");

// Wraps multer so file validation errors (wrong type, size exceeded) are forwarded
// to the global error handler instead of crashing silently.
function handleUpload(req, res, next) {
    upload.single("cv")(req, res, (err) => {
        if (err) return next(err);
        next();
    });
}

// All CV routes are student-only
router.post("/upload", auth, requireRole("student"), handleUpload, uploadCV); // Upload a new CV
router.get("/me", auth, requireRole("student"), getMyCV);                     // Get current CV info
router.put("/", auth, requireRole("student"), handleUpload, replaceCV);       // Replace existing CV with a new file
router.delete("/", auth, requireRole("student"), deleteCV);                   // Delete CV

module.exports = router;
