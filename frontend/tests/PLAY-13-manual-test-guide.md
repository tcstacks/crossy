# PLAY-13 Manual Test Guide

## Feature: Current clue highlighted in list

### Test Steps

1. **Navigate to the game**
   - Open http://localhost:3001/play in your browser
   - Wait for the puzzle to load completely

2. **Test 1: Click on a cell to select a word**
   - Click on any cell in the crossword grid
   - ✅ Verify the corresponding clue is highlighted in the clue list with:
     - Purple border (`border-[#7B61FF]`)
     - Light purple background (`bg-[#7B61FF]/10`)
   - ✅ Verify the clue tab automatically switches to match the direction (Across or Down)

3. **Test 2: Click on a different word**
   - Click on a cell in a different word
   - ✅ Verify the highlight moves from the previous clue to the new clue
   - ✅ Verify the clue tab switches if needed

4. **Test 3: Click on middle of a word**
   - Click on the first cell of a word to select it
   - Note which clue is highlighted
   - Click on a middle cell of the same word (not the first cell)
   - ✅ Verify the same clue remains highlighted

5. **Test 4: Toggle between across and down**
   - Click on a cell that has both across and down words
   - Note the highlighted across clue
   - Click the same cell again to toggle to down direction
   - ✅ Verify the down clue is now highlighted
   - ✅ Verify the Down tab is automatically selected

6. **Test 5: Use direction toggle buttons**
   - Select a cell
   - Click the "ACROSS" button in the current clue bar
   - ✅ Verify the Across tab is selected
   - ✅ Verify the across clue is highlighted
   - Click the "DOWN" button
   - ✅ Verify the Down tab is selected
   - ✅ Verify the down clue is highlighted

7. **Test 6: Click clue in list**
   - Click on a clue in the clue list
   - ✅ Verify the grid jumps to that word's first cell
   - ✅ Verify the clicked clue is highlighted

## Expected Visual Behavior

- **Highlighted clue** should have:
  - Border: `border border-[#7B61FF]` (purple)
  - Background: `bg-[#7B61FF]/10` (very light purple)

- **Non-highlighted clues** should have:
  - Background: `bg-[#F3F1FF]` (light gray)
  - Hover: `hover:bg-[#ECE9FF]` (slightly darker gray)

## Screenshots

Take screenshots showing:
1. Initial state with clue highlighted
2. Highlight moved to different clue
3. Tab automatically switched to match direction
