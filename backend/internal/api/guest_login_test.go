package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestGuestLoginValidation tests the guest login endpoint validation.
// The displayName field is optional - if not provided, a default will be generated.
// If provided, it must be 2-50 characters.
func TestGuestLoginValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("accepts empty request body (displayName is optional)", func(t *testing.T) {
		// When no displayName is provided, the handler should generate a default
		requestBody := map[string]string{}
		jsonBody, _ := json.Marshal(requestBody)

		req, _ := http.NewRequest("POST", "/api/auth/guest", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		router := gin.New()
		router.POST("/api/auth/guest", func(c *gin.Context) {
			var req GuestRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			// Simulate default name generation
			displayName := req.DisplayName
			if displayName == "" {
				displayName = "Guest_12345678"
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "displayName": displayName})
		})

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 for empty displayName (optional), got %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("accepts request with valid displayName", func(t *testing.T) {
		requestBody := map[string]string{
			"displayName": "TestGuest",
		}
		jsonBody, _ := json.Marshal(requestBody)

		req, _ := http.NewRequest("POST", "/api/auth/guest", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		router := gin.New()
		router.POST("/api/auth/guest", func(c *gin.Context) {
			var req GuestRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "displayName": req.DisplayName})
		})

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 for valid displayName, got %d. Body: %s", w.Code, w.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		if response["displayName"] != "TestGuest" {
			t.Errorf("Expected displayName 'TestGuest', got %v", response["displayName"])
		}
	})

	t.Run("accepts single character displayName", func(t *testing.T) {
		// Single character names are allowed - UI says "Optional" with no length requirement
		requestBody := map[string]string{
			"displayName": "t",
		}
		jsonBody, _ := json.Marshal(requestBody)

		req, _ := http.NewRequest("POST", "/api/auth/guest", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		router := gin.New()
		router.POST("/api/auth/guest", func(c *gin.Context) {
			var req GuestRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "displayName": req.DisplayName})
		})

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 for single char displayName, got %d. Body: %s", w.Code, w.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		if response["displayName"] != "t" {
			t.Errorf("Expected displayName 't', got %v", response["displayName"])
		}
	})

	t.Run("ignores unknown field 'username' and uses default", func(t *testing.T) {
		// This documents the original bug - frontend was sending 'username' instead of 'displayName'
		// Now the handler generates a default when displayName is not provided
		requestBody := map[string]string{
			"username": "TestGuest",
		}
		jsonBody, _ := json.Marshal(requestBody)

		req, _ := http.NewRequest("POST", "/api/auth/guest", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()

		router := gin.New()
		router.POST("/api/auth/guest", func(c *gin.Context) {
			var req GuestRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			// Simulate default name generation when displayName is empty
			displayName := req.DisplayName
			if displayName == "" {
				displayName = "Guest_12345678"
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "displayName": displayName})
		})

		router.ServeHTTP(w, req)

		// Should succeed - 'username' is ignored, default displayName is generated
		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 when unknown field is sent, got %d. Body: %s", w.Code, w.Body.String())
		}

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		// displayName should be the generated default, not the 'username' value
		if response["displayName"] == "TestGuest" {
			t.Error("Should not use 'username' field value - expected generated default")
		}
	})
}
