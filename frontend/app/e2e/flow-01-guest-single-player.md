# Flow 1: Guest Single Player

## Test Steps

### 1. Open Landing Page
- **Action**: Navigate to `http://localhost:5173`
- **Expected**: Landing page loads with Crossy branding and "Play Now" button

### 2. Click Play Now
- **Action**: Click "Play Now" button
- **Expected**: Navigate to `/play` (GameplayPage)

### 3. Guest Authentication
- **Action**: If auth modal appears, proceed as guest
- **Expected**: User is authenticated as guest, modal closes

### 4. GameplayPage Loads Real Puzzle
- **Action**: Wait for puzzle to load
- **Expected**:
  - Crossword grid appears with cells
  - Clues are displayed (Across and Down)
  - Puzzle data is fetched from backend

### 5. Fill Cells
- **Action**: Click on cells and type letters
- **Expected**:
  - Letters appear in cells
  - Auto-advance to next cell
  - Invalid characters are rejected

### 6. Complete Puzzle
- **Action**: Fill all cells correctly
- **Expected**:
  - Puzzle validation occurs
  - All cells turn green/correct state

### 7. Completion Modal
- **Action**: Complete the puzzle
- **Expected**:
  - Completion modal appears
  - Shows completion time and stats
  - Option to save progress

### 8. Save to Backend
- **Action**: Save completion data
- **Expected**:
  - POST request to backend with puzzle completion
  - Success confirmation
  - Data persisted

## Validation Checklist
- [ ] Landing page loads successfully
- [ ] Navigation to /play works
- [ ] Guest authentication succeeds
- [ ] Puzzle data loads from API
- [ ] Crossword grid renders correctly
- [ ] Cell input works properly
- [ ] Puzzle can be completed
- [ ] Completion modal displays
- [ ] Backend save operation succeeds

## API Endpoints Used
- `GET /api/puzzles/daily` or similar - Fetch puzzle
- `POST /api/games` - Save game progress
- `POST /api/games/:id/complete` - Mark game complete
