import { test as base, expect, Page } from '@playwright/test';

// Test user credentials - these should be set up in your test environment
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

/**
 * Extended test fixtures that include authentication
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  // This fixture will handle authentication before tests
  authenticatedPage: async ({ page }, use) => {
    // Go to login page
    await page.goto('/login');

    // Fill in credentials
    await page.locator('input[type="email"]').fill(TEST_USER_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_USER_PASSWORD);

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });

    // Pass the authenticated page to the test
    await use(page);
  },
});

export { expect };

/**
 * Helper to save authentication state for reuse
 */
export async function saveAuthState(page: Page) {
  // After successful login, save the storage state
  await page.context().storageState({ path: '.playwright/auth.json' });
}
