# PUZZLE-02: Manual Test Guide

## Prerequisites
1. Backend server running on port 8000
2. Frontend server running on port 3000
3. Valid test data in backend

## Test Steps

### Test Case 1: Cell Selection and Letter Entry

1. **Navigate to gameplay page**
   - Open browser to http://localhost:3000/play
   - Verify puzzle loads successfully
   - Verify grid is displayed

2. **Select a cell**
   - Click on an empty (non-black) cell in the crossword grid
   - **Expected**: Cell becomes highlighted with purple background (#7B61FF)
   - **Expected**: Current clue for that cell is highlighted in the clue list below

3. **Enter a letter**
   - With cell selected, type the letter 'A' on your keyboard
   - **Expected**: Letter 'A' appears in the selected cell
   - **Expected**: Cursor automatically advances to the next cell in the current direction (across or down)
   - **Expected**: Progress percentage increases

4. **Verify progress**
   - Check the progress bar at the bottom of the page
   - **Expected**: Progress should show a percentage greater than 0%

### Test Case 2: Multiple Letter Entry

1. Select first cell
2. Type "CAT" quickly
3. **Expected**: Letters appear in three consecutive cells
4. **Expected**: Cursor advances after each letter
5. **Expected**: Progress increases with each letter

### Test Case 3: Direction Toggle

1. Click on a cell once - note the direction indicator (ACROSS/DOWN)
2. Click the same cell again
3. **Expected**: Direction toggles between ACROSS and DOWN

### Test Case 4: Backspace

1. Select a cell with a letter
2. Press Backspace
3. **Expected**: Letter is deleted
4. **Expected**: Cursor moves back one cell

### Test Case 5: Arrow Key Navigation

1. Select a cell
2. Press Arrow Right - cursor moves right
3. Press Arrow Down - cursor moves down
4. Press Arrow Left - cursor moves left
5. Press Arrow Up - cursor moves up
6. **Expected**: Cursor skips over blocked (black) cells

## Implementation Status

The following features are implemented in GameplayPage.tsx:

- ✅ Cell selection (handleCellClick function, lines 245-276)
- ✅ Cell highlighting with purple background when selected
- ✅ Active clue highlighting in clue list
- ✅ Keyboard letter entry (handleKeyDown function, lines 278-332)
- ✅ Auto-advance cursor after letter entry
- ✅ Progress calculation based on filled cells
- ✅ Backspace to delete letters and move back
- ✅ Arrow key navigation
- ✅ Direction toggle when clicking same cell

## Automated Test Notes

The automated Playwright test requires both frontend and backend servers to be running simultaneously. To run the automated test:

```bash
# Terminal 1 - Start backend
cd backend
npm start  # or python manage.py runserver

# Terminal 2 - Start frontend
cd frontend/app
npm run dev

# Terminal 3 - Run tests
cd frontend
npx playwright test tests/PUZZLE-02-select-cell-enter-letter.test.ts
```
