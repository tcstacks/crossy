# Product Requirements Document: Crossy

**Multiplayer Crossword Puzzle Game**

---

## Document Information

- **Version**: 1.0
- **Date**: 2026-01-16
- **Status**: Retroactive (Generated from implemented codebase)
- **Product**: Crossy - Real-time Multiplayer Crossword Platform

---

## Executive Summary

Crossy is a modern, web-based crossword puzzle game that enables both solo and multiplayer gameplay. The platform features three distinct multiplayer game modes (Collaborative, Race, and Relay), real-time synchronization via WebSockets, and a comprehensive statistics and progression system.

### Key Differentiators
- **Real-time Multiplayer**: Three unique game modes for different play styles
- **Guest & Registered Play**: No barriers to entry with optional account creation
- **Live Collaboration**: See other players' cursors and edits in real-time
- **Cross-device Support**: PWA-enabled for mobile, tablet, and desktop
- **Daily Puzzles**: Fresh content with streak tracking

---

## Product Vision

**Mission**: Make crossword puzzles social, accessible, and engaging for players of all skill levels through innovative multiplayer experiences.

**Target Audience**:
- Crossword enthusiasts seeking social gameplay
- Casual puzzle players looking for quick games
- Friend groups wanting collaborative challenges
- Competitive players interested in racing

---

## Core Features

### 1. Authentication & User Management

#### 1.1 Registration
**Description**: Users can create permanent accounts with email and password.

**Requirements**:
- Email must be unique and valid format
- Password minimum length: 6 characters
- Display name: 2-50 characters
- Returns JWT token for session management
- Auto-login after successful registration

**Acceptance Criteria**:
- [ ] User can register with email/password
- [ ] System validates email uniqueness
- [ ] System enforces password requirements
- [ ] User receives JWT token on success
- [ ] Invalid inputs show clear error messages

#### 1.2 Login
**Description**: Registered users authenticate with credentials.

**Requirements**:
- Email/password validation
- JWT token generation
- Persistent session via localStorage
- "Remember me" functionality

**Acceptance Criteria**:
- [ ] User can login with valid credentials
- [ ] Invalid credentials show error message
- [ ] Session persists across page reloads
- [ ] Token expires appropriately (24h)

#### 1.3 Guest Accounts
**Description**: Quick-start gameplay without registration.

**Requirements**:
- No email required
- Display name only (2-50 chars)
- Temporary account with limited features
- Can be upgraded to full account later

**Acceptance Criteria**:
- [ ] User can create guest account instantly
- [ ] Guest can play all game modes
- [ ] Guest account marked with "is_guest" flag
- [ ] Guest stats not persisted long-term

---

### 2. Puzzle System

#### 2.1 Daily Puzzle
**Description**: New puzzle published every day at midnight.

**Requirements**:
- One puzzle per day
- Published on scheduled date
- Accessible via `/api/puzzles/today`
- Grid size: 5x5 to 15x15
- Difficulty levels: Easy, Medium, Hard

**Data Model**:
```json
{
  "id": "uuid",
  "date": "2026-01-16",
  "title": "Monday Crossword",
  "author": "Constructor Name",
  "difficulty": "easy",
  "gridWidth": 5,
  "gridHeight": 5,
  "grid": [[{letter, number}]],
  "cluesAcross": [{number, text, answer, position, length}],
  "cluesDown": [{number, text, answer, position, length}],
  "theme": "optional",
  "avgSolveTime": 180
}
```

**Acceptance Criteria**:
- [ ] Today's puzzle loads correctly
- [ ] Grid renders with proper layout
- [ ] Clues display in numbered order
- [ ] Black squares render correctly
- [ ] Solution validates accurately

#### 2.2 Puzzle Archive
**Description**: Browse and play previous published puzzles.

**Requirements**:
- Pagination support (limit/offset)
- Filter by difficulty
- Sort by date (newest first)
- Display average solve time
- Show completion status for logged-in users

**Acceptance Criteria**:
- [ ] Archive displays all published puzzles
- [ ] Pagination works correctly
- [ ] Difficulty filter applies properly
- [ ] User sees which puzzles they've completed
- [ ] Average solve times displayed

#### 2.3 Random Puzzle
**Description**: Play a random puzzle from the library.

**Requirements**:
- Optional difficulty filter
- Excludes puzzles user already completed
- Returns puzzle in standard format

**Acceptance Criteria**:
- [ ] Random puzzle endpoint returns valid puzzle
- [ ] Difficulty filter works
- [ ] Same puzzle not returned consecutively

---

### 3. Single-Player Mode

#### 3.1 Solo Gameplay
**Description**: Play crossword puzzles alone with timer and hints.

**Requirements**:
- Timer starts on first cell edit
- Hint system (reveal letter, reveal word, check grid)
- Auto-save progress
- Completion detection
- Results screen with statistics

**Acceptance Criteria**:
- [ ] Timer starts on first input
- [ ] Cells update as user types
- [ ] Hints reveal correct answers
- [ ] Puzzle completion detected automatically
- [ ] Solve time recorded accurately

#### 3.2 Hint System
**Description**: Assistance features for stuck players.

**Types**:
1. **Reveal Letter**: Show correct letter in selected cell
2. **Reveal Word**: Show all letters in selected clue
3. **Check Grid**: Highlight incorrect cells

**Requirements**:
- Hints counted in statistics
- Does not reveal full solution
- Available in all game modes
- Visual feedback for revealed cells

**Acceptance Criteria**:
- [ ] Reveal letter shows correct letter
- [ ] Reveal word fills entire answer
- [ ] Check grid highlights errors only
- [ ] Hint count tracked per puzzle
- [ ] Hints affect accuracy score

#### 3.3 Progress Tracking
**Description**: Track completion and performance metrics.

**Metrics Tracked**:
- Solve time (seconds)
- Hints used
- Accuracy percentage
- Completion date/time

**Acceptance Criteria**:
- [ ] Solve time calculated from first edit to completion
- [ ] Hints used counted accurately
- [ ] Accuracy = (correct cells / total cells) * 100
- [ ] Data saved to puzzle_history table

---

### 4. Multiplayer System

#### 4.1 Room Creation
**Description**: Host creates multiplayer game room.

**Requirements**:
- Unique 6-character alphanumeric room code
- Host selects game mode
- Configure max players (2-10)
- Optional settings:
  - Timer mode (stopwatch/countdown)
  - Hints enabled/disabled
  - Public/private visibility

**Room Configuration**:
```json
{
  "mode": "collaborative|race|relay",
  "maxPlayers": 6,
  "timerMode": "stopwatch|countdown",
  "hintsEnabled": true,
  "isPublic": false
}
```

**Acceptance Criteria**:
- [ ] Room code is unique and shareable
- [ ] Host selects game mode
- [ ] Configuration saved correctly
- [ ] Room enters "lobby" state
- [ ] Puzzle assigned to room

#### 4.2 Room Joining
**Description**: Players join via room code or link.

**Requirements**:
- Enter 6-character code (case-insensitive)
- Display name required (default to username)
- Cannot join full rooms
- Cannot join completed games
- Spectator mode option

**Acceptance Criteria**:
- [ ] Valid code allows entry
- [ ] Invalid code shows error
- [ ] Full room displays "Room Full" message
- [ ] Player added to room roster
- [ ] WebSocket connection established

#### 4.3 Lobby System
**Description**: Pre-game waiting area for players.

**Requirements**:
- Display all joined players
- Show room settings
- Host can start game
- Players can leave freely
- Real-time player join/leave updates

**Acceptance Criteria**:
- [ ] Player list updates in real-time
- [ ] Host sees "Start Game" button
- [ ] Non-hosts see "Waiting for host..."
- [ ] Players can leave lobby
- [ ] Room deleted if host leaves

---

### 5. Game Modes

#### 5.1 Collaborative Mode
**Description**: All players work together on one shared grid.

**Mechanics**:
- Single shared grid state
- All players can edit any cell
- Real-time cell updates visible to all
- Contribution tracking per player
- Completion when grid 100% correct

**UI Features**:
- Colored cursors for each player
- Cell edit attribution (who filled which cells)
- Contribution percentage on completion
- Live player presence indicators

**Acceptance Criteria**:
- [ ] All players see same grid
- [ ] Cell updates sync within 100ms
- [ ] Cursors visible for all active players
- [ ] Contribution scores calculated correctly
- [ ] Results show each player's contribution %

#### 5.2 Race Mode
**Description**: Players compete individually, first to finish wins.

**Mechanics**:
- Each player has separate grid copy
- No visibility into other players' grids
- Real-time leaderboard with completion %
- Finish order recorded with timestamps
- Winner determined by first 100% completion

**Leaderboard Display**:
- Player names with colors
- Completion percentage (0-100%)
- Cell count (X/Y filled)
- Finish position (1st/2nd/3rd medals)
- Live sorting as players progress

**Acceptance Criteria**:
- [ ] Each player has independent grid
- [ ] Leaderboard updates every cell edit
- [ ] First to complete wins
- [ ] Finish times recorded accurately
- [ ] Results show final standings with times

#### 5.3 Relay Mode
**Description**: Turn-based collaborative gameplay.

**Mechanics**:
- Turn order established at game start
- Time limit per turn (default: 60 seconds)
- Current player edits grid while others watch
- Pass turn button or auto-advance on timeout
- Tracks words completed per turn

**Turn Flow**:
1. Player's turn starts
2. Timer begins (60s)
3. Player fills cells or passes
4. Turn ends (manual or timeout)
5. Next player in rotation

**Acceptance Criteria**:
- [ ] Only current player can edit
- [ ] Turn timer counts down visibly
- [ ] Pass turn transfers to next player
- [ ] Timeout auto-advances turn
- [ ] Turn indicator highlights current player
- [ ] Words completed per turn tracked

---

### 6. Real-time Features

#### 6.1 WebSocket Communication
**Description**: Bidirectional real-time messaging for game state sync.

**Connection**:
- WebSocket endpoint: `ws://host/api/rooms/:code/ws`
- Auto-reconnect on disconnect (exponential backoff)
- Heartbeat/ping-pong to maintain connection
- Connection ID per client for multi-tab support

**Message Protocol**:
```json
// Client → Server
{
  "type": "cell_update|cursor_move|send_message|...",
  "data": { /* action-specific payload */ }
}

// Server → Client
{
  "type": "room_state|cell_updated|player_joined|...",
  "data": { /* event-specific payload */ }
}
```

**Acceptance Criteria**:
- [ ] WebSocket connects on room join
- [ ] Reconnects automatically if disconnected
- [ ] Messages serialize/deserialize correctly
- [ ] Events dispatch to appropriate handlers
- [ ] Connection errors handled gracefully

#### 6.2 Cursor Tracking
**Description**: See other players' current cell position.

**Requirements**:
- Each player assigned unique color
- Cursor rendered as colored cell border/highlight
- Position updates on cell selection change
- Cursor disappears when player disconnects

**Acceptance Criteria**:
- [ ] Cursors visible for all connected players
- [ ] Cursor color matches player color
- [ ] Position updates in real-time (<100ms)
- [ ] Disconnected player cursors removed
- [ ] Cursors don't interfere with editing

#### 6.3 Live Chat
**Description**: In-room text messaging between players.

**Requirements**:
- Message input field
- Message history (last 50 messages)
- Timestamps on messages
- User identification (color-coded)
- Scroll to latest message

**Message Format**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "displayName": "Player1",
  "text": "Great job team!",
  "createdAt": "2026-01-16T12:00:00Z"
}
```

**Acceptance Criteria**:
- [ ] Messages send on Enter key
- [ ] Messages appear for all players
- [ ] Timestamps display correctly
- [ ] User names color-coded to match cursors
- [ ] Chat scrolls to newest message

#### 6.4 Emoji Reactions
**Description**: React to clues with emoji.

**Requirements**:
- Emoji picker for each clue
- Limited reaction types (👍 ❤️ 😂 🤔 💡)
- One reaction per user per clue
- Reaction count displayed next to clue

**Acceptance Criteria**:
- [ ] User can add reaction to any clue
- [ ] Reaction appears for all players
- [ ] User can change their reaction
- [ ] Removing reaction updates count
- [ ] Reactions persist for room duration

---

### 7. User Statistics & Progression

#### 7.1 User Stats Dashboard
**Description**: Personal statistics page showing performance metrics.

**Metrics Displayed**:
- **Puzzles Solved**: Total count
- **Average Solve Time**: Mean time across all completions
- **Current Streak**: Consecutive days with completed puzzle
- **Best Streak**: All-time longest streak
- **Multiplayer Wins**: Wins in race mode
- **Total Play Time**: Cumulative time across all puzzles
- **Last Played**: Most recent puzzle date

**Acceptance Criteria**:
- [ ] All stats display correctly
- [ ] Stats update after puzzle completion
- [ ] Streak increments for consecutive days
- [ ] Streak resets if day missed
- [ ] Guest accounts show session stats only

#### 7.2 Puzzle History
**Description**: List of all completed puzzles with details.

**Requirements**:
- Pagination (20 per page)
- Shows puzzle title, date, solve time, accuracy
- Links to replay puzzle
- Indicates multiplayer vs solo
- Displays hints used

**Table Columns**:
| Date | Puzzle | Mode | Time | Accuracy | Hints |
|------|--------|------|------|----------|-------|

**Acceptance Criteria**:
- [ ] History displays all completed puzzles
- [ ] Pagination works correctly
- [ ] Click puzzle to view/replay
- [ ] Mode icon differentiates solo/multiplayer
- [ ] Stats accurate for each entry

#### 7.3 Streak Tracking
**Description**: Encourage daily play with consecutive day streaks.

**Logic**:
- Streak increments when puzzle completed on new day
- Streak continues if user plays every consecutive day
- Streak resets to 0 if day skipped
- Best streak saved as all-time record

**Acceptance Criteria**:
- [ ] Streak increments on daily completion
- [ ] Streak persists across sessions
- [ ] Missed day resets current streak
- [ ] Best streak never decreases
- [ ] Streak displayed on profile and home

---

### 8. User Interface

#### 8.1 Crossword Grid Component
**Description**: Interactive puzzle grid with cell editing.

**Features**:
- Click cell to select
- Arrow keys to navigate
- Type letters to fill cells
- Tab key to move to next blank cell
- Backspace to clear and move back
- Number labels in clue-start cells
- Black squares rendered
- Cell highlighting:
  - Selected cell (primary highlight)
  - Selected word (secondary highlight)
  - Other players' cursors (color-coded)

**Accessibility**:
- Keyboard navigation fully supported
- ARIA labels for screen readers
- Focus indicators clear and visible
- Color contrast meets WCAG AA standards

**Acceptance Criteria**:
- [ ] Grid renders correctly for all sizes (5x5 to 15x15)
- [ ] Cell selection works via click and keyboard
- [ ] Letters appear instantly on keypress
- [ ] Navigation keys work correctly
- [ ] Selected word highlights across/down
- [ ] Grid responsive on mobile/tablet

#### 8.2 Clue Panel
**Description**: List of across and down clues with navigation.

**Features**:
- Tabs for Across/Down clues
- Numbered clue list
- Click clue to select in grid
- Completed clues marked (strikethrough or checkmark)
- Highlight selected clue
- Scroll to selected clue

**Mobile Optimization**:
- Bottom sheet on mobile
- Swipe up to expand
- Swipe down to collapse
- Remains docked during typing

**Acceptance Criteria**:
- [ ] Clues display in numerical order
- [ ] Click clue selects first cell in grid
- [ ] Completed clues styled differently
- [ ] Selected clue highlighted
- [ ] Mobile bottom sheet works smoothly

#### 8.3 Timer Display
**Description**: Shows elapsed or remaining time.

**Modes**:
- **Stopwatch**: Count up from 00:00
- **Countdown**: Count down from set time

**Display Format**: MM:SS or HH:MM:SS for long games

**Visual Cues**:
- Green: Plenty of time
- Yellow: <25% time remaining (countdown)
- Red: <10% time remaining (countdown)
- Flashing: <1 minute remaining

**Acceptance Criteria**:
- [ ] Timer starts on game start
- [ ] Format displays correctly
- [ ] Countdown mode decrements properly
- [ ] Colors change at thresholds
- [ ] Timer pauses if game paused

#### 8.4 Results Modal
**Description**: Post-completion summary screen.

**Displays**:
- Solve time
- Accuracy percentage
- Hints used
- Contribution score (multiplayer)
- Leaderboard (race mode)
- Congratulations message

**Actions**:
- Play Again (new room with same players)
- View Solution (optional)
- Return to Home

**Acceptance Criteria**:
- [ ] Modal appears on puzzle completion
- [ ] All stats display accurately
- [ ] Play Again creates new room
- [ ] Return to Home navigates correctly
- [ ] Solution view shows all answers

---

### 9. Progressive Web App (PWA)

#### 9.1 Installability
**Description**: App installable to home screen on mobile/desktop.

**Requirements**:
- Manifest.json with app metadata
- Service worker for offline support
- Icons for all platforms (192x192, 512x512, etc.)
- Splash screens for iOS
- Name: "Crossy"
- Theme color: #8b5cf6 (purple)

**Acceptance Criteria**:
- [ ] Install prompt appears on supported browsers
- [ ] App installs to home screen
- [ ] Launches in standalone mode (no browser UI)
- [ ] Icons display correctly
- [ ] Splash screen shows on launch

#### 9.2 Offline Support
**Description**: Basic functionality works without internet.

**Offline Features**:
- App shell loads offline
- Previously played puzzles cached
- Queue actions when offline, sync when online

**Not Available Offline**:
- New puzzle downloads
- Multiplayer features
- User authentication

**Acceptance Criteria**:
- [ ] Service worker caches app assets
- [ ] App loads when offline
- [ ] Cached puzzles playable offline
- [ ] User notified when offline
- [ ] Queued actions sync on reconnect

---

### 10. Administrative Features

#### 10.1 Puzzle Management CLI
**Description**: Command-line tool for puzzle administration.

**Commands**:
```bash
# List puzzles
go run cmd/admin/main.go list
go run cmd/admin/main.go list -status published

# Import puzzles
go run cmd/admin/main.go import ./puzzles/puzzle.json
go run cmd/admin/main.go import ./puzzles/batch/

# Publish puzzles
go run cmd/admin/main.go publish -id <UUID> -date 2026-01-20
```

**Acceptance Criteria**:
- [ ] List command displays all puzzles
- [ ] Filter by status works
- [ ] Import validates JSON format
- [ ] Publish sets date and status
- [ ] Errors display helpful messages

---

## Technical Requirements

### 11. Backend Technology Stack

**Language & Framework**:
- Go 1.20+
- Gin web framework for HTTP
- Gorilla WebSocket for real-time

**Database**:
- PostgreSQL 14+ for primary data
- JSONB for grid and clue storage
- Indexes on frequently queried columns

**Caching**:
- Redis for session management
- Cache WebSocket connections
- Expire sessions after 24 hours

**Authentication**:
- JWT tokens (HS256 algorithm)
- Token expiration: 24 hours
- Secure password hashing (bcrypt, cost 10)

**API Design**:
- RESTful endpoints
- JSON request/response format
- CORS enabled for frontend origin
- Rate limiting: 100 req/min per IP

### 12. Frontend Technology Stack

**Framework**:
- Next.js 14 (App Router)
- React 18
- TypeScript

**State Management**:
- Zustand for global state
- React Query for server state
- WebSocket hook for real-time

**Styling**:
- Tailwind CSS
- CSS Grid for crossword layout
- Responsive breakpoints (sm, md, lg, xl)

**Build & Deploy**:
- Static export for CDN hosting
- Environment-based config
- Vercel/Netlify compatible

---

## Non-Functional Requirements

### 13. Performance

**Response Times**:
- API endpoints: <200ms (p95)
- WebSocket latency: <100ms (p95)
- Page load (initial): <2s
- Page load (subsequent): <500ms

**Scalability**:
- Support 1000+ concurrent users
- 100+ active rooms simultaneously
- WebSocket connections: 5000+

**Database**:
- Query response: <50ms (p95)
- Puzzle retrieval: <10ms (cached)

### 14. Security

**Authentication**:
- Passwords hashed with bcrypt
- JWT secret minimum 32 characters
- Tokens transmitted via headers only
- HTTPS required in production

**Data Protection**:
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF tokens for state-changing requests
- Rate limiting on sensitive endpoints

**Privacy**:
- Email addresses not shared publicly
- Guest accounts auto-deleted after 30 days
- User data export available on request

### 15. Accessibility

**WCAG 2.1 AA Compliance**:
- Color contrast ratios ≥4.5:1
- Keyboard navigation for all features
- Screen reader support (ARIA labels)
- Focus indicators visible

**Mobile**:
- Touch targets ≥44x44 pixels
- Text minimum 16px
- Pinch-to-zoom enabled

### 16. Browser Support

**Supported Browsers**:
- Chrome 90+ (desktop/mobile)
- Firefox 88+ (desktop/mobile)
- Safari 14+ (desktop/iOS)
- Edge 90+

**PWA Support**:
- Chrome/Edge (full support)
- Safari (limited offline)
- Firefox (install only)

---

## Data Models

### 17. Entity Relationship Diagram

```
users (1) ←→ (many) puzzle_history
users (1) ←→ (many) players
users (1) ←→ (1) user_stats

puzzles (1) ←→ (many) rooms
puzzles (1) ←→ (many) puzzle_history

rooms (1) ←→ (many) players
rooms (1) ←→ (many) grid_states
rooms (1) ←→ (many) messages
rooms (1) ←→ (1) relay_states
rooms (1) ←→ (many) reactions
```

### 18. API Endpoints Summary

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login |
| POST | /api/auth/guest | No | Guest account |
| GET | /api/users/me | Yes | Get current user |
| GET | /api/users/me/stats | Yes | Get user stats |
| GET | /api/users/me/history | Yes | Get puzzle history |
| GET | /api/puzzles/today | No | Today's puzzle |
| GET | /api/puzzles/archive | No | Puzzle list |
| GET | /api/puzzles/random | No | Random puzzle |
| POST | /api/rooms | Yes | Create room |
| GET | /api/rooms/:code | No | Get room |
| POST | /api/rooms/:id/join | Yes | Join room |
| POST | /api/rooms/:id/start | Yes | Start game |
| DELETE | /api/rooms/:id | Yes | Delete room |
| WS | /api/rooms/:code/ws | Yes | WebSocket |

---

## Success Metrics

### 19. Key Performance Indicators (KPIs)

**User Engagement**:
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Average session duration
- Puzzles completed per user
- Return rate (% users returning next day)

**Multiplayer Adoption**:
- % of puzzles played multiplayer
- Average players per room
- Room creation rate
- Mode preference distribution

**Retention**:
- Day 1, Day 7, Day 30 retention rates
- Streak completion rates
- Guest → registered conversion rate

**Performance**:
- Average API response time
- WebSocket connection success rate
- Puzzle completion rate
- Error rate (< 1%)

---

## Release Criteria

### 20. Launch Checklist

**Content**:
- [ ] Minimum 30 puzzles published
- [ ] Daily puzzle rotation automated
- [ ] Difficulty variety (easy/medium/hard)

**Features**:
- [ ] All three game modes functional
- [ ] Solo play working
- [ ] WebSocket sync verified
- [ ] User stats tracking accurate
- [ ] Chat and reactions working

**Quality**:
- [ ] Cross-browser testing complete
- [ ] Mobile responsive on iOS/Android
- [ ] Load testing passed (1000 concurrent users)
- [ ] Security audit complete
- [ ] Accessibility review passed

**Operations**:
- [ ] Production database configured
- [ ] Redis cache deployed
- [ ] CDN configured for frontend
- [ ] Error monitoring setup (Sentry)
- [ ] Analytics integrated (Plausible/GA)
- [ ] Backup/restore procedures documented

---

## Future Enhancements

### Phase 2 (Post-Launch)

**Social Features**:
- Friends list
- Private messaging
- Friend challenges
- Activity feed

**Leaderboards**:
- Daily/weekly/all-time rankings
- Per-puzzle leaderboards
- Accuracy-based rankings
- Speed rankings

**Achievements**:
- Badge system
- Milestone unlocks
- Special titles/avatars

**Content Expansion**:
- Themed puzzle packs
- User-generated puzzles
- Puzzle editor/constructor
- Community voting on puzzles

**Monetization** (Optional):
- Premium subscription (ad-free)
- Exclusive puzzle packs
- Custom room branding
- Priority support

---

## Appendix

### A. Puzzle JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "title", "difficulty", "grid", "clues"],
  "properties": {
    "id": {"type": "string", "format": "uuid"},
    "date": {"type": "string", "format": "date"},
    "title": {"type": "string"},
    "author": {"type": "string"},
    "difficulty": {"enum": ["easy", "medium", "hard"]},
    "gridWidth": {"type": "integer", "minimum": 5, "maximum": 21},
    "gridHeight": {"type": "integer", "minimum": 5, "maximum": 21},
    "grid": {
      "type": "array",
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "letter": {"type": "string", "pattern": "^[A-Z]$"},
            "number": {"type": "integer", "minimum": 1},
            "isBlack": {"type": "boolean"}
          }
        }
      }
    },
    "clues": {
      "type": "object",
      "properties": {
        "across": {"type": "array", "items": {"$ref": "#/definitions/clue"}},
        "down": {"type": "array", "items": {"$ref": "#/definitions/clue"}}
      }
    }
  },
  "definitions": {
    "clue": {
      "type": "object",
      "required": ["number", "text", "answer", "position", "length"],
      "properties": {
        "number": {"type": "integer"},
        "text": {"type": "string"},
        "answer": {"type": "string"},
        "position": {
          "type": "object",
          "properties": {
            "x": {"type": "integer"},
            "y": {"type": "integer"}
          }
        },
        "length": {"type": "integer"}
      }
    }
  }
}
```

### B. WebSocket Message Reference

**Client → Server Messages**:
- `join_room` - Join multiplayer room
- `leave_room` - Leave room
- `cell_update` - Update cell value
- `cursor_move` - Move cursor
- `send_message` - Chat message
- `request_hint` - Request hint
- `start_game` - Start game (host)
- `reaction` - Add emoji reaction
- `pass_turn` - Pass turn (relay)

**Server → Client Messages**:
- `room_state` - Full room state
- `player_joined` - Player joined
- `player_left` - Player left
- `cell_updated` - Cell changed
- `cursor_moved` - Cursor moved
- `new_message` - Chat message
- `game_started` - Game started
- `puzzle_completed` - Puzzle complete
- `error` - Error occurred
- `reaction_added` - Reaction added
- `race_progress` - Race leaderboard update
- `player_finished` - Player finished (race)
- `turn_changed` - Turn changed (relay)

### C. Database Indexes

**Critical Indexes**:
```sql
-- Puzzles
CREATE INDEX idx_puzzles_date ON puzzles(date);
CREATE INDEX idx_puzzles_difficulty ON puzzles(difficulty);
CREATE INDEX idx_puzzles_status ON puzzles(status);

-- Rooms
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_state ON rooms(state);

-- Users
CREATE INDEX idx_users_email ON users(email);

-- Puzzle History
CREATE INDEX idx_puzzle_history_user_id ON puzzle_history(user_id);

-- Messages
CREATE INDEX idx_messages_room_id ON messages(room_id);
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-16 | Claude (AI Assistant) | Initial retroactive PRD from codebase |

---

**End of Document**
