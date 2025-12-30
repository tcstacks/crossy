# CrossPlay - Multiplayer Crossword Puzzles

A mobile-first web application for solving crossword puzzles together with friends in real-time. Features daily puzzles, multiplayer rooms, and live collaboration.

## Features

- **Daily Puzzles**: Fresh crossword puzzles every day with varying difficulty
- **Multiplayer Rooms**: Create rooms and invite friends to solve together
- **Real-Time Collaboration**: See live cursors and typing from other players
- **Multiple Game Modes**:
  - Collaborative: Work together on one grid
  - Race: First to finish wins
  - Relay: Take turns solving
- **Chat & Reactions**: Communicate with teammates during gameplay
- **Statistics & Streaks**: Track your progress and compete for best times
- **Mobile-First**: Optimized for touch devices with responsive design
- **PWA Support**: Install as an app on mobile devices

## Tech Stack

### Backend (Go)
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL with go-pg
- **Cache/Sessions**: Redis
- **Real-time**: Gorilla WebSocket
- **Auth**: JWT with bcrypt password hashing
- **Puzzle Generation**: Claude API integration

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Real-time**: WebSocket client

## Project Structure

```
crossy/
├── backend/
│   ├── cmd/
│   │   └── server/          # Main server entry point
│   ├── internal/
│   │   ├── api/             # HTTP handlers
│   │   ├── auth/            # Authentication logic
│   │   ├── db/              # Database operations
│   │   ├── middleware/      # HTTP middleware
│   │   ├── models/          # Data models
│   │   ├── puzzle/          # Puzzle generation/validation
│   │   └── realtime/        # WebSocket hub and clients
│   ├── migrations/          # Database migrations
│   └── go.mod
│
└── frontend/
    ├── src/
    │   ├── app/             # Next.js app router pages
    │   ├── components/      # React components
    │   ├── hooks/           # Custom React hooks
    │   ├── lib/             # Utilities and API client
    │   ├── store/           # Zustand state management
    │   └── types/           # TypeScript type definitions
    ├── public/              # Static assets
    └── package.json
```

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure your environment variables:
   ```env
   PORT=8080
   DATABASE_URL=postgres://user:password@localhost:5432/crossplay?sslmode=disable
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key
   ANTHROPIC_API_KEY=your-api-key  # For puzzle generation
   ```

4. Install dependencies and run:
   ```bash
   go mod download
   go run cmd/server/main.go
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/guest` - Create guest session

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/me/stats` - Get user statistics
- `GET /api/users/me/history` - Get puzzle history

### Puzzles
- `GET /api/puzzles/today` - Get today's puzzle
- `GET /api/puzzles/:date` - Get puzzle by date
- `GET /api/puzzles/archive` - Browse puzzle archive
- `GET /api/puzzles/random` - Get random puzzle

### Rooms
- `POST /api/rooms` - Create a room
- `GET /api/rooms/:code` - Get room by code
- `POST /api/rooms/:id/join` - Join a room
- `POST /api/rooms/:id/start` - Start the game
- `DELETE /api/rooms/:id` - Close a room

### WebSocket Events
- `join_room` - Join a multiplayer room
- `leave_room` - Leave current room
- `cell_update` - Update a cell value
- `cursor_move` - Move cursor position
- `send_message` - Send chat message
- `request_hint` - Request a hint
- `start_game` - Start the game (host only)

## Deployment

### Backend
The Go backend can be deployed to any container platform:

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server cmd/server/main.go

FROM alpine:latest
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]
```

### Frontend
Deploy to Vercel or any static hosting:

```bash
npm run build
```

## License

MIT License - see LICENSE file for details
