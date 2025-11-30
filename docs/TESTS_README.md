# Playwright Tests

This directory contains end-to-end tests for the DOTO web application using Playwright.

## Running Tests

### Run all tests
```bash
npm run test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/example.spec.js
```

### Run specific test suites
```bash
# Run posts and claims tests
npm run test:posts

# Run mass claims test (50 claims)
npm run test:claims

# Run messaging tests
npm run test:messaging

# Run all tests
npm run test:all
```

## Test Structure

- `smoke.spec.js` - Comprehensive smoke tests covering:
  - Authentication flows (login, registration, verification)
  - All main screens (Feed, Map, Profile, Settings, etc.)
  - Post interactions (like, comment, claim)
  - Navigation and responsive design
  - Enhanced navigation tests (all links, mobile menu, deep linking)
  - Enhanced profile tests (image upload, stats, badges)
  - Enhanced settings tests (persistence, all toggles)
  - Enhanced map tests (interaction, zoom, pan, markers)
  - Enhanced feed tests (filtering, sorting, infinite scroll)
  - Cross-feature integration tests (complete user journeys, data persistence)

- `smoke-posts-claims.spec.js` - Advanced smoke tests for posts and claims:
  - User creation and authentication
  - Creating 20 posts with Israel locations and uploaded images with different users
  - Opening posts and verifying content
  - Claiming posts with multiple users
  - Commenting on posts
  - Testing claim workflows

- `mass-claims.spec.js` - Mass claims testing:
  - Creates 10 posting users and 10 claiming users
  - Creates 40 posts distributed among posting users
  - Tests 50 claims across different posts and users
  - Verifies claims are properly recorded
  - Tests edge cases (multiple users claiming same post, already claimed posts)

- `messaging.spec.js` - Messaging functionality tests:
  - Post-related messaging (users message post authors after claiming)
  - Post-related messaging (users ask questions about posts)
  - General conversations between users
  - Multiple message exchanges in conversations
  - Conversation list display and sorting
  - Message search functionality

- `auth-flow.spec.js` - Authentication flow tests:
  - Login validation
  - Registration form validation
  - Logout functionality

- `example.spec.js` - Basic tests covering:
  - Homepage and login flow
  - Navigation after authentication
  - Dark mode toggle functionality
  - RTL support for Hebrew language
  - Post creation flow
  - Map view display

## Writing New Tests

Create new test files in the `tests/` directory following the pattern:

```javascript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  // Your test code here
});
```

## Configuration

Test configuration is in `playwright.config.js`. The tests:
- Run against `http://localhost:5173` (Vite dev server)
- Automatically start the dev server before tests
- Test on Chromium, Firefox, and WebKit
- Include mobile viewport tests

## Test Suites Overview

### Smoke Tests (`smoke.spec.js`)
Comprehensive coverage of all major features and screens. Run with `npm run test:smoke`.

### Posts and Claims Tests (`smoke-posts-claims.spec.js`)
Tests multiple users creating posts, commenting, and claiming. Run with `npm run test:posts`.

### Mass Claims Tests (`mass-claims.spec.js`)
Stress test for claims functionality with 50 claims across different users and posts. Run with `npm run test:claims`.

### Messaging Tests (`messaging.spec.js`)
Tests messaging functionality including post-related and general conversations. Run with `npm run test:messaging`.

## Test Data

All tests use:
- Israel locations for posts (20 different cities)
- Test users with unique emails
- Test images (1x1 PNG files)
- Realistic post titles and descriptions

## Performance Notes

- Mass claims test may take 5-10 minutes to complete
- Messaging tests may take 3-5 minutes
- All tests use appropriate timeouts and wait strategies
- Tests can be run in parallel or sequentially

## CI/CD

Tests run automatically on GitHub Actions when pushing to main/master branch. See `.github/workflows/playwright.yml`.

