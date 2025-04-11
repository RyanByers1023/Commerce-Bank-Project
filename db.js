// db.js (JavaScript)
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',          // Your MySQL host
    user: 'ibra-ryz9ai',      // Your MySQL username (replace with your actual username)
    password: 'stock_password',  // Your MySQL password (replace with your actual password)
    database: 'your_database_name',  // The database containing stock_test
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
