package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/crossplay/backend/internal/api"
	"github.com/crossplay/backend/internal/auth"
	"github.com/crossplay/backend/internal/db"
	"github.com/crossplay/backend/internal/middleware"
	"github.com/crossplay/backend/internal/puzzle"
	"github.com/crossplay/backend/internal/realtime"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Get configuration
	port := getEnv("PORT", "8080")
	postgresURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/crossplay?sslmode=disable")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379")
	jwtSecret := getEnv("JWT_SECRET", "your-secret-key-change-in-production")

	// Initialize database
	database, err := db.New(postgresURL, redisURL)
	if err != nil {
		log.Printf("Warning: Database connection failed: %v", err)
		log.Println("Running in demo mode without database...")
		database = nil
	} else {
		// Initialize schema
		if err := database.InitSchema(); err != nil {
			log.Fatalf("Failed to initialize schema: %v", err)
		}
		log.Println("Database connected and schema initialized")

		// Seed sample puzzle if needed
		seedSamplePuzzle(database)
	}

	// Initialize services
	authService := auth.NewAuthService(jwtSecret)
	authMiddleware := middleware.NewAuthMiddleware(authService)

	// Initialize handlers
	var handlers *api.Handlers
	if database != nil {
		handlers = api.NewHandlers(database, authService)
	}

	// Initialize WebSocket hub
	var hub *realtime.Hub
	if database != nil {
		hub = realtime.NewHub(database)
		go hub.Run()
	}

	// Setup Gin router
	router := gin.Default()

	// Apply CORS middleware
	router.Use(middleware.CORS())

	// Apply performance monitoring middleware
	router.Use(middleware.PerformanceMonitor())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().Unix()})
	})

	// Performance metrics endpoint
	router.GET("/metrics", func(c *gin.Context) {
		c.JSON(http.StatusOK, middleware.GetMetrics())
	})

	// API routes
	apiGroup := router.Group("/api")
	{
		// Auth routes
		authGroup := apiGroup.Group("/auth")
		{
			if handlers != nil {
				authGroup.POST("/register", handlers.Register)
				authGroup.POST("/login", handlers.Login)
				authGroup.POST("/guest", handlers.Guest)
			} else {
				authGroup.POST("/register", demoAuthHandler(authService))
				authGroup.POST("/login", demoAuthHandler(authService))
				authGroup.POST("/guest", demoGuestHandler(authService))
			}
		}

		// User routes (protected)
		usersGroup := apiGroup.Group("/users")
		usersGroup.Use(authMiddleware.RequireAuth())
		{
			if handlers != nil {
				usersGroup.GET("/me", handlers.GetMe)
				usersGroup.GET("/me/stats", handlers.GetMyStats)
				usersGroup.GET("/me/history", handlers.GetMyHistory)
				usersGroup.POST("/me/history", handlers.SavePuzzleHistory)
			} else {
				usersGroup.GET("/me", demoUserHandler)
				usersGroup.GET("/me/stats", demoStatsHandler)
				usersGroup.GET("/me/history", demoHistoryHandler)
			}
		}

		// Puzzle routes
		puzzlesGroup := apiGroup.Group("/puzzles")
		{
			if handlers != nil {
				puzzlesGroup.GET("/today", handlers.GetTodayPuzzle)
				puzzlesGroup.GET("/archive", handlers.GetPuzzleArchive)
				puzzlesGroup.GET("/random", handlers.GetRandomPuzzle)
				puzzlesGroup.GET("/:date", handlers.GetPuzzleByDate)
			} else {
				puzzlesGroup.GET("/today", demoPuzzleHandler)
				puzzlesGroup.GET("/archive", demoArchiveHandler)
				puzzlesGroup.GET("/random", demoPuzzleHandler)
				puzzlesGroup.GET("/:date", demoPuzzleHandler)
			}
		}

		// Room routes (protected)
		roomsGroup := apiGroup.Group("/rooms")
		roomsGroup.Use(authMiddleware.RequireAuth())
		{
			if handlers != nil {
				roomsGroup.POST("", handlers.CreateRoom)
				roomsGroup.GET("/:code", handlers.GetRoomByCode)
				roomsGroup.POST("/join", handlers.JoinRoomByCode)
				roomsGroup.POST("/:id/join", handlers.JoinRoom)
				roomsGroup.POST("/:id/start", handlers.StartRoom)
				roomsGroup.DELETE("/:id", handlers.CloseRoom)
			} else {
				roomsGroup.POST("", demoCreateRoomHandler)
				roomsGroup.GET("/:code", demoGetRoomHandler)
				roomsGroup.POST("/join", demoJoinRoomHandler)
				roomsGroup.POST("/:id/join", demoJoinRoomHandler)
				roomsGroup.POST("/:id/start", demoStartRoomHandler)
				roomsGroup.DELETE("/:id", demoCloseRoomHandler)
			}
		}

		// Return JSON instead of HTML for unknown API routes
		apiGroup.NoRoute(func(c *gin.Context) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not Found",
				"message": "API endpoint does not exist",
				"path":    c.Request.URL.Path,
			})
		})

		// Note: Admin puzzle management is handled by the separate admin CLI tool
		// Run: go run ./cmd/admin --help for puzzle generation and management
	}

	// WebSocket endpoint - /api/rooms/:code/ws
	apiGroup.GET("/rooms/:code/ws", func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		roomCode := c.Param("code")
		if roomCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing room code"})
			return
		}

		if hub != nil {
			realtime.ServeWs(hub, c.Writer, c.Request, claims.UserID, claims.DisplayName)
		} else {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "WebSocket not available in demo mode"})
		}
	})

	// Create server
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Server started on port %s", port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	if database != nil {
		database.Close()
	}

	log.Println("Server exited")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func seedSamplePuzzle(database *db.Database) {
	// Check if we have any puzzles
	puzzles, _ := database.GetPuzzleArchive("", 1, 0)
	if len(puzzles) > 0 {
		return
	}

	// Create sample puzzle
	sample := puzzle.SamplePuzzle()
	if err := database.CreatePuzzle(sample); err != nil {
		log.Printf("Failed to seed sample puzzle: %v", err)
	} else {
		log.Println("Sample puzzle seeded")
	}
}

// Demo handlers for when database is not available
func demoAuthHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email       string `json:"email"`
			DisplayName string `json:"displayName"`
		}
		c.ShouldBindJSON(&req)

		userID := "demo-user-123"
		displayName := req.DisplayName
		if displayName == "" {
			displayName = "Demo User"
		}

		token, _ := authService.GenerateToken(userID, req.Email, displayName, false)
		c.JSON(http.StatusOK, gin.H{
			"user": gin.H{
				"id":          userID,
				"email":       req.Email,
				"displayName": displayName,
			},
			"token": token,
		})
	}
}

func demoGuestHandler(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			DisplayName string `json:"displayName"`
		}
		c.ShouldBindJSON(&req)

		displayName := req.DisplayName
		if displayName == "" {
			displayName = "Guest"
		}

		userID := "guest-" + time.Now().Format("20060102150405")
		token, _ := authService.GenerateToken(userID, "", displayName, true)
		c.JSON(http.StatusCreated, gin.H{
			"user": gin.H{
				"id":          userID,
				"displayName": displayName,
				"isGuest":     true,
			},
			"token": token,
		})
	}
}

func demoUserHandler(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	c.JSON(http.StatusOK, gin.H{
		"id":          claims.UserID,
		"email":       claims.Email,
		"displayName": claims.DisplayName,
		"isGuest":     claims.IsGuest,
	})
}

func demoStatsHandler(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	c.JSON(http.StatusOK, gin.H{
		"userId":          claims.UserID,
		"puzzlesSolved":   5,
		"avgSolveTime":    420,
		"streakCurrent":   3,
		"streakBest":      7,
		"multiplayerWins": 2,
	})
}

func demoHistoryHandler(c *gin.Context) {
	c.JSON(http.StatusOK, []gin.H{})
}

func demoPuzzleHandler(c *gin.Context) {
	sample := puzzle.SamplePuzzle()
	// Remove answers
	for i := range sample.CluesAcross {
		sample.CluesAcross[i].Answer = ""
	}
	for i := range sample.CluesDown {
		sample.CluesDown[i].Answer = ""
	}
	c.JSON(http.StatusOK, sample)
}

func demoArchiveHandler(c *gin.Context) {
	c.JSON(http.StatusOK, []interface{}{})
}

func demoCreateRoomHandler(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	roomID := "room-" + time.Now().Format("20060102150405")
	c.JSON(http.StatusCreated, gin.H{
		"room": gin.H{
			"id":       roomID,
			"code":     "ABC123",
			"hostId":   claims.UserID,
			"mode":     "collaborative",
			"state":    "lobby",
			"puzzleId": "demo-puzzle",
		},
		"player": gin.H{
			"userId":      claims.UserID,
			"displayName": claims.DisplayName,
			"color":       "#FF6B6B",
		},
	})
}

func demoGetRoomHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"room": gin.H{
			"id":    "room-demo",
			"code":  c.Param("code"),
			"state": "lobby",
		},
		"players": []gin.H{},
	})
}

func demoJoinRoomHandler(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	c.JSON(http.StatusOK, gin.H{
		"room": gin.H{
			"id":    c.Param("id"),
			"state": "lobby",
		},
		"player": gin.H{
			"userId":      claims.UserID,
			"displayName": claims.DisplayName,
			"color":       "#4ECDC4",
		},
	})
}

func demoStartRoomHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "room started"})
}

func demoCloseRoomHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "room closed"})
}
