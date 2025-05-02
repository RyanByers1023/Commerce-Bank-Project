// setupTestUser.js
import db from './db1.js';
import bcrypt from 'bcrypt';

const username = 'aydinvestor';
const rawPassword = 'testing123!';
const password = await bcrypt.hash(rawPassword, 10);

await db.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, password]
);

console.log('✅ Test user created.');
process.exit();
