const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const cvRoutes = require("./routes/cvRoutes");
const qrRoutes = require("./routes/qrRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

app.use("/auth", authRoutes);
app.use("/cv", cvRoutes);
app.use("/qr", qrRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});