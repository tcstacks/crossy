# Flow 9: Design Consistency

## Test Steps

### 1. Navigate All Pages
- **Action**: Visit each page in the application
  - Landing Page (`/`)
  - Gameplay Page (`/play`)
  - Archive Page (`/archive`)
  - Profile Page (`/profile`)
  - History Page (`/history`)
  - Create Room Page (`/room/create`)
  - Join Room Page (`/room/join`)
  - Room Lobby Page (`/room/:code`)
  - Multiplayer Game Page (`/room/:code/play`)
  - Not Found Page (404)
- **Expected**: All pages load without errors

### 2. Crossy Purple Theme on All Pages
- **Action**: Observe color scheme on each page
- **Expected**:
  - Consistent purple theme (#8B5CF6 or similar)
  - Primary buttons use Crossy purple
  - Accent colors consistent
  - Background colors match design system
  - No jarring color inconsistencies
  - Dark mode support (if applicable)

### 3. Pixel Font Usage for Headings
- **Action**: Inspect headings (h1, h2, h3) on all pages
- **Expected**:
  - Pixel/retro font family for headings
  - Font loads correctly (no FOUT/FOUC)
  - Consistent font weight and sizing
  - Proper fallback fonts
  - Readable at all sizes

### 4. Mascot Images Appear Appropriately
- **Action**: Check for Crossy mascot on pages
- **Expected**:
  - Landing page: Hero mascot image
  - Profile page: Mascot appears
  - Other appropriate locations
  - Images load correctly
  - Proper alt text for accessibility
  - Responsive image sizing
  - No broken image links

### 5. Button Styles Match Landing Page
- **Action**: Compare button styles across pages
- **Expected**:
  - Primary buttons: Same purple, rounded corners
  - Secondary buttons: Consistent outline style
  - Hover states match
  - Active/focus states consistent
  - Disabled states styled uniformly
  - Icon buttons match design
  - Button sizing consistent

### 6. Card Designs Match Patterns
- **Action**: Observe card components across pages
- **Expected**:
  - Consistent card padding
  - Same border radius
  - Shadow/elevation consistent
  - Background colors match
  - Spacing between cards uniform
  - Card headers styled the same
  - Card layouts follow grid system

### 7. Responsive Design Works on Mobile Viewport
- **Action**:
  - Resize browser to 375px width (mobile)
  - Navigate through all pages
  - Test interactions on mobile
- **Expected**:
  - All pages responsive and usable
  - No horizontal scrolling (unless intentional)
  - Touch targets at least 44x44px
  - Text readable without zooming
  - Navigation adapts (hamburger menu?)
  - Crossword grid scales appropriately
  - Modals/dialogs fit viewport
  - Forms usable on mobile
  - Images scale correctly
  - No content cutoff

### 8. Navigation Consistency
- **Action**: Check navigation on all pages
- **Expected**:
  - Navigation bar present on all pages
  - Navigation items consistent
  - Active page highlighted
  - Logo/branding always visible
  - User menu accessible
  - Consistent positioning

### 9. Typography Consistency
- **Action**: Review text across pages
- **Expected**:
  - Body text uses same font family
  - Consistent font sizes for hierarchy
  - Line heights comfortable
  - Letter spacing appropriate
  - Text colors accessible (WCAG AA)

### 10. Spacing and Layout
- **Action**: Observe page layouts
- **Expected**:
  - Consistent padding/margins
  - Grid system followed
  - Alignment consistent
  - White space used effectively
  - Max width constraints where appropriate

## Validation Checklist

### Color Theme
- [ ] Purple primary color (#8B5CF6) used consistently
- [ ] Accent colors consistent across pages
- [ ] Background colors match
- [ ] Text colors meet accessibility standards
- [ ] Dark mode works (if implemented)

### Typography
- [ ] Pixel font for headings on all pages
- [ ] Font loads without flash
- [ ] Body text font consistent
- [ ] Font sizes follow hierarchy
- [ ] Line heights comfortable
- [ ] Text readable on all backgrounds

### Components
- [ ] Buttons styled consistently
- [ ] Hover/focus states match
- [ ] Cards use same design pattern
- [ ] Forms styled uniformly
- [ ] Modals/dialogs consistent
- [ ] Navigation bar present everywhere

### Branding
- [ ] Crossy mascot on landing page
- [ ] Mascot on profile page
- [ ] Logo present in navigation
- [ ] Brand colors used correctly
- [ ] No broken images

### Responsive Design
- [ ] Mobile viewport (375px) works
- [ ] Tablet viewport (768px) works
- [ ] Desktop viewport (1024px+) works
- [ ] No horizontal scroll on mobile
- [ ] Touch targets large enough
- [ ] Text readable on small screens
- [ ] Crossword grid scales properly
- [ ] Navigation adapts to screen size

### Layout
- [ ] Consistent padding/margins
- [ ] Proper alignment
- [ ] Grid system followed
- [ ] Max-width containers used
- [ ] Spacing feels balanced

### Accessibility
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] Semantic HTML used
- [ ] Keyboard navigation works

## Technical Details
- **Design System**: Tailwind CSS with custom theme
- **Color Palette**: Check `tailwind.config.js`
- **Fonts**: Check font imports in CSS/HTML
- **Components**: Radix UI + custom components
- **Responsive Breakpoints**:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px

## Files to Inspect
- `tailwind.config.js` - Theme configuration
- `src/index.css` - Global styles and fonts
- `src/components/ui/*` - Component styles
