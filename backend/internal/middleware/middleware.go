package middleware

import (
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/crossplay/backend/internal/auth"
	"github.com/gin-gonic/gin"
)

const (
	AuthUserKey = "authUser"
)

type AuthMiddleware struct {
	authService *auth.AuthService
}

func NewAuthMiddleware(authService *auth.AuthService) *AuthMiddleware {
	return &AuthMiddleware{authService: authService}
}

// RequireAuth is a middleware that requires a valid JWT token
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
			c.Abort()
			return
		}

		claims, err := m.authService.ValidateToken(token)
		if err != nil {
			if err == auth.ErrTokenExpired {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			}
			c.Abort()
			return
		}

		c.Set(AuthUserKey, claims)
		c.Next()
	}
}

// OptionalAuth is a middleware that validates a JWT token if present
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token != "" {
			claims, err := m.authService.ValidateToken(token)
			if err == nil {
				c.Set(AuthUserKey, claims)
			}
		}
		c.Next()
	}
}

// extractToken extracts the JWT token from the Authorization header
func extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}

	return parts[1]
}

// GetAuthUser retrieves the authenticated user from the context
func GetAuthUser(c *gin.Context) *auth.Claims {
	claims, exists := c.Get(AuthUserKey)
	if !exists {
		return nil
	}
	return claims.(*auth.Claims)
}

// CORS middleware
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// PerformanceMetrics holds performance statistics
type PerformanceMetrics struct {
	mu              sync.RWMutex
	requestCount    int64
	totalDuration   time.Duration
	endpointMetrics map[string]*EndpointMetrics
}

// EndpointMetrics holds metrics for a specific endpoint
type EndpointMetrics struct {
	Count        int64
	TotalTime    time.Duration
	MinTime      time.Duration
	MaxTime      time.Duration
	P95Time      time.Duration
	recentTimes  []time.Duration
}

var globalMetrics = &PerformanceMetrics{
	endpointMetrics: make(map[string]*EndpointMetrics),
}

// PerformanceMonitor middleware tracks request performance
func PerformanceMonitor() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		c.Next()

		duration := time.Since(start)

		// Skip health check and WebSocket endpoints from logging
		if path != "/health" && !strings.HasSuffix(path, "/ws") {
			// Log slow requests (>200ms for API, >100ms for WebSocket messages)
			threshold := 200 * time.Millisecond
			if duration > threshold {
				log.Printf("[SLOW] %s %s - %v (status: %d)",
					c.Request.Method, path, duration, c.Writer.Status())
			}

			// Record metrics
			globalMetrics.recordRequest(path, duration)
		}

		// Add performance headers
		c.Header("X-Response-Time", duration.String())
	}
}

// recordRequest records performance metrics for a request
func (pm *PerformanceMetrics) recordRequest(path string, duration time.Duration) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.requestCount++
	pm.totalDuration += duration

	metrics, exists := pm.endpointMetrics[path]
	if !exists {
		metrics = &EndpointMetrics{
			MinTime:     duration,
			MaxTime:     duration,
			recentTimes: make([]time.Duration, 0, 100),
		}
		pm.endpointMetrics[path] = metrics
	}

	metrics.Count++
	metrics.TotalTime += duration

	if duration < metrics.MinTime {
		metrics.MinTime = duration
	}
	if duration > metrics.MaxTime {
		metrics.MaxTime = duration
	}

	// Keep last 100 requests for P95 calculation
	metrics.recentTimes = append(metrics.recentTimes, duration)
	if len(metrics.recentTimes) > 100 {
		metrics.recentTimes = metrics.recentTimes[1:]
	}

	// Calculate P95 from recent times
	if len(metrics.recentTimes) > 0 {
		sorted := make([]time.Duration, len(metrics.recentTimes))
		copy(sorted, metrics.recentTimes)
		// Simple sort for P95 calculation
		for i := 0; i < len(sorted); i++ {
			for j := i + 1; j < len(sorted); j++ {
				if sorted[i] > sorted[j] {
					sorted[i], sorted[j] = sorted[j], sorted[i]
				}
			}
		}
		p95Index := int(float64(len(sorted)) * 0.95)
		if p95Index >= len(sorted) {
			p95Index = len(sorted) - 1
		}
		metrics.P95Time = sorted[p95Index]
	}
}

// GetMetrics returns current performance metrics
func GetMetrics() map[string]interface{} {
	globalMetrics.mu.RLock()
	defer globalMetrics.mu.RUnlock()

	endpoints := make(map[string]interface{})
	for path, metrics := range globalMetrics.endpointMetrics {
		avgTime := time.Duration(0)
		if metrics.Count > 0 {
			avgTime = metrics.TotalTime / time.Duration(metrics.Count)
		}

		endpoints[path] = map[string]interface{}{
			"count":   metrics.Count,
			"avg_ms":  avgTime.Milliseconds(),
			"min_ms":  metrics.MinTime.Milliseconds(),
			"max_ms":  metrics.MaxTime.Milliseconds(),
			"p95_ms":  metrics.P95Time.Milliseconds(),
		}
	}

	avgDuration := time.Duration(0)
	if globalMetrics.requestCount > 0 {
		avgDuration = globalMetrics.totalDuration / time.Duration(globalMetrics.requestCount)
	}

	return map[string]interface{}{
		"total_requests": globalMetrics.requestCount,
		"avg_duration_ms": avgDuration.Milliseconds(),
		"endpoints": endpoints,
	}
}
