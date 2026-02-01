package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/auth"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestRequireAuth_ValidToken(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	// Generate a valid token
	token, err := authService.GenerateToken("user-123", "test@example.com", "Test User", false)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	router := gin.New()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		claims := GetAuthUser(c)
		if claims == nil {
			t.Error("expected claims to be set")
		}
		c.JSON(http.StatusOK, gin.H{"userId": claims.UserID})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestRequireAuth_MissingToken(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	router := gin.New()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	router := gin.New()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestRequireAuth_WrongSecret(t *testing.T) {
	// Generate token with different secret
	otherService := auth.NewAuthService("other-secret")
	token, _ := otherService.GenerateToken("user-123", "test@example.com", "Test", false)

	// Validate with different secret
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	router := gin.New()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Token from different secret should be rejected
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestRequireAuth_MalformedAuthHeader(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	router := gin.New()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	tests := []struct {
		name       string
		authHeader string
	}{
		{"no Bearer prefix", "token-without-bearer"},
		{"wrong prefix", "Basic token123"},
		{"only Bearer", "Bearer"},
		{"extra parts", "Bearer token extra"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			req.Header.Set("Authorization", tt.authHeader)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected status 401, got %d", w.Code)
			}
		})
	}
}

func TestOptionalAuth_ValidToken(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	token, _ := authService.GenerateToken("user-123", "test@example.com", "Test User", false)

	router := gin.New()
	router.Use(middleware.OptionalAuth())
	router.GET("/optional", func(c *gin.Context) {
		claims := GetAuthUser(c)
		if claims != nil {
			c.JSON(http.StatusOK, gin.H{"userId": claims.UserID})
		} else {
			c.JSON(http.StatusOK, gin.H{"userId": nil})
		}
	})

	req := httptest.NewRequest(http.MethodGet, "/optional", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestOptionalAuth_NoToken(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	router := gin.New()
	router.Use(middleware.OptionalAuth())
	router.GET("/optional", func(c *gin.Context) {
		claims := GetAuthUser(c)
		if claims == nil {
			c.JSON(http.StatusOK, gin.H{"authenticated": false})
		} else {
			c.JSON(http.StatusOK, gin.H{"authenticated": true})
		}
	})

	req := httptest.NewRequest(http.MethodGet, "/optional", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Should still succeed without token
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestOptionalAuth_InvalidToken(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	router := gin.New()
	router.Use(middleware.OptionalAuth())
	router.GET("/optional", func(c *gin.Context) {
		claims := GetAuthUser(c)
		if claims == nil {
			c.JSON(http.StatusOK, gin.H{"authenticated": false})
		} else {
			c.JSON(http.StatusOK, gin.H{"authenticated": true})
		}
	})

	req := httptest.NewRequest(http.MethodGet, "/optional", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Should still succeed, just without auth
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestCORS_Headers(t *testing.T) {
	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	expectedHeaders := map[string]string{
		"Access-Control-Allow-Origin":      "*",
		"Access-Control-Allow-Methods":     "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers":     "Origin, Content-Type, Authorization",
		"Access-Control-Allow-Credentials": "true",
	}

	for header, expected := range expectedHeaders {
		actual := w.Header().Get(header)
		if actual != expected {
			t.Errorf("header %s = %q, want %q", header, actual, expected)
		}
	}
}

func TestCORS_Preflight(t *testing.T) {
	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204 for OPTIONS, got %d", w.Code)
	}
}

func TestPerformanceMonitor_RecordsMetrics(t *testing.T) {
	// Reset global metrics for this test
	globalMetrics = &PerformanceMetrics{
		endpointMetrics: make(map[string]*EndpointMetrics),
	}

	router := gin.New()
	router.Use(PerformanceMonitor())
	router.GET("/api/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	// Check that response time header is set
	responseTime := w.Header().Get("X-Response-Time")
	if responseTime == "" {
		t.Error("expected X-Response-Time header to be set")
	}
}

func TestPerformanceMonitor_SkipsHealthCheck(t *testing.T) {
	globalMetrics = &PerformanceMetrics{
		endpointMetrics: make(map[string]*EndpointMetrics),
	}

	router := gin.New()
	router.Use(PerformanceMonitor())
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	metrics := GetMetrics()
	endpoints := metrics["endpoints"].(map[string]interface{})

	if _, exists := endpoints["/health"]; exists {
		t.Error("health endpoint should not be recorded in metrics")
	}
}

func TestPerformanceMonitor_SkipsWebSocket(t *testing.T) {
	globalMetrics = &PerformanceMetrics{
		endpointMetrics: make(map[string]*EndpointMetrics),
	}

	router := gin.New()
	router.Use(PerformanceMonitor())
	router.GET("/api/rooms/:code/ws", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ws endpoint"})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/rooms/ABC123/ws", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	metrics := GetMetrics()
	endpoints := metrics["endpoints"].(map[string]interface{})

	if _, exists := endpoints["/api/rooms/:code/ws"]; exists {
		t.Error("WebSocket endpoint should not be recorded in metrics")
	}
}

func TestGetMetrics(t *testing.T) {
	globalMetrics = &PerformanceMetrics{
		endpointMetrics: make(map[string]*EndpointMetrics),
	}

	// Record some test metrics
	globalMetrics.recordRequest("/api/test", 100*time.Millisecond)
	globalMetrics.recordRequest("/api/test", 200*time.Millisecond)
	globalMetrics.recordRequest("/api/other", 50*time.Millisecond)

	metrics := GetMetrics()

	if metrics["total_requests"].(int64) != 3 {
		t.Errorf("expected 3 total requests, got %d", metrics["total_requests"])
	}

	endpoints := metrics["endpoints"].(map[string]interface{})

	testEndpoint := endpoints["/api/test"].(map[string]interface{})
	if testEndpoint["count"].(int64) != 2 {
		t.Errorf("expected 2 requests to /api/test, got %d", testEndpoint["count"])
	}

	otherEndpoint := endpoints["/api/other"].(map[string]interface{})
	if otherEndpoint["count"].(int64) != 1 {
		t.Errorf("expected 1 request to /api/other, got %d", otherEndpoint["count"])
	}
}

func TestExtractToken(t *testing.T) {
	tests := []struct {
		name       string
		authHeader string
		want       string
	}{
		{"valid Bearer token", "Bearer abc123", "abc123"},
		{"valid bearer lowercase", "bearer abc123", "abc123"},
		{"no header", "", ""},
		{"only Bearer", "Bearer", ""},
		{"wrong scheme", "Basic abc123", ""},
		{"no space", "Bearerabc123", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.authHeader != "" {
				c.Request.Header.Set("Authorization", tt.authHeader)
			}

			got := extractToken(c)
			if got != tt.want {
				t.Errorf("extractToken() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGetAuthUser_NoUser(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())

	claims := GetAuthUser(c)
	if claims != nil {
		t.Error("expected nil when no auth user is set")
	}
}

func TestGetAuthUser_WithUser(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())

	expectedClaims := &auth.Claims{
		UserID:      "user-123",
		Email:       "test@example.com",
		DisplayName: "Test User",
		IsGuest:     false,
	}

	c.Set(AuthUserKey, expectedClaims)

	claims := GetAuthUser(c)
	if claims == nil {
		t.Fatal("expected claims to be returned")
	}

	if claims.UserID != expectedClaims.UserID {
		t.Errorf("UserID = %q, want %q", claims.UserID, expectedClaims.UserID)
	}
}

func TestNewAuthMiddleware(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	if middleware == nil {
		t.Fatal("expected non-nil middleware")
	}
	if middleware.authService != authService {
		t.Error("authService not set correctly")
	}
}

func TestRequireAuth_GuestUser(t *testing.T) {
	authService := auth.NewAuthService("test-secret")
	middleware := NewAuthMiddleware(authService)

	// Generate a guest token
	token, err := authService.GenerateToken("guest-123", "guest@crossplay.local", "Guest_123", true)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	router := gin.New()
	router.Use(middleware.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		claims := GetAuthUser(c)
		if claims == nil {
			t.Error("expected claims to be set")
			return
		}
		if !claims.IsGuest {
			t.Error("expected IsGuest to be true")
		}
		c.JSON(http.StatusOK, gin.H{"userId": claims.UserID, "isGuest": claims.IsGuest})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestPerformanceMetrics_MinMaxTracking(t *testing.T) {
	globalMetrics = &PerformanceMetrics{
		endpointMetrics: make(map[string]*EndpointMetrics),
	}

	// Record metrics with different durations
	globalMetrics.recordRequest("/api/test", 50*time.Millisecond)
	globalMetrics.recordRequest("/api/test", 100*time.Millisecond)
	globalMetrics.recordRequest("/api/test", 200*time.Millisecond)

	metrics := GetMetrics()
	endpoints := metrics["endpoints"].(map[string]interface{})
	testEndpoint := endpoints["/api/test"].(map[string]interface{})

	if testEndpoint["min_ms"].(int64) != 50 {
		t.Errorf("expected min_ms 50, got %d", testEndpoint["min_ms"])
	}
	if testEndpoint["max_ms"].(int64) != 200 {
		t.Errorf("expected max_ms 200, got %d", testEndpoint["max_ms"])
	}
}

func TestPerformanceMetrics_AverageCalculation(t *testing.T) {
	globalMetrics = &PerformanceMetrics{
		endpointMetrics: make(map[string]*EndpointMetrics),
	}

	// Record 3 requests: 100ms, 200ms, 300ms -> avg should be 200ms
	globalMetrics.recordRequest("/api/test", 100*time.Millisecond)
	globalMetrics.recordRequest("/api/test", 200*time.Millisecond)
	globalMetrics.recordRequest("/api/test", 300*time.Millisecond)

	metrics := GetMetrics()
	endpoints := metrics["endpoints"].(map[string]interface{})
	testEndpoint := endpoints["/api/test"].(map[string]interface{})

	if testEndpoint["avg_ms"].(int64) != 200 {
		t.Errorf("expected avg_ms 200, got %d", testEndpoint["avg_ms"])
	}
}
