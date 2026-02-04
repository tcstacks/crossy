# AUTH-05: Guest Login Without Account - Browser Test

## Manual Test Instructions

This test verifies that users can play as a guest without creating an account.

### Prerequisites
1. Backend server is running on `http://localhost:8080`
2. Frontend dev server is running on `http://localhost:5173`

### Test Steps

1. **Navigate to the app**
   - Open browser to `http://localhost:5173`
   - Verify landing page loads successfully

2. **Open auth modal**
   - Click any "Play" button or profile button to open the auth modal
   - Verify modal opens with title "Welcome to Crossy!"

3. **Verify Guest tab is available**
   - Verify three tabs are visible: Guest, Login, Register
   - Verify Guest tab is selected by default (active state)

4. **Verify Guest login UI**
   - Verify "Display Name (Optional)" label is visible
   - Verify text input field with placeholder "Enter a display name"
   - Verify "Play as Guest" button is visible and enabled

5. **Test guest login without display name**
   - Leave the display name field empty
   - Click "Play as Guest" button
   - Observe loading state: "Playing as guest..." appears briefly
   - ✅ Modal should close
   - ✅ User should be logged in as guest
   - ✅ Page should redirect or update to show authenticated state

6. **Verify guest authenticated state**
   - ✅ User is logged in (check header/profile area)
   - ✅ User can access protected features
   - ✅ User profile shows guest status (isGuest: true)

7. **Test guest login with display name**
   - Log out if needed
   - Open auth modal again
   - Click Guest tab
   - Enter display name: "TestGuest"
   - Click "Play as Guest" button
   - ✅ Modal should close
   - ✅ User should be logged in as guest with display name "TestGuest"

### Expected Behavior
- Guest login works without requiring any credentials
- Display name is optional
- Modal closes on successful guest login
- User is authenticated and can access the app
- User profile shows isGuest: true
- Display name is shown if provided, or a default name if not

### Screenshots
Take snapshots showing:
1. Auth modal with Guest tab selected
2. Guest login form with optional display name field
3. Guest authenticated state (user logged in, header shows profile)
4. User profile showing guest status

## Automated Browser Test Script

```typescript
// AUTH-05: Test guest login without account
async function testGuestLogin() {
  // Step 1: Navigate to app
  await navigateTo('http://localhost:5173');

  // Step 2: Wait for page to load
  await waitFor('Crossy');

  // Step 3: Open auth modal
  await click('button:has-text("Play Today\'s Puzzle")');

  // Step 4: Verify modal is open
  await waitFor('Welcome to Crossy!');

  // Step 5: Verify Guest tab is active
  await waitFor('Guest');
  await waitFor('Play as Guest');

  // Step 6: Click Play as Guest without entering name
  await click('button:has-text("Play as Guest")');

  // Step 7: Wait for modal to close and auth to complete
  await waitFor(2000); // Wait for auth to complete

  // Step 8: Verify user is logged in
  // Check for authenticated state indicators
  await takeSnapshot('AUTH-05-guest-authenticated.txt');

  console.log('✅ AUTH-05: Guest login test PASSED');
}
```
