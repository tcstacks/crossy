#!/bin/bash

# CrossPlay Stop Script
# Stops both backend and frontend servers

echo "🛑 Stopping CrossPlay Application..."

# Kill backend
pkill -f "go run cmd/server/main.go" && echo "✓ Backend stopped" || echo "⚠️  Backend not running"

# Kill frontend  
pkill -f "next dev" && echo "✓ Frontend stopped" || echo "⚠️  Frontend not running"

echo ""
echo "✓ All servers stopped"
