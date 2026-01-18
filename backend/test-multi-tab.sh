#!/bin/bash

# Test script to verify multi-tab support
# This script tests that multiple connections from the same user work correctly

set -e

echo "Multi-Tab Support Test"
echo "====================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:8080"

echo -e "${YELLOW}Prerequisites:${NC}"
echo "1. Backend server should be running on $BACKEND_URL"
echo "2. Test will create a room and simulate multiple tabs"
echo ""
read -p "Press Enter to continue..."
echo ""

# Create a test user
echo -e "${YELLOW}Step 1: Creating test user...${NC}"
USER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "multitab-test@example.com",
    "password": "testpass123",
    "displayName": "MultiTab Tester"
  }')

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
TOKEN=$(echo "$USER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to create user. Response:${NC}"
  echo "$USER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ User created: $USER_ID${NC}"
echo ""

# Create a room
echo -e "${YELLOW}Step 2: Creating room...${NC}"
ROOM_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mode": "collaborative",
    "config": {
      "maxPlayers": 4,
      "isPublic": true,
      "timeLimit": 600,
      "hintsEnabled": true
    }
  }')

ROOM_CODE=$(echo "$ROOM_RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ROOM_CODE" ]; then
  echo -e "${RED}Failed to create room. Response:${NC}"
  echo "$ROOM_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Room created: $ROOM_CODE${NC}"
echo ""

echo -e "${YELLOW}Step 3: Testing multi-tab connections...${NC}"
echo "This test requires manual verification:"
echo ""
echo "1. Open the frontend in your browser and log in with:"
echo "   Email: multitab-test@example.com"
echo "   Password: testpass123"
echo ""
echo "2. Join room: $ROOM_CODE"
echo ""
echo "3. Open the SAME room in a NEW TAB (same user)"
echo ""
echo "4. Check the backend logs to verify:"
echo "   - Two different connectionIDs registered for the same userID"
echo "   - Both connections stored in hub.clients map"
echo "   - Both connections tracked in hub.userConnections"
echo ""
echo "5. Make cell updates in both tabs:"
echo "   - Updates should be broadcast to BOTH tabs"
echo "   - Each tab should receive updates from the other"
echo ""
echo "6. Close one tab:"
echo "   - Only that connection should unregister"
echo "   - Other tab should remain connected"
echo "   - User should NOT receive 'player_left' message"
echo ""
echo "7. Close the last tab:"
echo "   - Connection should unregister"
echo "   - User should receive 'player_left' message"
echo ""
echo -e "${GREEN}Room is ready for testing!${NC}"
echo ""
echo "Watch backend logs with:"
echo "  tail -f /path/to/backend/logs"
echo ""
echo "Look for log entries with:"
echo "  - 'Client registered: connectionID=...'"
echo "  - 'broadcastToRoom: sending to client connectionID=...'"
echo "  - 'Client unregistered: connectionID=...'"
