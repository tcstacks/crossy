# PUZZLE-04 Manual Test Guide

## Feature: Click clue to jump to word

### Test Environment
- URL: http://localhost:3000/play
- Browser: Any modern browser (Chrome, Firefox, Safari)

### Pre-requisites
✅ PUZZLE-01 completed (puzzle loads successfully)

### Test Cases

#### Test Case 1: Click Across Clue
**Steps:**
1. Navigate to http://localhost:3000/play
2. Wait for puzzle to load (grid and clues visible)
3. Ensure you're on the "Across" tab in the clues panel
4. Click on any clue in the Across list (e.g., "1. Feline pet that meows")

**Expected Results:**
- ✅ The first cell of that word is selected (purple background #7B61FF)
- ✅ Direction is set to 'Across' (ACROSS button in top bar has white background)
- ✅ The entire word is highlighted (light purple background #E8E3FF)
- ✅ The clue appears in the top purple bar
- ✅ The clue is highlighted in the clues list

#### Test Case 2: Click Down Clue
**Steps:**
1. From the puzzle page
2. Click on the "Down" tab in the clues panel
3. Click on any clue in the Down list (e.g., "2. Man's best friend")

**Expected Results:**
- ✅ Selection jumps to first cell of that Down word (purple background)
- ✅ Direction changes to 'Down' (DOWN button in top bar has white background)
- ✅ The entire word is highlighted vertically (light purple)
- ✅ The clue appears in the top purple bar
- ✅ The clue is highlighted in the clues list

#### Test Case 3: Switch Between Across and Down
**Steps:**
1. Click on an Across clue (e.g., "1 Across")
2. Verify selection and direction (ACROSS active)
3. Click on the "Down" tab
4. Click on a Down clue (e.g., "2 Down")
5. Verify selection and direction (DOWN active)
6. Click back on the "Across" tab
7. Click on a different Across clue
8. Verify selection and direction (ACROSS active)

**Expected Results:**
- ✅ Each click navigates to the correct word's first cell
- ✅ Direction indicator updates correctly each time
- ✅ Word highlighting follows the selection
- ✅ Clue text in top bar updates to show the selected clue

### Visual Indicators to Check

1. **Selected Cell** - Purple background (`bg-[#7B61FF]`)
2. **Word Highlight** - Light purple background (`bg-[#E8E3FF]`)
3. **Active Direction** - White background on direction button (`bg-white`)
4. **Active Clue** - Purple border and light purple background (`bg-[#7B61FF]/10 border border-[#7B61FF]`)

### Code Reference

The clue click handler is implemented in `frontend/app/src/pages/GameplayPage.tsx` at lines 721-725:

```typescript
onClick={() => {
  setDirection(clueTab);
  setActiveClue({ ...clue, direction: clueTab });
  setSelectedCell({ row: clue.row, col: clue.col });
}}
```

### Notes

- The implementation is complete and functional
- The feature works for both Across and Down clues
- Clicking a clue automatically switches to the appropriate direction
- The clue tab automatically switches when navigating via arrow keys or clicking cells
