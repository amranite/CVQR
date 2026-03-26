const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

// Middleware that protects routes requiring authentication.
// Expects the request to include an Authorization header in the format: "Bearer <token>"
// If valid, attaches the decoded user payload (id, role) to req.user and passes control to the next handler.
function auth(req, res, next) {

    const header = req.headers.authorization;

    // Reject if no Authorization header is present
    if (!header)
        return res.status(401).json({ error: "No token provided" });

    // Extract the token part from "Bearer <token>"
    const token = header.split(" ")[1];

    try {

        // Verify the token signature and expiry, throws if invalid
        const decoded = jwt.verify(token, SECRET);

        // Attach the decoded payload to the request so downstream handlers can read it
        req.user = decoded;

        next();

    } catch {

        res.status(401).json({ error: "Invalid token" });

    }
}

module.exports = auth;
