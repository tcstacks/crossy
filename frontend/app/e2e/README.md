# End-to-End Testing with Chrome MCP

This directory contains E2E tests for the Crossy crossword application using Chrome DevTools MCP.

## Prerequisites

1. Backend server running on `http://localhost:8080`
2. Frontend dev server running on `http://localhost:5173`
3. Chrome MCP server connected

## Test Flows

- **Flow 1**: Guest Single Player - Complete puzzle flow
- **Flow 2**: Registration and Profile - User registration and profile viewing
- **Flow 3**: Archive and History - Browse and complete archived puzzles
- **Flow 4**: Multiplayer Collaborative - Real-time collaboration
- **Flow 5**: Multiplayer Chat and Reactions - Communication features
- **Flow 6**: Race Mode - Competitive racing
- **Flow 7**: Relay Mode - Turn-based gameplay
- **Flow 8**: Error Handling - Error states and recovery
- **Flow 9**: Design Consistency - UI/UX consistency across pages

## Running Tests

Tests are designed to be run via Chrome MCP tools. Each test file can be executed independently.
