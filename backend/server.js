// Load environment variables from .env before anything else
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const cvRoutes = require("./routes/cvRoutes");
const qrRoutes = require("./routes/qrRoutes");
const adminRoutes = require("./routes/adminRoutes");
const companyRoutes = require("./routes/companyRoutes");

const app = express();

// Allow cross-origin requests from the mobile frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Serve uploaded CV files as static assets (e.g. GET /uploads/filename.pdf)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount route groups
app.use("/auth", authRoutes);
app.use("/cv", cvRoutes);
app.use("/qr", qrRoutes);
app.use("/admin", adminRoutes);
app.use("/company", companyRoutes);

// Health check, confirms the API is reachable
app.get("/", (req, res) => {
  res.send("API is running");
});

// DB connectivity check, runs a simple query to verify the database connection
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Global error handler — catches errors passed via next(err) and multer rejections.
// Must be defined after all routes so it only catches unhandled errors.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Internal server error" });
});

// Start listening on port 3000
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
