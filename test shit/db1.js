// db.js
import mysql from 'mysql2/promise'

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'stockpassword',
    database: 'invested'
});

export default db;
