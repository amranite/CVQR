const fs = require("fs");
const path = require("path");
const { HttpError } = require("./httpError");

const uploadDir = path.join(__dirname, "../uploads");

function getUploadPath(fileName) {
    if (!fileName || path.basename(fileName) !== fileName)
        throw new HttpError(400, "Invalid CV file name", "INVALID_CV_FILE_NAME");

    return path.join(uploadDir, fileName);
}

function deleteFileIfExists(fileName) {
    return new Promise((resolve, reject) => {
        let fullPath;

        try {
            fullPath = getUploadPath(fileName);
        } catch (err) {
            reject(err);
            return;
        }

        fs.unlink(fullPath, (err) => {
            if (err && err.code !== "ENOENT") {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

function contentDisposition(disposition, fileName) {
    const safeName = String(fileName || "cv.pdf").replace(/["\r\n]/g, "");
    return `${disposition}; filename="${safeName}"`;
}

function sendCvVersionFile(res, cvVersion, options = {}) {
    if (!cvVersion?.file_path)
        throw new HttpError(404, "CV version file not found", "CV_VERSION_FILE_NOT_FOUND");

    const disposition = options.disposition || "inline";
    const fullPath = getUploadPath(cvVersion.file_path);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", contentDisposition(disposition, cvVersion.original_name));

    return res.sendFile(fullPath);
}

module.exports = {
    uploadDir,
    getUploadPath,
    deleteFileIfExists,
    sendCvVersionFile
};
