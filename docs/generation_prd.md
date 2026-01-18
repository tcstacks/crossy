# Crossy Puzzle Generation Pipeline

**Product Requirements Document**

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | January 2026 |
| Status | Draft |
| Language | Go (Golang) |

---

## 1. Executive Summary

This PRD defines the technical architecture for an automated crossword puzzle generation pipeline that produces thousands of commercially-usable American-style crosswords at zero content acquisition cost.

### Core Strategy

- Generate grids programmatically using constraint satisfaction algorithms
- Fill grids with Peter Broda's wordlist (explicit commercial permission)
- Generate clues via LLM (Claude API or local model)
- Output puzzles in multiple formats for Crossy consumption

### Key Outcomes

- 1,000+ puzzles generated in initial batch
- Zero licensing fees or royalties
- Full commercial rights to all generated content
- Scalable to unlimited puzzle generation

---

## 2. System Architecture

### 2.1 High-Level Pipeline

The puzzle generation pipeline consists of four discrete stages, each implemented as an independent Go package with clean interfaces.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUZZLE GENERATION PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  GRID    │───▶│  FILL    │───▶│  CLUE    │───▶│  OUTPUT  │  │
│  │GENERATOR │    │  ENGINE  │    │GENERATOR │    │ FORMATTER│  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│   Symmetric      Broda's         Claude API       .puz, JSON   │
│   15x15 Grid     Wordlist        or Local LLM     .ipuz, SQL   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Input | Output | Key Logic |
|-----------|-------|--------|-----------|
| Grid Generator | Difficulty params | Empty symmetric grid | Constraint propagation, symmetry enforcement |
| Fill Engine | Empty grid + wordlist | Filled grid | Backtracking search, word scoring |
| Clue Generator | Filled grid | Grid + clues | LLM prompting, difficulty calibration |
| Output Formatter | Complete puzzle | File(s) | Format conversion, validation |

---

## 3. Grid Generator

### 3.1 Requirements

- Generate standard American-style 15x15 grids
- Enforce 180° rotational symmetry (standard crossword convention)
- Ensure all white squares are connected (no isolated regions)
- Control difficulty via black square density (typically 16-20%)
- Avoid 2-letter words (minimum 3-letter entries)

### 3.2 Data Structures

```go
// pkg/grid/types.go

type Grid struct {
    Size    int           // 15 for standard
    Cells   [][]Cell      // 2D array
    Entries []Entry       // Computed word slots
}

type Cell struct {
    Row      int
    Col      int
    IsBlack  bool
    Letter   rune          // 0 if unfilled
    Number   int           // Clue number (0 if none)
}

type Entry struct {
    Number    int
    Direction Direction    // ACROSS or DOWN
    StartRow  int
    StartCol  int
    Length    int
    Cells     []*Cell      // Pointers to grid cells
}
```

### 3.3 Generation Algorithm

The grid generator uses a constraint-based approach with random seeding:

```go
// pkg/grid/generator.go

func Generate(config GridConfig) (*Grid, error) {
    grid := NewEmptyGrid(config.Size)
    
    // 1. Seed random black squares in top-left quadrant
    seedBlackSquares(grid, config.BlackDensity)
    
    // 2. Mirror to enforce 180° symmetry
    enforceSymmetry(grid)
    
    // 3. Validate connectivity (flood fill from center)
    if !isConnected(grid) {
        return nil, ErrDisconnectedGrid
    }
    
    // 4. Validate minimum word lengths
    if hasShortWords(grid, config.MinWordLength) {
        return nil, ErrShortWords
    }
    
    // 5. Compute entry slots and assign numbers
    grid.Entries = computeEntries(grid)
    assignNumbers(grid)
    
    return grid, nil
}
```

### 3.4 Difficulty Presets

| Difficulty | Black Density | Avg Word Length | Target Audience |
|------------|---------------|-----------------|-----------------|
| Easy (Monday) | 18-20% | 4.5-5.0 | Beginners |
| Medium (Wed) | 16-18% | 5.0-5.5 | Regular solvers |
| Hard (Friday) | 14-16% | 5.5-6.0 | Experienced |
| Expert (Saturday) | 12-14% | 6.0+ | Experts |

---

## 4. Fill Engine

### 4.1 Wordlist Integration

The fill engine uses Peter Broda's wordlist, which provides ~427,000 scored entries. Each word has a quality score (1-100) that helps avoid crosswordese.

```go
// pkg/wordlist/loader.go

type WordList struct {
    ByLength map[int][]ScoredWord  // Words grouped by length
    Trie     *Trie                 // For prefix matching
}

type ScoredWord struct {
    Word  string
    Score int  // 1-100, higher = better
}

func LoadBrodaWordlist(path string) (*WordList, error) {
    // Format: WORD;SCORE
    // Example: JAZZ;95
    file, _ := os.Open(path)
    scanner := bufio.NewScanner(file)
    
    wl := &WordList{
        ByLength: make(map[int][]ScoredWord),
        Trie:     NewTrie(),
    }
    
    for scanner.Scan() {
        parts := strings.Split(scanner.Text(), ";")
        word := strings.ToUpper(parts[0])
        score, _ := strconv.Atoi(parts[1])
        
        sw := ScoredWord{Word: word, Score: score}
        wl.ByLength[len(word)] = append(wl.ByLength[len(word)], sw)
        wl.Trie.Insert(word, score)
    }
    
    // Sort each length bucket by score descending
    for _, words := range wl.ByLength {
        sort.Slice(words, func(i, j int) bool {
            return words[i].Score > words[j].Score
        })
    }
    
    return wl, nil
}
```

### 4.2 Fill Algorithm

The fill engine uses backtracking search with constraint propagation, prioritizing high-scoring words:

```go
// pkg/fill/engine.go

type FillEngine struct {
    WordList   *wordlist.WordList
    MinScore   int    // Minimum acceptable word score
    MaxRetries int    // Backtrack limit before restart
}

func (fe *FillEngine) Fill(grid *grid.Grid) error {
    // Sort entries by constraint (most constrained first)
    entries := sortByConstraint(grid.Entries)
    
    return fe.fillRecursive(grid, entries, 0)
}

func (fe *FillEngine) fillRecursive(g *grid.Grid, entries []grid.Entry, idx int) error {
    if idx >= len(entries) {
        return nil  // All entries filled
    }
    
    entry := entries[idx]
    pattern := getPattern(g, entry)  // e.g., "J__Z" 
    candidates := fe.WordList.Match(pattern, fe.MinScore)
    
    for _, word := range candidates {
        if !conflictsWithFilled(g, entry, word) {
            placeWord(g, entry, word)
            
            if err := fe.fillRecursive(g, entries, idx+1); err == nil {
                return nil
            }
            
            removeWord(g, entry)  // Backtrack
        }
    }
    
    return ErrNoValidFill
}
```

### 4.3 Quality Controls

- Minimum word score threshold (default: 50) to avoid obscure entries
- No duplicate words within a puzzle
- Limit repeated letters in crossing positions
- Prefer common letters (E, T, A, O, I, N) in high-crossing cells

---

## 5. Clue Generator

### 5.1 LLM Integration

The clue generator calls an LLM API to produce clues for each answer word. This is the most time-consuming step but produces natural, varied clues.

| Provider | Model | Cost | Speed | Quality |
|----------|-------|------|-------|---------|
| Anthropic API | Claude 3 Haiku | $0.25/1M tokens | Fast | High |
| Anthropic API | Claude 3.5 Sonnet | $3/1M tokens | Medium | Excellent |
| Local (Ollama) | Llama 3 8B | $0 (compute) | Varies | Good |
| Local (Ollama) | Mistral 7B | $0 (compute) | Fast | Good |

### 5.2 Clue Generation Strategy

```go
// pkg/clues/generator.go

type ClueGenerator struct {
    Client     LLMClient
    Difficulty Difficulty
}

type ClueRequest struct {
    Word           string
    CrossingLetters map[int]rune  // Position -> letter
    Position       int            // Clue number
    Direction      string         // "Across" or "Down"
}

func (cg *ClueGenerator) GenerateClues(grid *grid.Grid) (map[string]string, error) {
    clues := make(map[string]string)
    
    // Batch words for efficiency (reduce API calls)
    batches := batchEntries(grid.Entries, 20)
    
    for _, batch := range batches {
        prompt := cg.buildPrompt(batch)
        response, err := cg.Client.Complete(prompt)
        if err != nil {
            return nil, err
        }
        
        parsed := parseClueResponse(response)
        for word, clue := range parsed {
            clues[word] = clue
        }
    }
    
    return clues, nil
}
```

### 5.3 Prompt Engineering

The prompt template is calibrated to produce crossword-style clues at the specified difficulty level:

```go
// pkg/clues/prompts.go

const CluePromptTemplate = `You are a crossword puzzle constructor.
Generate clues for the following words. Each clue should:
- Be concise (typically 3-8 words)
- Match the difficulty level: {{.Difficulty}}
- Use standard crossword conventions
- Never include the answer word or obvious derivatives

Difficulty guidelines:
- EASY: Straightforward definitions, common knowledge
- MEDIUM: May include wordplay, require inference
- HARD: Misdirection, obscure meanings, clever wordplay

Words to clue:
{{range .Words}}
- {{.Word}} ({{.Length}} letters){{end}}

Respond in JSON format:
{
  "clues": {
    "WORD1": "Clue for word 1",
    "WORD2": "Clue for word 2"
  }
}`
```

### 5.4 Fallback Clue Database

For cost optimization or offline generation, maintain a cache of previously generated clues:

```go
// pkg/clues/cache.go

type ClueCache struct {
    db *sql.DB
}

func (cc *ClueCache) GetClue(word string, difficulty Difficulty) (string, bool) {
    var clue string
    err := cc.db.QueryRow(`
        SELECT clue FROM clue_cache 
        WHERE word = ? AND difficulty = ?
        ORDER BY RANDOM() LIMIT 1
    `, word, difficulty).Scan(&clue)
    
    return clue, err == nil
}

func (cc *ClueCache) SaveClue(word, clue string, difficulty Difficulty) error {
    _, err := cc.db.Exec(`
        INSERT INTO clue_cache (word, clue, difficulty, created_at)
        VALUES (?, ?, ?, ?)`,
        word, clue, difficulty, time.Now())
    return err
}
```

---

## 6. Output Formats

### 6.1 Supported Formats

| Format | Extension | Use Case | Notes |
|--------|-----------|----------|-------|
| JSON | .json | Crossy API, web apps | Primary format |
| Across Lite | .puz | Desktop solvers | Industry standard |
| ipuz | .ipuz | Modern solvers | JSON-based, extensible |
| SQLite | .db | Batch storage | For puzzle database |

### 6.2 JSON Schema

```go
// pkg/output/json.go

type PuzzleJSON struct {
    ID          string            `json:"id"`
    Title       string            `json:"title"`
    Author      string            `json:"author"`
    Difficulty  string            `json:"difficulty"`
    Size        Size              `json:"size"`
    Grid        [][]string        `json:"grid"`        // Letters or "."
    Clues       CluesJSON         `json:"clues"`
    CreatedAt   time.Time         `json:"created_at"`
}

type Size struct {
    Rows int `json:"rows"`
    Cols int `json:"cols"`
}

type CluesJSON struct {
    Across []ClueJSON `json:"across"`
    Down   []ClueJSON `json:"down"`
}

type ClueJSON struct {
    Number int    `json:"number"`
    Clue   string `json:"clue"`
    Answer string `json:"answer"`
    Length int    `json:"length"`
}
```

### 6.3 Example Output

```json
{
  "id": "xp-2026-001-easy-0042",
  "title": "Easy Monday #42",
  "author": "Crossy Generator",
  "difficulty": "easy",
  "size": { "rows": 15, "cols": 15 },
  "grid": [
    ["J", "A", "Z", "Z", ".", "S", "P", "A", "M", "..."],
    "..."
  ],
  "clues": {
    "across": [
      { "number": 1, "clue": "Musical genre with improvisation", "answer": "JAZZ", "length": 4 }
    ],
    "down": []
  },
  "created_at": "2026-01-18T12:00:00Z"
}
```

---

## 7. CLI Interface

### 7.1 Command Structure

```
crossgen
├── generate      Generate puzzles
│   ├── --count N           Number of puzzles (default: 10)
│   ├── --difficulty LEVEL  easy|medium|hard|expert
│   ├── --output DIR        Output directory
│   ├── --format FMT        json|puz|ipuz|all (default: json)
│   ├── --wordlist PATH     Path to wordlist (default: broda.txt)
│   └── --llm PROVIDER      anthropic|ollama|cache-only
│
├── validate      Validate puzzle files
│   └── --input PATH        Puzzle file or directory
│
├── convert       Convert between formats
│   ├── --input PATH        Source file
│   ├── --output PATH       Destination file
│   └── --format FMT        Target format
│
└── stats         Show generation statistics
    └── --db PATH           Clue cache database
```

### 7.2 Example Usage

```bash
# Generate 100 easy puzzles
crossgen generate --count 100 --difficulty easy --output ./puzzles

# Generate with local LLM (Ollama)
crossgen generate --count 50 --llm ollama --difficulty medium

# Use cached clues only (fastest, offline)
crossgen generate --count 1000 --llm cache-only

# Validate generated puzzles
crossgen validate --input ./puzzles

# Convert JSON to .puz format
crossgen convert --input puzzle.json --output puzzle.puz --format puz
```

---

## 8. Project Structure

```
crossgen/
├── cmd/
│   └── crossgen/
│       └── main.go           # CLI entrypoint
│
├── pkg/
│   ├── grid/
│   │   ├── types.go          # Grid, Cell, Entry structs
│   │   ├── generator.go      # Grid generation logic
│   │   └── validator.go      # Grid validation
│   │
│   ├── wordlist/
│   │   ├── loader.go         # Wordlist parsing
│   │   └── trie.go           # Prefix matching
│   │
│   ├── fill/
│   │   ├── engine.go         # Fill algorithm
│   │   └── constraints.go    # Constraint propagation
│   │
│   ├── clues/
│   │   ├── generator.go      # LLM clue generation
│   │   ├── prompts.go        # Prompt templates
│   │   ├── cache.go          # SQLite clue cache
│   │   └── providers/
│   │       ├── anthropic.go  # Claude API client
│   │       └── ollama.go     # Local LLM client
│   │
│   ├── output/
│   │   ├── json.go           # JSON formatter
│   │   ├── puz.go            # .puz formatter
│   │   └── ipuz.go           # .ipuz formatter
│   │
│   └── puzzle/
│       └── puzzle.go         # High-level Puzzle type
│
├── data/
│   ├── broda.txt             # Peter Broda wordlist
│   └── clue_cache.db         # SQLite clue cache
│
├── output/                   # Generated puzzles
│
├── go.mod
├── go.sum
└── README.md
```

---

## 9. Dependencies

### 9.1 Go Packages

| Package | Purpose | License |
|---------|---------|---------|
| github.com/spf13/cobra | CLI framework | Apache 2.0 |
| github.com/mattn/go-sqlite3 | SQLite driver | MIT |
| github.com/anthropics/anthropic-sdk-go | Claude API | MIT |
| github.com/ollama/ollama/api | Local LLM | MIT |

### 9.2 External Resources

| Resource | Source | License Status |
|----------|--------|----------------|
| Peter Broda Wordlist | peterbroda.me | Commercial OK (get written confirmation) |
| Claude API | anthropic.com | Pay-per-use |
| Ollama | ollama.ai | MIT (free) |

---

## 10. Implementation Plan

### 10.1 Milestones

| Phase | Deliverables | Duration | Priority |
|-------|--------------|----------|----------|
| Phase 1: Core | Grid generator, fill engine, JSON output | 1 week | P0 |
| Phase 2: Clues | LLM integration, prompt tuning, caching | 1 week | P0 |
| Phase 3: CLI | Full CLI, batch generation, validation | 3 days | P0 |
| Phase 4: Formats | .puz and .ipuz export | 2 days | P1 |
| Phase 5: Quality | Clue quality review, difficulty tuning | Ongoing | P1 |

### 10.2 Success Criteria

- Generate 1,000 valid puzzles without manual intervention
- All puzzles pass structural validation (connectivity, symmetry, word lengths)
- Clue generation completes in <30 seconds per puzzle (with API)
- Output files are compatible with Crossy backend
- Zero licensing/legal issues with generated content

---

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM clue quality inconsistent | Medium | High | Human review for initial batch; iterative prompt tuning |
| API costs exceed budget | Medium | Medium | Use Ollama locally; aggressive caching |
| Fill algorithm too slow | High | Low | Pre-generate grids; parallelize fill |
| Wordlist permission revoked | High | Very Low | Get written confirmation; backup wordlists |
| Duplicate/similar puzzles | Low | Medium | Track generated grids; similarity detection |

---

## 12. Appendix

### 12.1 Wordlist Format (Broda)

```
# Peter Broda wordlist format
# WORD;SCORE
# Score: 1-100 (higher = better quality)

JAZZ;95
PIZZA;90
QUARTZ;85
SPHINX;80
...
ETUI;15      # Crosswordese - low score
ESNE;10      # Obscure - very low score
```

### 12.2 Pre-Launch Checklist

- [ ] Email Peter Broda for written commercial permission
- [ ] Set up Anthropic API account with billing
- [ ] Install Ollama as backup/local option
- [ ] Create initial clue cache from test runs
- [ ] Define puzzle naming convention for Crossy
- [ ] Set up CI/CD for batch generation

### 12.3 Contact Information

| Resource | Contact |
|----------|---------|
| Peter Broda Wordlist | peter[at]bananarchy[at]gmail[dot]com |
| Anthropic API | console.anthropic.com |
| Ollama | ollama.ai |

---

*End of Document*