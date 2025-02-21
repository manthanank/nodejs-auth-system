# Node.js Authentication System

A comprehensive authentication and session management system built with Node.js.

## Features

- 🔐 **Authentication**
  - Email/Password Registration and Login
  - OAuth2 Integration (Google, GitHub)
  - JWT-based Authentication
  - Session Management across Multiple Devices
  - Account Verification via Email
  - Password Reset/Recovery

- 📱 **Device Management**
  - Multi-device Login Support (up to 4 devices)
  - Active Session Tracking
  - Force Logout from Specific Devices
  - Device-specific Session Control

- 🛡️ **Security**
  - Role-based Authorization
  - Rate Limiting
  - Password Hashing with Bcrypt
  - Token Blacklisting
  - Account Lockout after Failed Attempts
  - Secure Headers with Helmet
  - CORS Protection

## Tech Stack

- Node.js, Express.js
- MongoDB with Mongoose
- JWT, Passport.js
- Bcrypt, Helmet, Express-rate-limit
- Joi for validation
- Nodemailer for emails
- Swagger UI Express for API docs

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create a `.env` file using `.env.example` as template

    ```bash
    cp .env.example .env
    ```

3. Start the development server:

    ```bash
    npm run dev
    ```

## API Documentation

Access the Swagger documentation at: `http://localhost:5000/api-docs`

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 5000) |
| NODE_ENV | Environment (development/production) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret |
| SMTP_HOST | SMTP server host |
| SMTP_PORT | SMTP server port |
| SMTP_MAIL | SMTP email address |
| SMTP_APP_PASS | SMTP application password |
| GITHUB_CLIENT_ID | GitHub OAuth client ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth client secret |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |

## API Routes

### Auth Routes

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout from current device
- `POST /api/auth/logout-all` - Logout from all devices
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Session Routes

- `GET /api/auth/sessions` - Get active sessions
- `DELETE /api/auth/sessions/:deviceId` - Delete specific session

### Password Management

- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `PUT /api/auth/change-password` - Change password

### Email Verification

- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-verification-email` - Resend verification

### OAuth Routes

- `GET /api/auth/github` - GitHub OAuth login
- `GET /api/auth/google` - Google OAuth login

## License

This project is open source and available under the [MIT License](LICENSE).
