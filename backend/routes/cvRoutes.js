const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
    deleteCV,
    getMyCV,
    replaceCV,
    sendCvVersionFile,
    sendParticipationCvFile,
    uploadCV
} = require("../controllers/cvController");

// Wraps multer so file validation errors (wrong type, size exceeded) are forwarded
// to the global error handler instead of crashing silently.
function handleUpload(req, res, next) {
    upload.single("cv")(req, res, (err) => {
        if (err) return next(err);
        next();
    });
}

// All CV routes are student-only
router.post("/upload", auth, requireRole("student"), handleUpload, uploadCV); // Upload first CV or append a version
router.get("/me", auth, requireRole("student"), getMyCV);                     // Get logical CV and retained versions
router.put("/", auth, requireRole("student"), handleUpload, replaceCV);       // Append a new version to existing CV
router.delete("/", auth, requireRole("student"), deleteCV);                   // Delete CV if not used by an open participation
router.get("/version/:versionId/file", auth, sendCvVersionFile);              // Stream a specific retained CV version
router.get("/participation/:participationId/file", auth, sendParticipationCvFile); // Stream latest CV for a participation

module.exports = router;
