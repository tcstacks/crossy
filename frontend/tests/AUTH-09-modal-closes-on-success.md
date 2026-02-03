# AUTH-09: Auth Modal Closes on Success - Manual Test Guide

## Test Story
As a user, the auth modal closes after successful login/register

## Prerequisites
- Backend server running
- Frontend development server running
- Test user credentials available OR ability to register new user

## Test Scenario 1: Modal Closes After Successful Login

### Steps:
1. Open the application in browser
2. Click "Login" button in the header to open auth modal
3. Verify modal is visible with "Welcome to Crossy!" title
4. Ensure you are on the "Login" tab
5. Enter valid credentials:
   - Email: (use existing test user)
   - Password: (use existing test user password)
6. Click "Login" button
7. Wait for login to complete

### Expected Results:
- Modal closes automatically
- Modal is no longer visible on the page
- User is authenticated (username appears in header)
- User can access the application

### Actual Results:
[To be filled during test execution]

---

## Test Scenario 2: Modal Closes After Successful Registration

### Steps:
1. Open the application in browser
2. Click "Login" button in the header to open auth modal
3. Verify modal is visible with "Welcome to Crossy!" title
4. Click on the "Register" tab
5. Enter new user details:
   - Display Name: TestUser_AUTH09
   - Email: testuser_auth09_[timestamp]@example.com
   - Password: TestPass123!
6. Click "Register" button
7. Wait for registration to complete

### Expected Results:
- Modal closes automatically
- Modal is no longer visible on the page
- User is authenticated (username "TestUser_AUTH09" appears in header)
- User can access the application

### Actual Results:
[To be filled during test execution]

---

## Test Scenario 3: Modal Closes After Guest Login

### Steps:
1. Open the application in browser
2. Click "Login" button in the header to open auth modal
3. Verify modal is visible with "Welcome to Crossy!" title
4. Ensure you are on the "Guest" tab (default)
5. Optionally enter a display name (e.g., "GuestTester")
6. Click "Play as Guest" button
7. Wait for guest login to complete

### Expected Results:
- Modal closes automatically
- Modal is no longer visible on the page
- User is authenticated (display name or "Guest" appears in header)
- User can access the application

### Actual Results:
[To be filled during test execution]

---

## Test Scenario 4: Modal Stays Open on Login Failure

### Steps:
1. Open the application in browser
2. Click "Login" button in the header to open auth modal
3. Verify modal is visible with "Welcome to Crossy!" title
4. Ensure you are on the "Login" tab
5. Enter invalid credentials:
   - Email: invalid@example.com
   - Password: wrongpassword
6. Click "Login" button
7. Wait for error to appear

### Expected Results:
- Error message appears within the modal
- Modal STAYS OPEN (does not close)
- User is NOT authenticated
- User can retry login

### Actual Results:
[To be filled during test execution]

---

## Browser Testing Checklist
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if on macOS)

## Test Status: ⏳ Pending

## Notes:
[Add any additional observations or issues found during testing]
