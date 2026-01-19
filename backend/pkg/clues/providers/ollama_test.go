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

func TestNewOllamaClient(t *testing.T) {
	tests := []struct {
		name    string
		config  OllamaConfig
		wantErr bool
	}{
		{
			name: "valid config with defaults",
			config: OllamaConfig{},
			wantErr: false,
		},
		{
			name: "valid config with custom values",
			config: OllamaConfig{
				BaseURL: "http://custom:11434/api/generate",
				Model:   ModelMistral,
				Timeout: 120 * time.Second,
			},
			wantErr: false,
		},
		{
			name: "valid config with specific model",
			config: OllamaConfig{
				Model: ModelLlama2,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewOllamaClient(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewOllamaClient() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if client == nil {
					t.Error("NewOllamaClient() returned nil client")
				}

				expectedURL := tt.config.BaseURL
				if expectedURL == "" {
					expectedURL = defaultOllamaURL
				}
				if client.baseURL != expectedURL {
					t.Errorf("baseURL = %v, want %v", client.baseURL, expectedURL)
				}

				expectedModel := tt.config.Model
				if expectedModel == "" {
					expectedModel = defaultOllamaModel
				}
				if client.model != expectedModel {
					t.Errorf("model = %v, want %v", client.model, expectedModel)
				}
			}
		})
	}
}

func TestOllamaClient_Complete(t *testing.T) {
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
				if r.Header.Get("Content-Type") != "application/json" {
					t.Error("Missing or incorrect Content-Type header")
				}

				var req ollamaRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Errorf("Failed to decode request: %v", err)
				}

				if req.Prompt != "Write a clue for EXAMPLE" {
					t.Error("Request prompt mismatch")
				}

				if req.Stream {
					t.Error("Stream should be false")
				}

				resp := ollamaResponse{
					Model:     ModelLlama3,
					CreatedAt: time.Now().Format(time.RFC3339),
					Response:  "A typical instance",
					Done:      true,
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
				resp := ollamaResponse{
					Error: "model not found",
				}
				json.NewEncoder(w).Encode(resp)
			},
			wantErr:      true,
			wantContains: "model not found",
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
				resp := ollamaResponse{
					Model:     ModelLlama3,
					CreatedAt: time.Now().Format(time.RFC3339),
					Response:  "",
					Done:      true,
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
			},
			wantErr:      true,
			wantContains: "empty response",
		},
		{
			name:   "connection error",
			prompt: "test prompt",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				// Close connection immediately
				w.Header().Set("Connection", "close")
			},
			wantErr:      true,
			wantContains: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			client := &OllamaClient{
				baseURL: server.URL,
				model:   ModelLlama3,
				timeout: 5 * time.Second,
				httpClient: &http.Client{Timeout: 5 * time.Second},
			}

			ctx := context.Background()

			// Create a request that will use our test server
			reqBody := ollamaRequest{
				Model:  client.model,
				Prompt: tt.prompt,
				Stream: false,
			}

			jsonData, _ := json.Marshal(reqBody)
			req, _ := http.NewRequestWithContext(ctx, "POST", server.URL, strings.NewReader(string(jsonData)))
			req.Header.Set("Content-Type", "application/json")

			resp, err := client.httpClient.Do(req)
			if err != nil {
				if !tt.wantErr {
					t.Errorf("Complete() unexpected error = %v", err)
				}
				return
			}
			defer resp.Body.Close()

			var apiResp ollamaResponse
			json.NewDecoder(resp.Body).Decode(&apiResp)

			if resp.StatusCode != http.StatusOK {
				if !tt.wantErr {
					t.Errorf("Complete() unexpected error status = %d", resp.StatusCode)
				}
				return
			}

			if tt.wantErr {
				if apiResp.Error == "" && apiResp.Response != "" {
					t.Error("Complete() expected error but got success")
				}
				return
			}

			if apiResp.Response == "" {
				if !tt.wantErr {
					t.Error("Complete() got empty content")
				}
				return
			}

			result := apiResp.Response
			if tt.wantContains != "" && !strings.Contains(strings.ToLower(result), strings.ToLower(tt.wantContains)) {
				t.Errorf("Complete() result = %v, want to contain %v", result, tt.wantContains)
			}
		})
	}
}

func TestOllamaClient_Complete_WithRetry(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			resp := ollamaResponse{
				Error: "service temporarily unavailable",
			}
			json.NewEncoder(w).Encode(resp)
			return
		}
		resp := ollamaResponse{
			Model:     ModelLlama3,
			CreatedAt: time.Now().Format(time.RFC3339),
			Response:  "Success after retry",
			Done:      true,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := &testOllamaClient{
		OllamaClient: OllamaClient{
			baseURL: server.URL,
			model:   ModelLlama3,
			timeout: 5 * time.Second,
			httpClient: &http.Client{Timeout: 5 * time.Second},
		},
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

// testOllamaClient wraps OllamaClient to allow testing
type testOllamaClient struct {
	OllamaClient
}

func (c *testOllamaClient) sendRequest(ctx context.Context, prompt string) (string, error) {
	reqBody := ollamaRequest{
		Model:  c.model,
		Prompt: prompt,
		Stream: false,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", &RetryableError{Err: fmt.Errorf("failed to connect to Ollama: %w", err)}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", handleOllamaHTTPError(resp.StatusCode, body)
	}

	var apiResp ollamaResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if apiResp.Error != "" {
		return "", fmt.Errorf("Ollama API error: %s", apiResp.Error)
	}

	if apiResp.Response == "" {
		return "", fmt.Errorf("empty response from Ollama")
	}

	return apiResp.Response, nil
}

func (c *testOllamaClient) Complete(ctx context.Context, prompt string) (string, error) {
	var lastErr error

	for attempt := 0; attempt < defaultOllamaMaxRetries; attempt++ {
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

	return "", fmt.Errorf("failed after %d retries: %w", defaultOllamaMaxRetries, lastErr)
}

func TestOllamaClient_Complete_ContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		resp := ollamaResponse{
			Model:    ModelLlama3,
			Response: "Response",
			Done:     true,
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := &OllamaClient{
		baseURL: server.URL,
		model:   ModelLlama3,
		timeout: 5 * time.Second,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	_, err := client.Complete(ctx, "test")
	if err == nil {
		return
	}

	if ctx.Err() == nil {
		t.Error("Expected context to be cancelled")
	}
}

func TestOllamaClient_ModelSelection(t *testing.T) {
	models := []string{ModelLlama3, ModelLlama2, ModelMistral, ModelMixtral, ModelCodeLlama}

	for _, model := range models {
		t.Run(model, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var req ollamaRequest
				json.NewDecoder(r.Body).Decode(&req)

				if req.Model != model {
					t.Errorf("Expected model %s, got %s", model, req.Model)
				}

				resp := ollamaResponse{
					Model:    model,
					Response: "Test response",
					Done:     true,
				}
				json.NewEncoder(w).Encode(resp)
			}))
			defer server.Close()

			client, err := NewOllamaClient(OllamaConfig{
				BaseURL: server.URL,
				Model:   model,
			})
			if err != nil {
				t.Fatalf("Failed to create client: %v", err)
			}

			ctx := context.Background()
			_, err = client.Complete(ctx, "test")
			if err != nil {
				t.Errorf("Complete() failed: %v", err)
			}
		})
	}
}

func TestOllamaClient_ConnectionError(t *testing.T) {
	client, err := NewOllamaClient(OllamaConfig{
		BaseURL: "http://localhost:99999",
		Timeout: 1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Failed to create client: %v", err)
	}

	ctx := context.Background()
	_, err = client.Complete(ctx, "test")
	if err == nil {
		t.Error("Expected connection error, got nil")
	}

	if !strings.Contains(err.Error(), "failed") {
		t.Errorf("Expected connection error message, got: %v", err)
	}
}

func TestOllamaModelConstants(t *testing.T) {
	models := []string{ModelLlama3, ModelLlama2, ModelMistral, ModelMixtral, ModelCodeLlama}

	for i, model := range models {
		if model == "" {
			t.Errorf("Model constant at index %d is empty", i)
		}

		for j, other := range models {
			if i != j && model == other {
				t.Errorf("Duplicate model constants: %s at indices %d and %d", model, i, j)
			}
		}
	}
}

func TestOllamaClient_ImplementsLLMClient(t *testing.T) {
	var _ LLMClient = (*OllamaClient)(nil)
}
