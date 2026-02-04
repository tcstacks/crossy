package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/crossplay/backend/internal/models"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

type Database struct {
	DB    *sql.DB
	Redis *redis.Client
}

func New(postgresURL, redisURL string) (*Database, error) {
	db, err := sql.Open("postgres", postgresURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	// Configure connection pool for optimal performance
	db.SetMaxOpenConns(25)                 // Maximum number of open connections
	db.SetMaxIdleConns(10)                 // Maximum number of idle connections
	db.SetConnMaxLifetime(5 * time.Minute) // Maximum lifetime of a connection

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis url: %w", err)
	}

	rdb := redis.NewClient(opt)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	return &Database{DB: db, Redis: rdb}, nil
}

func (d *Database) Close() error {
	if err := d.DB.Close(); err != nil {
		return err
	}
	return d.Redis.Close()
}

// InitSchema creates all database tables
func (d *Database) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(36) PRIMARY KEY,
		email VARCHAR(255) UNIQUE,
		display_name VARCHAR(100) NOT NULL,
		avatar_url TEXT,
		password_hash VARCHAR(255),
		is_guest BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS user_stats (
		user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
		puzzles_solved INTEGER DEFAULT 0,
		avg_solve_time FLOAT DEFAULT 0,
		streak_current INTEGER DEFAULT 0,
		streak_best INTEGER DEFAULT 0,
		multiplayer_wins INTEGER DEFAULT 0,
		total_play_time INTEGER DEFAULT 0,
		last_played_at TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS puzzles (
		id VARCHAR(36) PRIMARY KEY,
		date DATE UNIQUE,
		title VARCHAR(255) NOT NULL,
		author VARCHAR(100) NOT NULL,
		difficulty VARCHAR(20) NOT NULL,
		grid_width INTEGER NOT NULL,
		grid_height INTEGER NOT NULL,
		grid JSONB NOT NULL,
		clues_across JSONB NOT NULL,
		clues_down JSONB NOT NULL,
		theme VARCHAR(255),
		avg_solve_time INTEGER,
		status VARCHAR(20) DEFAULT 'draft',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		published_at TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(date);
	CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty);
	CREATE INDEX IF NOT EXISTS idx_puzzles_status ON puzzles(status);

	CREATE TABLE IF NOT EXISTS rooms (
		id VARCHAR(36) PRIMARY KEY,
		code VARCHAR(6) UNIQUE NOT NULL,
		host_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
		puzzle_id VARCHAR(36) REFERENCES puzzles(id) ON DELETE CASCADE,
		mode VARCHAR(20) NOT NULL,
		config JSONB NOT NULL,
		state VARCHAR(20) DEFAULT 'lobby',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		started_at TIMESTAMP,
		ended_at TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
	CREATE INDEX IF NOT EXISTS idx_rooms_state ON rooms(state);

	CREATE TABLE IF NOT EXISTS players (
		user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
		room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE CASCADE,
		display_name VARCHAR(100) NOT NULL,
		cursor_x INTEGER,
		cursor_y INTEGER,
		is_spectator BOOLEAN DEFAULT FALSE,
		is_connected BOOLEAN DEFAULT TRUE,
		is_ready BOOLEAN DEFAULT FALSE,
		contribution FLOAT DEFAULT 0,
		color VARCHAR(7) NOT NULL,
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, room_id)
	);

	CREATE TABLE IF NOT EXISTS grid_states (
		room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE CASCADE,
		user_id VARCHAR(36) DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
		cells JSONB NOT NULL,
		completed_clues JSONB DEFAULT '[]',
		last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (room_id, user_id)
	);

	CREATE TABLE IF NOT EXISTS relay_states (
		room_id VARCHAR(36) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
		current_player_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
		turn_order JSONB NOT NULL DEFAULT '[]',
		turn_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		turn_time_limit INTEGER DEFAULT 0,
		words_this_turn INTEGER DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS messages (
		id VARCHAR(36) PRIMARY KEY,
		room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE CASCADE,
		user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
		display_name VARCHAR(100) NOT NULL,
		text TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);

	CREATE TABLE IF NOT EXISTS reactions (
		id VARCHAR(36) PRIMARY KEY,
		room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE CASCADE,
		user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
		clue_id VARCHAR(50) NOT NULL,
		emoji VARCHAR(10) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(room_id, user_id, clue_id, emoji)
	);

	CREATE TABLE IF NOT EXISTS puzzle_history (
		id VARCHAR(36) PRIMARY KEY,
		user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
		puzzle_id VARCHAR(36) REFERENCES puzzles(id) ON DELETE CASCADE,
		room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE SET NULL,
		solve_time INTEGER DEFAULT 0,
		completed BOOLEAN DEFAULT FALSE,
		accuracy FLOAT DEFAULT 0,
		hints_used INTEGER DEFAULT 0,
		completed_at TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_puzzle_history_user_id ON puzzle_history(user_id);
	CREATE INDEX IF NOT EXISTS idx_puzzle_history_puzzle_id ON puzzle_history(puzzle_id);
	CREATE INDEX IF NOT EXISTS idx_puzzle_history_completed_at ON puzzle_history(completed_at);
	CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
	CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
	CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	`

	_, err := d.DB.Exec(schema)
	return err
}

// User operations
func (d *Database) CreateUser(user *models.User) error {
	_, err := d.DB.Exec(`
		INSERT INTO users (id, email, display_name, avatar_url, password_hash, is_guest, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, user.ID, user.Email, user.DisplayName, user.AvatarURL, user.Password, user.IsGuest, user.CreatedAt, user.UpdatedAt)

	if err != nil {
		return err
	}

	// Create initial stats
	_, err = d.DB.Exec(`
		INSERT INTO user_stats (user_id) VALUES ($1)
	`, user.ID)

	return err
}

func (d *Database) GetUserByID(id string) (*models.User, error) {
	user := &models.User{}
	err := d.DB.QueryRow(`
		SELECT id, email, display_name, avatar_url, password_hash, is_guest, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.Password, &user.IsGuest, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	return user, err
}

func (d *Database) GetUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := d.DB.QueryRow(`
		SELECT id, email, display_name, avatar_url, password_hash, is_guest, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.Password, &user.IsGuest, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	return user, err
}

func (d *Database) GetUserStats(userID string) (*models.UserStats, error) {
	stats := &models.UserStats{}
	err := d.DB.QueryRow(`
		SELECT user_id, puzzles_solved, avg_solve_time, streak_current, streak_best,
			   multiplayer_wins, total_play_time, last_played_at
		FROM user_stats WHERE user_id = $1
	`, userID).Scan(&stats.UserID, &stats.PuzzlesSolved, &stats.AvgSolveTime, &stats.StreakCurrent,
		&stats.StreakBest, &stats.MultiplayerWins, &stats.TotalPlayTime, &stats.LastPlayedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	return stats, err
}

func (d *Database) UpdateUserStats(stats *models.UserStats) error {
	_, err := d.DB.Exec(`
		UPDATE user_stats SET
			puzzles_solved = $2,
			avg_solve_time = $3,
			streak_current = $4,
			streak_best = $5,
			multiplayer_wins = $6,
			total_play_time = $7,
			last_played_at = $8
		WHERE user_id = $1
	`, stats.UserID, stats.PuzzlesSolved, stats.AvgSolveTime, stats.StreakCurrent,
		stats.StreakBest, stats.MultiplayerWins, stats.TotalPlayTime, stats.LastPlayedAt)
	return err
}

// Puzzle operations
func (d *Database) CreatePuzzle(puzzle *models.Puzzle) error {
	gridJSON, _ := json.Marshal(puzzle.Grid)
	cluesAcrossJSON, _ := json.Marshal(puzzle.CluesAcross)
	cluesDownJSON, _ := json.Marshal(puzzle.CluesDown)

	_, err := d.DB.Exec(`
		INSERT INTO puzzles (id, date, title, author, difficulty, grid_width, grid_height,
							 grid, clues_across, clues_down, theme, avg_solve_time, status, created_at, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, puzzle.ID, puzzle.Date, puzzle.Title, puzzle.Author, puzzle.Difficulty, puzzle.GridWidth, puzzle.GridHeight,
		gridJSON, cluesAcrossJSON, cluesDownJSON, puzzle.Theme, puzzle.AvgSolveTime, puzzle.Status, puzzle.CreatedAt, puzzle.PublishedAt)
	return err
}

func (d *Database) GetPuzzleByID(id string) (*models.Puzzle, error) {
	puzzle := &models.Puzzle{}
	var gridJSON, cluesAcrossJSON, cluesDownJSON []byte

	err := d.DB.QueryRow(`
		SELECT id, date, title, author, difficulty, grid_width, grid_height,
			   grid, clues_across, clues_down, theme, avg_solve_time, status, created_at, published_at
		FROM puzzles WHERE id = $1
	`, id).Scan(&puzzle.ID, &puzzle.Date, &puzzle.Title, &puzzle.Author, &puzzle.Difficulty,
		&puzzle.GridWidth, &puzzle.GridHeight, &gridJSON, &cluesAcrossJSON, &cluesDownJSON,
		&puzzle.Theme, &puzzle.AvgSolveTime, &puzzle.Status, &puzzle.CreatedAt, &puzzle.PublishedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(gridJSON, &puzzle.Grid)
	json.Unmarshal(cluesAcrossJSON, &puzzle.CluesAcross)
	json.Unmarshal(cluesDownJSON, &puzzle.CluesDown)

	return puzzle, nil
}

func (d *Database) GetPuzzleByDate(date string) (*models.Puzzle, error) {
	puzzle := &models.Puzzle{}
	var gridJSON, cluesAcrossJSON, cluesDownJSON []byte

	err := d.DB.QueryRow(`
		SELECT id, date, title, author, difficulty, grid_width, grid_height,
			   grid, clues_across, clues_down, theme, avg_solve_time, status, created_at, published_at
		FROM puzzles WHERE date = $1 AND status = 'published'
	`, date).Scan(&puzzle.ID, &puzzle.Date, &puzzle.Title, &puzzle.Author, &puzzle.Difficulty,
		&puzzle.GridWidth, &puzzle.GridHeight, &gridJSON, &cluesAcrossJSON, &cluesDownJSON,
		&puzzle.Theme, &puzzle.AvgSolveTime, &puzzle.Status, &puzzle.CreatedAt, &puzzle.PublishedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(gridJSON, &puzzle.Grid)
	json.Unmarshal(cluesAcrossJSON, &puzzle.CluesAcross)
	json.Unmarshal(cluesDownJSON, &puzzle.CluesDown)

	return puzzle, nil
}

func (d *Database) GetTodayPuzzle() (*models.Puzzle, error) {
	today := time.Now().Format("2006-01-02")
	return d.GetPuzzleByDate(today)
}

func (d *Database) GetPuzzleArchive(status string, limit, offset int) ([]*models.Puzzle, error) {
	query := `
		SELECT id, date, title, author, difficulty, grid_width, grid_height,
			   grid, clues_across, clues_down, theme, avg_solve_time, status, created_at, published_at
		FROM puzzles WHERE 1=1
	`
	args := []interface{}{}
	argNum := 1

	// Filter by status - empty string means all puzzles, otherwise filter by specific status
	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argNum)
		args = append(args, status)
		argNum++
	}

	query += " ORDER BY created_at DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argNum, argNum+1)
	args = append(args, limit, offset)

	rows, err := d.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var puzzles []*models.Puzzle
	for rows.Next() {
		puzzle := &models.Puzzle{}
		var gridJSON, cluesAcrossJSON, cluesDownJSON []byte

		err := rows.Scan(&puzzle.ID, &puzzle.Date, &puzzle.Title, &puzzle.Author, &puzzle.Difficulty,
			&puzzle.GridWidth, &puzzle.GridHeight, &gridJSON, &cluesAcrossJSON, &cluesDownJSON,
			&puzzle.Theme, &puzzle.AvgSolveTime, &puzzle.Status, &puzzle.CreatedAt, &puzzle.PublishedAt)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(gridJSON, &puzzle.Grid)
		json.Unmarshal(cluesAcrossJSON, &puzzle.CluesAcross)
		json.Unmarshal(cluesDownJSON, &puzzle.CluesDown)

		puzzles = append(puzzles, puzzle)
	}

	return puzzles, nil
}

// GetPuzzleArchiveEnhanced returns puzzles with optional difficulty filter, sorted by published date
func (d *Database) GetPuzzleArchiveEnhanced(difficulty string, limit, offset int) ([]*models.Puzzle, error) {
	query := `
		SELECT id, date, title, author, difficulty, grid_width, grid_height,
			   grid, clues_across, clues_down, theme, avg_solve_time, status, created_at, published_at
		FROM puzzles WHERE status = 'published'
	`
	args := []interface{}{}
	argNum := 1

	// Filter by difficulty if provided
	if difficulty != "" {
		query += fmt.Sprintf(" AND difficulty = $%d", argNum)
		args = append(args, difficulty)
		argNum++
	}

	// Sort by published date (newest first), then by date field
	query += " ORDER BY COALESCE(published_at, created_at) DESC, date DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argNum, argNum+1)
	args = append(args, limit, offset)

	rows, err := d.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var puzzles []*models.Puzzle
	for rows.Next() {
		puzzle := &models.Puzzle{}
		var gridJSON, cluesAcrossJSON, cluesDownJSON []byte

		err := rows.Scan(&puzzle.ID, &puzzle.Date, &puzzle.Title, &puzzle.Author, &puzzle.Difficulty,
			&puzzle.GridWidth, &puzzle.GridHeight, &gridJSON, &cluesAcrossJSON, &cluesDownJSON,
			&puzzle.Theme, &puzzle.AvgSolveTime, &puzzle.Status, &puzzle.CreatedAt, &puzzle.PublishedAt)
		if err != nil {
			return nil, err
		}

		json.Unmarshal(gridJSON, &puzzle.Grid)
		json.Unmarshal(cluesAcrossJSON, &puzzle.CluesAcross)
		json.Unmarshal(cluesDownJSON, &puzzle.CluesDown)

		puzzles = append(puzzles, puzzle)
	}

	return puzzles, nil
}

// GetPuzzleArchiveCount returns the total count of published puzzles with optional difficulty filter
func (d *Database) GetPuzzleArchiveCount(difficulty string) (int, error) {
	query := `SELECT COUNT(*) FROM puzzles WHERE status = 'published'`
	args := []interface{}{}

	if difficulty != "" {
		query += " AND difficulty = $1"
		args = append(args, difficulty)
	}

	var count int
	err := d.DB.QueryRow(query, args...).Scan(&count)
	return count, err
}

// GetUserPuzzleCompletion checks if a user has completed a specific puzzle
func (d *Database) GetUserPuzzleCompletion(userID, puzzleID string) (bool, error) {
	var completed bool
	err := d.DB.QueryRow(`
		SELECT completed FROM puzzle_history
		WHERE user_id = $1 AND puzzle_id = $2 AND completed = true
		LIMIT 1
	`, userID, puzzleID).Scan(&completed)

	if err == sql.ErrNoRows {
		return false, nil
	}
	return completed, err
}

func (d *Database) GetRandomPuzzle(difficulty string) (*models.Puzzle, error) {
	return d.GetRandomPuzzleForUser("", difficulty)
}

// GetRandomPuzzleForUser returns a random puzzle with optional difficulty filter,
// excluding completed puzzles and the last returned puzzle for the user
func (d *Database) GetRandomPuzzleForUser(userID, difficulty string) (*models.Puzzle, error) {
	ctx := context.Background()

	query := `
		SELECT id, date, title, author, difficulty, grid_width, grid_height,
			   grid, clues_across, clues_down, theme, avg_solve_time, status, created_at, published_at
		FROM puzzles WHERE status = 'published'
	`
	args := []interface{}{}
	argNum := 1

	// Exclude completed puzzles for logged-in users
	if userID != "" {
		query += fmt.Sprintf(` AND id NOT IN (
			SELECT puzzle_id FROM puzzle_history
			WHERE user_id = $%d AND completed = true
		)`, argNum)
		args = append(args, userID)
		argNum++
	}

	// Apply difficulty filter
	if difficulty != "" {
		query += fmt.Sprintf(" AND difficulty = $%d", argNum)
		args = append(args, difficulty)
		argNum++
	}

	// Get last returned puzzle from Redis to exclude it
	var lastPuzzleID string
	if userID != "" {
		lastPuzzleID, _ = d.Redis.Get(ctx, "last_random_puzzle:"+userID).Result()
		if lastPuzzleID != "" {
			query += fmt.Sprintf(" AND id != $%d", argNum)
			args = append(args, lastPuzzleID)
		}
	}

	query += " ORDER BY RANDOM() LIMIT 1"

	puzzle := &models.Puzzle{}
	var gridJSON, cluesAcrossJSON, cluesDownJSON []byte

	err := d.DB.QueryRow(query, args...).Scan(&puzzle.ID, &puzzle.Date, &puzzle.Title, &puzzle.Author, &puzzle.Difficulty,
		&puzzle.GridWidth, &puzzle.GridHeight, &gridJSON, &cluesAcrossJSON, &cluesDownJSON,
		&puzzle.Theme, &puzzle.AvgSolveTime, &puzzle.Status, &puzzle.CreatedAt, &puzzle.PublishedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(gridJSON, &puzzle.Grid)
	json.Unmarshal(cluesAcrossJSON, &puzzle.CluesAcross)
	json.Unmarshal(cluesDownJSON, &puzzle.CluesDown)

	// Store this puzzle ID as the last returned for this user (expires in 1 hour)
	if userID != "" {
		d.Redis.Set(ctx, "last_random_puzzle:"+userID, puzzle.ID, time.Hour)
	}

	return puzzle, nil
}

func (d *Database) UpdatePuzzleStatus(id, status string) error {
	query := `UPDATE puzzles SET status = $2`
	if status == "published" {
		query += ", published_at = CURRENT_TIMESTAMP"
	}
	query += " WHERE id = $1"

	_, err := d.DB.Exec(query, id, status)
	return err
}

func (d *Database) UpdatePuzzle(puzzle *models.Puzzle) error {
	gridJSON, _ := json.Marshal(puzzle.Grid)
	cluesAcrossJSON, _ := json.Marshal(puzzle.CluesAcross)
	cluesDownJSON, _ := json.Marshal(puzzle.CluesDown)

	_, err := d.DB.Exec(`
		UPDATE puzzles SET
			date = $2, title = $3, author = $4, difficulty = $5,
			grid_width = $6, grid_height = $7, grid = $8,
			clues_across = $9, clues_down = $10, theme = $11,
			avg_solve_time = $12, status = $13, published_at = $14
		WHERE id = $1
	`, puzzle.ID, puzzle.Date, puzzle.Title, puzzle.Author, puzzle.Difficulty,
		puzzle.GridWidth, puzzle.GridHeight, gridJSON,
		cluesAcrossJSON, cluesDownJSON, puzzle.Theme,
		puzzle.AvgSolveTime, puzzle.Status, puzzle.PublishedAt)
	return err
}

// Room operations
func (d *Database) CreateRoom(room *models.Room) error {
	configJSON, _ := json.Marshal(room.Config)

	_, err := d.DB.Exec(`
		INSERT INTO rooms (id, code, host_id, puzzle_id, mode, config, state, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, room.ID, room.Code, room.HostID, room.PuzzleID, room.Mode, configJSON, room.State, room.CreatedAt)
	return err
}

func (d *Database) GetRoomByID(id string) (*models.Room, error) {
	room := &models.Room{}
	var configJSON []byte

	err := d.DB.QueryRow(`
		SELECT id, code, host_id, puzzle_id, mode, config, state, created_at, started_at, ended_at
		FROM rooms WHERE id = $1
	`, id).Scan(&room.ID, &room.Code, &room.HostID, &room.PuzzleID, &room.Mode, &configJSON,
		&room.State, &room.CreatedAt, &room.StartedAt, &room.EndedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(configJSON, &room.Config)
	return room, nil
}

func (d *Database) GetRoomByCode(code string) (*models.Room, error) {
	room := &models.Room{}
	var configJSON []byte

	err := d.DB.QueryRow(`
		SELECT id, code, host_id, puzzle_id, mode, config, state, created_at, started_at, ended_at
		FROM rooms WHERE code = $1
	`, code).Scan(&room.ID, &room.Code, &room.HostID, &room.PuzzleID, &room.Mode, &configJSON,
		&room.State, &room.CreatedAt, &room.StartedAt, &room.EndedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(configJSON, &room.Config)
	return room, nil
}

func (d *Database) UpdateRoomState(id string, state models.RoomState) error {
	query := `UPDATE rooms SET state = $2`
	if state == models.RoomStateActive {
		query += ", started_at = CURRENT_TIMESTAMP"
	} else if state == models.RoomStateCompleted {
		query += ", ended_at = CURRENT_TIMESTAMP"
	}
	query += " WHERE id = $1"

	_, err := d.DB.Exec(query, id, state)
	return err
}

func (d *Database) DeleteRoom(id string) error {
	_, err := d.DB.Exec(`DELETE FROM rooms WHERE id = $1`, id)
	return err
}

// Player operations
func (d *Database) AddPlayer(player *models.Player) error {
	_, err := d.DB.Exec(`
		INSERT INTO players (user_id, room_id, display_name, cursor_x, cursor_y, is_spectator, is_connected, contribution, color, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, room_id) DO UPDATE SET
			is_connected = EXCLUDED.is_connected,
			display_name = EXCLUDED.display_name
	`, player.UserID, player.RoomID, player.DisplayName, player.CursorX, player.CursorY,
		player.IsSpectator, player.IsConnected, player.Contribution, player.Color, player.JoinedAt)
	return err
}

func (d *Database) GetRoomPlayers(roomID string) ([]models.Player, error) {
	rows, err := d.DB.Query(`
		SELECT user_id, room_id, display_name, cursor_x, cursor_y, is_spectator, is_connected, is_ready, contribution, color, joined_at
		FROM players WHERE room_id = $1
	`, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var player models.Player
		err := rows.Scan(&player.UserID, &player.RoomID, &player.DisplayName, &player.CursorX, &player.CursorY,
			&player.IsSpectator, &player.IsConnected, &player.IsReady, &player.Contribution, &player.Color, &player.JoinedAt)
		if err != nil {
			return nil, err
		}
		players = append(players, player)
	}

	return players, nil
}

func (d *Database) UpdatePlayerConnection(userID, roomID string, connected bool) error {
	_, err := d.DB.Exec(`
		UPDATE players SET is_connected = $3 WHERE user_id = $1 AND room_id = $2
	`, userID, roomID, connected)
	return err
}

func (d *Database) UpdatePlayerCursor(userID, roomID string, x, y int) error {
	_, err := d.DB.Exec(`
		UPDATE players SET cursor_x = $3, cursor_y = $4 WHERE user_id = $1 AND room_id = $2
	`, userID, roomID, x, y)
	return err
}

func (d *Database) UpdatePlayerContribution(userID, roomID string, contribution float64) error {
	_, err := d.DB.Exec(`
		UPDATE players SET contribution = $3 WHERE user_id = $1 AND room_id = $2
	`, userID, roomID, contribution)
	return err
}

func (d *Database) UpdatePlayerReady(userID, roomID string, ready bool) error {
	_, err := d.DB.Exec(`
		UPDATE players SET is_ready = $3 WHERE user_id = $1 AND room_id = $2
	`, userID, roomID, ready)
	return err
}

func (d *Database) RemovePlayer(userID, roomID string) error {
	_, err := d.DB.Exec(`DELETE FROM players WHERE user_id = $1 AND room_id = $2`, userID, roomID)
	return err
}

// Grid state operations
func (d *Database) CreateGridState(gridState *models.GridState) error {
	cellsJSON, _ := json.Marshal(gridState.Cells)
	completedCluesJSON, _ := json.Marshal(gridState.CompletedClues)

	userID := gridState.UserID
	if userID == "" {
		userID = "" // Empty string for collaborative/relay modes
	}

	_, err := d.DB.Exec(`
		INSERT INTO grid_states (room_id, user_id, cells, completed_clues, last_updated)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (room_id, user_id) DO UPDATE SET
			cells = EXCLUDED.cells,
			completed_clues = EXCLUDED.completed_clues,
			last_updated = EXCLUDED.last_updated
	`, gridState.RoomID, userID, cellsJSON, completedCluesJSON, gridState.LastUpdated)
	return err
}

// GetGridState returns the shared grid state for a room (collaborative/relay modes)
func (d *Database) GetGridState(roomID string) (*models.GridState, error) {
	return d.GetPlayerGridState(roomID, "")
}

// GetPlayerGridState returns a player-specific grid state (for Race mode)
func (d *Database) GetPlayerGridState(roomID, userID string) (*models.GridState, error) {
	gridState := &models.GridState{}
	var cellsJSON, completedCluesJSON []byte

	err := d.DB.QueryRow(`
		SELECT room_id, user_id, cells, completed_clues, last_updated
		FROM grid_states WHERE room_id = $1 AND user_id = $2
	`, roomID, userID).Scan(&gridState.RoomID, &gridState.UserID, &cellsJSON, &completedCluesJSON, &gridState.LastUpdated)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(cellsJSON, &gridState.Cells)
	json.Unmarshal(completedCluesJSON, &gridState.CompletedClues)

	return gridState, nil
}

// GetAllPlayerGridStates returns all player grid states for a room (Race mode leaderboard)
func (d *Database) GetAllPlayerGridStates(roomID string) ([]*models.GridState, error) {
	rows, err := d.DB.Query(`
		SELECT room_id, user_id, cells, completed_clues, last_updated
		FROM grid_states WHERE room_id = $1 AND user_id != ''
	`, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var states []*models.GridState
	for rows.Next() {
		gridState := &models.GridState{}
		var cellsJSON, completedCluesJSON []byte
		err := rows.Scan(&gridState.RoomID, &gridState.UserID, &cellsJSON, &completedCluesJSON, &gridState.LastUpdated)
		if err != nil {
			return nil, err
		}
		json.Unmarshal(cellsJSON, &gridState.Cells)
		json.Unmarshal(completedCluesJSON, &gridState.CompletedClues)
		states = append(states, gridState)
	}

	return states, nil
}

func (d *Database) UpdateGridState(gridState *models.GridState) error {
	cellsJSON, _ := json.Marshal(gridState.Cells)
	completedCluesJSON, _ := json.Marshal(gridState.CompletedClues)

	userID := gridState.UserID
	if userID == "" {
		userID = ""
	}

	_, err := d.DB.Exec(`
		UPDATE grid_states SET cells = $3, completed_clues = $4, last_updated = $5
		WHERE room_id = $1 AND user_id = $2
	`, gridState.RoomID, userID, cellsJSON, completedCluesJSON, gridState.LastUpdated)
	return err
}

// Relay state operations
func (d *Database) CreateRelayState(state *models.RelayState) error {
	turnOrderJSON, _ := json.Marshal(state.TurnOrder)

	_, err := d.DB.Exec(`
		INSERT INTO relay_states (room_id, current_player_id, turn_order, turn_started_at, turn_time_limit, words_this_turn)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, state.RoomID, state.CurrentPlayerID, turnOrderJSON, state.TurnStartedAt, state.TurnTimeLimit, state.WordsThisTurn)
	return err
}

func (d *Database) GetRelayState(roomID string) (*models.RelayState, error) {
	state := &models.RelayState{}
	var turnOrderJSON []byte

	err := d.DB.QueryRow(`
		SELECT room_id, current_player_id, turn_order, turn_started_at, turn_time_limit, words_this_turn
		FROM relay_states WHERE room_id = $1
	`, roomID).Scan(&state.RoomID, &state.CurrentPlayerID, &turnOrderJSON, &state.TurnStartedAt, &state.TurnTimeLimit, &state.WordsThisTurn)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(turnOrderJSON, &state.TurnOrder)
	return state, nil
}

func (d *Database) UpdateRelayState(state *models.RelayState) error {
	turnOrderJSON, _ := json.Marshal(state.TurnOrder)

	_, err := d.DB.Exec(`
		UPDATE relay_states SET current_player_id = $2, turn_order = $3, turn_started_at = $4, turn_time_limit = $5, words_this_turn = $6
		WHERE room_id = $1
	`, state.RoomID, state.CurrentPlayerID, turnOrderJSON, state.TurnStartedAt, state.TurnTimeLimit, state.WordsThisTurn)
	return err
}

// Message operations
func (d *Database) CreateMessage(msg *models.Message) error {
	_, err := d.DB.Exec(`
		INSERT INTO messages (id, room_id, user_id, display_name, text, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, msg.ID, msg.RoomID, msg.UserID, msg.DisplayName, msg.Text, msg.CreatedAt)
	return err
}

func (d *Database) GetRoomMessages(roomID string, limit int) ([]models.Message, error) {
	rows, err := d.DB.Query(`
		SELECT id, room_id, user_id, display_name, text, created_at
		FROM messages WHERE room_id = $1
		ORDER BY created_at DESC LIMIT $2
	`, roomID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var msg models.Message
		err := rows.Scan(&msg.ID, &msg.RoomID, &msg.UserID, &msg.DisplayName, &msg.Text, &msg.CreatedAt)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// Puzzle history operations
func (d *Database) CreatePuzzleHistory(history *models.PuzzleHistory) error {
	_, err := d.DB.Exec(`
		INSERT INTO puzzle_history (id, user_id, puzzle_id, room_id, solve_time, completed, accuracy, hints_used, completed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, history.ID, history.UserID, history.PuzzleID, history.RoomID, history.SolveTime,
		history.Completed, history.Accuracy, history.HintsUsed, history.CompletedAt, history.CreatedAt)
	return err
}

func (d *Database) GetUserPuzzleHistory(userID string, limit, offset int) ([]models.PuzzleHistory, error) {
	rows, err := d.DB.Query(`
		SELECT id, user_id, puzzle_id, room_id, solve_time, completed, accuracy, hints_used, completed_at, created_at
		FROM puzzle_history WHERE user_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.PuzzleHistory
	for rows.Next() {
		var h models.PuzzleHistory
		err := rows.Scan(&h.ID, &h.UserID, &h.PuzzleID, &h.RoomID, &h.SolveTime,
			&h.Completed, &h.Accuracy, &h.HintsUsed, &h.CompletedAt, &h.CreatedAt)
		if err != nil {
			return nil, err
		}
		history = append(history, h)
	}

	return history, nil
}

// Redis session operations
func (d *Database) SetSession(ctx context.Context, userID, token string, expiration time.Duration) error {
	return d.Redis.Set(ctx, "session:"+token, userID, expiration).Err()
}

func (d *Database) GetSession(ctx context.Context, token string) (string, error) {
	return d.Redis.Get(ctx, "session:"+token).Result()
}

func (d *Database) DeleteSession(ctx context.Context, token string) error {
	return d.Redis.Del(ctx, "session:"+token).Err()
}

// Reaction operations
func (d *Database) AddOrUpdateReaction(reaction *models.Reaction) error {
	_, err := d.DB.Exec(`
		INSERT INTO reactions (id, room_id, user_id, clue_id, emoji, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (room_id, user_id, clue_id, emoji) DO UPDATE SET
			created_at = EXCLUDED.created_at
	`, reaction.ID, reaction.RoomID, reaction.UserID, reaction.ClueID, reaction.Emoji, reaction.CreatedAt)
	return err
}

func (d *Database) RemoveReaction(roomID, userID, clueID string) error {
	_, err := d.DB.Exec(`
		DELETE FROM reactions WHERE room_id = $1 AND user_id = $2 AND clue_id = $3
	`, roomID, userID, clueID)
	return err
}

func (d *Database) GetRoomReactions(roomID string) ([]models.Reaction, error) {
	rows, err := d.DB.Query(`
		SELECT id, room_id, user_id, clue_id, emoji, created_at
		FROM reactions WHERE room_id = $1
		ORDER BY created_at ASC
	`, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reactions []models.Reaction
	for rows.Next() {
		var r models.Reaction
		err := rows.Scan(&r.ID, &r.RoomID, &r.UserID, &r.ClueID, &r.Emoji, &r.CreatedAt)
		if err != nil {
			return nil, err
		}
		reactions = append(reactions, r)
	}

	return reactions, nil
}

func (d *Database) GetUserReactionForClue(roomID, userID, clueID string) (*models.Reaction, error) {
	reaction := &models.Reaction{}
	err := d.DB.QueryRow(`
		SELECT id, room_id, user_id, clue_id, emoji, created_at
		FROM reactions WHERE room_id = $1 AND user_id = $2 AND clue_id = $3
	`, roomID, userID, clueID).Scan(&reaction.ID, &reaction.RoomID, &reaction.UserID, &reaction.ClueID, &reaction.Emoji, &reaction.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	return reaction, err
}

// Redis room presence operations
func (d *Database) SetRoomPresence(ctx context.Context, roomID, userID string) error {
	return d.Redis.SAdd(ctx, "room:"+roomID+":presence", userID).Err()
}

func (d *Database) RemoveRoomPresence(ctx context.Context, roomID, userID string) error {
	return d.Redis.SRem(ctx, "room:"+roomID+":presence", userID).Err()
}

func (d *Database) GetRoomPresence(ctx context.Context, roomID string) ([]string, error) {
	return d.Redis.SMembers(ctx, "room:"+roomID+":presence").Result()
}
