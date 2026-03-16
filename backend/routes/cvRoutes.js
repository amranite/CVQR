const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const { uploadCV } = require("../controllers/cvController");

router.post("/upload", auth, uploadCV);

module.exports = router;