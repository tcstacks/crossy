#!/bin/bash

# VIS-01 Test Runner
# This script starts the necessary servers and runs the VIS-01 mascot visibility test

set -e

echo "🚀 Starting VIS-01 test..."

# Check if backend is running
if ! lsof -i :5001 > /dev/null 2>&1; then
  echo "❌ Backend server not running on port 5001"
  echo "Please start the backend with: cd backend && npm run dev"
  exit 1
fi

# Check if frontend is running
if ! lsof -i :5173 > /dev/null 2>&1; then
  echo "❌ Frontend server not running on port 5173"
  echo "Please start the frontend with: cd frontend/app && npm run dev"
  exit 1
fi

echo "✓ Servers are running"
echo "Running Playwright test..."

# Run the test
cd "$(dirname "$0")/.."
npx playwright test tests/VIS-01-mascot-visibility.test.ts --project=chromium

echo "✅ VIS-01 test complete!"
echo "📸 Screenshots saved in frontend/tests/"
