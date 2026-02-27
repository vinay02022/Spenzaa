# Phase 1 — Authentication (Backend)

## Overview

JWT-based authentication with signup and login endpoints. A global guard protects all routes by default; public routes opt out with the `@Public()` decorator.

## Endpoints

### POST /auth/signup

Creates a new user account and returns a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Success Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400` — Validation error (invalid email, password < 6 chars)
  ```json
  {
    "message": ["Please provide a valid email address", "Password must be at least 6 characters"],
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- `409` — Email already registered
  ```json
  {
    "message": "Email already registered",
    "error": "Conflict",
    "statusCode": 409
  }
  ```

### POST /auth/login

Authenticates an existing user and returns a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `401` — Invalid credentials
  ```json
  {
    "message": "Invalid email or password",
    "error": "Unauthorized",
    "statusCode": 401
  }
  ```

## Implementation Details

### Password Hashing

- Passwords are hashed using **bcrypt** with a salt round of 10.
- Plaintext passwords are never stored or logged.

### JWT Token

- Signed with the `JWT_SECRET` environment variable.
- Expires in 24 hours.
- Payload: `{ sub: userId, email: userEmail }`.
- Sent in responses as `access_token`.

### Global Auth Guard

- `JwtAuthGuard` is registered globally via `APP_GUARD`.
- Every route requires a valid JWT `Authorization: Bearer <token>` header.
- Routes decorated with `@Public()` bypass the guard.
- Public routes: `/health`, `/auth/signup`, `/auth/login`.

### JWT Strategy (Passport)

- Extracts token from `Authorization: Bearer` header.
- Validates token signature and expiration.
- Attaches `{ userId, email }` to `request.user`.

## Files

| File | Purpose |
|------|---------|
| `src/auth/auth.module.ts` | Module wiring (Passport, JWT, providers) |
| `src/auth/auth.controller.ts` | Signup and login endpoints |
| `src/auth/auth.service.ts` | Business logic (hash, compare, token generation) |
| `src/auth/dto/signup.dto.ts` | Signup validation DTO |
| `src/auth/dto/login.dto.ts` | Login validation DTO |
| `src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `src/auth/guards/jwt-auth.guard.ts` | Global auth guard with @Public() support |
| `src/auth/decorators/public.decorator.ts` | @Public() decorator |

## Edge Cases

- **Duplicate email:** Returns 409 Conflict.
- **Wrong password:** Returns 401 with generic "Invalid email or password" (no leak of which field is wrong).
- **Missing fields:** Returns 400 with specific validation messages.
- **Extra fields:** Stripped by `whitelist: true` in ValidationPipe.
- **Expired token:** Returns 401 Unauthorized.

## How to Test

```bash
# Start the server
npm run start:dev

# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Access protected route (will return 401 without token)
curl http://localhost:3000/webhooks

# Access with token
curl http://localhost:3000/webhooks \
  -H "Authorization: Bearer <token-from-login>"
```
