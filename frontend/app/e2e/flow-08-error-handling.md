# Flow 8: Error Handling

## Test Steps

### 1. Join Invalid Room Code
- **Action**:
  - Navigate to Join Room page
  - Enter invalid/non-existent room code (e.g., "INVALID")
  - Click Join
- **Expected**:
  - API request to join room fails
  - Error message displays clearly
  - Error message says "Room not found" or similar
  - User remains on join page
  - Can retry with different code
  - No navigation occurs

### 2. Error Message Shows
- **Action**: Observe error display
- **Expected**:
  - Error message is prominent and readable
  - Error styling (red color, icon, etc.)
  - Error doesn't block UI
  - Dismissable or auto-hides after timeout
  - Form validation feedback

### 3. Access Protected Page Without Auth
- **Action**:
  - Open new incognito window
  - Navigate directly to `http://localhost:5173/profile`
  - (Or any protected route like /history, /room/create)
- **Expected**:
  - ProtectedRoute component triggers
  - Redirect occurs (to `/` or current page)
  - User is not shown protected content

### 4. Redirect and Auth Modal
- **Action**: Observe behavior after redirect
- **Expected**:
  - Redirected to landing page or login
  - Auth modal appears automatically
  - Modal prompts for login/register
  - Return URL preserved (optional)
  - After successful auth, redirects to originally requested page

### 5. Disconnect Network Mid-Game
- **Action**:
  - Start multiplayer game or single player
  - Disable network (airplane mode, disconnect WiFi)
  - Wait for connection to drop
- **Expected**:
  - WebSocket connection closes
  - Connection error detected
  - Reconnection attempt begins

### 6. WebSocket Reconnection Works
- **Action**: Re-enable network connection
- **Expected**:
  - WebSocket attempts to reconnect automatically
  - Exponential backoff for retries
  - Reconnection succeeds within reasonable time
  - Game state resumes from last known state
  - No data loss
  - User can continue playing

### 7. UI Shows Disconnected State
- **Action**: Observe UI during disconnection
- **Expected**:
  - Disconnection indicator appears
  - Banner or toast notification
  - "Reconnecting..." message
  - Disabled controls during reconnection
  - Loading state shown
  - Clear visual feedback
  - When reconnected, indicator disappears

## Additional Error Scenarios

### API Error Handling
- **Action**: Trigger API failures (500, 404, timeout)
- **Expected**:
  - Error boundaries catch errors
  - User-friendly error messages
  - No app crashes
  - Can recover gracefully

### Form Validation Errors
- **Action**: Submit forms with invalid data
- **Expected**:
  - Client-side validation prevents submission
  - Clear error messages per field
  - Highlight invalid fields
  - Submit button disabled until valid

### Network Timeouts
- **Action**: Simulate slow/timeout network
- **Expected**:
  - Loading states shown
  - Timeout errors handled
  - Retry options available
  - User informed of issue

## Validation Checklist
- [ ] Invalid room code shows error
- [ ] Error message is clear and helpful
- [ ] User can retry after error
- [ ] Protected routes require authentication
- [ ] Unauthenticated access redirects correctly
- [ ] Auth modal appears for protected routes
- [ ] Return URL works after login
- [ ] Network disconnection detected
- [ ] WebSocket reconnection attempts automatically
- [ ] Reconnection succeeds when network restored
- [ ] UI shows disconnected state clearly
- [ ] Disconnection indicator appears
- [ ] Reconnecting message displays
- [ ] Controls disabled during disconnection
- [ ] Game state preserved after reconnection
- [ ] Error boundaries catch runtime errors
- [ ] Form validation prevents invalid submissions
- [ ] API errors handled gracefully
- [ ] User experience degrades gracefully

## Technical Details
- **Error Boundary**: React error boundary component
- **WebSocket Reconnection**:
  - Exponential backoff algorithm
  - Max retries configuration
  - State preservation during reconnection

- **Protected Routes**: ProtectedRoute component wrapper
- **Error Display**: Toast notifications (sonner library)

## API Endpoints Used
- `POST /api/rooms/:code/join` - Join room (for invalid code test)
- `WS /ws` - WebSocket connection (for disconnect test)
