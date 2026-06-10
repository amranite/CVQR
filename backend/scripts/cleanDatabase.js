require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const { uploadDir } = require("../utils/cvFiles");

const TABLES = [
    "scan_logs",
    "qr_tokens",
    "participations",
    "event_companies",
    "cv_versions",
    "cvs",
    "events",
    "users"
];

function assertSafeToRun() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to clean the database when NODE_ENV=production");
    }

    if (!process.argv.includes("--yes")) {
        throw new Error("Refusing to clean the database without --yes");
    }
}

async function listUploadedFiles() {
    const [rows] = await pool.query("SELECT file_path FROM cv_versions WHERE file_path IS NOT NULL");
    let uploadFiles = [];

    try {
        uploadFiles = await fs.readdir(uploadDir);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    return Array.from(new Set([
        ...rows.map((row) => row.file_path),
        ...uploadFiles.filter((fileName) => fileName !== ".gitkeep")
    ].filter(Boolean)));
}

async function deleteUploadedFiles(fileNames) {
    await Promise.all(fileNames.map(async (fileName) => {
        try {
            if (path.basename(fileName) !== fileName) {
                return;
            }

            await fs.unlink(path.join(uploadDir, fileName));
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }));
}

async function cleanDatabase() {
    assertSafeToRun();

    const dbName = process.env.DB_NAME || "cvqr";
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "3306";
    const files = await listUploadedFiles();

    console.log(`Cleaning database ${dbName} at ${dbHost}:${dbPort}`);

    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of TABLES) {
        await pool.query(`DELETE FROM ${table}`);
        await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }

    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
    await deleteUploadedFiles(files);

    console.log(`Database cleaned. Removed ${files.length} uploaded file${files.length === 1 ? "" : "s"}.`);
}

if (require.main === module) {
    cleanDatabase()
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}

module.exports = {
    cleanDatabase
};
