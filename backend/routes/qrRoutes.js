const express = require("express");
const router = express.Router();

const { scanQR } = require("../controllers/qrController");

router.get("/:token", scanQR);

module.exports = router;