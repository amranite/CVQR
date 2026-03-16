const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "ID476849_CVQR.db.webhosting.be",
    user: "ID476849_CVQR",
    password: "CVQR2026!",
    database: "ID476849_CVQR",
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;