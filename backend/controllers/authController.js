const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// JWT secret loaded from environment, used to sign and verify tokens
const SECRET = process.env.JWT_SECRET;

// POST /auth/register
// Creates a new user account. Role is derived from the email domain:
// @school.com addresses are registered as students, everything else as companies.
exports.register = async (req, res) => {

    const { name, email, password } = req.body;

    // Reject missing or blank fields before hitting the database
    if (!name?.trim() || !email?.trim() || !password)
        return res.status(400).json({ error: "name, email, and password are required" });

    // Basic email format check — catches typos before they reach the DB
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: "Invalid email format" });

    try {

        // Determine role based on email domain
        const role = email.endsWith("@school.com")
            ? "student"
            : "company";

        // Hash the password before storing, never store plaintext passwords
        const password_hash = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [name, email, password_hash, role]
        );

        res.json({ message: "User registered" });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};

// POST /auth/login
// Validates credentials and returns a signed JWT token.
// The token carries the user's id and role, used by protected routes.
exports.login = async (req, res) => {

    const { email, password } = req.body;

    // Reject missing fields before querying the database
    if (!email?.trim() || !password)
        return res.status(400).json({ error: "email and password are required" });

    try {

        // Look up the user by email
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0)
            return res.status(401).json({ error: "User not found" });

        const user = rows[0];

        // Compare the submitted password against the stored hash
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid)
            return res.status(401).json({ error: "Invalid password" });

        // Sign a token containing the user's id and role, valid for 24 hours
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
