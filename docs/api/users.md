# Users API

The users endpoints provide access to user profile information, statistics, and puzzle history. All endpoints require authentication.

## Endpoints

- [Get Current User](#get-current-user)
- [Get User Statistics](#get-user-statistics)
- [Get Puzzle History](#get-puzzle-history)

---

## Get Current User

Retrieve the profile of the currently authenticated user.

### Endpoint

```
GET /api/users/me
```

### Authentication

Required - JWT token in Authorization header

### Example Request

```bash
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": null,
  "isGuest": false,
  "createdAt": "2026-01-10T14:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique user identifier (UUID) |
| email | string | User's email address |
| displayName | string | Display name shown to other players |
| avatarUrl | string \| null | URL to user's avatar image (if set) |
| isGuest | boolean | Whether this is a guest account |
| createdAt | string | Account creation timestamp (ISO 8601) |
| updatedAt | string | Last update timestamp (ISO 8601) |

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | not authenticated | Missing or invalid JWT token |
| 404 | user not found | User ID from token not found in database |
| 500 | database error | Server error retrieving user |

---

## Get User Statistics

Retrieve statistics for the currently authenticated user.

### Endpoint

```
GET /api/users/me/stats
```

### Authentication

Required - JWT token in Authorization header

### Example Request

```bash
curl http://localhost:8080/api/users/me/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response (200 OK)

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "puzzlesSolved": 42,
  "avgSolveTime": 385.5,
  "streakCurrent": 7,
  "streakBest": 14,
  "multiplayerWins": 8,
  "totalPlayTime": 16170,
  "lastPlayedAt": "2026-01-15T10:30:00Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| userId | string | User's unique identifier |
| puzzlesSolved | integer | Total number of completed puzzles |
| avgSolveTime | float | Average solve time in seconds |
| streakCurrent | integer | Current daily puzzle streak |
| streakBest | integer | Best daily puzzle streak achieved |
| multiplayerWins | integer | Number of multiplayer games won |
| totalPlayTime | integer | Total time spent playing in seconds |
| lastPlayedAt | string \| null | Last puzzle completion timestamp |

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | not authenticated | Missing or invalid JWT token |
| 500 | database error | Server error retrieving stats |

### Notes

- If user has no stats yet, returns default values (all zeros)
- `avgSolveTime` is calculated as a rolling average
- Streaks are based on daily puzzle completion (consecutive days)

---

## Get Puzzle History

Retrieve the puzzle-solving history for the current user with pagination.

### Endpoint

```
GET /api/users/me/history
```

### Authentication

Required - JWT token in Authorization header

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Number of records to return (max 100) |
| offset | integer | 0 | Number of records to skip |

### Example Request

```bash
curl "http://localhost:8080/api/users/me/history?limit=10&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response (200 OK)

```json
[
  {
    "id": "hist-550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "puzzleId": "puzzle-660e8400-e29b-41d4-a716-446655440001",
    "roomId": "room-770e8400-e29b-41d4-a716-446655440002",
    "solveTime": 420,
    "completed": true,
    "accuracy": 98.5,
    "hintsUsed": 2,
    "completedAt": "2026-01-15T10:30:00Z",
    "createdAt": "2026-01-15T10:00:00Z"
  },
  {
    "id": "hist-550e8400-e29b-41d4-a716-446655440003",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "puzzleId": "puzzle-660e8400-e29b-41d4-a716-446655440004",
    "roomId": null,
    "solveTime": 315,
    "completed": true,
    "accuracy": 100.0,
    "hintsUsed": 0,
    "completedAt": "2026-01-14T15:45:00Z",
    "createdAt": "2026-01-14T15:20:00Z"
  }
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | History record identifier |
| userId | string | User who solved the puzzle |
| puzzleId | string | ID of the puzzle that was solved |
| roomId | string \| null | Room ID if solved in multiplayer, null for solo |
| solveTime | integer | Time to complete in seconds |
| completed | boolean | Whether puzzle was completed |
| accuracy | float | Percentage of cells filled correctly (0-100) |
| hintsUsed | integer | Number of hints requested |
| completedAt | string \| null | Completion timestamp if completed |
| createdAt | string | When puzzle was started |

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | not authenticated | Missing or invalid JWT token |
| 500 | database error | Server error retrieving history |

### Notes

- Records are ordered by `createdAt` descending (most recent first)
- Solo puzzles have `roomId: null`
- Multiplayer puzzles include the room ID
- Incomplete puzzles have `completed: false` and `completedAt: null`

---

## Statistics Calculations

### Streaks

Streaks track consecutive days of completing the daily puzzle:

- **Current Streak**: Days in a row with at least one daily puzzle completion
- **Best Streak**: Longest streak ever achieved
- Streak resets if you miss a day
- Completing the same daily puzzle multiple times doesn't increase streak

### Average Solve Time

```
avgSolveTime = totalSolveTime / puzzlesSolved
```

- Only includes completed puzzles
- Updated incrementally as new puzzles are completed
- Measured in seconds

### Multiplayer Wins

In different game modes:

- **Collaborative**: All players win if puzzle is completed
- **Race**: Only the first player to finish wins
- **Relay**: All players win if puzzle is completed within turns

### Total Play Time

```
totalPlayTime = sum of all (completedAt - createdAt) from history
```

- Accumulated time from all puzzle attempts
- Includes both completed and incomplete puzzles
- Measured in seconds

---

## Example Usage

```javascript
// Fetch current user profile
async function getCurrentUser(token) {
  const response = await fetch('http://localhost:8080/api/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Get user statistics
async function getUserStats(token) {
  const response = await fetch('http://localhost:8080/api/users/me/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stats = await response.json();

  // Convert seconds to human-readable format
  const avgMinutes = Math.floor(stats.avgSolveTime / 60);
  const avgSeconds = Math.floor(stats.avgSolveTime % 60);

  return {
    ...stats,
    avgSolveTimeFormatted: `${avgMinutes}m ${avgSeconds}s`
  };
}

// Fetch paginated history
async function getPuzzleHistory(token, page = 0, pageSize = 20) {
  const offset = page * pageSize;
  const response = await fetch(
    `http://localhost:8080/api/users/me/history?limit=${pageSize}&offset=${offset}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return await response.json();
}
```
