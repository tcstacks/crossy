package puzzle

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// LLMProvider represents the type of LLM API being used
type LLMProvider string

const (
	ProviderAnthropic LLMProvider = "anthropic"
	ProviderOpenAI    LLMProvider = "openai" // Also used for local LLMs (LMStudio, Ollama, etc.)
)

// LLMConfig holds configuration for the LLM client
type LLMConfig struct {
	Provider   LLMProvider
	APIKey     string
	APIURL     string
	Model      string
	Timeout    time.Duration
	MaxTokens  int
}

// LLMClient provides a unified interface for different LLM providers
type LLMClient struct {
	config     LLMConfig
	httpClient *http.Client
}

// DefaultLLMConfig returns default configuration from environment variables
func DefaultLLMConfig() LLMConfig {
	provider := LLMProvider(os.Getenv("LLM_PROVIDER"))
	if provider == "" {
		provider = ProviderOpenAI // Default to OpenAI-compatible for local LLMs
	}

	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY") // Fallback for backward compatibility
	}

	apiURL := os.Getenv("LLM_API_URL")
	if apiURL == "" {
		if provider == ProviderAnthropic {
			apiURL = "https://api.anthropic.com/v1/messages"
		} else {
			apiURL = "http://localhost:1234/v1/chat/completions" // LMStudio default
		}
	}

	model := os.Getenv("LLM_MODEL")
	if model == "" {
		if provider == ProviderAnthropic {
			model = "claude-sonnet-4-20250514"
		} else {
			model = "local-model" // Generic name for local models
		}
	}

	timeout := 120 * time.Second
	if t := os.Getenv("LLM_TIMEOUT"); t != "" {
		if d, err := time.ParseDuration(t); err == nil {
			timeout = d
		}
	}

	maxTokens := 4096
	if m := os.Getenv("LLM_MAX_TOKENS"); m != "" {
		fmt.Sscanf(m, "%d", &maxTokens)
	}

	return LLMConfig{
		Provider:  provider,
		APIKey:    apiKey,
		APIURL:    apiURL,
		Model:     model,
		Timeout:   timeout,
		MaxTokens: maxTokens,
	}
}

// NewLLMClient creates a new LLM client with the given configuration
func NewLLMClient(config LLMConfig) *LLMClient {
	return &LLMClient{
		config:     config,
		httpClient: &http.Client{Timeout: config.Timeout},
	}
}

// NewLLMClientFromEnv creates a new LLM client using environment variables
func NewLLMClientFromEnv() *LLMClient {
	return NewLLMClient(DefaultLLMConfig())
}

// LLMMessage represents a chat message
type LLMMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Complete sends a prompt to the LLM and returns the response
func (c *LLMClient) Complete(prompt string) (string, error) {
	return c.CompleteWithMessages([]LLMMessage{{Role: "user", Content: prompt}})
}

// CompleteWithMessages sends messages to the LLM and returns the response
func (c *LLMClient) CompleteWithMessages(messages []LLMMessage) (string, error) {
	switch c.config.Provider {
	case ProviderAnthropic:
		return c.completeAnthropic(messages)
	case ProviderOpenAI:
		return c.completeOpenAI(messages)
	default:
		return c.completeOpenAI(messages) // Default to OpenAI-compatible format
	}
}

// Anthropic API types
type anthropicRequest struct {
	Model     string           `json:"model"`
	MaxTokens int              `json:"max_tokens"`
	Messages  []anthropicMessage `json:"messages"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *LLMClient) completeAnthropic(messages []LLMMessage) (string, error) {
	// Convert messages
	anthropicMsgs := make([]anthropicMessage, len(messages))
	for i, msg := range messages {
		anthropicMsgs[i] = anthropicMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	reqBody := anthropicRequest{
		Model:     c.config.Model,
		MaxTokens: c.config.MaxTokens,
		Messages:  anthropicMsgs,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.config.APIURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.config.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var apiResp anthropicResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if apiResp.Error != nil {
		return "", fmt.Errorf("API error: %s - %s", apiResp.Error.Type, apiResp.Error.Message)
	}

	if len(apiResp.Content) == 0 {
		return "", fmt.Errorf("empty response from API")
	}

	return apiResp.Content[0].Text, nil
}

// OpenAI API types (compatible with local LLMs)
type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func (c *LLMClient) completeOpenAI(messages []LLMMessage) (string, error) {
	// Convert messages
	openAIMsgs := make([]openAIMessage, len(messages))
	for i, msg := range messages {
		openAIMsgs[i] = openAIMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	reqBody := openAIRequest{
		Model:       c.config.Model,
		Messages:    openAIMsgs,
		MaxTokens:   c.config.MaxTokens,
		Temperature: 0.7, // Good balance for creative puzzle generation
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.config.APIURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var apiResp openAIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if apiResp.Error != nil {
		return "", fmt.Errorf("API error: %s - %s", apiResp.Error.Type, apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return "", fmt.Errorf("empty response from API")
	}

	return apiResp.Choices[0].Message.Content, nil
}

// CleanJSONResponse extracts and cleans JSON from LLM response
func CleanJSONResponse(response string) string {
	response = strings.TrimSpace(response)

	// Remove markdown code blocks
	if strings.HasPrefix(response, "```json") {
		response = strings.TrimPrefix(response, "```json")
		response = strings.TrimSuffix(response, "```")
	} else if strings.HasPrefix(response, "```") {
		response = strings.TrimPrefix(response, "```")
		response = strings.TrimSuffix(response, "```")
	}
	response = strings.TrimSpace(response)

	// Try to find JSON object or array boundaries
	if !strings.HasPrefix(response, "{") && !strings.HasPrefix(response, "[") {
		// Try to find JSON in the response
		objStart := strings.Index(response, "{")
		arrStart := strings.Index(response, "[")

		start := -1
		if objStart >= 0 && (arrStart < 0 || objStart < arrStart) {
			start = objStart
		} else if arrStart >= 0 {
			start = arrStart
		}

		if start >= 0 {
			response = response[start:]
		}
	}

	// Find the matching closing bracket
	if strings.HasPrefix(response, "{") {
		end := strings.LastIndex(response, "}")
		if end >= 0 {
			response = response[:end+1]
		}
	} else if strings.HasPrefix(response, "[") {
		end := strings.LastIndex(response, "]")
		if end >= 0 {
			response = response[:end+1]
		}
	}

	return strings.TrimSpace(response)
}

// GetConfig returns the current configuration
func (c *LLMClient) GetConfig() LLMConfig {
	return c.config
}
