# AUTH-04: Login Invalid Credentials Error - Browser Test

## Manual Test Instructions

This test verifies that error messages are displayed when login fails with invalid credentials.

### Prerequisites
1. Backend server is running on `http://localhost:8080`
2. Frontend dev server is running on `http://localhost:5173`
3. A test user does NOT exist in the database with email `invalid@test.com`

### Test Steps

1. **Navigate to the app**
   - Open browser to `http://localhost:5173`

2. **Open auth modal**
   - Click the "Login" or profile button to open the auth modal
   - Verify modal title shows "Welcome to Crossy!"

3. **Select Login tab**
   - Click on "Login" tab if not already selected
   - Verify Login tab is active

4. **Fill form with invalid credentials**
   - Enter email: `invalid@test.com`
   - Enter password: `wrongpassword123`

5. **Submit the form**
   - Click "Login" button
   - Observe loading state: "Logging in..." appears briefly

6. **Verify error message**
   - ✅ Error message "invalid credentials" is displayed
   - ✅ Error appears in a styled alert box (red text, light red background)
   - ✅ Error has proper styling classes: text-sm, text-destructive, bg-destructive/10

7. **Verify modal state**
   - ✅ Modal remains open (does not close)
   - ✅ Email field still contains `invalid@test.com`
   - ✅ Password field still contains `wrongpassword123`
   - ✅ Login button is enabled (not disabled)

### Expected Behavior
- Error message appears below the password field
- Error text reads: "invalid credentials"
- Error has red/destructive styling
- User can correct credentials and retry
- Modal does not close on error

### Screenshots
Take a screenshot showing:
- Auth modal open with Login tab selected
- Email and password fields filled with invalid credentials
- Error message displayed below password field
- Styled error alert box visible

## Automated Browser Test Script

Run this test using Chrome DevTools MCP integration:

```typescript
// AUTH-04: Test login with invalid credentials
async function testLoginInvalidCredentials() {
  // Step 1: Navigate to app
  await navigateTo('http://localhost:5173');

  // Step 2: Wait for page to load
  await waitFor('Crossy');

  // Step 3: Open auth modal (click login/profile button)
  // Note: Replace with actual selector for your login button
  await click('[data-testid="login-button"]');

  // Step 4: Verify modal is open
  await waitFor('Welcome to Crossy!');

  // Step 5: Click Login tab
  await click('button:has-text("Login")');

  // Step 6: Fill in invalid credentials
  await fill('input[type="email"]', 'invalid@test.com');
  await fill('input[type="password"]', 'wrongpassword123');

  // Step 7: Submit form
  await click('button:has-text("Login")');

  // Step 8: Wait for and verify error message
  await waitFor('invalid credentials');

  // Step 9: Take screenshot
  await screenshot('AUTH-04-login-error.png');

  console.log('✅ AUTH-04: Login invalid credentials error test PASSED');
}
```
