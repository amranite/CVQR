// Factory middleware that restricts a route to users with a specific role.
// Usage: router.get("/route", auth, requireRole("student"), handler)
// Must always be used AFTER the auth middleware since it reads req.user.
function requireRole(role) {
    return (req, res, next) => {
        // req.user is set by authMiddleware after verifying the JWT
        if (!req.user || req.user.role !== role)
            return res.status(403).json({ error: "Forbidden: insufficient role" });

        next();
    };
}

module.exports = requireRole;
