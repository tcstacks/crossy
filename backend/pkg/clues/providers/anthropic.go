package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"
)

const (
	anthropicAPIURL = "https://api.anthropic.com/v1/messages"

	// Model identifiers
	ModelHaiku  = "claude-3-5-haiku-20241022"
	ModelSonnet = "claude-3-5-sonnet-20241022"

	// Default configuration
	defaultMaxTokens   = 1024
	defaultTemperature = 1.0
	defaultTimeout     = 30 * time.Second

	// Retry configuration
	maxRetries     = 3
	initialBackoff = 1 * time.Second
	maxBackoff     = 16 * time.Second
)

// AnthropicClient implements LLMClient for Anthropic's Claude API
type AnthropicClient struct {
	apiKey      string
	model       string
	maxTokens   int
	temperature float64
	timeout     time.Duration
	httpClient  *http.Client
}

// AnthropicConfig holds configuration for the Anthropic client
type AnthropicConfig struct {
	APIKey      string
	Model       string
	MaxTokens   int
	Temperature float64
	Timeout     time.Duration
}

// anthropicRequest represents the API request format
type anthropicRequest struct {
	Model       string              `json:"model"`
	MaxTokens   int                 `json:"max_tokens"`
	Messages    []anthropicMessage  `json:"messages"`
	Temperature float64             `json:"temperature,omitempty"`
}

// anthropicMessage represents a message in the conversation
type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// anthropicResponse represents the API response format
type anthropicResponse struct {
	ID      string              `json:"id"`
	Type    string              `json:"type"`
	Role    string              `json:"role"`
	Content []anthropicContent  `json:"content"`
	Model   string              `json:"model"`
	Error   *anthropicError     `json:"error,omitempty"`
}

// anthropicContent represents content blocks in the response
type anthropicContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// anthropicError represents an API error
type anthropicError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// NewAnthropicClient creates a new Anthropic API client
func NewAnthropicClient(config AnthropicConfig) (*AnthropicClient, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	if config.Model == "" {
		config.Model = ModelSonnet
	}

	if config.MaxTokens == 0 {
		config.MaxTokens = defaultMaxTokens
	}

	if config.Temperature == 0 {
		config.Temperature = defaultTemperature
	}

	if config.Timeout == 0 {
		config.Timeout = defaultTimeout
	}

	return &AnthropicClient{
		apiKey:      config.APIKey,
		model:       config.Model,
		maxTokens:   config.MaxTokens,
		temperature: config.Temperature,
		timeout:     config.Timeout,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}, nil
}

// Complete sends a prompt to Claude API and returns the response text
func (c *AnthropicClient) Complete(ctx context.Context, prompt string) (string, error) {
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

		// Don't retry on context cancellation or non-retryable errors
		if ctx.Err() != nil || !isRetryableError(err) {
			return "", err
		}
	}

	return "", fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}

// sendRequest sends a single request to the Anthropic API
func (c *AnthropicClient) sendRequest(ctx context.Context, prompt string) (string, error) {
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

	req, err := http.NewRequestWithContext(ctx, "POST", anthropicAPIURL, bytes.NewBuffer(jsonData))
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

// handleHTTPError converts HTTP status codes to appropriate errors
func handleHTTPError(statusCode int, body []byte) error {
	var apiResp anthropicResponse
	if err := json.Unmarshal(body, &apiResp); err == nil && apiResp.Error != nil {
		err := fmt.Errorf("API error (%d): %s - %s", statusCode, apiResp.Error.Type, apiResp.Error.Message)

		// Retryable errors
		if statusCode == http.StatusTooManyRequests ||
		   statusCode == http.StatusServiceUnavailable ||
		   statusCode == http.StatusGatewayTimeout ||
		   (statusCode >= 500 && statusCode < 600) {
			return &RetryableError{Err: err}
		}

		return err
	}

	err := fmt.Errorf("HTTP error %d: %s", statusCode, string(body))

	// Retryable HTTP errors
	if statusCode == http.StatusTooManyRequests ||
	   statusCode == http.StatusServiceUnavailable ||
	   statusCode == http.StatusGatewayTimeout ||
	   (statusCode >= 500 && statusCode < 600) {
		return &RetryableError{Err: err}
	}

	return err
}

// calculateBackoff returns the backoff duration for a given retry attempt
func calculateBackoff(attempt int) time.Duration {
	backoff := time.Duration(float64(initialBackoff) * math.Pow(2, float64(attempt-1)))
	if backoff > maxBackoff {
		backoff = maxBackoff
	}
	return backoff
}

// isRetryableError checks if an error should be retried
func isRetryableError(err error) bool {
	_, ok := err.(*RetryableError)
	return ok
}

// RetryableError indicates an error that should be retried
type RetryableError struct {
	Err error
}

func (e *RetryableError) Error() string {
	return e.Err.Error()
}

func (e *RetryableError) Unwrap() error {
	return e.Err
}
