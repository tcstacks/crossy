# PLAY-08: Manual Testing Guide for Direction Toggle

## Prerequisites
- Development server running at: http://localhost:3002/play
- Browser with developer tools
- Screenshot tool ready

## Testing Steps

### 1. Initial State
1. Open browser and navigate to http://localhost:3002/play
2. Wait for the puzzle grid to fully load
3. Take screenshot: `play-08-initial.png`
4. Verify you can see:
   - Crossword grid with numbered cells
   - Across clues list
   - Down clues list

### 2. First Click - Across Direction (Default)
1. Identify a cell that has both across and down clues (cell with number 1 is ideal)
2. Click on this cell
3. Take screenshot: `play-08-across-first.png`
4. Verify:
   - Cell is selected (has selection styling)
   - Across clue cells are highlighted
   - Across clue in the clue list is highlighted/active
   - Down clue is NOT highlighted

### 3. Second Click - Toggle to Down
1. Click the SAME cell again (the one that's currently selected)
2. Take screenshot: `play-08-down-toggled.png`
3. Verify:
   - Cell remains selected
   - Down clue cells are now highlighted
   - Down clue in the clue list is highlighted/active
   - Across clue is no longer highlighted

### 4. Third Click - Toggle Back to Across
1. Click the SAME cell one more time
2. Take screenshot: `play-08-across-toggled-back.png`
3. Verify:
   - Cell remains selected
   - Across clue cells are highlighted again
   - Across clue in the clue list is highlighted/active
   - Down clue is no longer highlighted

## Expected Behavior

The direction should toggle in this cycle:
- First click: Select cell with ACROSS direction
- Second click: Toggle to DOWN direction
- Third click: Toggle back to ACROSS direction
- Fourth click: Toggle to DOWN direction
- And so on...

## Visual Indicators to Check

1. **Selected Cell**: Should have distinct styling (border, background color)
2. **Highlighted Cells**: All cells in the current direction's word should be highlighted
3. **Active Clue**: The current clue should be highlighted in the clue list
4. **Direction Indicator**: Any UI element showing current direction should update

## Screenshots Location

Save all screenshots to: `/Users/dev/conductor/workspaces/crossy/sao-paulo/frontend/tests/`

## Reporting Results

Update `/Users/dev/conductor/workspaces/crossy/sao-paulo/frontend/tests/PLAY-08-direction-toggle.md` with:
- PASS/FAIL for each step
- Any observations or issues found
- Browser and version used for testing

## Chrome MCP Command (Automated Testing)

If using Chrome MCP tools:
```bash
# Use --isolated flag to avoid interfering with other sessions
chrome-mcp --isolated navigate http://localhost:3002/play
chrome-mcp --isolated screenshot initial
chrome-mcp --isolated click [selector-for-cell-1]
chrome-mcp --isolated screenshot across-first
chrome-mcp --isolated click [selector-for-cell-1]
chrome-mcp --isolated screenshot down-toggled
chrome-mcp --isolated click [selector-for-cell-1]
chrome-mcp --isolated screenshot across-toggled-back
```
