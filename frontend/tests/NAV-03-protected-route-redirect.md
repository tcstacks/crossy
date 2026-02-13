# NAV-03: Protected Route Redirect - Manual Test Guide

## User Story
As a visitor, I am redirected when accessing protected routes

## Test Prerequisites
- Frontend server running on http://localhost:5173
- Backend API running
- Fresh browser session (no auth token stored)

## Test Cases

### Test Case 1: Logged Out State - Profile Route
**Steps:**
1. Ensure user is logged out (clear localStorage/cookies if needed)
2. Navigate directly to http://localhost:5173/profile
3. Observe behavior

**Expected Results:**
- Auth modal should appear prompting for login/registration
- If modal is dismissed, user should be redirected to home page (/)
- User should NOT see the profile page content

### Test Case 2: Logged Out State - History Route
**Steps:**
1. Ensure user is logged out
2. Navigate directly to http://localhost:5173/history
3. Observe behavior

**Expected Results:**
- Auth modal should appear prompting for login/registration
- If modal is dismissed, user should be redirected to home page (/)
- User should NOT see the history page content

### Test Case 3: Verify Redirect to Home
**Steps:**
1. Ensure user is logged out
2. Navigate to http://localhost:5173/profile
3. Wait for auth modal to appear
4. Click outside modal or close button to dismiss it

**Expected Results:**
- URL should change to http://localhost:5173/ (home page)
- Landing page should be visible

### Test Case 4: Successful Login Flow
**Steps:**
1. Navigate to http://localhost:5173/profile while logged out
2. Complete login in the auth modal
3. Observe behavior

**Expected Results:**
- After successful login, profile page should be displayed
- User should remain on /profile route

## Implementation Details

The protected route logic is implemented in:
- `frontend/app/src/components/ProtectedRoute.tsx` - Main protection logic
- `frontend/app/src/App.tsx` - Route configuration

Protected routes include:
- `/profile` - User profile page
- `/history` - Game history page
- `/room/create` - Create multiplayer room
- `/room/join` - Join multiplayer room
- `/room/:code` - Room lobby
- `/room/:code/play` - Multiplayer game

## Notes
- The ProtectedRoute component shows a loading spinner while checking authentication status
- If not authenticated, it displays an AuthModal instead of immediately redirecting
- Only after the modal is dismissed does it redirect to home
- This provides a better UX by giving users a chance to authenticate without losing their intended destination
