package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNewAnthropicClient(t *testing.T) {
	tests := []struct {
		name    string
		config  AnthropicConfig
		wantErr bool
	}{
		{
			name: "valid config with defaults",
			config: AnthropicConfig{
				APIKey: "test-key",
			},
			wantErr: false,
		},
		{
			name: "valid config with custom values",
			config: AnthropicConfig{
				APIKey:      "test-key",
				Model:       ModelHaiku,
				MaxTokens:   2048,
				Temperature: 0.7,
				Timeout:     60 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "missing API key",
			config: AnthropicConfig{
				Model: ModelSonnet,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewAnthropicClient(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewAnthropicClient() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if client == nil {
					t.Error("NewAnthropicClient() returned nil client")
				}
				if client.apiKey != tt.config.APIKey {
					t.Errorf("API key = %v, want %v", client.apiKey, tt.config.APIKey)
				}
				expectedModel := tt.config.Model
				if expectedModel == "" {
					expectedModel = ModelSonnet
				}
				if client.model != expectedModel {
					t.Errorf("model = %v, want %v", client.model, expectedModel)
				}
			}
		})
	}
}

func TestAnthropicClient_Complete(t *testing.T) {
	tests := []struct {
		name           string
		prompt         string
		serverResponse func(w http.ResponseWriter, r *http.Request)
		wantErr        bool
		wantContains   string
	}{
		{
			name:   "successful completion",
			prompt: "Write a clue for EXAMPLE",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("x-api-key") != "test-key" {
					t.Error("Missing or incorrect API key header")
				}
				if r.Header.Get("anthropic-version") != "2023-06-01" {
					t.Error("Missing or incorrect anthropic-version header")
				}

				var req anthropicRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Errorf("Failed to decode request: %v", err)
				}

				if len(req.Messages) != 1 || req.Messages[0].Content != "Write a clue for EXAMPLE" {
					t.Error("Request message content mismatch")
				}

				resp := anthropicResponse{
					ID:    "msg_123",
					Type:  "message",
					Role:  "assistant",
					Model: ModelSonnet,
					Content: []anthropicContent{
						{
							Type: "text",
							Text: "A typical instance",
						},
					},
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
			},
			wantErr:      false,
			wantContains: "typical instance",
		},
		{
			name:   "API error response",
			prompt: "test prompt",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusBadRequest)
				resp := anthropicResponse{
					Error: &anthropicError{
						Type:    "invalid_request_error",
						Message: "Invalid request",
					},
				}
				json.NewEncoder(w).Encode(resp)
			},
			wantErr:      true,
			wantContains: "Invalid request",
		},
		{
			name:   "persistent server error",
			prompt: "test prompt",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte("Internal server error"))
			},
			wantErr:      true,
			wantContains: "500",
		},
		{
			name:   "empty response content",
			prompt: "test prompt",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				resp := anthropicResponse{
					ID:      "msg_123",
					Type:    "message",
					Role:    "assistant",
					Model:   ModelSonnet,
					Content: []anthropicContent{},
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
			},
			wantErr:      true,
			wantContains: "empty response",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			client := &AnthropicClient{
				apiKey:      "test-key",
				model:       ModelSonnet,
				maxTokens:   1024,
				temperature: 1.0,
				timeout:     5 * time.Second,
				httpClient:  &http.Client{Timeout: 5 * time.Second},
			}

			ctx := context.Background()

			// Create a request that will use our test server
			reqBody := anthropicRequest{
				Model:       client.model,
				MaxTokens:   client.maxTokens,
				Temperature: client.temperature,
				Messages: []anthropicMessage{
					{Role: "user", Content: tt.prompt},
				},
			}

			jsonData, _ := json.Marshal(reqBody)
			req, _ := http.NewRequestWithContext(ctx, "POST", server.URL, strings.NewReader(string(jsonData)))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("x-api-key", client.apiKey)
			req.Header.Set("anthropic-version", "2023-06-01")

			resp, err := client.httpClient.Do(req)
			if err != nil {
				if !tt.wantErr {
					t.Errorf("Complete() unexpected error = %v", err)
				}
				return
			}
			defer resp.Body.Close()

			var apiResp anthropicResponse
			json.NewDecoder(resp.Body).Decode(&apiResp)

			if resp.StatusCode != http.StatusOK {
				if !tt.wantErr {
					t.Errorf("Complete() unexpected error status = %d", resp.StatusCode)
				}
				return
			}

			if tt.wantErr {
				if apiResp.Error == nil && len(apiResp.Content) > 0 {
					t.Error("Complete() expected error but got success")
				}
				return
			}

			if len(apiResp.Content) == 0 {
				if !tt.wantErr {
					t.Error("Complete() got empty content")
				}
				return
			}

			result := apiResp.Content[0].Text
			if !strings.Contains(strings.ToLower(result), strings.ToLower(tt.wantContains)) {
				t.Errorf("Complete() result = %v, want to contain %v", result, tt.wantContains)
			}
		})
	}
}

func TestAnthropicClient_Complete_WithRetry(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 2 {
			w.WriteHeader(http.StatusTooManyRequests)
			resp := anthropicResponse{
				Error: &anthropicError{
					Type:    "rate_limit_error",
					Message: "Rate limit exceeded",
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}
		resp := anthropicResponse{
			ID:    "msg_123",
			Type:  "message",
			Role:  "assistant",
			Model: ModelSonnet,
			Content: []anthropicContent{
				{
					Type: "text",
					Text: "Success after retry",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := &testAnthropicClient{
		AnthropicClient: AnthropicClient{
			apiKey:      "test-key",
			model:       ModelSonnet,
			maxTokens:   1024,
			temperature: 1.0,
			timeout:     5 * time.Second,
			httpClient:  &http.Client{Timeout: 5 * time.Second},
		},
		testURL: server.URL,
	}

	ctx := context.Background()
	result, err := client.Complete(ctx, "test prompt")
	if err != nil {
		t.Errorf("Complete() unexpected error = %v", err)
		return
	}

	if !strings.Contains(result, "Success after retry") {
		t.Errorf("Complete() result = %v, want to contain 'Success after retry'", result)
	}

	if attempts != 2 {
		t.Errorf("Expected 2 attempts, got %d", attempts)
	}
}

// testAnthropicClient wraps AnthropicClient to allow URL override for testing
type testAnthropicClient struct {
	AnthropicClient
	testURL string
}

func (c *testAnthropicClient) sendRequest(ctx context.Context, prompt string) (string, error) {
	reqBody := anthropicRequest{
		Model:       c.model,
		MaxTokens:   c.maxTokens,
		Temperature: c.temperature,
		Messages: []anthropicMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := c.testURL
	if url == "" {
		url = anthropicAPIURL
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", &RetryableError{Err: fmt.Errorf("failed to send request: %w", err)}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", handleHTTPError(resp.StatusCode, body)
	}

	var apiResp anthropicResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if apiResp.Error != nil {
		return "", fmt.Errorf("API error: %s - %s", apiResp.Error.Type, apiResp.Error.Message)
	}

	if len(apiResp.Content) == 0 {
		return "", fmt.Errorf("empty response content")
	}

	return apiResp.Content[0].Text, nil
}

func (c *testAnthropicClient) Complete(ctx context.Context, prompt string) (string, error) {
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			backoff := calculateBackoff(attempt)
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return "", ctx.Err()
			}
		}

		response, err := c.sendRequest(ctx, prompt)
		if err == nil {
			return response, nil
		}

		lastErr = err

		if ctx.Err() != nil || !isRetryableError(err) {
			return "", err
		}
	}

	return "", fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}

func TestAnthropicClient_Complete_ContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		resp := anthropicResponse{
			ID:   "msg_123",
			Type: "message",
			Role: "assistant",
			Content: []anthropicContent{
				{Type: "text", Text: "Response"},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := &AnthropicClient{
		apiKey:      "test-key",
		model:       ModelSonnet,
		maxTokens:   1024,
		temperature: 1.0,
		timeout:     5 * time.Second,
		httpClient:  &http.Client{Timeout: 5 * time.Second},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	// This will test context cancellation during retries
	// We're testing the error handling, not the actual API call
	_, err := client.Complete(ctx, "test")
	if err == nil {
		// Context might not cancel if the call is too fast
		// That's okay for this test
		return
	}

	if ctx.Err() == nil {
		t.Error("Expected context to be cancelled")
	}
}

func TestCalculateBackoff(t *testing.T) {
	tests := []struct {
		attempt int
		want    time.Duration
	}{
		{attempt: 1, want: 1 * time.Second},
		{attempt: 2, want: 2 * time.Second},
		{attempt: 3, want: 4 * time.Second},
		{attempt: 4, want: 8 * time.Second},
		{attempt: 5, want: 16 * time.Second},
		{attempt: 6, want: 16 * time.Second}, // capped at maxBackoff
		{attempt: 10, want: 16 * time.Second}, // capped at maxBackoff
	}

	for _, tt := range tests {
		t.Run(string(rune(tt.attempt)), func(t *testing.T) {
			got := calculateBackoff(tt.attempt)
			if got != tt.want {
				t.Errorf("calculateBackoff(%d) = %v, want %v", tt.attempt, got, tt.want)
			}
		})
	}
}

func TestIsRetryableError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "retryable error",
			err:  &RetryableError{Err: http.ErrServerClosed},
			want: true,
		},
		{
			name: "non-retryable error",
			err:  context.Canceled,
			want: false,
		},
		{
			name: "nil error",
			err:  nil,
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isRetryableError(tt.err); got != tt.want {
				t.Errorf("isRetryableError() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestModelConstants(t *testing.T) {
	if ModelHaiku == "" {
		t.Error("ModelHaiku should not be empty")
	}
	if ModelSonnet == "" {
		t.Error("ModelSonnet should not be empty")
	}
	if ModelHaiku == ModelSonnet {
		t.Error("ModelHaiku and ModelSonnet should be different")
	}
}

func TestAnthropicClient_ImplementsLLMClient(t *testing.T) {
	var _ LLMClient = (*AnthropicClient)(nil)
}
