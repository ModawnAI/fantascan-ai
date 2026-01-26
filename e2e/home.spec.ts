import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should show the landing page content (brand name in h1)
    await expect(page.getByRole('heading', { name: '판타스캔 AI', exact: true })).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for login/signup navigation
    const loginLink = page.locator('a[href="/login"]');
    const signupLink = page.locator('a[href="/signup"]');

    // At least one of these should exist on landing
    const hasLoginLink = await loginLink.count();
    const hasSignupLink = await signupLink.count();

    expect(hasLoginLink > 0 || hasSignupLink > 0).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should load without horizontal scroll
    const body = page.locator('body');
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    const viewportWidth = 375;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin
  });
});
