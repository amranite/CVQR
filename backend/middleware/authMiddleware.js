const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header)
        return res.status(401).json({ error: "No token provided" });

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
}

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "No authenticated user" });

        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: "Forbidden" });

        next();
    };
}

module.exports = auth;
module.exports.allowRoles = allowRoles;