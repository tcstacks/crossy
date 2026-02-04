# AuthModal End-to-End Test - Switch Between Login and Register Tabs

## Test: AUTH-08 - Switch between login and register tabs

### Prerequisites
- Frontend application running (usually on http://localhost:5173 or similar)
- No backend required for this UI test

### Test Steps

1. **Navigate to the application**
   - Open the app in a browser
   - Verify the home page loads

2. **Open the Auth Modal**
   - Click on the "Get Started" button in the header (or any button that opens auth modal)
   - Verify the auth modal opens
   - Verify all three tabs are visible: Guest, Login, Register

3. **Verify Login tab is active by default**
   - Verify the "Login" tab is highlighted/active (has active styling)
   - Verify the Login form is displayed with:
     - Email input field (id="login-email")
     - Password input field (id="login-password")
     - "Forgot password?" link
     - "Login" button
   - Verify the form does NOT have a username/display name field
   - Take a snapshot: `auth-08-login-default.png`

4. **Switch to Register tab**
   - Click on the "Register" tab
   - Verify the "Register" tab is now highlighted/active
   - Verify the Register form is displayed with:
     - Display Name input field (id="register-username")
     - Email input field (id="register-email")
     - Password input field (id="register-password")
     - "Register" button
   - Verify the form DOES have a username field (this is the key difference)
   - Take a snapshot: `auth-08-register-tab.png`

5. **Switch back to Login tab**
   - Click on the "Login" tab
   - Verify the "Login" tab is highlighted/active again
   - Verify the Login form is displayed again with:
     - Email input field (id="login-email")
     - Password input field (id="login-password")
     - "Forgot password?" link
     - "Login" button
   - Verify the form does NOT have a username/display name field
   - Take a snapshot: `auth-08-login-return.png`

6. **Test multiple switches**
   - Click Register tab again
   - Verify Register form appears
   - Click Login tab again
   - Verify Login form appears
   - Confirm smooth transitions with no errors

### Expected Results

- ✓ Auth modal opens successfully
- ✓ Login tab is active by default when modal opens
- ✓ Login form has only email and password fields (no username)
- ✓ Clicking Register tab switches to Register form
- ✓ Register form has username, email, and password fields
- ✓ Clicking Login tab switches back to Login form
- ✓ Tab switching works smoothly in both directions
- ✓ Active tab styling is clearly visible
- ✓ No errors or console warnings during tab switching

### Screenshot Requirements

Take three screenshots:
1. `auth-08-login-default.png` - Login tab active by default
2. `auth-08-register-tab.png` - Register tab after clicking
3. `auth-08-login-return.png` - Login tab after switching back

### Key Verification Points

**Login Form Identification:**
- Has 2 input fields (email, password)
- Has "Forgot password?" link
- Button text is "Login"
- NO username/display name field

**Register Form Identification:**
- Has 3 input fields (username, email, password)
- Username field is the KEY DIFFERENCE
- Button text is "Register"
- NO "Forgot password?" link

### Implementation Notes

- Tab switching is implemented using Radix UI Tabs component
- Default active tab is set to 'login' in state (line 22 of AuthModal.tsx)
- Tab change handler at lines 121-124 clears errors when switching
- Login form: lines 166-221
- Register form: lines 223-281

### Browser Test Checklist

- [ ] Open auth modal
- [ ] Verify Login tab is active by default
- [ ] Click Register tab
- [ ] Verify Register form is displayed (has username field)
- [ ] Click Login tab
- [ ] Verify Login form is displayed (no username field)
- [ ] Take snapshots of both states
