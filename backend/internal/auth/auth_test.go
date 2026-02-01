package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestNewAuthService(t *testing.T) {
	secret := "test-secret-key"
	service := NewAuthService(secret)

	if service == nil {
		t.Fatal("expected non-nil AuthService")
	}
	if string(service.jwtSecret) != secret {
		t.Errorf("expected secret %q, got %q", secret, string(service.jwtSecret))
	}
	if service.tokenDuration != 24*time.Hour {
		t.Errorf("expected token duration 24h, got %v", service.tokenDuration)
	}
}

func TestHashPassword(t *testing.T) {
	service := NewAuthService("test-secret")

	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "securePassword123!",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  false, // bcrypt accepts empty passwords
		},
		{
			name:     "long password",
			password: strings.Repeat("a", 72), // bcrypt max is 72 bytes
			wantErr:  false,
		},
		{
			name:     "password with special characters",
			password: "p@$$w0rd!#%&*()[]{}",
			wantErr:  false,
		},
		{
			name:     "unicode password",
			password: "password123",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := service.HashPassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("HashPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && hash == "" {
				t.Error("expected non-empty hash")
			}
			// Hash should be different from password
			if hash == tt.password {
				t.Error("hash should not equal plaintext password")
			}
		})
	}
}

func TestHashPassword_ProducesDifferentHashes(t *testing.T) {
	service := NewAuthService("test-secret")
	password := "samePassword123"

	hash1, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("first hash failed: %v", err)
	}

	hash2, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("second hash failed: %v", err)
	}

	if hash1 == hash2 {
		t.Error("same password should produce different hashes (bcrypt uses random salt)")
	}
}

func TestCheckPassword(t *testing.T) {
	service := NewAuthService("test-secret")

	// Create a known hash for testing
	password := "correctPassword123"
	hash, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	tests := []struct {
		name     string
		password string
		hash     string
		want     bool
	}{
		{
			name:     "correct password",
			password: password,
			hash:     hash,
			want:     true,
		},
		{
			name:     "incorrect password",
			password: "wrongPassword",
			hash:     hash,
			want:     false,
		},
		{
			name:     "empty password against valid hash",
			password: "",
			hash:     hash,
			want:     false,
		},
		{
			name:     "password against empty hash",
			password: password,
			hash:     "",
			want:     false,
		},
		{
			name:     "password against malformed hash",
			password: password,
			hash:     "not-a-valid-bcrypt-hash",
			want:     false,
		},
		{
			name:     "case sensitive check",
			password: "CorrectPassword123", // different case
			hash:     hash,
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.CheckPassword(tt.password, tt.hash)
			if result != tt.want {
				t.Errorf("CheckPassword() = %v, want %v", result, tt.want)
			}
		})
	}
}

func TestGenerateToken(t *testing.T) {
	service := NewAuthService("test-secret-key")

	tests := []struct {
		name        string
		userID      string
		email       string
		displayName string
		isGuest     bool
	}{
		{
			name:        "regular user",
			userID:      "user-123",
			email:       "test@example.com",
			displayName: "Test User",
			isGuest:     false,
		},
		{
			name:        "guest user",
			userID:      "guest-456",
			email:       "guest_456@crossplay.local",
			displayName: "Guest_456",
			isGuest:     true,
		},
		{
			name:        "empty display name",
			userID:      "user-789",
			email:       "empty@example.com",
			displayName: "",
			isGuest:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := service.GenerateToken(tt.userID, tt.email, tt.displayName, tt.isGuest)
			if err != nil {
				t.Fatalf("GenerateToken() error = %v", err)
			}
			if token == "" {
				t.Fatal("expected non-empty token")
			}

			// Validate the token contains correct claims
			claims, err := service.ValidateToken(token)
			if err != nil {
				t.Fatalf("failed to validate generated token: %v", err)
			}

			if claims.UserID != tt.userID {
				t.Errorf("UserID = %q, want %q", claims.UserID, tt.userID)
			}
			if claims.Email != tt.email {
				t.Errorf("Email = %q, want %q", claims.Email, tt.email)
			}
			if claims.DisplayName != tt.displayName {
				t.Errorf("DisplayName = %q, want %q", claims.DisplayName, tt.displayName)
			}
			if claims.IsGuest != tt.isGuest {
				t.Errorf("IsGuest = %v, want %v", claims.IsGuest, tt.isGuest)
			}
			if claims.Issuer != "crossplay" {
				t.Errorf("Issuer = %q, want %q", claims.Issuer, "crossplay")
			}
		})
	}
}

func TestGenerateToken_Expiration(t *testing.T) {
	service := NewAuthService("test-secret-key")

	before := time.Now().Truncate(time.Second)
	token, err := service.GenerateToken("user-123", "test@example.com", "Test", false)
	after := time.Now().Add(time.Second).Truncate(time.Second)

	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := service.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}

	// Check expiration is approximately 24 hours from now (JWT truncates to seconds)
	actualExpiry := claims.ExpiresAt.Time
	minExpiry := before.Add(24 * time.Hour)
	maxExpiry := after.Add(24 * time.Hour)

	if actualExpiry.Before(minExpiry) || actualExpiry.After(maxExpiry) {
		t.Errorf("token expiry = %v, expected between %v and %v", actualExpiry, minExpiry, maxExpiry)
	}

	// Check IssuedAt is set correctly (JWT truncates to seconds)
	if claims.IssuedAt.Time.Before(before) || claims.IssuedAt.Time.After(after) {
		t.Errorf("token IssuedAt = %v, expected between %v and %v", claims.IssuedAt.Time, before, after)
	}
}

func TestValidateToken(t *testing.T) {
	service := NewAuthService("test-secret-key")

	// Generate a valid token for testing
	validToken, _ := service.GenerateToken("user-123", "test@example.com", "Test User", false)

	tests := []struct {
		name      string
		token     string
		wantErr   error
		wantClaim string // UserID to verify if no error
	}{
		{
			name:      "valid token",
			token:     validToken,
			wantErr:   nil,
			wantClaim: "user-123",
		},
		{
			name:    "empty token",
			token:   "",
			wantErr: ErrInvalidToken,
		},
		{
			name:    "malformed token",
			token:   "not.a.valid.jwt.token",
			wantErr: ErrInvalidToken,
		},
		{
			name:    "random string",
			token:   "randomgarbage123",
			wantErr: ErrInvalidToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := service.ValidateToken(tt.token)

			if tt.wantErr != nil {
				if err != tt.wantErr {
					t.Errorf("ValidateToken() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("ValidateToken() unexpected error = %v", err)
			}
			if claims.UserID != tt.wantClaim {
				t.Errorf("UserID = %q, want %q", claims.UserID, tt.wantClaim)
			}
		})
	}
}

func TestValidateToken_WrongSecret(t *testing.T) {
	service1 := NewAuthService("secret-one")
	service2 := NewAuthService("secret-two")

	// Generate token with service1
	token, err := service1.GenerateToken("user-123", "test@example.com", "Test", false)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	// Try to validate with service2 (different secret)
	_, err = service2.ValidateToken(token)
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken when validating with wrong secret, got %v", err)
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	// Create a service with very short token duration for testing
	service := &AuthService{
		jwtSecret:     []byte("test-secret"),
		tokenDuration: -1 * time.Hour, // Already expired
	}

	token, err := service.GenerateToken("user-123", "test@example.com", "Test", false)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	_, err = service.ValidateToken(token)
	if err != ErrTokenExpired {
		t.Errorf("expected ErrTokenExpired for expired token, got %v", err)
	}
}

func TestValidateToken_WrongSigningMethod(t *testing.T) {
	service := NewAuthService("test-secret")

	// Create a token with a different signing method (none)
	claims := &Claims{
		UserID:      "user-123",
		Email:       "test@example.com",
		DisplayName: "Test",
		IsGuest:     false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "crossplay",
		},
	}

	// Sign with RS256 instead of HS256 (will fail validation)
	token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	tokenString, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)

	_, err := service.ValidateToken(tokenString)
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken for wrong signing method, got %v", err)
	}
}

func TestRefreshToken(t *testing.T) {
	service := NewAuthService("test-secret-key")

	// Generate original token
	originalToken, err := service.GenerateToken("user-123", "test@example.com", "Test User", true)
	if err != nil {
		t.Fatalf("failed to generate original token: %v", err)
	}

	// Get claims from original token
	originalClaims, err := service.ValidateToken(originalToken)
	if err != nil {
		t.Fatalf("failed to validate original token: %v", err)
	}

	// Wait for at least 1 second to ensure different IssuedAt (JWT uses second precision)
	time.Sleep(1100 * time.Millisecond)

	// Refresh the token
	refreshedToken, err := service.RefreshToken(originalClaims)
	if err != nil {
		t.Fatalf("RefreshToken() error = %v", err)
	}

	// Validate refreshed token
	refreshedClaims, err := service.ValidateToken(refreshedToken)
	if err != nil {
		t.Fatalf("failed to validate refreshed token: %v", err)
	}

	// Check that claims are preserved
	if refreshedClaims.UserID != originalClaims.UserID {
		t.Errorf("UserID not preserved: got %q, want %q", refreshedClaims.UserID, originalClaims.UserID)
	}
	if refreshedClaims.Email != originalClaims.Email {
		t.Errorf("Email not preserved: got %q, want %q", refreshedClaims.Email, originalClaims.Email)
	}
	if refreshedClaims.DisplayName != originalClaims.DisplayName {
		t.Errorf("DisplayName not preserved: got %q, want %q", refreshedClaims.DisplayName, originalClaims.DisplayName)
	}
	if refreshedClaims.IsGuest != originalClaims.IsGuest {
		t.Errorf("IsGuest not preserved: got %v, want %v", refreshedClaims.IsGuest, originalClaims.IsGuest)
	}

	// Check that IssuedAt is later (proving a new token was generated)
	if !refreshedClaims.IssuedAt.Time.After(originalClaims.IssuedAt.Time) {
		t.Error("refreshed token should have later IssuedAt")
	}

	// Check that expiration is extended (24h from new IssuedAt)
	expectedExpiry := refreshedClaims.IssuedAt.Time.Add(24 * time.Hour)
	if !refreshedClaims.ExpiresAt.Time.Equal(expectedExpiry) {
		t.Errorf("refreshed token expiry = %v, expected %v", refreshedClaims.ExpiresAt.Time, expectedExpiry)
	}
}

func TestClaims_Structure(t *testing.T) {
	service := NewAuthService("test-secret")

	token, _ := service.GenerateToken("user-123", "test@example.com", "Display Name", true)
	claims, _ := service.ValidateToken(token)

	// Verify all expected fields are present and correct types
	if claims.UserID == "" {
		t.Error("UserID should not be empty")
	}
	if claims.Email == "" {
		t.Error("Email should not be empty")
	}
	// DisplayName can be empty, just verify the field exists
	_ = claims.DisplayName
	// IsGuest is a bool, verify it's accessible
	if !claims.IsGuest {
		t.Error("IsGuest should be true for this test case")
	}
	// Verify RegisteredClaims
	if claims.ExpiresAt == nil {
		t.Error("ExpiresAt should not be nil")
	}
	if claims.IssuedAt == nil {
		t.Error("IssuedAt should not be nil")
	}
	if claims.Issuer == "" {
		t.Error("Issuer should not be empty")
	}
}
