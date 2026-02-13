# ARCH-04 Manual Test Guide
## Play puzzle from archive

### Prerequisites
1. Backend server running on `http://localhost:8080`
2. Frontend server running on `http://localhost:3000`
3. Database populated with puzzles (see Database Setup below)

### Database Setup
If the archive is empty, populate the database:

```bash
cd backend
# Import puzzles
go run cmd/admin/main.go import ./test-puzzles/batch1/

# List imported puzzles
go run cmd/admin/main.go list

# Publish a puzzle for a specific date
go run cmd/admin/main.go publish -id <UUID> -date 2026-01-20
```

### Test Steps

#### Test 1: Basic Navigation from Archive to Play Page

1. **Navigate to Archive**
   - Go to `http://localhost:3000/archive`
   - ✅ Verify page loads with "Puzzle Archive" title
   - ✅ Verify puzzle cards are displayed

2. **Click on a Puzzle Card**
   - Click on any puzzle card
   - ✅ Verify browser navigates to `/play?date=YYYY-MM-DD`
   - ✅ Verify the date parameter matches the clicked puzzle's date

3. **Verify API Call**
   - Open browser DevTools > Network tab
   - Click on a puzzle card
   - ✅ Verify API request to `GET /api/puzzles/YYYY-MM-DD`
   - ✅ Verify response status is 200
   - ✅ Verify response contains puzzle data (id, date, grid, clues)

4. **Verify Puzzle Loads**
   - ✅ Verify crossword grid is displayed
   - ✅ Verify clues are displayed (Across/Down)
   - ✅ Verify the puzzle date matches the selected puzzle
   - ✅ Take screenshot for verification

#### Test 2: Multiple Puzzle Navigation

1. Go to `/archive`
2. Click on the first puzzle
3. ✅ Verify puzzle loads
4. Go back to `/archive`
5. Click on a different puzzle
6. ✅ Verify the new puzzle loads with different date
7. ✅ Verify URL updates to the new date

#### Test 3: Direct URL Navigation

1. From the archive, note a puzzle's date (e.g., `2026-01-20`)
2. Directly navigate to `http://localhost:3000/play?date=2026-01-20`
3. ✅ Verify the puzzle loads correctly
4. ✅ Verify API call to `/api/puzzles/2026-01-20`

### Expected Results

All checks should pass:
- ✅ Clicking archive puzzles navigates to play page with date parameter
- ✅ API calls are made to fetch puzzle by date
- ✅ Puzzles load correctly in the gameplay interface
- ✅ URL contains the correct date parameter
- ✅ Each puzzle shows unique data based on its date

### Implementation Details

**Frontend Code:**

1. **ArchivePage.tsx** (line 150-152)
   ```typescript
   const handlePuzzleClick = (date: string) => {
     navigate(`/play?date=${date}`);
   };
   ```

2. **ArchivePage.tsx** (line 343)
   ```typescript
   <button
     key={puzzle.id}
     onClick={() => handlePuzzleClick(puzzle.date)}
     ...
   ```

3. **GameplayPage.tsx** (line 44-46, 84)
   ```typescript
   const [searchParams] = useSearchParams();
   const dateParam = searchParams.get('date');

   // Later in useEffect:
   if (dateParam) {
     fetchedPuzzle = await puzzleApi.getPuzzleByDate({ date: dateParam });
   }
   ```

4. **API Client** (lib/api.ts line 161-163)
   ```typescript
   getPuzzleByDate: async (data: GetPuzzleByDateRequest): Promise<Puzzle> => {
     const response = await apiClient.get<Puzzle>(`/api/puzzles/${data.date}`);
     return response.data;
   }
   ```

### Feature Status

✅ **IMPLEMENTED** - The feature is fully functional:
- Archive page has click handlers
- Navigation includes date parameter
- Play page fetches and displays puzzles by date
- API integration complete
- UI properly displays selected puzzles
