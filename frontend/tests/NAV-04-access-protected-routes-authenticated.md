# NAV-04: Access Protected Routes When Authenticated - Manual Test Guide

## User Story
As a user, I can access protected routes

## Test Prerequisites
- Frontend server running on http://localhost:5173
- Backend API running
- Valid user credentials (email/password or guest login)

## Test Cases

### Test Case 1: Login and Access Profile Page
**Steps:**
1. Navigate to http://localhost:5173
2. Click "Login" button in header
3. Enter valid credentials and submit OR click "Continue as Guest"
4. After successful login, navigate to http://localhost:5173/profile
5. Observe the page loads successfully

**Expected Results:**
- Profile page should load without showing auth modal
- User should see:
  - Header with user's display name
  - Stats cards (Puzzles Solved, Avg Solve Time, Current Streak, etc.)
  - Mascot image
  - No loading spinner (after initial data fetch)
- URL should remain at /profile

### Test Case 2: Login and Access History Page
**Steps:**
1. Ensure user is logged in (complete Test Case 1 if needed)
2. Navigate to http://localhost:5173/history
3. Observe the page loads successfully

**Expected Results:**
- History page should load without showing auth modal
- User should see:
  - "Puzzle History" title
  - Filter and sort options
  - Either puzzle history entries (if user has played) OR empty state with "No Puzzles Yet!" message
  - No loading spinner (after initial data fetch)
- URL should remain at /history

### Test Case 3: Navigate Between Protected Routes
**Steps:**
1. Ensure user is logged in
2. Navigate to http://localhost:5173/profile
3. Verify profile page loads
4. Navigate to http://localhost:5173/history
5. Verify history page loads
6. Navigate back to /profile
7. Verify profile page loads again

**Expected Results:**
- All navigation should work smoothly without:
  - Auth modal appearing
  - Redirects to home page
  - Authentication errors
- User should remain logged in throughout

### Test Case 4: Direct URL Access While Authenticated
**Steps:**
1. Ensure user is logged in
2. Open a new browser tab (same browser session)
3. Directly enter http://localhost:5173/profile in address bar
4. Observe behavior
5. Directly enter http://localhost:5173/history in address bar
6. Observe behavior

**Expected Results:**
- Both pages should load directly without auth modal
- User session should persist across tabs
- No redirects or authentication errors

### Test Case 5: Page Refresh While on Protected Route
**Steps:**
1. Ensure user is logged in
2. Navigate to http://localhost:5173/profile
3. Refresh the page (F5 or Cmd+R)
4. Navigate to http://localhost:5173/history
5. Refresh the page

**Expected Results:**
- Page should reload successfully
- Auth state should persist through refresh
- User should remain on the same protected route
- No auth modal should appear

## Implementation Details

The authentication and protected route logic is implemented in:
- `frontend/app/src/components/ProtectedRoute.tsx` - Main protection logic
- `frontend/app/src/contexts/AuthContext.tsx` - Authentication state management
- `frontend/app/src/pages/ProfilePage.tsx` - Profile page component
- `frontend/app/src/pages/HistoryPage.tsx` - History page component
- `frontend/app/src/App.tsx` - Route configuration

## Success Criteria
All test cases should pass with:
- ✅ No authentication errors
- ✅ No unexpected redirects
- ✅ Protected content loads properly
- ✅ Auth state persists across navigation and refresh
- ✅ Good user experience (no loading flicker, smooth transitions)

## Notes
- The ProtectedRoute component checks authentication status before rendering
- It shows a loading spinner while checking auth (brief moment)
- Once authenticated, users can freely navigate between protected routes
- Token is stored in localStorage and persists across sessions
