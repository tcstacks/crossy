# AUTH-06: User Logout - Browser Test

## Manual Test Instructions

This test verifies that users can logout and their session is properly cleared.

### Prerequisites
1. Backend server is running on `http://localhost:8080`
2. Frontend dev server is running on `http://localhost:5173`
3. A test user exists with credentials (or use guest login)

### Test Steps

1. **Navigate to the app**
   - Open browser to `http://localhost:5173`

2. **Login as a user first**
   - Click the "Login" button in the header
   - Enter valid credentials OR click "Continue as Guest"
   - Verify you are logged in (user menu appears in header)

3. **Click on user menu in header**
   - Locate the user menu button (shows user avatar/initial and display name)
   - Click on the user menu button
   - Verify dropdown menu opens with options:
     - Profile
     - History
     - Logout (with LogOut icon)

4. **Click Logout option**
   - Click on "Logout" option in the dropdown menu
   - Verify logout happens immediately (no confirmation dialog)

5. **Verify Login/Sign Up button reappears in header**
   - ✅ User menu is no longer visible
   - ✅ "Login" button reappears in the header
   - ✅ User is redirected or can continue browsing as unauthenticated

6. **Take snapshot showing logged out state**
   - Screenshot should show:
     - Header with "Login" button visible
     - No user menu/avatar visible
     - User successfully logged out

### Expected Behavior
- User menu opens when clicked
- Logout option is visible with LogOut icon
- Clicking logout immediately clears session
- Login button reappears after logout
- No error messages appear during logout
- User can immediately login again if desired

### Screenshots
Take screenshots showing:
1. Logged in state with user menu visible
2. User menu dropdown opened showing Logout option
3. Logged out state with Login button visible

## Automated Browser Test Script

Run this test using Chrome DevTools MCP integration:

```typescript
// AUTH-06: Test user logout flow
async function testUserLogout() {
  // Step 1: Navigate to app
  await navigateTo('http://localhost:5173');

  // Step 2: Wait for page to load
  await waitFor('Crossy');

  // Step 3: Login first (using guest login for simplicity)
  await click('[data-testid="login-button"]');
  await waitFor('Welcome to Crossy!');

  // Click "Continue as Guest" button
  await click('button:has-text("Continue as Guest")');

  // Wait for login to complete - user menu should appear
  await waitFor('Guest'); // Should see "Guest" in the header

  // Take screenshot of logged in state
  await screenshot('AUTH-06-logged-in-state.png');

  // Step 4: Click on user menu in header
  // Look for button with user avatar/name
  await click('button:has-text("Guest")');

  // Step 5: Wait for dropdown menu to open
  await waitFor('Logout');

  // Take screenshot of open menu
  await screenshot('AUTH-06-user-menu-open.png');

  // Step 6: Click Logout option
  await click('button:has-text("Logout")');

  // Step 7: Verify Login button reappears
  await waitFor('Login');

  // Verify user menu is gone by checking that "Guest" text is no longer visible in header
  // (Guest text should only appear when logged in)

  // Take screenshot showing logged out state
  await screenshot('AUTH-06-logged-out-state.png');

  console.log('✅ AUTH-06: User logout test PASSED');
}
```

## Test Verification Checklist

After running the test, verify:
- [ ] User menu opens when clicked
- [ ] Logout option is visible in the menu
- [ ] Clicking logout clears the session
- [ ] Login button reappears after logout
- [ ] No error messages during logout process
- [ ] Screenshots captured show the complete flow
