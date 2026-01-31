# Flow 3: Archive and History

## Test Steps

### 1. User Login
- **Action**: Navigate to landing and login with valid credentials
- **Expected**:
  - Login modal/form appears
  - Successful authentication
  - User state updated

### 2. Navigate to Archive Page
- **Action**: Click "Archive" link in navigation
- **Expected**:
  - Navigate to `/archive`
  - Archive page loads

### 3. Puzzle List Loads
- **Action**: Wait for puzzle list to render
- **Expected**:
  - GET request to fetch archived puzzles
  - List of past puzzles displays
  - Each puzzle shows date, difficulty, status

### 4. Click Past Puzzle
- **Action**: Select a puzzle from the archive
- **Expected**:
  - Navigate to puzzle gameplay
  - Selected puzzle loads
  - Can resume if previously started

### 5. Complete Puzzle
- **Action**: Fill and complete the archived puzzle
- **Expected**:
  - Puzzle completion works same as daily
  - Completion modal appears
  - Progress saved to backend

### 6. Navigate to History Page
- **Action**: Click "History" link in navigation
- **Expected**:
  - Navigate to `/history` (protected route)
  - History page loads

### 7. Completed Puzzle in History
- **Action**: View history page content
- **Expected**:
  - Completed puzzles list appears
  - Recently completed puzzle is visible
  - Shows completion time, date, stats
  - Completion badge or indicator present

## Validation Checklist
- [ ] Login succeeds
- [ ] Archive page navigation works
- [ ] Puzzle list fetches and displays
- [ ] Individual puzzle selection works
- [ ] Archived puzzle loads correctly
- [ ] Puzzle can be completed
- [ ] Completion saves properly
- [ ] History page navigation works
- [ ] History page is protected (requires auth)
- [ ] Completed puzzles appear in history
- [ ] Completion data is accurate

## API Endpoints Used
- `POST /api/auth/login` - User login
- `GET /api/puzzles` or `/api/puzzles/archive` - Fetch puzzle archive
- `GET /api/puzzles/:id` - Fetch specific puzzle
- `POST /api/games/:id/complete` - Complete puzzle
- `GET /api/users/me/history` or `/api/games/history` - Fetch completion history
