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

## Test Structure

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

## CI/CD

Tests run automatically on GitHub Actions when pushing to main/master branch. See `.github/workflows/playwright.yml`.

