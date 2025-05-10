// src/server/middleware/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);
/**

 * Get a connection from the pool
 * @returns {Promise<Connection>} MySQL connection
 */
const getConnection = async () => {
    try {
        return await pool.getConnection();
    } catch (error) {
        console.error('Error getting database connection:', error);
        throw error;
    }
};

/**
 * Execute a query
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Array>} Query results
 */
const query = async (sql, params = []) => {
    try {
        const result = await pool.query(sql, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Execute a transaction
 * @param {Function} callback - Function to execute in transaction
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        const result = await callback(connection);

        await connection.commit();
        return result;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Transaction error:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Close the database pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
    try {
        await pool.end();
        console.log('Database pool closed');
    } catch (error) {
        console.error('Error closing database pool:', error);
        throw error;
    }
};

// Test connection on startup
const testConnection = async () => {
    try {
        const connection = await getConnection();
        console.log('Database connection test successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
};

module.exports = {
    getConnection,
    query,
    transaction,
    closePool,
    testConnection
};