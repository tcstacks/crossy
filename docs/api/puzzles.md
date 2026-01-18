# Puzzles API

The puzzles endpoints provide access to crossword puzzles. Puzzles can be retrieved by date, randomly selected, or browsed from the archive.

## Endpoints

- [Get Today's Puzzle](#get-todays-puzzle)
- [Get Puzzle by Date](#get-puzzle-by-date)
- [Get Puzzle Archive](#get-puzzle-archive)
- [Get Random Puzzle](#get-random-puzzle)

---

## Get Today's Puzzle

Retrieve today's daily crossword puzzle.

### Endpoint

```
GET /api/puzzles/today
```

### Authentication

None required (public endpoint)

### Example Request

```bash
curl http://localhost:8080/api/puzzles/today
```

### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2026-01-15",
  "title": "Wednesday Challenge",
  "author": "CrossPlay Team",
  "difficulty": "medium",
  "gridWidth": 15,
  "gridHeight": 15,
  "grid": [
    [
      { "letter": null, "number": null },
      { "letter": "C", "number": 1 },
      { "letter": "A", "number": null }
    ]
  ],
  "cluesAcross": [
    {
      "number": 1,
      "text": "Feline pet",
      "positionX": 1,
      "positionY": 0,
      "length": 3,
      "direction": "across"
    }
  ],
  "cluesDown": [
    {
      "number": 1,
      "text": "Taxi",
      "positionX": 1,
      "positionY": 0,
      "length": 3,
      "direction": "down"
    }
  ],
  "theme": "Animals",
  "avgSolveTime": 420,
  "status": "published",
  "createdAt": "2026-01-14T00:00:00Z",
  "publishedAt": "2026-01-15T00:00:00Z"
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | no puzzle available for today | No puzzle published for today's date |
| 500 | database error | Server error retrieving puzzle |

### Notes

- Answers are NOT included in the response (they're on the server only)
- Black squares are represented as `{ "letter": null }`
- Grid is a 2D array indexed as `grid[y][x]`

---

## Get Puzzle by Date

Retrieve a puzzle from a specific date.

### Endpoint

```
GET /api/puzzles/:date
```

### Authentication

None required (public endpoint)

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| date | string | Date in YYYY-MM-DD format |

### Example Request

```bash
curl http://localhost:8080/api/puzzles/2026-01-10
```

### Response (200 OK)

Same format as "Get Today's Puzzle"

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | puzzle not found | No puzzle exists for that date |
| 500 | database error | Server error retrieving puzzle |

---

## Get Puzzle Archive

Browse published puzzles with pagination.

### Endpoint

```
GET /api/puzzles/archive
```

### Authentication

None required (public endpoint)

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Number of puzzles to return (max 100) |
| offset | integer | 0 | Number of puzzles to skip |

### Example Request

```bash
curl "http://localhost:8080/api/puzzles/archive?limit=10&offset=0"
```

### Response (200 OK)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-01-15",
    "title": "Wednesday Challenge",
    "author": "CrossPlay Team",
    "difficulty": "medium",
    "gridWidth": 15,
    "gridHeight": 15,
    "grid": [...],
    "cluesAcross": [...],
    "cluesDown": [...],
    "theme": "Animals",
    "avgSolveTime": 420,
    "status": "published",
    "createdAt": "2026-01-14T00:00:00Z",
    "publishedAt": "2026-01-15T00:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "date": "2026-01-14",
    "title": "Tuesday Teaser",
    "author": "CrossPlay Team",
    "difficulty": "easy",
    "gridWidth": 13,
    "gridHeight": 13,
    "grid": [...],
    "cluesAcross": [...],
    "cluesDown": [...],
    "theme": "Food",
    "avgSolveTime": 300,
    "status": "published",
    "createdAt": "2026-01-13T00:00:00Z",
    "publishedAt": "2026-01-14T00:00:00Z"
  }
]
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 500 | database error | Server error retrieving puzzles |

### Notes

- Puzzles are returned in reverse chronological order (newest first)
- Only published puzzles are included
- Use pagination for large result sets

---

## Get Random Puzzle

Get a random published puzzle, optionally filtered by difficulty.

### Endpoint

```
GET /api/puzzles/random
```

### Authentication

None required (public endpoint)

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| difficulty | string | (none) | Filter by difficulty: "easy", "medium", or "hard" |

### Example Request

```bash
# Random puzzle of any difficulty
curl http://localhost:8080/api/puzzles/random

# Random easy puzzle
curl "http://localhost:8080/api/puzzles/random?difficulty=easy"
```

### Response (200 OK)

Same format as "Get Today's Puzzle"

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | no puzzles available | No published puzzles match the criteria |
| 500 | database error | Server error retrieving puzzle |

---

## Puzzle Data Structure

### Grid Cell

Each cell in the grid has the following structure:

```typescript
{
  letter: string | null,      // The answer letter, null for black squares
  number: number | null,       // Clue number if this cell starts a word
  isCircled: boolean,          // Special marker (optional)
  rebus: string | null         // Multi-letter answer for rebus puzzles (optional)
}
```

### Clue

Each clue has the following structure:

```typescript
{
  number: number,              // Clue number (e.g., 1, 2, 3...)
  text: string,                // Clue text shown to player
  answer: string,              // Answer (only included server-side, never sent to client)
  positionX: number,           // Starting column (0-indexed)
  positionY: number,           // Starting row (0-indexed)
  length: number,              // Number of letters in answer
  direction: "across" | "down" // Clue direction
}
```

### Difficulty Levels

| Level | Grid Size | Typical Solve Time |
|-------|-----------|-------------------|
| easy | 11x11 - 13x13 | 5-10 minutes |
| medium | 13x13 - 15x15 | 10-20 minutes |
| hard | 15x15 - 17x17 | 20-40 minutes |

### Puzzle Status

| Status | Description |
|--------|-------------|
| draft | Puzzle is being created, not visible to users |
| approved | Puzzle reviewed but not yet published |
| published | Puzzle available to play |

---

## Client-Side Usage Example

```javascript
// Fetch today's puzzle
async function getTodaysPuzzle() {
  const response = await fetch('http://localhost:8080/api/puzzles/today');
  const puzzle = await response.json();

  // Initialize grid state
  const gridState = puzzle.grid.map(row =>
    row.map(cell => ({
      ...cell,
      userValue: null,  // Player's input
      isCorrect: null   // Validation state
    }))
  );

  return { puzzle, gridState };
}

// Browse archive with pagination
async function browseArchive(page = 0, pageSize = 20) {
  const offset = page * pageSize;
  const response = await fetch(
    `http://localhost:8080/api/puzzles/archive?limit=${pageSize}&offset=${offset}`
  );
  return await response.json();
}
```
