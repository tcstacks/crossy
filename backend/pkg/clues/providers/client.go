package providers

import "context"

// LLMClient defines the interface for LLM-based clue generation
type LLMClient interface {
	// Complete sends a prompt to the LLM and returns the response text
	Complete(ctx context.Context, prompt string) (string, error)
}
