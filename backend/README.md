# CrossPlay Backend

**Multiplayer Crossword Puzzle Game Server**

---

## Stack

- **Language**: Go 1.20+
- **Database**: PostgreSQL
- **Cache**: Redis
- **WebSockets**: Gorilla WebSocket
- **API Framework**: Gin

---

## Architecture

```
backend/
├── cmd/
│   ├── admin/          # Puzzle management CLI
│   └── server/         # Main HTTP/WebSocket server
├── internal/
│   ├── api/            # HTTP endpoints
│   ├── auth/           # JWT authentication
│   ├── db/             # Database layer
│   ├── models/         # Data models
│   └── realtime/       # WebSocket hub
├── test-puzzles/       # Template puzzles
└── data/
    └── source-puzzles/ # Downloaded puzzle sources
```

---

## Running the Server

### Prerequisites
- Go 1.20+
- PostgreSQL running
- Redis running

### Start
```bash
cd backend
go run cmd/server/main.go
```

Server runs on `http://localhost:8080`

---

## Puzzle Management

### List Puzzles
```bash
go run cmd/admin/main.go list
go run cmd/admin/main.go list -status published
```

### Import Puzzles
```bash
go run cmd/admin/main.go import ./test-puzzles/batch1/
```

### Publish Puzzles
```bash
go run cmd/admin/main.go publish -id <UUID> -date 2026-01-20
```

### Puzzle JSON Format
```json
{
  "id": "uuid-here",
  "title": "Monday Crossword",
  "author": "Constructor Name",
  "difficulty": "easy",
  "grid": [
    [
      {"letter": "A", "number": 1},
      {"letter": "P", "number": 2}
    ]
  ],
  "clues": {
    "across": [
      {
        "number": 1,
        "text": "Fruit",
        "answer": "APPLE",
        "position": {"x": 0, "y": 0},
        "length": 5
      }
    ],
    "down": [...]
  }
}
```

---

## API Endpoints

### Puzzles
- `GET /api/puzzles/today` - Get today's puzzle
- `GET /api/puzzles/archive` - Get all published puzzles
- `GET /api/puzzles/:id` - Get specific puzzle

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/guest` - Create guest account

### Rooms (Multiplayer)
- `POST /api/rooms` - Create game room
- `GET /api/rooms/:code` - Get room details
- `POST /api/rooms/:code/join` - Join room
- `WS /api/rooms/:code/ws` - WebSocket connection

### Game Modes
- **Collaborative**: Everyone edits same grid
- **Race**: Individual grids, first to finish wins
- **Relay**: Take turns editing shared grid

---

## WebSocket Protocol

### Client → Server

**Cell Update**:
```json
{
  "type": "cell_update",
  "data": {
    "row": 0,
    "col": 1,
    "letter": "A"
  }
}
```

**Chat Message**:
```json
{
  "type": "chat_message",
  "data": {
    "message": "Hello team!"
  }
}
```

### Server → Client

**Room State**:
```json
{
  "type": "room_state",
  "data": {
    "roomCode": "ABCD12",
    "status": "active",
    "players": [...],
    "grid": [...]
  }
}
```

---

## Current Puzzle Library

**Status**: 20 template puzzles
**Coverage**: Jan 9-28, 2026
**Location**: `test-puzzles/batch1/`

See `PUZZLE_LIBRARY_STATUS.md` for details.

---

## Development

### Build
```bash
go build ./cmd/server
go build ./cmd/admin
```

### Test
```bash
go test ./...
```

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@localhost/crossplay
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=8080
```

---

## Production Deployment

**Recommended Platforms**:
- Render.com
- Railway.app
- Fly.io

---

**Status**: Production ready with 20 puzzles
**Last Updated**: 2026-01-16
