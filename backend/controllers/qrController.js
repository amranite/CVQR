const pool = require("../config/db");

exports.scanQR = async (req, res) => {

    const { token } = req.params;

    try {

        const [rows] = await pool.query(
            `SELECT *
             FROM qr_tokens
             WHERE token = ?
             AND expires_at > NOW()`,
            [token]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: "QR expired or invalid" });

        res.json({
            message: "QR valid",
            token: rows[0]
        });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};