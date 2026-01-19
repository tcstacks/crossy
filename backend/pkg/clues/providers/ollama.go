package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	defaultOllamaURL = "http://localhost:11434/api/generate"

	// Common Ollama model identifiers
	ModelLlama3   = "llama3"
	ModelLlama2   = "llama2"
	ModelMistral  = "mistral"
	ModelMixtral  = "mixtral"
	ModelCodeLlama = "codellama"

	// Default Ollama configuration
	defaultOllamaModel      = ModelLlama3
	defaultOllamaTimeout    = 60 * time.Second
	defaultOllamaMaxRetries = 3
)

// OllamaClient implements LLMClient for local Ollama models
type OllamaClient struct {
	baseURL    string
	model      string
	timeout    time.Duration
	httpClient *http.Client
}

// OllamaConfig holds configuration for the Ollama client
type OllamaConfig struct {
	BaseURL string
	Model   string
	Timeout time.Duration
}

// ollamaRequest represents the API request format
type ollamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

// ollamaResponse represents the API response format
type ollamaResponse struct {
	Model     string `json:"model"`
	CreatedAt string `json:"created_at"`
	Response  string `json:"response"`
	Done      bool   `json:"done"`
	Error     string `json:"error,omitempty"`
}

// NewOllamaClient creates a new Ollama API client
func NewOllamaClient(config OllamaConfig) (*OllamaClient, error) {
	if config.BaseURL == "" {
		config.BaseURL = defaultOllamaURL
	}

	if config.Model == "" {
		config.Model = defaultOllamaModel
	}

	if config.Timeout == 0 {
		config.Timeout = defaultOllamaTimeout
	}

	return &OllamaClient{
		baseURL: config.BaseURL,
		model:   config.Model,
		timeout: config.Timeout,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}, nil
}

// Complete sends a prompt to Ollama and returns the response text
func (c *OllamaClient) Complete(ctx context.Context, prompt string) (string, error) {
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

		// Don't retry on context cancellation or non-retryable errors
		if ctx.Err() != nil || !isRetryableError(err) {
			return "", err
		}
	}

	return "", fmt.Errorf("failed after %d retries: %w", defaultOllamaMaxRetries, lastErr)
}

// sendRequest sends a single request to the Ollama API
func (c *OllamaClient) sendRequest(ctx context.Context, prompt string) (string, error) {
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

// handleOllamaHTTPError converts HTTP status codes to appropriate errors
func handleOllamaHTTPError(statusCode int, body []byte) error {
	var apiResp ollamaResponse
	if err := json.Unmarshal(body, &apiResp); err == nil && apiResp.Error != "" {
		err := fmt.Errorf("Ollama API error (%d): %s", statusCode, apiResp.Error)

		// Retryable errors
		if statusCode == http.StatusServiceUnavailable ||
			statusCode == http.StatusGatewayTimeout ||
			(statusCode >= 500 && statusCode < 600) {
			return &RetryableError{Err: err}
		}

		return err
	}

	err := fmt.Errorf("Ollama HTTP error %d: %s", statusCode, string(body))

	// Retryable HTTP errors
	if statusCode == http.StatusServiceUnavailable ||
		statusCode == http.StatusGatewayTimeout ||
		(statusCode >= 500 && statusCode < 600) {
		return &RetryableError{Err: err}
	}

	return err
}
