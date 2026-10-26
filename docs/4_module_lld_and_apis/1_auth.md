# GlovaCRM — Auth Module LLD / API Design

**Version:** 1.0  
**Module:** Authentication & Session Management  
**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Architecture:** Modular Monolith  
**API Base Path:** `/api/auth`

---

## 1. Purpose

The Auth Module manages multi-tenant user authentication, session management, and password lifecycle.

This module is responsible for:
- Tenant signup (registration).
- Login via email and password for Super Admins, Tenant Admins, and Telecallers.
- JWT-based access tokens containing `tenant_id`, role, and permissions.
- Refresh-token generation and rotation strategy.
- Password recovery (forgot, reset, change).
- Email verification during registration.
- Logout and session invalidation.

**Scope boundary:** Auth does not manage comprehensive user profiles or tenant billing settings. It strictly handles credentials, identity resolution, and token issuance.

---

## 2. Actors

| Actor | Login Method | Notes |
|---|---|---|
| Super Admin | Email + Password | Can access cross-tenant management APIs. `tenant_id` is null or special system tenant. |
| Tenant Admin | Email + Password | Bound to a specific `tenant_id`. Has full access to tenant resources. |
| Telecaller (User) | Email + Password | Bound to a specific `tenant_id`. Access restricted to assigned leads. |

---

## 3. Auth Design Decisions

| Area | Decision |
|---|---|
| Password Hashing | `bcrypt` (cost factor 12) |
| Access Token | JWT (JSON Web Token), short-lived (e.g., 15 mins). |
| Refresh Token | Opaque cryptographically random string (e.g., `crypto.randomBytes(40).toString('hex')`). |
| JWT Payload | `{ id, email, role, tenant_id, permissions }` |
| Session Storage | Refresh tokens stored as hashes in `user_sessions` or `refresh_tokens` DB table. |
| Refresh Token Rotation | Required. On refresh, the old token is invalidated and a new one is issued. |
| Rate Limiting | Implemented via Redis on `/login`, `/register`, `/forgot-password`. Max 5 failed logins per 15 min per IP/Email. |

---

## 4. Endpoint Summary

| Method | Endpoint | Auth Required | Description |
|---|---|---:|---|
| POST | `/api/auth/register` | No | Tenant signup and account creation. |
| POST | `/api/auth/login` | No | Authenticate user and return tokens. |
| POST | `/api/auth/refresh-token` | No | Refresh access token. |
| POST | `/api/auth/logout` | Yes | Revoke refresh token. |
| POST | `/api/auth/forgot-password` | No | Request password reset link. |
| POST | `/api/auth/reset-password` | No | Reset password using token. |
| POST | `/api/auth/verify-email` | No | Verify email address. |
| GET | `/api/auth/me` | Yes | Get current authenticated user details. |
| POST | `/api/auth/change-password` | Yes | Change password while logged in. |

---

## 5. Security Considerations

- **Tenant Isolation:** JWT strictly includes `tenant_id`. All downstream API middlewares must enforce `tenant_id` matching on queries.
- **Token Storage:** Frontend should store access tokens in memory and refresh tokens in `HttpOnly` Secure cookies to prevent XSS.
- **Brute Force:** Rate limiters (`express-rate-limit` backed by Redis) on authentication routes.
- **Token Invalidation:** Logging out deletes the refresh token record in the DB.

---

## 6. Endpoint Details

### 6.1 Register Tenant

`POST /api/auth/register`

#### Request Body
```json
{
  "companyName": "Acme Corp",
  "fullName": "John Doe",
  "email": "john@acme.com",
  "password": "SecurePassword123!"
}
```

#### Response
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "tenantId": "tenant_123",
    "userId": "user_456"
  }
}
```

### 6.2 Login

`POST /api/auth/login`

#### Request Body
```json
{
  "email": "john@acme.com",
  "password": "SecurePassword123!"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "7a9b...",
    "user": {
      "id": "user_456",
      "tenantId": "tenant_123",
      "role": "TENANT_ADMIN"
    }
  }
}
```

### 6.3 Refresh Token

`POST /api/auth/refresh-token`

#### Request Body
```json
{
  "refreshToken": "7a9b..."
}
```
*(Or fetched from `HttpOnly` cookie depending on frontend choice)*

#### Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "new_98cx..."
  }
}
```

### 6.4 Logout

`POST /api/auth/logout`

#### Request Body
```json
{
  "refreshToken": "7a9b..."
}
```

### 6.5 Forgot Password

`POST /api/auth/forgot-password`

#### Request Body
```json
{
  "email": "john@acme.com"
}
```

### 6.6 Reset Password

`POST /api/auth/reset-password`

#### Request Body
```json
{
  "token": "reset_token_xyz",
  "newPassword": "NewSecurePassword123!"
}
```

### 6.7 Verify Email

`POST /api/auth/verify-email`

#### Request Body
```json
{
  "token": "verify_token_abc"
}
```

### 6.8 Get Current User

`GET /api/auth/me`

#### Response
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "email": "john@acme.com",
    "role": "TENANT_ADMIN",
    "tenantId": "tenant_123",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### 6.9 Change Password

`POST /api/auth/change-password`

#### Request Body
```json
{
  "oldPassword": "SecurePassword123!",
  "newPassword": "NewSecurePassword123!"
}
```
