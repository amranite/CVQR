const pool = require("../config/db");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");


exports.uploadCV = async (req, res) => {

    try {

        const filePath = req.file.filename;

        const token = uuidv4();

        const expires = new Date();
        expires.setHours(expires.getHours() + 24);

        await pool.query(
            `INSERT INTO qr_tokens (token, file_path, expires_at)
             VALUES (?, ?, ?)`,
            [token, filePath, expires]
        );

        const qrUrl = `http://localhost:3000/qr/${token}`;

        const qrImage = await QRCode.toDataURL(qrUrl);

        res.json({
            message: "CV uploaded",
            qrUrl,
            qrImage
        });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};



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
            cv: `/uploads/${rows[0].file_path}`
        });

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
};