# AuthModal End-to-End Test - Registration Validation Errors

## Test: AUTH-02 - Registration validation errors for duplicate email

### Prerequisites
- Backend server running on configured API endpoint
- At least one registered user in the database

### Test Steps

1. **Navigate to the application**
   - Open the app in a browser
   - Verify the home page loads

2. **Open the Auth Modal**
   - Click on the "Get Started" or authentication button
   - Verify the auth modal opens
   - Verify all three tabs are visible: Guest, Login, Register

3. **Switch to Register tab**
   - Click on the "Register" tab
   - Verify the register form is displayed with:
     - Display Name input field
     - Email input field
     - Password input field
     - Register button

4. **Fill form with existing email**
   - Enter a display name (e.g., "TestUser")
   - Enter an email that already exists in the database
   - Enter a valid password (at least 6 characters)

5. **Submit the registration**
   - Click the "Register" button
   - Verify the button shows loading state ("Creating account..." with spinner)

6. **Verify error message is displayed**
   - Wait for the API response
   - Verify an error message appears in a red alert box
   - Verify the error message contains text indicating the email is already registered
   - Expected error text: "email already registered" or similar
   - Verify the error box has:
     - Red/destructive text color
     - Semi-transparent red background
     - Padding and rounded corners

7. **Verify form state after error**
   - Verify the form remains populated with entered values
   - Verify the Register button is enabled again (not loading)
   - Verify the modal remains open
   - Verify the user can edit the form fields

### Expected Results

- ✓ Error message displays in a styled alert box
- ✓ Error message clearly indicates the email is already registered
- ✓ Form remains functional after error
- ✓ User can correct the email and try again

### Test Data

**Existing User:**
- Email: test@example.com (or any email that exists in your test database)
- You may need to create this user first via the Register flow

**Test Registration:**
- Display Name: "DuplicateTest"
- Email: test@example.com (same as existing user)
- Password: "password123"

### Screenshot Requirements

Take a screenshot showing:
- The auth modal with Register tab active
- The error message clearly visible in the red alert box
- The form fields still populated
- Save as: `auth-registration-duplicate-error.png`

### Additional Test Cases

1. **Invalid email format**
   - Try registering with "notanemail"
   - Should show HTML5 validation error or API validation error

2. **Password too short**
   - Try registering with password "123"
   - Should show error: "password must be at least 6 characters"

3. **Missing required fields**
   - Try submitting with empty fields
   - Should show HTML5 required field validation

### Notes

- This test verifies the complete error flow from backend to frontend UI
- The error handling is already implemented in AuthModal.tsx lines 86-103, 264-268
- Backend returns 409 Conflict status with message "email already registered"
- Frontend catches the error and displays it in the error state variable
