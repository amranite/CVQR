const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");

// Public routes, no authentication required
router.post("/register", register); // Create a new student or company account
router.post("/login", login);       // Login and receive a JWT token

module.exports = router;
