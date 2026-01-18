# Crossword Generation Pipeline - Implementation Plan

**Project**: Automated Crossword Puzzle Generation System
**Goal**: Build a complete pipeline to generate high-quality crossword puzzles at scale
**Target**: 50-100 puzzles per week, varying difficulty levels

---

## Executive Summary

CrossPlay currently has 25 manually created puzzles. To sustain daily puzzle releases and build a rich archive, we need an automated generation pipeline that can:

1. **Generate grids** with proper crossword structure (symmetry, connectivity)
2. **Fill grids** with words from curated dictionaries
3. **Create clues** that are engaging and difficulty-appropriate
4. **Validate quality** to ensure puzzles are solvable and enjoyable
5. **Manage workflow** from generation to publication

**Current State:**
- ✅ 25 existing puzzles (17 draft, 8 published)
- ✅ Admin CLI tool for importing/publishing
- ✅ Database schema supports all puzzle metadata
- ❌ No automated generation system
- ❌ Manual puzzle creation only

**Target State:**
- Automated grid generation with configurable patterns
- Word dictionary with 50K+ quality words
- Clue generation using LLM (GPT-4 or local model)
- Quality scoring and validation
- Batch generation capabilities
- Daily automated puzzle selection

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Generation Pipeline                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Grid Generation                                       │
│     ├─ Pattern Templates (NYT-style, quick, themed)      │
│     ├─ Symmetry Rules (rotational, reflective)          │
│     └─ Black Square Placement                           │
│                                                           │
│  2. Word Filling (Constraint Satisfaction)               │
│     ├─ Dictionary Lookup (50K+ words)                   │
│     ├─ Backtracking Algorithm                           │
│     ├─ Scoring (word quality, obscurity)                │
│     └─ Fill Validation                                   │
│                                                           │
│  3. Clue Generation                                       │
│     ├─ LLM-based (GPT-4 API or local LLM)               │
│     ├─ Template-based (for common words)                │
│     ├─ Difficulty Calibration                           │
│     └─ Clue Quality Scoring                             │
│                                                           │
│  4. Quality Control                                       │
│     ├─ Solvability Check                                │
│     ├─ Difficulty Analysis                              │
│     ├─ Offensive Content Filter                         │
│     └─ Duplication Detection                            │
│                                                           │
│  5. Storage & Publishing                                 │
│     ├─ Save to JSON format                              │
│     ├─ Import to database                               │
│     ├─ Queue for publication                            │
│     └─ Archive management                               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Grid Generation Engine (Week 1)

### Objective
Create a robust grid generator that produces valid crossword structures.

### P1.1: Grid Generator Core (3 days)

**File**: `backend/internal/generator/grid.go`

**Features:**
- Grid size configuration (5x5, 7x7, 9x9, 11x11, 15x15)
- Symmetry enforcement (rotational 180°, reflective)
- Black square placement with constraints
- Connectivity validation (no isolated sections)
- Word slot identification (across/down)

**Key Algorithms:**

```go
type GridGenerator struct {
    Width      int
    Height     int
    Symmetry   SymmetryType // Rotational180, Reflective, None
    BlackRatio float64      // Target ratio of black squares (0.15-0.25)
    MinWordLen int          // Minimum word length (usually 3)
}

func (g *GridGenerator) Generate() (*Grid, error) {
    // 1. Initialize empty grid
    // 2. Place black squares with symmetry
    // 3. Validate connectivity
    // 4. Identify word slots
    // 5. Number the grid
    // 6. Return grid structure
}
```

**Validation Rules:**
- All white squares must be connected
- No 2-letter words (minimum 3 letters)
- Maximum black square ratio: 25%
- At least 50% of grid filled with long words (6+ letters)

**Testing:**
- Generate 100 grids of each size
- Verify all symmetry rules
- Check connectivity
- Validate word slot quality

**Deliverables:**
- `grid.go` - Grid generation engine
- `grid_test.go` - Comprehensive tests
- Sample grids in `test-output/grids/`

---

### P1.2: Grid Pattern Templates (2 days)

**File**: `backend/internal/generator/patterns.go`

**Templates:**

1. **NYT Monday** (Easy - 15x15)
   - Low black square count (16-20%)
   - Simple symmetry
   - Long words encouraged

2. **NYT Wednesday** (Medium - 15x15)
   - Moderate black squares (18-22%)
   - Rotational symmetry
   - Mix of word lengths

3. **NYT Friday** (Hard - 15x15)
   - Higher black squares (20-24%)
   - Complex patterns
   - Themed sections

4. **Quick Puzzle** (5-7 minutes - 9x9)
   - Small grid
   - Simple pattern
   - Fast solving

5. **Mini** (2-3 minutes - 5x5)
   - Tiny grid
   - Perfect for mobile
   - Daily quick puzzle

**Implementation:**

```go
type GridPattern struct {
    Name        string
    Size        GridSize
    Difficulty  string
    Template    [][]bool // Pre-defined black square positions
    Constraints GridConstraints
}

var Patterns = map[string]GridPattern{
    "nyt_monday": {...},
    "nyt_wednesday": {...},
    "quick": {...},
    "mini": {...},
}
```

**Deliverables:**
- 10+ grid patterns
- Pattern validation tests
- Visual preview tool (SVG output)

---

## Phase 2: Word Dictionary & Filling Engine (Week 2)

### P2.1: Dictionary Management (2 days)

**File**: `backend/internal/generator/dictionary.go`

**Data Sources:**

1. **Primary Dictionary** (50K words)
   - Common English words
   - Scored by usage frequency
   - No offensive terms
   - Sources:
     - SCOWL (Spell Checker Oriented Word Lists)
     - Google Books Ngram
     - WordNet

2. **Supplementary Lists**
   - Proper nouns (capitals, countries, famous people)
   - Abbreviations (common acronyms)
   - Themed word lists (sports, movies, science)

3. **Scoring System**
   - Frequency score (1-100)
   - Crossword-worthiness (vowel ratio, letter distribution)
   - Obscurity penalty
   - Theme bonus

**Schema:**

```go
type Word struct {
    Text       string
    Length     int
    Score      int    // Higher = better for crosswords
    Frequency  int    // Usage frequency
    Categories []string // "common", "proper_noun", "science", etc.
    Difficulty string   // "easy", "medium", "hard"
}

type Dictionary struct {
    Words      map[int][]Word // Indexed by length
    Index      map[string]*Word
    Categories map[string][]Word
}
```

**File Format** (JSON):
```json
{
  "words": [
    {
      "text": "APPLE",
      "length": 5,
      "score": 95,
      "frequency": 12500,
      "categories": ["food", "common"],
      "difficulty": "easy"
    }
  ]
}
```

**Deliverables:**
- Dictionary loader
- Word scoring algorithm
- Dictionary stats tool
- 50K+ word database

---

### P2.2: Grid Filling Algorithm (3 days)

**File**: `backend/internal/generator/filler.go`

**Algorithm**: Constraint Satisfaction with Backtracking

**Approach:**

1. **Slot Prioritization**
   - Fill slots with fewest valid words first
   - Prefer crossing slots (more constraints)
   - Long words before short words

2. **Word Selection**
   - Filter dictionary by length and pattern
   - Score candidates by:
     - Word quality (dictionary score)
     - Cross-word compatibility
     - Theme matching (if themed puzzle)
   - Select highest-scoring word

3. **Backtracking**
   - If no valid word found, backtrack
   - Try next-best word in previous slot
   - Track failed attempts to avoid loops

4. **Optimization**
   - Caching for pattern lookups
   - Parallel filling attempts
   - Early termination on unsolvable grids

**Implementation:**

```go
type GridFiller struct {
    Grid       *Grid
    Dictionary *Dictionary
    Theme      *Theme // Optional
    MaxRetries int
}

func (f *GridFiller) Fill() (*FilledGrid, error) {
    // 1. Get all word slots sorted by constraint
    // 2. For each slot:
    //    - Get matching words from dictionary
    //    - Score candidates
    //    - Try best word
    //    - If fails, backtrack
    // 3. Validate final grid
    // 4. Return filled grid
}
```

**Performance Target:**
- 5x5: < 1 second
- 9x9: < 5 seconds
- 15x15: < 30 seconds
- Success rate: > 95%

**Deliverables:**
- Grid filling engine
- Performance benchmarks
- Fill statistics (average time, success rate)
- Failed grid analysis tool

---

## Phase 3: Clue Generation System (Week 3)

### P3.1: LLM-Based Clue Generation (3 days)

**File**: `backend/internal/generator/clues.go`

**Options:**

1. **GPT-4 API** (Recommended)
   - High quality clues
   - Good difficulty calibration
   - Cost: ~$0.01 per puzzle

2. **Local LLM** (Llama 3, Mixtral)
   - Free after setup
   - Faster for batch generation
   - Requires 16GB+ VRAM

3. **Hybrid Approach**
   - Templates for common words
   - LLM for uncommon/themed words
   - Best cost/quality balance

**Prompt Engineering:**

```
Generate a crossword clue for the word "{word}".

Difficulty: {difficulty}
Theme: {theme} (if applicable)
Context: This is a {day_of_week} puzzle.

Requirements:
- Clue should be {difficulty} difficulty
- Keep it concise (under 50 characters)
- Be creative but fair
- Use wordplay for harder puzzles
- For easy puzzles, use straightforward definitions

Word: {word}
Clue:
```

**Difficulty Calibration:**

- **Easy (Monday)**: Direct definitions, synonyms
  - "Large fruit" → APPLE
  - "Capital of France" → PARIS

- **Medium (Wednesday)**: Some wordplay, cultural references
  - "Big Apple, for one" → NYC
  - "Seine sight" → EIFFELTOWER

- **Hard (Friday)**: Heavy wordplay, obscure references
  - "Where Eve took a bite?" → EDEN
  - "It's outstanding in its field" → SCARECROW

**Implementation:**

```go
type ClueGenerator struct {
    LLMClient  *openai.Client // or local LLM client
    Templates  map[string][]string
    Difficulty string
    Theme      *Theme
}

func (cg *ClueGenerator) GenerateClue(word string) (string, error) {
    // 1. Check if word has template clue
    // 2. If not, generate with LLM
    // 3. Validate clue quality
    // 4. Return clue
}

func (cg *ClueGenerator) BatchGenerate(words []string) (map[string]string, error) {
    // Generate clues for multiple words efficiently
}
```

**Quality Control:**
- No offensive content
- Not too similar to existing clues
- Appropriate difficulty
- Factually correct
- Engaging and clear

**Deliverables:**
- Clue generation engine
- Template library (1000+ common words)
- LLM integration (GPT-4 or local)
- Clue quality scorer

---

### P3.2: Clue Templates & Database (2 days)

**File**: `backend/internal/generator/clue_templates.go`

**Template Format:**

```json
{
  "word": "APPLE",
  "clues": {
    "easy": [
      "Red fruit",
      "Fruit in pie",
      "Teacher's gift"
    ],
    "medium": [
      "Big ___ (NYC)",
      "iPhone maker",
      "Garden of Eden fruit"
    ],
    "hard": [
      "Newton's inspiration?",
      "It may be Granny Smith",
      "Core concern?"
    ]
  }
}
```

**Common Words Library:**
- 1000 most common crossword words
- Multiple clues per word per difficulty
- Manually curated for quality

**Sources:**
- NY Times crossword archives
- Crossword clue databases
- Manual curation

**Deliverables:**
- Clue template database
- Template loader
- Clue selection algorithm
- 1000+ templated words

---

## Phase 4: Quality Control & Validation (Week 4)

### P4.1: Puzzle Solvability Checker (2 days)

**File**: `backend/internal/generator/validator.go`

**Validation Checks:**

1. **Structural Validation**
   - All slots filled
   - No duplicate words
   - Proper numbering
   - Symmetry maintained

2. **Solvability Analysis**
   - Crossing words provide hints
   - No impossible intersections
   - Reasonable difficulty progression

3. **Quality Metrics**
   - Average word score
   - Obscure word ratio
   - Clue clarity score
   - Theme consistency

4. **Content Filtering**
   - No offensive words
   - No duplicate clues
   - No overly obscure references

**Scoring System:**

```go
type PuzzleScore struct {
    Overall      float64 // 0-100
    GridQuality  float64 // Grid structure
    WordQuality  float64 // Word selection
    ClueQuality  float64 // Clue clarity/creativity
    Difficulty   string  // "easy", "medium", "hard"
    Solvable     bool
    Issues       []string
}

func ValidatePuzzle(puzzle *Puzzle) (*PuzzleScore, error) {
    // Run all validation checks
    // Calculate scores
    // Return comprehensive score
}
```

**Quality Thresholds:**
- Minimum overall score: 70/100
- No issues marked as "critical"
- Solvability: must be true
- Word quality average: > 60/100

**Deliverables:**
- Validation engine
- Quality scoring algorithm
- Issue detection and reporting
- Acceptance criteria

---

### P4.2: Difficulty Calibration (2 days)

**File**: `backend/internal/generator/difficulty.go`

**Difficulty Factors:**

1. **Grid Complexity** (30%)
   - Grid size
   - Black square ratio
   - Word length distribution

2. **Word Obscurity** (40%)
   - Average word frequency
   - Proper noun ratio
   - Abbreviation usage

3. **Clue Difficulty** (30%)
   - Wordplay complexity
   - Reference obscurity
   - Misdirection level

**Calibration Algorithm:**

```go
func CalculateDifficulty(puzzle *Puzzle) DifficultyScore {
    gridScore := analyzeGrid(puzzle.Grid)
    wordScore := analyzeWords(puzzle.Words)
    clueScore := analyzeClues(puzzle.Clues)

    overall := (gridScore * 0.3) + (wordScore * 0.4) + (clueScore * 0.3)

    return DifficultyScore{
        Overall: overall,
        Level: getDifficultyLevel(overall),
        Breakdown: map[string]float64{
            "grid": gridScore,
            "words": wordScore,
            "clues": clueScore,
        },
    }
}
```

**Difficulty Levels:**
- **Easy (Monday)**: Score 20-40 - Common words, simple clues
- **Medium (Wednesday)**: Score 40-60 - Mix of common/uncommon, some wordplay
- **Hard (Friday)**: Score 60-80 - Obscure words, heavy wordplay
- **Expert (Saturday)**: Score 80-100 - Very challenging

**Testing:**
- Human solver testing
- Compare with existing NYT puzzles
- Track solve times
- Adjust weights based on feedback

**Deliverables:**
- Difficulty calculation engine
- Calibration tool
- Human testing framework
- Difficulty adjustment system

---

## Phase 5: Pipeline Integration & Automation (Week 5)

### P5.1: End-to-End Pipeline (3 days)

**File**: `backend/cmd/generator/main.go`

**Pipeline Flow:**

```bash
# Generate a single puzzle
generator generate \
  --size 15x15 \
  --pattern nyt_monday \
  --difficulty easy \
  --theme "food" \
  --output puzzles/

# Batch generation
generator batch \
  --count 30 \
  --difficulty-distribution "easy:40%,medium:40%,hard:20%" \
  --output puzzles/batch/

# Weekly generation
generator weekly \
  --start-date 2026-01-20 \
  --difficulty-schedule monday:easy,wednesday:medium,friday:hard \
  --output puzzles/week/
```

**Pipeline Steps:**

1. **Configuration**
   - Load settings (size, difficulty, theme)
   - Select grid pattern
   - Load dictionary

2. **Generation Loop**
   ```
   for each puzzle:
     1. Generate grid
     2. Fill with words
     3. Generate clues
     4. Validate quality
     5. If score > threshold: save
     6. Else: retry (max 3 attempts)
   ```

3. **Quality Filtering**
   - Sort by overall score
   - Remove duplicates
   - Select best puzzles

4. **Output**
   - Save to JSON format
   - Import to database (optional)
   - Generate preview HTML

**Performance:**
- Generate 30 puzzles in < 15 minutes
- Success rate > 90%
- All puzzles score > 70/100

**Deliverables:**
- Complete generator CLI
- Batch generation
- Progress reporting
- Error handling and retry logic

---

### P5.2: Automated Publishing Workflow (2 days)

**File**: `backend/cmd/publisher/main.go`

**Workflow:**

```bash
# Daily puzzle publishing (runs via cron)
publisher daily \
  --source puzzles/queue/ \
  --date 2026-01-20 \
  --auto-publish

# Queue management
publisher queue \
  --add puzzles/new/* \
  --priority-sort \
  --review-mode

# Scheduled publishing
publisher schedule \
  --start 2026-01-20 \
  --duration 30days \
  --difficulty-rotation monday:easy,friday:hard
```

**Features:**

1. **Smart Queue**
   - Puzzles sorted by score
   - Difficulty balancing
   - Theme variety
   - No duplicate words across week

2. **Publishing Logic**
   - Auto-publish if score > 85
   - Flag for review if 70-85
   - Reject if < 70

3. **Monitoring**
   - Track publish stats
   - Alert on low queue
   - Quality trends

**Database Integration:**
```go
func PublishPuzzle(puzzle *Puzzle, date time.Time) error {
    // 1. Validate puzzle
    // 2. Check for duplicates
    // 3. Insert into database
    // 4. Update published_at
    // 5. Send notifications
}
```

**Cron Schedule:**
```bash
# Generate weekly batch every Sunday
0 0 * * 0 cd /app && ./generator weekly

# Publish daily puzzle at midnight
0 0 * * * cd /app && ./publisher daily
```

**Deliverables:**
- Publisher CLI tool
- Queue management system
- Automated scheduling
- Monitoring dashboard

---

## Phase 6: Advanced Features (Week 6+)

### P6.1: Themed Puzzles (3 days)

**Themes:**
- Sports (teams, players, terminology)
- Movies (titles, actors, quotes)
- Science (elements, scientists, concepts)
- Geography (countries, capitals, landmarks)
- Food (cuisines, ingredients, restaurants)
- History (events, figures, dates)

**Implementation:**

```go
type Theme struct {
    Name        string
    Keywords    []string
    Dictionary  *Dictionary // Themed word list
    ThemeWords  int         // Number of theme words required
    Placement   PlacementRule
}

func GenerateThemedPuzzle(theme *Theme, difficulty string) (*Puzzle, error) {
    // 1. Generate grid with theme word placement
    // 2. Fill with mix of theme + regular words
    // 3. Generate themed clues
    // 4. Validate theme consistency
}
```

**Deliverables:**
- Theme system
- 10+ theme dictionaries
- Themed clue generation
- Theme validation

---

### P6.2: Custom Puzzle Designer (3 days)

**Web UI for Manual Design:**

```
frontend/src/app/designer/
  ├── page.tsx           # Designer UI
  ├── GridEditor.tsx     # Visual grid editor
  ├── WordFiller.tsx     # Assisted word filling
  └── ClueEditor.tsx     # Clue editing interface
```

**Features:**
- Visual grid editor (click to add black squares)
- Auto-fill suggestions
- Clue assistance (LLM suggestions)
- Real-time validation
- Export to JSON
- Import for editing

**Deliverables:**
- Designer web interface
- Grid editor component
- Assisted filling tool
- Preview and export

---

### P6.3: A/B Testing & Analytics (2 days)

**Track Puzzle Performance:**

```sql
CREATE TABLE puzzle_analytics (
  puzzle_id UUID,
  avg_solve_time INTEGER,
  completion_rate FLOAT,
  difficulty_rating FLOAT, -- User-reported
  enjoyment_rating FLOAT,  -- User-reported
  hint_usage INTEGER,
  error_rate FLOAT,
  created_at TIMESTAMP
);
```

**Metrics:**
- Solve time by difficulty
- Completion rates
- User ratings
- Most/least enjoyed puzzles
- Clue difficulty accuracy

**Use Data To:**
- Improve difficulty calibration
- Identify problematic words/clues
- Optimize generator weights
- Guide theme selection

**Deliverables:**
- Analytics schema
- Tracking integration
- Analytics dashboard
- Generator tuning based on data

---

## Implementation Roadmap

### Week 1: Grid Generation
- Days 1-3: Core grid generator
- Days 4-5: Pattern templates
- **Deliverable:** Working grid generator

### Week 2: Dictionary & Filling
- Days 1-2: Dictionary management
- Days 3-5: Filling algorithm
- **Deliverable:** Complete grids with words

### Week 3: Clue Generation
- Days 1-3: LLM integration
- Days 4-5: Template library
- **Deliverable:** Fully clued puzzles

### Week 4: Quality Control
- Days 1-2: Validation system
- Days 3-5: Difficulty calibration
- **Deliverable:** Quality-scored puzzles

### Week 5: Pipeline Integration
- Days 1-3: End-to-end pipeline
- Days 4-5: Automated publishing
- **Deliverable:** Production pipeline

### Week 6+: Advanced Features
- Themed puzzles
- Designer UI
- Analytics

---

## Technical Stack

### Backend (Go)
- **Grid Generation**: Custom algorithms
- **Constraint Solving**: Backtracking with optimization
- **LLM Integration**: OpenAI Go SDK or local LLM client
- **CLI Tools**: Cobra (command framework)

### Data Storage
- **Dictionary**: JSON files (50K+ words)
- **Templates**: JSON files (1K+ clues)
- **Generated Puzzles**: JSON format
- **Database**: PostgreSQL (for published puzzles)

### External Services
- **OpenAI GPT-4**: Clue generation (~$0.01/puzzle)
- **Optional**: Local LLM (Ollama + Llama 3)

---

## Success Metrics

### Week 1-2 (Grid & Fill)
- ✅ Generate 100 valid grids of each size
- ✅ 95%+ fill success rate
- ✅ Average fill time < 30s for 15x15

### Week 3-4 (Clues & Quality)
- ✅ Generate quality clues for all words
- ✅ 90%+ puzzles score > 70/100
- ✅ Difficulty calibration accurate

### Week 5 (Pipeline)
- ✅ Generate 30 puzzles in < 15 minutes
- ✅ Automated daily publishing
- ✅ Queue always has 30+ puzzles

### Week 6+ (Advanced)
- ✅ Themed puzzles available
- ✅ Designer UI functional
- ✅ Analytics tracking

---

## Cost Estimates

### Development (5-6 weeks)
- **Developer Time**: $30K-50K (1 senior dev, 6 weeks)
- **LLM Costs (Testing)**: $50-100 (1000 test puzzles)
- **Infrastructure**: Minimal (use existing servers)

### Ongoing Costs
- **LLM Costs**: ~$10/month (30 puzzles @ $0.01 each)
- **Storage**: Minimal (JSON files)
- **Compute**: Existing backend

### Alternative (No LLM Costs)
- Use local LLM (Llama 3): Free after setup
- Requires: 16GB VRAM GPU or CPU inference (slower)
- One-time cost: $1K-2K for GPU if needed

---

## Risk Assessment

### High Risks
1. **Fill Algorithm Performance**
   - Mitigation: Start with smaller grids, optimize incrementally
   - Fallback: Use pre-computed grid templates

2. **Clue Quality (LLM)**
   - Mitigation: Human review for first 100 puzzles
   - Fallback: Larger template library, less LLM dependence

3. **Difficulty Calibration**
   - Mitigation: A/B test with real users
   - Fallback: Manual adjustment based on solve times

### Medium Risks
1. **Dictionary Quality**
   - Mitigation: Curate from multiple sources
   - Fallback: Manual word list curation

2. **Generation Speed**
   - Mitigation: Batch generation, caching
   - Fallback: Pre-generate puzzles weekly

---

## Next Steps

### Immediate (Week 1)
1. Set up generator project structure
2. Research and collect word lists
3. Implement basic grid generator
4. Test grid validation

### Short-term (Weeks 2-3)
1. Implement filling algorithm
2. Integrate LLM for clue generation
3. Build validation system
4. Generate first 10 test puzzles

### Long-term (Weeks 4-6)
1. Complete pipeline integration
2. Automate publishing
3. Build themed puzzle system
4. Launch designer UI

---

## Resources & References

### Algorithms
- Constraint Satisfaction Problems (CSP)
- Backtracking algorithms
- Pattern matching optimization

### Data Sources
- SCOWL word lists
- WordNet dictionary
- NY Times crossword archives
- Crossword clue databases

### Tools & Libraries
- OpenAI Go SDK
- Ollama (local LLM)
- Cobra (CLI framework)

### Similar Projects
- Crossword Compiler
- Phil's Crossword Solver
- Automatic crossword generators (research papers)

---

## Appendix: File Structure

```
backend/
├── cmd/
│   ├── generator/
│   │   └── main.go           # Generator CLI
│   └── publisher/
│       └── main.go           # Publisher CLI
├── internal/
│   └── generator/
│       ├── grid.go           # Grid generation
│       ├── patterns.go       # Pattern templates
│       ├── dictionary.go     # Dictionary management
│       ├── filler.go         # Grid filling algorithm
│       ├── clues.go          # Clue generation
│       ├── templates.go      # Clue templates
│       ├── validator.go      # Quality validation
│       └── difficulty.go     # Difficulty calibration
├── data/
│   ├── dictionaries/
│   │   ├── common-50k.json   # Main word list
│   │   ├── proper-nouns.json
│   │   └── themed/           # Theme word lists
│   └── templates/
│       └── clues-1k.json     # Clue templates
└── puzzles/
    ├── generated/            # Generated puzzles
    ├── queue/                # Publishing queue
    └── archive/              # Published puzzles
```

---

**Plan Version**: 1.0
**Last Updated**: 2026-01-16
**Status**: Ready for implementation
