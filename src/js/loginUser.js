// loginUser.js
import db from './db.js';
import bcrypt from 'bcrypt';

async function login(username, password) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
        console.log('❌ User not found');
        return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (valid) {
        console.log(`✅ Welcome back, ${user.username}! Your user ID is ${user.id}`);
    } else {
        console.log('❌ Incorrect password');
    }
}

// Call it with your test user info
await login('aydinvestor', 'testing123');
process.exit();
