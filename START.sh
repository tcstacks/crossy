#!/bin/bash

# CrossPlay Quick Start Script
# Starts both backend and frontend servers

set -e

echo "🚀 Starting CrossPlay Application..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check PostgreSQL
if ! pgrep -x postgres > /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not running. Starting...${NC}"
    brew services start postgresql@14 || echo "Please start PostgreSQL manually"
fi

# Check Redis
if ! pgrep -x redis-server > /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not running. Starting...${NC}"
    brew services start redis || echo "Please start Redis manually"
fi

sleep 2

# Kill any existing servers
echo -e "${BLUE}Stopping any existing servers...${NC}"
pkill -f "go run cmd/server/main.go" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Start Backend
echo -e "${BLUE}Starting Backend Server...${NC}"
cd /Users/dev/proj/crossy/backend
go run cmd/server/main.go > /tmp/backend-server.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "  URL: http://localhost:8080"
echo "  Logs: tail -f /tmp/backend-server.log"

sleep 3

# Start Frontend
echo -e "${BLUE}Starting Frontend Server...${NC}"
cd /Users/dev/proj/crossy/frontend
npm run dev > /tmp/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "  URL: http://localhost:3000"
echo "  Logs: tail -f /tmp/frontend-dev.log"

sleep 5

# Health check
echo ""
echo -e "${YELLOW}Running health checks...${NC}"

if curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend might still be starting...${NC}"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend might still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 CrossPlay is ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Open: ${BLUE}http://localhost:3000${NC}"
echo ""
echo "To stop servers:"
echo "  pkill -f 'go run cmd/server/main.go'"
echo "  pkill -f 'next dev'"
echo ""
echo "Or run: ./STOP.sh"
echo ""
