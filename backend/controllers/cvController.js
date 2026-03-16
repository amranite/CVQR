const pool = require("../config/db");
const generateToken = require("../utils/generateToken");

exports.uploadCV = async (req, res) => {

    try {

        const studentId = req.user.id;

        const token = generateToken();

        const expires = new Date();
        expires.setHours(expires.getHours() + 72);

        res.json({
            message: "Upload endpoint placeholder",
            qr_token: token,
            expires_at: expires
        });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};