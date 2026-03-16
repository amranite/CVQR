const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const { scanQR, uploadCV } = require("../controllers/qrController");

router.post("/upload", upload.single("cv"), uploadCV);

router.get("/:token", scanQR);

module.exports = router;