# InvestEd Login System Integration Guide

This guide explains how to integrate the enhanced login and authentication system with your InvestEd Stock Market Simulator project.

## Installation Steps

1. **Update Database Schema**

   Run the password_reset_migration.sql script to add the necessary tables for password reset functionality:

   ```sql
   -- Add password_reset_tokens table to existing schema
   CREATE TABLE IF NOT EXISTS password_reset_tokens (
       tokenID INT AUTO_INCREMENT PRIMARY KEY,
       userID INT NOT NULL,
       token VARCHAR(255) NOT NULL,
       expiresAt TIMESTAMP NOT NULL,
       createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
       UNIQUE KEY (token)
   );

   -- Ensure users table has isDemoAccount column
   ALTER TABLE users
   ADD COLUMN IF NOT EXISTS isDemoAccount BOOLEAN DEFAULT FALSE;
   ```

2. **Update Server Files**

   Replace the `src/server/routes/auth.js` file with the enhanced version provided.

3. **Add Client Files**

   Copy the following files to your project:

   - `src/client/login.html` (replace existing file)
   - `src/client/forgot-password.html` (new file)
   - `src/client/js/AuthHandler.js` (new file)
   - `src/client/js/PasswordValidator.js` (new file)
   - `src/client/js/LoginEnhancements.js` (new file)
   - `src/client/js/PasswordResetHandler.js` (new file)

4. **Update Navbar Links**

   Make sure your navbar includes proper links to:

   - Login page (`login.html`)
   - Dashboard for authenticated users (`dashboard.html`)

## Feature Overview

### 1. User Authentication

- **Login**: Email and password authentication
- **Registration**: New user account creation with strong password requirements
- **Remember Me**: Extended session functionality
- **Demo Account**: Quick access without registration

### 2. Password Management

- **Password Reset**: "Forgot Password" workflow
- **Password Strength Meter**: Visual feedback during password creation
- **Password Requirements**: Enforced minimum security standards
  - At least 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### 3. Security Features

- **Session Management**: Server-side session storage
- **Password Hashing**: Secure bcrypt hashing
- **CSRF Protection**: Enabled through session cookies
- **Input Validation**: Both client and server-side validation

## Authentication Flow

1. **Login Process**:
   - User enters email and password
   - Client validates input
   - Server verifies credentials against database
   - Server creates session and returns success
   - Client redirects to dashboard

2. **Registration Process**:
   - User enters username, email, and password
   - Client validates password strength
   - Server checks for existing username/email
   - Server creates user, initial portfolio, and session
   - Client redirects to dashboard

3. **Password Reset Flow**:
   - User requests password reset with email
   - Server generates reset token and sends email (simulated)
   - User clicks reset link
   - User creates new password
   - Server verifies token and updates password
   - User can log in with new password

## Testing

Test the authentication system with the following scenarios:

1. **Registration**
   - Create a new account with valid credentials
   - Try creating an account with an existing username/email
   - Test password requirements enforcement

2. **Login**
   - Log in with valid credentials
   - Try logging in with invalid credentials
   - Test "Remember Me" functionality

3. **Password Reset**
   - Request password reset with valid email
   - Reset password with valid token
   - Try logging in with old and new passwords

4. **Demo Account**
   - Test demo login functionality
   - Verify demo account has proper setup

## Troubleshooting

- **Session Issues**: Check browser cookies and server session configuration
- **Database Connection**: Verify MySQL connection parameters
- **Missing Dependencies**: Ensure bcrypt and uuid packages are installed
- **API Paths**: Confirm the API base path matches your server configuration

## Next Steps

1. **Email Integration**: Add actual email sending for password reset
2. **Account Verification**: Implement email verification for new accounts
3. **OAuth Integration**: Add social login options (Google, GitHub, etc.)
4. **Advanced Security**: Implement rate limiting and two-factor authentication