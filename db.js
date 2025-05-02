// db.js
import mysql

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'stockpassword',
    database: 'invested'
});

export default db;
