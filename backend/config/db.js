const mysql = require("mysql2/promise");

// Create a connection pool using credentials from environment variables.
// A pool reuses connections instead of opening a new one for every query,
// which is more efficient for a web server handling multiple requests.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true, // Queue requests when all connections are busy
    connectionLimit: 10       // Maximum number of simultaneous connections
});

module.exports = pool;
