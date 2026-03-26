const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Configure where and how uploaded files are stored on disk
const storage = multer.diskStorage({

    // Save all uploads to the /uploads directory
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    // Rename the file to a UUID to avoid collisions and hide original names on disk
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});

// Only allow PDF files, reject anything else before it reaches the controller
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed"), false);
    }
};

// Export the configured multer instance, routes call upload.single("cv") to activate it
// 5 MB ceiling — enough for any reasonable CV PDF
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;
