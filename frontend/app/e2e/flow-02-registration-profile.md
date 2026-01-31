# Flow 2: Registration and Profile

## Test Steps

### 1. Navigate to Landing Page
- **Action**: Open `http://localhost:5173`
- **Expected**: Landing page loads

### 2. Click Register
- **Action**: Click "Register" or "Sign Up" button
- **Expected**: Registration modal/form appears

### 3. Fill Registration Form
- **Action**: Enter username, email, password
- **Expected**:
  - Form validation works
  - Real-time validation feedback
  - Submit button becomes enabled

### 4. Submit Registration
- **Action**: Click "Register" submit button
- **Expected**:
  - POST request to `/api/auth/register`
  - Success response received
  - User is authenticated

### 5. Verify Redirect
- **Action**: Check URL after registration
- **Expected**:
  - Redirected to appropriate page (likely `/play` or `/profile`)
  - Auth state is updated

### 6. Navigate to Profile
- **Action**: Click profile link/button in navigation
- **Expected**:
  - Navigate to `/profile`
  - Profile page loads

### 7. Stats Load and Display
- **Action**: Wait for profile data to load
- **Expected**:
  - User stats appear (games played, completion rate, etc.)
  - Profile information displays
  - Loading state resolves

### 8. Crossy Mascot Appears
- **Action**: Observe page layout
- **Expected**:
  - Crossy mascot image is visible
  - Proper styling and positioning
  - Consistent with brand guidelines

## Validation Checklist
- [ ] Landing page loads
- [ ] Registration form appears
- [ ] Form validation works
- [ ] Registration submission succeeds
- [ ] User is authenticated after registration
- [ ] Redirect to appropriate page occurs
- [ ] Navigation to /profile works
- [ ] Profile page loads with user data
- [ ] Stats are fetched and displayed correctly
- [ ] Crossy mascot image appears
- [ ] Page layout matches design

## API Endpoints Used
- `POST /api/auth/register` - User registration
- `GET /api/users/me` or `/api/profile` - Fetch user profile
- `GET /api/users/me/stats` - Fetch user statistics
