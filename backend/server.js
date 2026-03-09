const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("API is running");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

const pool = require("./config/db");

app.get("/db-test", async (req, res) => {

    try {
        const [rows] = await pool.query("SELECT 1 + 1 AS result");
        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
    }

});