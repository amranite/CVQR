const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {

    const { name, email, password } = req.body;

    try {

        const role = email.endsWith("@school.com")
            ? "student"
            : "company";

        const password_hash = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [name, email, password_hash, role]
        );

        res.json({ message: "User registered" });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};

exports.login = async (req, res) => {

    const { email, password } = req.body;

    try {

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0)
            return res.status(401).json({ error: "User not found" });

        const user = rows[0];

        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid)
            return res.status(401).json({ error: "Invalid password" });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            SECRET,
            { expiresIn: "24h" }
        );

        res.json({ token });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};