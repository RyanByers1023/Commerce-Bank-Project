require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'invested_simulator',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    // Additional security and performance settings
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false,
    charset: 'utf8mb4',
    timezone: '+00:00'
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
 * Execute a query - FIXED to work with destructuring pattern used in routes
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Array>} Query results [rows, fields]
 */
const query = async (sql, params = []) => {
    const startTime = Date.now();
    try {
        // Log query in development mode
        if (process.env.NODE_ENV === 'development') {
            console.log('Executing query:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
            if (params.length > 0) {
                console.log('With parameters:', params);
            }
        }

        const result = await pool.execute(sql, params);

        // Log query time in development
        if (process.env.NODE_ENV === 'development') {
            const duration = Date.now() - startTime;
            console.log(`Query completed in ${duration}ms`);
        }

        return result; // Returns [rows, fields] - works with destructuring
    } catch (error) {
        console.error('Database query error:', {
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            params: params,
            error: error.message,
            code: error.code,
            errno: error.errno
        });
        throw error;
    }
};

/**
 * Execute a simple query (for commands like START TRANSACTION, COMMIT, ROLLBACK)
 * @param {string} sql - SQL command to execute
 * @returns {Promise<any>} Query result
 */
const execute = async (sql) => {
    try {
        const result = await pool.execute(sql);
        return result;
    } catch (error) {
        console.error('Database execute error:', {
            sql: sql,
            error: error.message
        });
        throw error;
    }
};

/**
 * Execute a transaction with callback
 * @param {Function} callback - Function to execute in transaction
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback) => {
    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Create a query function that uses this connection
        const txQuery = async (sql, params = []) => {
            return await connection.execute(sql, params);
        };

        const result = await callback(txQuery, connection);

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
 * Get database statistics
 * @returns {Promise<Object>} Database pool statistics
 */
const getStats = () => {
    return {
        totalConnections: pool.pool._allConnections.length,
        freeConnections: pool.pool._freeConnections.length,
        acquiringConnections: pool.pool._acquiringConnections.length,
        connectionLimit: dbConfig.connectionLimit
    };
};

/**
 * Test a specific query for health checks
 * @returns {Promise<boolean>} Whether the test query succeeded
 */
const healthCheck = async () => {
    try {
        const [rows] = await query('SELECT 1 as health_check');
        return rows[0].health_check === 1;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
};

/**
 * Close the database pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
    try {
        await pool.end();
        console.log('Database pool closed gracefully');
    } catch (error) {
        console.error('Error closing database pool:', error);
        throw error;
    }
};

/**
 * Test connection on startup
 * @returns {Promise<boolean>} Whether connection test succeeded
 */
const testConnection = async () => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT VERSION() as version, DATABASE() as database');
        console.log('Database connection successful:', {
            version: rows[0].version,
            database: rows[0].database,
            host: dbConfig.host
        });
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection test failed:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            error: error.message
        });
        return false;
    }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database pool...');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database pool...');
    await closePool();
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled promise rejection:', err);
    // Don't exit the process, just log the error
});

module.exports = {
    getConnection,
    query,           // Main query function - works with destructuring
    execute,         // Simple execute function for commands
    transaction,     // Callback-based transactions
    getStats,        // Pool statistics
    healthCheck,     // Health check function
    closePool,       // Graceful shutdown
    testConnection   // Startup test
};