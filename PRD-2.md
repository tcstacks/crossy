# Product Requirements Document 2: Crossword Content Expansion
**Crossy - Solving the Content Gap**

---

## Document Information

- **Version**: 1.0
- **Date**: 2026-01-18
- **Status**: Planning
- **Product**: Crossy - Content Acquisition & Management System
- **Supersedes**: PRD.md (extends, does not replace)

---

## Executive Summary

**Problem Statement**: Users are reporting "not enough crosswords" in the archive, limiting engagement and retention. The current system relies on manual puzzle creation, which doesn't scale to meet user demand for daily fresh content.

**Solution**: Implement a content acquisition strategy focused primarily on importing existing puzzles from public sources, third-party APIs, and standard crossword formats. Secondary focus on community contributions and optional AI generation for gaps.

**Target Metrics**:
- Achieve 365+ puzzles (1 year of daily content) within 3 months
- Import 500+ puzzles from public sources in first month
- Support all major crossword file formats (.puz, .json, .ipuz, .xml)
- Maintain quality standards (>4.0/5.0 average rating)

---

## Problem Analysis

### Current State
- **Archive Size**: ~30 puzzles
- **Creation Method**: Manual construction or manual LLM generation
- **Creation Rate**: ~1-2 puzzles per week
- **User Demand**: Daily puzzles + archive browsing
- **Gap**: Need ~300+ more puzzles to sustain engagement

### User Impact
- **Limited Replay Value**: Users exhaust archive quickly
- **Reduced Engagement**: No content → no reason to return
- **Competitive Disadvantage**: NYT has 80+ years of puzzles
- **Streak Breaking**: Miss daily puzzle = broken streak = churn

### Root Causes
1. No automated generation pipeline
2. No bulk import capabilities
3. No community contribution system
4. No third-party integrations
5. High manual effort per puzzle

---

## Goals & Success Metrics

### Primary Goals
1. **Expand Archive**: Reach 500+ puzzles within 3 months
2. **Automate Generation**: Generate quality puzzles in <5 minutes
3. **Enable Community**: 20% of new puzzles from user contributions
4. **Maintain Quality**: >85% of puzzles rated "good" or better

### Success Metrics

**Content Volume**:
- Total puzzles in archive: 500+ (30 days), 1000+ (90 days)
- Daily puzzle queue filled: 30+ days ahead
- Puzzles per difficulty: 33% easy, 33% medium, 33% hard

**Generation Efficiency**:
- AI generation time: <5 minutes per puzzle
- Bulk import rate: 100+ puzzles per hour
- Manual review time: <10 minutes per puzzle

**Quality Metrics**:
- Puzzle quality score: >4.0/5.0 average
- Completion rate: >60% of started puzzles
- User report rate: <5% of puzzles flagged
- Clue accuracy: >95% (no incorrect answers)

**Community Engagement**:
- Active puzzle creators: 50+ users
- Monthly submissions: 40+ puzzles
- Acceptance rate: >50% of submissions

---

## Feature Set

**Priority Order**: Import & Sources (P0) → Community Contributions (P1) → AI Generation (P2)

### 1. Bulk Import System

#### 1.1 Standard Format Importers
**Description**: Import puzzles from common crossword file formats.

**Supported Formats**:
1. **.puz (Across Lite)**: Industry standard binary format
2. **.json (Custom/NYT)**: JSON puzzle specifications
3. **.xml (XWord Info)**: XML crossword format
4. **.ipuz**: Open standard puzzle format
5. **.csv**: Simple grid + clue format

**Import Process**:
1. Upload file(s) via web interface or CLI
2. Parser extracts grid, clues, metadata
3. Validator checks puzzle integrity
4. Preview shows rendered puzzle
5. Admin approves and publishes

**CLI Commands**:
```bash
# Import single puzzle
./crossy-admin import --file puzzle.puz

# Import directory
./crossy-admin import --dir ./puzzles/archive/

# Import with auto-publish
./crossy-admin import --file puzzle.json --publish --date 2026-01-25

# Dry run (validate without importing)
./crossy-admin import --file puzzle.puz --dry-run
```

**Validation Rules**:
- Grid structure valid
- All clues have answers
- No duplicate clue numbers
- Words match grid positions
- Metadata complete (title, author, date)

**Acceptance Criteria**:
- [ ] All 5 formats import successfully
- [ ] Batch import handles 100+ files
- [ ] Validation catches malformed puzzles
- [ ] Preview shows puzzle correctly
- [ ] Metadata preserved (author, title, copyright)

---

#### 1.2 Crossword Puzzle Sources
**Description**: Acquire puzzles from public domain and licensed sources.

**Public Domain Sources**:
1. **Pre-1928 NYT Puzzles**: Public domain, available via archives
2. **USA Today Archive**: Some puzzles available for licensing
3. **Local Newspapers**: Many small papers willing to license old puzzles
4. **Vintage Puzzle Books**: Out-of-copyright puzzle collections
5. **Internet Archive**: Scanned crossword books and magazines

**Third-Party APIs & Databases**:
1. **XWord Info** (xwordinfo.com): NYT puzzle database with metadata
2. **Crossword Nexus** (crosswordnexus.com): Free puzzles and constructor tools
3. **Guardian Crosswords**: UK-style puzzles via Guardian API
4. **The Atlantic**: Occasional free puzzles
5. **Washington Post**: Some puzzles available
6. **LA Times**: Daily crossword syndication
7. **Universal Crossword**: Syndicated free puzzles

**Community & Open Sources**:
1. **/r/crossword**: Community-created puzzles
2. **Crossword Fiend**: Blog with links to free daily puzzles
3. **Crossword Hobbyist**: User-generated puzzles
4. **Armored Penguin**: Free puzzle creation and sharing
5. **Puzzle Baron**: Public puzzle database

**Licensing Opportunities**:
- Contact constructor syndicates (Tribune, Universal, King Features)
- Reach out to independent constructors
- License historical archives from defunct publications
- Partner with puzzle aggregators

**Sync Configuration**:
```json
{
  "source": "xwordinfo",
  "schedule": "daily",
  "autoImport": true,
  "requireReview": true,
  "filters": {
    "difficulty": ["easy", "medium"],
    "minDate": "2020-01-01",
    "excludeAuthors": []
  }
}
```

**Acceptance Criteria**:
- [ ] Can authenticate with external APIs
- [ ] Daily sync imports new puzzles
- [ ] Duplicate detection prevents re-imports
- [ ] Copyright/attribution preserved
- [ ] Rate limiting respected

**Scraping Considerations**:
- Respect robots.txt and terms of service
- Rate limit requests (1-2 per second max)
- Cache responses to avoid redundant requests
- Attribute sources properly
- Only scrape publicly available puzzles
- Get permission where required

**Acceptance Criteria**:
- [ ] Can import from 5+ public sources
- [ ] Licensing agreements documented
- [ ] Attribution tracked per puzzle
- [ ] Daily sync configured for free sources
- [ ] 500+ puzzles imported in first month

---

### 2. Community Puzzle Contributions

#### 2.1 Web-Based Puzzle Constructor
**Description**: In-app tool for users to create and submit puzzles.

**Constructor Features**:
- Interactive grid editor
- Auto-numbering clue system
- Symmetry enforcement toggle
- Black square placement tools
- Word suggestions from dictionary
- Clue writing interface
- Preview/test mode
- Save drafts

**Editor Interface**:
```
┌─────────────────────────────────────┐
│  Grid Editor (15x15)                │
│  ┌───┬───┬───┬───┬───┐             │
│  │ 1 │ 2 │ █ │ 3 │ 4 │  Across:    │
│  ├───┼───┼───┼───┼───┤  1. Clue... │
│  │ 5 │   │ █ │   │   │  5. Clue... │
│  ├───┼───┼───┼───┼───┤             │
│  │ █ │   │   │   │ █ │  Down:      │
│  └───┴───┴───┴───┴───┘  1. Clue... │
│                                     │
│  [Symmetry: ON] [Auto-fill] [Test] │
└─────────────────────────────────────┘
```

**Tools**:
- **Black Square Tool**: Click to toggle
- **Auto-fill**: Suggest valid words for pattern
- **Clue Assistant**: AI-generated clue suggestions
- **Validator**: Check puzzle solvability
- **Theme Helper**: Ensure theme consistency

**Acceptance Criteria**:
- [ ] Users can create full puzzles in editor
- [ ] Grid enforces crossword rules
- [ ] Auto-numbering updates dynamically
- [ ] Validation catches errors before submission
- [ ] Drafts auto-save every 30 seconds

---

#### 2.2 Submission & Review Workflow
**Description**: Community puzzle review and approval process.

**Submission Flow**:
1. User completes puzzle in constructor
2. System validates structure and solvability
3. User submits with metadata (title, theme, difficulty)
4. Enters review queue
5. Moderators review and test
6. Approved puzzles published to archive
7. Creator credited and notified

**Review Queue Dashboard**:
```
Pending Submissions (23)
┌───────────────────────────────────────────────────────┐
│ ID   | Title            | Author  | Difficulty | Date │
├───────────────────────────────────────────────────────┤
│ 1523 | Monday Fun       | User42  | Easy       | 1/18 │
│ 1522 | Movie Madness    | Alice   | Medium     | 1/18 │
│ 1521 | Science Special  | Bob     | Hard       | 1/17 │
└───────────────────────────────────────────────────────┘
[Review] [Test Solve] [Approve] [Reject with Feedback]
```

**Review Criteria**:
- Puzzle solvable and unique solution
- Clues accurate and unambiguous
- Difficulty appropriate
- No offensive content
- Theme consistency (if themed)
- Grammar and spelling correct

**Acceptance Criteria**:
- [ ] Submissions enter queue automatically
- [ ] Reviewers can test-solve before approval
- [ ] Rejection includes feedback to creator
- [ ] Approved puzzles auto-publish or schedule
- [ ] Creators earn reputation points

---

#### 2.3 Creator Incentives & Reputation
**Description**: Gamification and rewards for puzzle creators.

**Reputation System**:
- **Points Earned**:
  - Puzzle submitted: +10 points
  - Puzzle approved: +50 points
  - Puzzle featured: +100 points
  - High user rating (4.5+): +25 points
  - 10+ completions: +15 points

- **Reputation Levels**:
  - Novice (0-100): Can submit 1 puzzle/week
  - Constructor (100-500): Can submit 3 puzzles/week
  - Expert (500-1500): Can submit 5 puzzles/week
  - Master (1500+): Can submit unlimited, skip review queue

**Rewards**:
- Creator badge on profile
- Featured on homepage
- Creator leaderboard
- Early access to new features
- Custom puzzle collections
- Revenue share (future monetization)

**Acceptance Criteria**:
- [ ] Points calculated correctly
- [ ] Levels unlock at thresholds
- [ ] Leaderboard updates in real-time
- [ ] Badges display on profile
- [ ] High-reputation users auto-approved

---

### 3. Puzzle Management & Scheduling

#### 3.1 Advanced Publishing Calendar
**Description**: Visual calendar for scheduling puzzle publications.

**Calendar Features**:
- Drag-and-drop puzzle scheduling
- Difficulty balancing (varied week)
- Theme planning (holiday puzzles, etc.)
- Gap detection (missing days highlighted)
- Bulk operations (schedule 30 days at once)

**Calendar View**:
```
January 2026
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  1  │  2  │  3  │  4  │  5  │  6  │  7  │
│ 🟢E │ 🟡M │ 🟢E │ 🔴H │ 🟡M │ 🔴H │ 🟢E │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │
│ 🟢E │ ❌  │ 🟡M │ 🟡M │ 🔴H │ 🟢E │ 🟡M │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

🟢 Easy  🟡 Medium  🔴 Hard  ❌ No puzzle
```

**Auto-Scheduling Rules**:
- Monday/Tuesday: Easy
- Wednesday/Thursday: Medium
- Friday/Saturday: Hard
- Sunday: Varies
- Holiday: Themed puzzle

**Acceptance Criteria**:
- [ ] Calendar displays all scheduled puzzles
- [ ] Drag-and-drop reschedules puzzles
- [ ] Missing days highlighted
- [ ] Auto-schedule fills gaps intelligently
- [ ] Export schedule as CSV/JSON

---

#### 3.2 Puzzle Analytics Dashboard
**Description**: Track puzzle performance and user preferences.

**Metrics Tracked Per Puzzle**:
- Completion rate (% who finish)
- Average solve time
- Hint usage rate
- User ratings (1-5 stars)
- Difficulty accuracy (is "hard" actually hard?)
- Popularity (total plays)
- User feedback/comments

**Dashboard Views**:
1. **Overview**: Archive health, total puzzles, avg rating
2. **Performance**: Top/bottom rated puzzles
3. **Trends**: Difficulty preferences over time
4. **User Behavior**: Peak play times, device breakdown
5. **Content Gaps**: Underrepresented themes/difficulties

**Actionable Insights**:
- "Users prefer medium puzzles on Wednesdays"
- "Sports-themed puzzles have low completion rate"
- "Puzzle #234 rated too hard, reclassify as 'hard'"
- "Need more easy puzzles - only 20% of archive"

**Acceptance Criteria**:
- [ ] Dashboard updates daily
- [ ] All metrics display correctly
- [ ] Export data as CSV
- [ ] Filter by date range, difficulty, theme
- [ ] Insights auto-generated weekly

---

### 4. Quality Assurance System

#### 4.1 Automated Puzzle Validation
**Description**: Comprehensive pre-publish checks.

**Validation Checks**:
1. **Structural**:
   - Grid is rectangular
   - All words minimum 3 letters
   - No isolated sections
   - Symmetry (if required)
   - Black square ratio (15-25%)

2. **Content**:
   - All words in dictionary
   - No duplicate words
   - Clue numbering sequential
   - Answer lengths match grid
   - No orphan clues

3. **Solvability**:
   - Unique solution exists
   - Puzzle completable
   - No ambiguous answers
   - Crossing words valid

4. **Quality**:
   - Clues grammatically correct
   - No offensive content
   - Difficulty appropriate
   - Theme consistency (if themed)

**Validation Response**:
```json
{
  "valid": false,
  "errors": [
    {
      "type": "structural",
      "severity": "critical",
      "message": "Word at 3-Across is only 2 letters",
      "location": {"clue": "3-Across", "row": 0, "col": 2}
    }
  ],
  "warnings": [
    {
      "type": "quality",
      "severity": "minor",
      "message": "Unusual word 'ZYMURGY' may be too obscure for 'easy' difficulty"
    }
  ],
  "score": 78
}
```

**Acceptance Criteria**:
- [ ] All critical errors block publication
- [ ] Warnings shown but don't block
- [ ] Validation runs in <2 seconds
- [ ] Clear error messages with locations
- [ ] Quality score calculated (0-100)

---

#### 4.2 User Feedback & Reporting
**Description**: Allow users to report puzzle issues.

**Report Types**:
- Incorrect answer
- Ambiguous clue
- Offensive content
- Difficulty mismatch
- Technical issue (grid rendering)
- General feedback

**Report Flow**:
1. User reports issue from puzzle page
2. Report includes puzzle ID, clue number, description
3. Moderator reviews report
4. Issue resolved (fix puzzle, remove, dismiss)
5. Reporter notified of outcome

**Moderator Dashboard**:
```
Puzzle Reports (12 pending)
┌────────────────────────────────────────────────────────┐
│ Puzzle         | Issue              | Reporter | Date  │
├────────────────────────────────────────────────────────┤
│ Monday Fun #45 | Incorrect answer   | User123  | 1/18  │
│ Movie Madness  | Ambiguous clue 12A | Alice    | 1/17  │
└────────────────────────────────────────────────────────┘
[View] [Fix Puzzle] [Remove] [Dismiss]
```

**Acceptance Criteria**:
- [ ] Users can report from puzzle page
- [ ] Reports tracked in moderation queue
- [ ] Moderators can edit puzzles directly
- [ ] High-report puzzles flagged automatically
- [ ] Fixed puzzles notify affected users

---

### 5. Advanced Content Features

#### 5.1 Puzzle Collections & Themes
**Description**: Organize puzzles into curated collections.

**Collection Types**:
- **Themed Collections**: "Movie Mondays", "Science Sundays"
- **Difficulty Series**: "Beginner's Pack", "Expert Challenge"
- **Event Collections**: "Holiday Specials", "Black History Month"
- **Creator Showcases**: "Best of User42"
- **Historical**: "Puzzles from 2025"

**Collection Features**:
- Custom cover image
- Description and curator note
- Completion progress (X/Y solved)
- Shareable collection link
- Leaderboard for collection

**Acceptance Criteria**:
- [ ] Admins can create collections
- [ ] Collections display on archive page
- [ ] Users track progress per collection
- [ ] Collections shareable via link
- [ ] Auto-collections (e.g., "This Week")

---

#### 5.2 Difficulty Calibration System
**Description**: Dynamically adjust puzzle difficulty based on user data.

**Calibration Process**:
1. New puzzle published with estimated difficulty
2. Track completion rate and solve times
3. Compare to expected metrics for difficulty level
4. Adjust difficulty rating if mismatch detected
5. Notify users of reclassification

**Difficulty Metrics**:
- **Easy**: >85% completion, <10 min avg solve
- **Medium**: 60-85% completion, 10-25 min avg solve
- **Hard**: <60% completion, >25 min avg solve

**Auto-Reclassification**:
- After 100 attempts, system suggests reclassification
- Moderator reviews and approves
- Puzzle difficulty updated
- Users notified if they solved it

**Acceptance Criteria**:
- [ ] System tracks completion metrics
- [ ] Suggestions generated after threshold
- [ ] Reclassification updates difficulty tag
- [ ] Historical data preserved
- [ ] Users can see difficulty changes

---

### 6. AI-Powered Puzzle Generation (Optional/Future)

#### 6.1 LLM Generation Engine
**Description**: Generate puzzles using AI when imports don't meet demand or for specific themes.

**Note**: This is a lower priority feature. Focus should be on importing existing puzzles first.

**Capabilities**:
- Generate puzzles for underrepresented themes
- Fill gaps in publishing calendar
- Create custom-sized grids not available from sources
- Support themed events (holidays, special occasions)

**Quality Requirements**:
- Must pass same validation as imported puzzles
- Requires human review before publishing
- Track generation success rate
- User feedback determines if AI puzzles continue

**Acceptance Criteria**:
- [ ] AI puzzles indistinguishable from human-created
- [ ] Generation only used when imports insufficient
- [ ] Clear labeling if AI-generated (transparency)
- [ ] Quality metrics match imported puzzles

---

## Technical Requirements

### 7. Architecture & Infrastructure

#### 7.1 File Processing Pipeline
**Requirements**:
- Async job queue (Redis/BullMQ)
- Worker pool for parallel processing
- Progress tracking per job
- Error handling and retry logic
- File validation and sanitization

**Pipeline Stages**:
1. **Upload**: File received, queued
2. **Parse**: Extract data from format
3. **Validate**: Run quality checks
4. **Transform**: Convert to internal format
5. **Store**: Save to database
6. **Publish**: Make available to users

**Worker Configuration**:
```yaml
workers:
  puzzle_import:
    concurrency: 5
    timeout: 60s
    retries: 3
  puzzle_generation:
    concurrency: 3
    timeout: 300s
    retries: 1
```

**Acceptance Criteria**:
- [ ] Queue processes jobs in order
- [ ] Workers handle failures gracefully
- [ ] Progress visible in admin dashboard
- [ ] Failed jobs logged with details
- [ ] Retry logic prevents duplicate imports

---

#### 7.2 Database Schema Extensions
**New Tables**:

```sql
-- Puzzle submissions from community
CREATE TABLE puzzle_submissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  theme VARCHAR(100),
  difficulty VARCHAR(20),
  grid JSONB,
  clues JSONB,
  metadata JSONB,
  status VARCHAR(20), -- pending, approved, rejected
  reviewer_id UUID REFERENCES users(id),
  review_notes TEXT,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- Puzzle collections
CREATE TABLE puzzle_collections (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  creator_id UUID REFERENCES users(id),
  cover_image VARCHAR(255),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- Collection membership
CREATE TABLE collection_puzzles (
  collection_id UUID REFERENCES puzzle_collections(id),
  puzzle_id UUID REFERENCES puzzles(id),
  order_index INTEGER,
  PRIMARY KEY (collection_id, puzzle_id)
);

-- User reputation
CREATE TABLE user_reputation (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  points INTEGER DEFAULT 0,
  level VARCHAR(50),
  puzzles_submitted INTEGER DEFAULT 0,
  puzzles_approved INTEGER DEFAULT 0,
  puzzles_featured INTEGER DEFAULT 0,
  updated_at TIMESTAMP
);

-- Puzzle reports
CREATE TABLE puzzle_reports (
  id UUID PRIMARY KEY,
  puzzle_id UUID REFERENCES puzzles(id),
  user_id UUID REFERENCES users(id),
  report_type VARCHAR(50),
  clue_number INTEGER,
  description TEXT,
  status VARCHAR(20), -- pending, resolved, dismissed
  moderator_id UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Puzzle analytics (aggregated daily)
CREATE TABLE puzzle_analytics (
  puzzle_id UUID REFERENCES puzzles(id),
  date DATE,
  plays INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  avg_solve_time INTEGER,
  hints_used INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  total_ratings INTEGER DEFAULT 0,
  PRIMARY KEY (puzzle_id, date)
);
```

**Indexes**:
```sql
CREATE INDEX idx_submissions_status ON puzzle_submissions(status);
CREATE INDEX idx_submissions_user ON puzzle_submissions(user_id);
CREATE INDEX idx_reports_status ON puzzle_reports(status);
CREATE INDEX idx_analytics_date ON puzzle_analytics(date);
```

---

### 8. Admin Interface

#### 8.1 Content Management Dashboard
**Description**: Centralized admin panel for puzzle management.

**Dashboard Sections**:
1. **Overview**: Archive stats, pending reviews, reports
2. **Generator**: AI puzzle generation interface
3. **Import**: File upload and batch import
4. **Review Queue**: Pending submissions
5. **Calendar**: Publishing schedule
6. **Analytics**: Puzzle performance metrics
7. **Reports**: User-reported issues
8. **Collections**: Manage themed collections

**Access Control**:
- **Admin**: Full access
- **Moderator**: Review, approve, edit puzzles
- **Creator**: Submit puzzles, view own stats
- **User**: Play puzzles only

**Acceptance Criteria**:
- [ ] Dashboard accessible at /admin
- [ ] Role-based access enforced
- [ ] All CRUD operations available
- [ ] Real-time stats updates
- [ ] Mobile-responsive design

---

## Implementation Plan

### Phase 1: Import Infrastructure (Weeks 1-2)
**Goal**: Build robust import system for existing puzzles

**Deliverables**:
- [ ] CLI import tool for .puz, .json, .ipuz formats
- [ ] Database schema updates
- [ ] Basic admin dashboard for review
- [ ] Automated validation pipeline

**Success Criteria**:
- Import 100+ puzzles from various formats
- Validation catches malformed puzzles
- Admin can review and publish via dashboard

---

### Phase 2: Source Acquisition (Weeks 3-4)
**Goal**: Acquire puzzles from public and licensed sources

**Deliverables**:
- [ ] Integrate with 3-5 public puzzle sources
- [ ] Web scraper for permitted sites
- [ ] Licensing agreements with 2+ sources
- [ ] Attribution tracking system

**Success Criteria**:
- Import 300+ puzzles from public sources
- Daily sync configured for free puzzle sources
- Proper attribution for all imported puzzles

---

### Phase 3: Publishing & Organization (Weeks 5-6)
**Goal**: Organize and schedule imported puzzles

**Deliverables**:
- [ ] Publishing calendar with drag-and-drop
- [ ] Puzzle collections by theme
- [ ] Automated scheduling system
- [ ] Difficulty calibration based on imports

**Success Criteria**:
- 500+ puzzles in archive
- 60+ days scheduled ahead
- 5+ themed collections created
- Difficulty distribution balanced

---

### Phase 4: Community & Polish (Weeks 7-8)
**Goal**: Enable community contributions and refine system

**Deliverables**:
- [ ] Web puzzle constructor
- [ ] Submission and review workflow
- [ ] Puzzle analytics dashboard
- [ ] User feedback/reporting system

**Success Criteria**:
- Community creator tools live
- 10+ user submissions received
- Analytics tracking all metrics
- <5% user complaints about content

---

## Success Criteria

### Content Metrics (30 Days Post-Launch)
- [ ] Archive contains 500+ puzzles (primarily imported)
- [ ] Daily puzzle scheduled 60+ days ahead
- [ ] Difficulty distribution: 30-35% each level
- [ ] Theme variety: 10+ different themes
- [ ] Average puzzle rating: >4.0/5.0
- [ ] Puzzle sources documented with attribution

### Engagement Metrics
- [ ] Archive browse rate: >50% of users
- [ ] Average puzzles per user: 10+ per month
- [ ] User complaint "not enough content": <5%
- [ ] Daily active users increase: >30%
- [ ] Return rate improvement: >20%
- [ ] Repeat puzzle plays: <10% (enough variety)

### Operational Metrics
- [ ] Import success rate: >95%
- [ ] Source integration uptime: >99%
- [ ] Daily sync reliability: 100%
- [ ] Validation false positive rate: <5%
- [ ] Review-to-publish time: <48 hours

---

## Risk Assessment

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM generates invalid puzzles | High | Medium | Multi-stage validation, human review |
| Import formats incompatible | Medium | Low | Extensive format testing, fallback parsers |
| Third-party API rate limits | Low | Medium | Caching, distributed sync, backup sources |
| Database performance degradation | High | Low | Proper indexing, query optimization, caching |

### Content Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low-quality AI puzzles | High | Medium | Validation, human review, user ratings |
| Community spam/offensive content | Medium | Medium | Moderation queue, reputation system, reporting |
| Copyright violations | High | Low | Attribution tracking, DMCA process, legal review |
| Difficulty inconsistency | Medium | High | Calibration system, user feedback, reclassification |

---

## Future Enhancements (Post-Phase 4)

### Advanced Generation
- Multi-language puzzles (Spanish, French, etc.)
- Cryptic crossword support
- Collaborative puzzle construction
- AI clue quality improvement

### Social Features
- Creator profiles and following
- Puzzle commenting and discussion
- Community voting on submissions
- Featured creator of the month

### Monetization
- Premium puzzle packs
- Creator revenue sharing
- Sponsored themed collections
- Enterprise licensing

---

## Appendix

### A. File Format Specifications

**.puz Format**: Binary format specification at https://code.google.com/archive/p/puz/wikis/FileFormat.wiki
**.json Format**: Internal crossword JSON schema (see PRD.md Appendix A)
**.ipuz Format**: Open standard at https://www.ipuz.org/
**.xml Format**: XWordInfo XML specification at https://www.xwordinfo.com/

**Format Parsers**:
- **Go**: github.com/bbeck/puzzles (supports .puz)
- **Python**: puzpy library (supports .puz, .ipuz)
- **JavaScript**: @confuzzle/puz-crossword parser

### B. Public Puzzle Sources Reference

**Free Daily Puzzles**:
- Universal Crossword: https://www.universaluclick.com/puzzles
- Newsday: https://www.newsday.com/puzzles-games
- LA Times: https://www.latimes.com/games/daily-crossword
- Wall Street Journal: https://www.wsj.com/puzzles/crossword (free archive)
- Crossword Hobbyist: https://crosswordhobbyist.com/

**Archives & Databases**:
- Internet Archive: Crossword puzzle collections
- Project Gutenberg: Public domain puzzle books
- XWord Info: https://www.xwordinfo.com/ (NYT archive metadata)
- Crossword Nexus: https://crosswordnexus.com/

**Constructor Resources**:
- Crossword tracking: https://www.xwordinfo.com/
- Community: https://www.reddit.com/r/crossword/
- Fiend blog: https://crosswordfiend.com/

### C. API Endpoints

```
POST   /api/admin/puzzles/import            - Import single file
POST   /api/admin/puzzles/import/batch      - Import multiple files
GET    /api/admin/puzzles/import/status/:id - Check import job status
GET    /api/admin/puzzles/pending           - Get pending submissions
PUT    /api/admin/puzzles/:id/approve       - Approve submission
PUT    /api/admin/puzzles/:id/reject        - Reject submission
GET    /api/admin/puzzles/sources           - List configured sources
POST   /api/admin/puzzles/sources/sync      - Trigger source sync
GET    /api/admin/analytics/overview        - Get analytics dashboard
GET    /api/admin/calendar                  - Get publishing calendar
PUT    /api/admin/calendar/:date            - Schedule puzzle
POST   /api/puzzles/submit                  - Submit user puzzle
POST   /api/puzzles/:id/report              - Report puzzle issue
GET    /api/collections                     - List collections
GET    /api/collections/:id                 - Get collection details
POST   /api/collections                     - Create collection
PUT    /api/collections/:id                 - Update collection
```

### D. Import Priority Matrix

**Priority 1 - Immediate (Week 1-2)**:
- [ ] Universal Crossword (free syndicated puzzles)
- [ ] LA Times archive (licensing)
- [ ] Newsday puzzles (free)
- [ ] User submissions via .puz upload

**Priority 2 - Short-term (Week 3-4)**:
- [ ] Crossword Nexus community puzzles
- [ ] Internet Archive public domain collections
- [ ] Reddit /r/crossword community puzzles
- [ ] Wall Street Journal free archive

**Priority 3 - Long-term (Week 5-8)**:
- [ ] Guardian Crosswords (UK style)
- [ ] Local newspaper licensing deals
- [ ] Constructor direct partnerships
- [ ] Vintage puzzle book scanning/OCR

**Legal & Attribution Checklist**:
- [ ] Terms of service reviewed for each source
- [ ] Attribution template created
- [ ] Copyright information tracked per puzzle
- [ ] DMCA takedown process documented
- [ ] Licensing agreements filed
- [ ] Creator payment system (if applicable)

---

**End of Document**
