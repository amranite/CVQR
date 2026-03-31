require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const cvRoutes = require("./routes/cvRoutes");
const qrRoutes = require("./routes/qrRoutes");
const companyRoutes = require("./routes/companyRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", authRoutes);
app.use("/cv", cvRoutes);
app.use("/qr", qrRoutes);
app.use("/company", companyRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});