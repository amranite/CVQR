const crypto = require("crypto");

// Generates a cryptographically random token as a hex string.
// Used for creating unique, hard-to-guess QR code tokens.
function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

module.exports = generateToken;
