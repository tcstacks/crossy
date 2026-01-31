# E2E Test Suite - Crossy Crossword Application

## Overview
This test suite provides comprehensive end-to-end testing for all core user flows in the Crossy crossword application. Tests verify functionality, real-time collaboration, UI/UX consistency, and error handling.

## Test Environment Setup

### Prerequisites
1. **Backend Server**: Running on `http://localhost:8080`
2. **Frontend Dev Server**: Running on `http://localhost:5173`
3. **Chrome Browser**: With MCP DevTools support
4. **Network**: Stable connection for WebSocket testing

### Environment Variables
```bash
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
VITE_SITE_URL=http://localhost:5173
```

## Test Flows

### Flow 1: Guest Single Player ✓
**File**: `flow-01-guest-single-player.md`

Tests the complete single-player guest experience from landing page through puzzle completion.

**Key Validations**:
- Landing page loads
- Guest authentication
- Puzzle data fetches from API
- Crossword grid interaction
- Puzzle completion
- Backend save operation

**Duration**: ~2-3 minutes

---

### Flow 2: Registration and Profile ✓
**File**: `flow-02-registration-profile.md`

Tests user registration, authentication, and profile viewing functionality.

**Key Validations**:
- Registration form validation
- User creation API
- Post-registration redirect
- Profile data loading
- Stats display
- Crossy mascot rendering

**Duration**: ~2-3 minutes

---

### Flow 3: Archive and History ✓
**File**: `flow-03-archive-history.md`

Tests puzzle archive browsing and completion history tracking.

**Key Validations**:
- Protected route authentication
- Archive puzzle list loading
- Past puzzle selection
- Puzzle completion from archive
- History page display
- Completed puzzle appears in history

**Duration**: ~3-4 minutes

---

### Flow 4: Multiplayer Collaborative ✓
**File**: `flow-04-multiplayer-collaborative.md`

Tests real-time collaborative crossword solving with multiple users.

**Key Validations**:
- Room creation and joining
- WebSocket connection establishment
- Real-time cell updates
- Cursor position synchronization
- Colored cursor indicators
- Simultaneous editing without conflicts

**Duration**: ~4-5 minutes
**Requirements**: Two browser windows

---

### Flow 5: Multiplayer Chat and Reactions ✓
**File**: `flow-05-multiplayer-chat-reactions.md`

Tests real-time chat and animated emoji reactions during multiplayer games.

**Key Validations**:
- Chat message sending
- Real-time message delivery
- Message attribution and timestamps
- Emoji reaction selection
- Animated emoji rendering (GSAP)
- Float and fade animations
- Synchronization across clients

**Duration**: ~3-4 minutes
**Requirements**: Two browser windows

---

### Flow 6: Race Mode ✓
**File**: `flow-06-race-mode.md`

Tests competitive race mode where players compete to complete puzzle first.

**Key Validations**:
- Race mode room creation
- Progress bar rendering
- Real-time progress updates
- Winner detection
- Race completion modal
- Correct winner announcement
- Final standings display

**Duration**: ~4-5 minutes
**Requirements**: Two browser windows

---

### Flow 7: Relay Mode ✓
**File**: `flow-07-relay-mode.md`

Tests turn-based relay mode where players take turns solving.

**Key Validations**:
- Relay mode room creation
- Turn indicator display
- Active player input enabled
- Inactive player input disabled
- Word completion detection
- Turn passing mechanism
- Turn state synchronization

**Duration**: ~4-5 minutes
**Requirements**: Two browser windows

---

### Flow 8: Error Handling ✓
**File**: `flow-08-error-handling.md`

Tests error states, recovery mechanisms, and edge cases.

**Key Validations**:
- Invalid room code error
- Protected route authentication redirect
- Auth modal triggering
- Network disconnection handling
- WebSocket reconnection
- Disconnected state UI
- Error message display
- Graceful degradation

**Duration**: ~3-4 minutes

---

### Flow 9: Design Consistency ✓
**File**: `flow-09-design-consistency.md`

Tests UI/UX consistency, branding, and responsive design across all pages.

**Key Validations**:
- Crossy purple theme consistency
- Pixel font for headings
- Mascot image placement
- Button style uniformity
- Card design patterns
- Responsive design (mobile, tablet, desktop)
- Typography consistency
- Color accessibility
- Navigation consistency

**Duration**: ~5-7 minutes
**Requirements**: Responsive testing across viewports

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Start backend server: `cd backend && go run main.go`
- [ ] Start frontend dev server: `cd frontend/app && npm run dev`
- [ ] Verify backend accessible at `http://localhost:8080`
- [ ] Verify frontend accessible at `http://localhost:5173`
- [ ] Confirm WebSocket endpoint available
- [ ] Clear browser cache/storage for clean tests

### Flow Execution
- [ ] Flow 1: Guest Single Player
- [ ] Flow 2: Registration and Profile
- [ ] Flow 3: Archive and History
- [ ] Flow 4: Multiplayer Collaborative
- [ ] Flow 5: Multiplayer Chat and Reactions
- [ ] Flow 6: Race Mode
- [ ] Flow 7: Relay Mode
- [ ] Flow 8: Error Handling
- [ ] Flow 9: Design Consistency

### Post-Test Validation
- [ ] `npm run build` completes successfully
- [ ] `npm run lint` passes with no errors
- [ ] No console errors in browser
- [ ] No network request failures
- [ ] All acceptance criteria met

## Technical Architecture

### Frontend Stack
- **Framework**: React 19 with Vite
- **Routing**: React Router v7
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Animations**: GSAP
- **Forms**: React Hook Form + Zod
- **WebSockets**: Native WebSocket API

### Key Directories
```
frontend/app/
├── src/
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   ├── contexts/        # React contexts (Auth)
│   ├── store/           # Zustand stores
│   ├── lib/             # Utilities and configs
│   └── hooks/           # Custom hooks
├── e2e/                 # E2E test documentation
└── public/              # Static assets
```

### API Endpoints Reference
- `GET /api/puzzles/daily` - Fetch daily puzzle
- `GET /api/puzzles` - Fetch puzzle archive
- `GET /api/puzzles/:id` - Fetch specific puzzle
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/me` - Get current user
- `GET /api/users/me/stats` - Get user statistics
- `GET /api/users/me/history` - Get completion history
- `POST /api/rooms` - Create multiplayer room
- `POST /api/rooms/:code/join` - Join room
- `GET /api/rooms/:code` - Get room details
- `POST /api/games` - Create game session
- `POST /api/games/:id/complete` - Complete game
- `WS /ws` - WebSocket connection

### WebSocket Events
- `room:join` - User joins room
- `room:user_joined` - Broadcast user joined
- `room:user_left` - Broadcast user left
- `game:start` - Game started
- `game:cell_update` - Cell value changed
- `game:cursor_move` - Cursor position changed
- `game:progress_update` - Progress updated (race mode)
- `game:turn_change` - Turn changed (relay mode)
- `chat:message` - Chat message sent
- `chat:message_received` - Chat message received
- `reaction:send` - Reaction emoji sent
- `reaction:received` - Reaction received

## Success Criteria

All acceptance criteria from US-025 must be validated:
1. ✓ Flow 1 - Guest Single Player complete
2. ✓ Flow 2 - Registration and Profile complete
3. ✓ Flow 3 - Archive and History complete
4. ✓ Flow 4 - Multiplayer Collaborative complete
5. ✓ Flow 5 - Multiplayer Chat and Reactions complete
6. ✓ Flow 6 - Race Mode complete
7. ✓ Flow 7 - Relay Mode complete
8. ✓ Flow 8 - Error Handling complete
9. ✓ Flow 9 - Design Consistency complete
10. ✓ Build completes successfully
11. ✓ Lint passes with no errors
12. ✓ Browser tests executed via Chrome MCP

## Notes
- Tests are designed for manual execution with Chrome MCP tools
- Each flow document contains detailed step-by-step instructions
- Multiplayer flows require two browser windows/tabs
- Network disconnection tests may require manual network toggling
- Responsive tests should cover mobile (375px), tablet (768px), and desktop (1024px+)

## Maintenance
- Update test flows when new features are added
- Keep API endpoint references current
- Review and update after UI/UX changes
- Add new flows for new game modes or features
