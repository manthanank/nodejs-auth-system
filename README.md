# Node.js Authentication System

A comprehensive authentication and session management system built with Node.js.

## Features

- 🔐 **Authentication**
  - Email/Password Registration and Login
  - OAuth2 Integration (Google, GitHub) via Passport.js
  - JWT-based Authentication with Token Blacklisting
  - Session Management across Multiple Devices
  - Account Verification via Email with Custom HTML Templates
  - Password Reset/Recovery

- 📱 **Device Management**
  - Multi-device Login Support (max 4 concurrent devices)
  - Real-time Session Tracking with Last Active Times
  - Force Logout from Specific Devices
  - Device-specific Session Control with User Agent Tracking
  - Email Notifications for New Device Logins

- 🛡️ **Security**
  - Role-based Authorization (user/admin roles)
  - Rate Limiting via express-rate-limit
  - Password Hashing with Bcrypt
  - Token Blacklisting for Logout
  - Account Lockout after Failed Login Attempts
  - Secure Headers with Helmet
  - CORS Protection
  - Input Validation with Joi

## Tech Stack

- Express.js with Node.js
- MongoDB with Mongoose ODM
- JWT & Passport.js Authentication
- Bcrypt for Password Hashing
- Helmet for Security Headers
- Morgan for HTTP Logging
- Nodemailer for Email Service
- Swagger UI for API Documentation

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create `.env` file from template:

    ```bash
    cp .env.example .env
    ```

3. Start development server:

    ```bash
    npm run dev
    ```

## API Documentation

Access Swagger UI docs at: `http://localhost:5000/api-docs`

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 5000) |
| NODE_ENV | Environment (development/production) |
| BASE_URL | API base URL |
| FRONTEND_URL | Frontend application URL |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret |
| SMTP_HOST | SMTP server host |
| SMTP_PORT | SMTP server port |
| SMTP_SERVICE | Email service (e.g. gmail) |
| SMTP_MAIL | SMTP email address |
| SMTP_APP_PASS | SMTP application password |
| API_SECRET | Session secret key |
| GITHUB_CLIENT_ID | GitHub OAuth client ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth client secret |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| CALLBACK_URL | OAuth callback URL |

## API Routes

### Auth Routes

- `POST /api/auth/register` - Register new user

- `POST /api/auth/login` - Login user with device tracking
- `POST /api/auth/logout` - Logout current device
- `POST /api/auth/logout-all` - Logout all devices
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Session Management

- `GET /api/auth/sessions` - List active sessions
- `DELETE /api/auth/sessions/:deviceId` - Remove session
- `GET /api/auth/users/device/:deviceId` - Get users by device

### Password Management

- `POST /api/auth/forgot-password` - Request reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/refresh-token` - Refresh JWT token

### Email Verification

- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-verification-email` - Resend verification

### OAuth Routes

- `GET /api/auth/github` - GitHub OAuth login
- `GET /api/auth/google` - Google OAuth login

## License

This project is open source under the MIT License.
