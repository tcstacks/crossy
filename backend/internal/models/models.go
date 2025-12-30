package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	Password    string    `json:"-"`
	IsGuest     bool      `json:"isGuest"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// UserStats represents user statistics
type UserStats struct {
	UserID           string  `json:"userId"`
	PuzzlesSolved    int     `json:"puzzlesSolved"`
	AvgSolveTime     float64 `json:"avgSolveTime"` // seconds
	StreakCurrent    int     `json:"streakCurrent"`
	StreakBest       int     `json:"streakBest"`
	MultiplayerWins  int     `json:"multiplayerWins"`
	TotalPlayTime    int     `json:"totalPlayTime"` // seconds
	LastPlayedAt     *time.Time `json:"lastPlayedAt,omitempty"`
}

// UserWithStats combines user and stats
type UserWithStats struct {
	User  User      `json:"user"`
	Stats UserStats `json:"stats"`
}

// Difficulty levels for puzzles
type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
)

// Puzzle represents a crossword puzzle
type Puzzle struct {
	ID           string       `json:"id"`
	Date         *string      `json:"date,omitempty"` // YYYY-MM-DD, null for archive-only
	Title        string       `json:"title"`
	Author       string       `json:"author"`
	Difficulty   Difficulty   `json:"difficulty"`
	GridWidth    int          `json:"gridWidth"`
	GridHeight   int          `json:"gridHeight"`
	Grid         [][]GridCell `json:"grid"`
	CluesAcross  []Clue       `json:"cluesAcross"`
	CluesDown    []Clue       `json:"cluesDown"`
	Theme        *string      `json:"theme,omitempty"`
	AvgSolveTime *int         `json:"avgSolveTime,omitempty"` // seconds, populated after release
	CreatedAt    time.Time    `json:"createdAt"`
	PublishedAt  *time.Time   `json:"publishedAt,omitempty"`
	Status       string       `json:"status"` // draft, approved, published
}

// GridCell represents a single cell in the puzzle grid
type GridCell struct {
	Letter    *string `json:"letter"`           // null = black square
	Number    *int    `json:"number,omitempty"` // clue number if start of word
	IsCircled bool    `json:"isCircled,omitempty"`
	Rebus     *string `json:"rebus,omitempty"` // for rebus puzzles
}

// Clue represents a single clue
type Clue struct {
	Number     int    `json:"number"`
	Text       string `json:"text"`
	Answer     string `json:"answer"`
	PositionX  int    `json:"positionX"` // starting cell column
	PositionY  int    `json:"positionY"` // starting cell row
	Length     int    `json:"length"`
	Direction  string `json:"direction"` // "across" or "down"
}

// RoomMode represents the type of multiplayer room
type RoomMode string

const (
	RoomModeCollaborative RoomMode = "collaborative"
	RoomModeRace          RoomMode = "race"
	RoomModeRelay         RoomMode = "relay"
)

// RoomState represents the state of a room
type RoomState string

const (
	RoomStateLobby     RoomState = "lobby"
	RoomStateActive    RoomState = "active"
	RoomStateCompleted RoomState = "completed"
)

// RoomConfig holds room configuration options
type RoomConfig struct {
	MaxPlayers    int    `json:"maxPlayers"`
	IsPublic      bool   `json:"isPublic"`
	SpectatorMode bool   `json:"spectatorMode"`
	TimerMode     string `json:"timerMode"` // "none", "countdown", "stopwatch"
	TimerSeconds  int    `json:"timerSeconds,omitempty"`
	HintsEnabled  bool   `json:"hintsEnabled"`
}

// Room represents a multiplayer room
type Room struct {
	ID        string     `json:"id"`
	Code      string     `json:"code"` // 6-char alphanumeric
	HostID    string     `json:"hostId"`
	PuzzleID  string     `json:"puzzleId"`
	Mode      RoomMode   `json:"mode"`
	Config    RoomConfig `json:"config"`
	State     RoomState  `json:"state"`
	CreatedAt time.Time  `json:"createdAt"`
	StartedAt *time.Time `json:"startedAt,omitempty"`
	EndedAt   *time.Time `json:"endedAt,omitempty"`
}

// Player represents a player in a room
type Player struct {
	UserID         string  `json:"userId"`
	RoomID         string  `json:"roomId"`
	DisplayName    string  `json:"displayName"`
	CursorX        *int    `json:"cursorX,omitempty"`
	CursorY        *int    `json:"cursorY,omitempty"`
	IsSpectator    bool    `json:"isSpectator"`
	IsConnected    bool    `json:"isConnected"`
	Contribution   float64 `json:"contribution"` // % of correct cells
	Color          string  `json:"color"`        // cursor/highlight color
	JoinedAt       time.Time `json:"joinedAt"`
}

// Cell represents the state of a single cell in a game
type Cell struct {
	Value        *string `json:"value"`
	IsRevealed   bool    `json:"isRevealed"`
	IsCorrect    *bool   `json:"isCorrect,omitempty"`
	LastEditedBy *string `json:"lastEditedBy,omitempty"`
}

// GridState represents the current state of the puzzle grid in a room
type GridState struct {
	RoomID        string     `json:"roomId"`
	Cells         [][]Cell   `json:"cells"`
	CompletedClues []string  `json:"completedClues"`
	LastUpdated   time.Time  `json:"lastUpdated"`
}

// Message represents a chat message in a room
type Message struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId"`
	UserID    string    `json:"userId"`
	DisplayName string  `json:"displayName"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"createdAt"`
}

// Reaction represents an emoji reaction on a clue
type Reaction struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId"`
	UserID    string    `json:"useriId"`
	ClueID    string    `json:"clueId"` // format: "across-1" or "down-5"
	Emoji     string    `json:"emoji"`
	CreatedAt time.Time `json:"createdAt"`
}

// PuzzleHistory represents a user's puzzle solve history
type PuzzleHistory struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	PuzzleID     string    `json:"puzzleId"`
	RoomID       *string   `json:"roomId,omitempty"`
	SolveTime    int       `json:"solveTime"` // seconds
	Completed    bool      `json:"completed"`
	Accuracy     float64   `json:"accuracy"` // percentage
	HintsUsed    int       `json:"hintsUsed"`
	CompletedAt  *time.Time `json:"completedAt,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// RoomWithDetails includes room, players, and grid state
type RoomWithDetails struct {
	Room      Room      `json:"room"`
	Players   []Player  `json:"players"`
	GridState *GridState `json:"gridState,omitempty"`
	Puzzle    *Puzzle   `json:"puzzle,omitempty"`
}
