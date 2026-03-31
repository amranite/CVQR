const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");
const { getAllCvs, deleteStudentCv } = require("../controllers/adminController");

router.get("/cvs", auth, allowRoles("admin"), getAllCvs);
router.delete("/cv/:studentId", auth, allowRoles("admin"), deleteStudentCv);

module.exports = router;