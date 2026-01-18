# Authentication API

The authentication endpoints handle user registration, login, and guest account creation. All endpoints return a JWT token that must be used for authenticated requests.

## Endpoints

- [Register](#register)
- [Login](#login)
- [Guest](#guest)

---

## Register

Create a new user account with email and password.

### Endpoint

```
POST /api/auth/register
```

### Authentication

None required

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 6 characters |
| displayName | string | Yes | 2-50 characters |

### Example Request

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "displayName": "John Doe"
  }'
```

### Response (201 Created)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "isGuest": false,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid email format, password too short, or displayName invalid |
| 409 | email already registered | An account with this email already exists |
| 500 | failed to create user | Server error during account creation |

### Validation Rules

- **Email**: Must be a valid email format (e.g., user@example.com)
- **Password**: Minimum 6 characters, no maximum
- **Display Name**: 2-50 characters, will be visible to other players

---

## Login

Sign in to an existing account with email and password.

### Endpoint

```
POST /api/auth/login
```

### Authentication

None required

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Registered email address |
| password | string | Yes | Account password |

### Example Request

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

### Response (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "isGuest": false,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid request format |
| 401 | invalid credentials | Email not found or password incorrect |
| 500 | database error | Server error during login |

### Security Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 7 days by default
- Failed login attempts are not rate-limited (consider adding in production)

---

## Guest

Create a temporary guest account without email/password. Guest accounts can play but won't persist across sessions.

### Endpoint

```
POST /api/auth/guest
```

### Authentication

None required

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| displayName | string | Yes | 2-50 characters, visible to other players |

### Example Request

```bash
curl -X POST http://localhost:8080/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Guest Player"
  }'
```

### Response (201 Created)

```json
{
  "user": {
    "id": "guest-20260115103000",
    "email": "guest_20260115@crossplay.local",
    "displayName": "Guest Player",
    "isGuest": true,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Display name invalid (too short/long) |
| 500 | failed to create guest user | Server error during guest creation |

### Guest Account Limitations

- Guest accounts are deleted after inactivity
- Statistics and history are not permanently saved
- Cannot recover account if token is lost
- Guest email format: `guest_<timestamp>@crossplay.local`

---

## Using JWT Tokens

After successful authentication, use the returned token in subsequent requests:

### HTTP Requests

Include the token in the Authorization header:

```bash
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### WebSocket Connection

Pass the token as a query parameter:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

### Token Payload

JWT tokens contain the following claims:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "John Doe",
  "isGuest": false,
  "exp": 1705315800
}
```

### Token Expiration

- Tokens expire after 7 days
- Expired tokens will receive a 401 Unauthorized response
- Client should handle token refresh or re-authentication
