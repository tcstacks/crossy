# CrossPlay API Documentation

Welcome to the CrossPlay API documentation. This API powers the CrossPlay multiplayer crossword application, providing endpoints for authentication, puzzle management, multiplayer rooms, and real-time collaboration via WebSocket.

## Base URL

Development: `http://localhost:8080`

Production: `https://your-domain.com`

## API Overview

The CrossPlay API is organized around REST principles. It accepts JSON-encoded request bodies and returns JSON-encoded responses. The API uses standard HTTP response codes for success and error states.

## Authentication

Most API endpoints require authentication via JWT (JSON Web Tokens). After logging in or registering, you'll receive a token that must be included in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

For WebSocket connections, the token is passed as a query parameter:

```
ws://localhost:8080/ws?token=<your-token>
```

## Available Endpoints

### Authentication
- [POST /api/auth/register](./authentication.md#register) - Create a new user account
- [POST /api/auth/login](./authentication.md#login) - Sign in to existing account
- [POST /api/auth/guest](./authentication.md#guest) - Create a guest account

### Users
- [GET /api/users/me](./users.md#get-current-user) - Get current user profile
- [GET /api/users/me/stats](./users.md#get-user-statistics) - Get user statistics
- [GET /api/users/me/history](./users.md#get-puzzle-history) - Get puzzle solving history

### Puzzles
- [GET /api/puzzles/today](./puzzles.md#get-todays-puzzle) - Get today's daily puzzle
- [GET /api/puzzles/:date](./puzzles.md#get-puzzle-by-date) - Get puzzle by specific date
- [GET /api/puzzles/archive](./puzzles.md#get-puzzle-archive) - Browse puzzle archive
- [GET /api/puzzles/random](./puzzles.md#get-random-puzzle) - Get random puzzle

### Rooms
- [POST /api/rooms](./rooms.md#create-room) - Create a multiplayer room
- [GET /api/rooms/:code](./rooms.md#get-room-by-code) - Get room by join code
- [POST /api/rooms/:id/join](./rooms.md#join-room) - Join a room
- [POST /api/rooms/:id/start](./rooms.md#start-room) - Start the game (host only)
- [DELETE /api/rooms/:id](./rooms.md#close-room) - Close a room (host only)

### WebSocket
- [WebSocket Protocol](./websocket.md) - Real-time multiplayer protocol

## HTTP Status Codes

The API uses standard HTTP status codes:

| Code | Description |
|------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request format |
| 401 | Unauthorized - Authentication required or invalid |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

## Rate Limiting

Currently, there are no rate limits enforced on the API. However, this may change in production environments.

## CORS

The API supports CORS for cross-origin requests. In development, all origins are allowed.

## Examples

All endpoint documentation includes:
- Request format with required/optional fields
- Example curl commands
- Sample responses
- Error scenarios

## Need Help?

- Check the [FAQ](../user-guide/faq.md) for common questions
- Review the [Development Guide](../development/README.md) for architecture details
- Open an issue on GitHub for bugs or feature requests
