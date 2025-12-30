# CrossPlay Development - Resume Point

## Last Session: 2025-12-30

### What We Were Doing
Testing crossword puzzle generation using the `make admin` command.

### Current State

**LLM Configuration** (`backend/.env`):
- Provider: `openai` (LMStudio local)
- API URL: `http://localhost:1234/v1/chat/completions`
- Model: `nvidia-nemotron-3-nano-30b-a3b-mlx`

**Issue Encountered**:
- The GLM-4.6v-flash model (vision model) was loaded in LMStudio but times out on text requests
- The nemotron model is configured but needs to be loaded in LMStudio

### To Resume

1. **Start LMStudio** and load a text-based model (e.g., `nvidia-nemotron-3-nano-30b-a3b-mlx`)

2. **Update `backend/.env`** if using a different model:
   ```
   LLM_MODEL=your-model-name
   ```

3. **Test generation**:
   ```bash
   make admin ARGS="generate -size mini -difficulty monday"
   ```

### Test Results from Last Session

| Command | Result |
|---------|--------|
| `generate -size mini` | 3 candidates, 60% success, quality issues |
| `generate -size daily` | Failed - no valid puzzle |
| `batch -size mini -count 5` | 2/5 candidates, 40% success |

**Quality issues detected** (expected with smaller local models):
- Clues containing answers
- Grid cells not fully crossed
- Short words in grid
- Duplicate answers

### Useful Commands

```bash
# Check LLM config
make admin ARGS="config"

# Generate single puzzle
make admin ARGS="generate -size mini -difficulty monday"

# Batch generate
make admin ARGS="batch -size mini -count 5"

# Test LMStudio connection
curl -s http://localhost:1234/v1/models

# Test model response
curl -s http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "MODEL_NAME", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 50}'
```

### For Better Quality Puzzles

Consider using Anthropic API:
```env
LLM_PROVIDER=anthropic
LLM_API_KEY=your-anthropic-key
LLM_MODEL=claude-sonnet-4-20250514
```
