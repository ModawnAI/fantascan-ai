import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test.describe('Unauthenticated Access', () => {
    test('dashboard should redirect to login', async ({ page }) => {
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('new scan page should redirect to login', async ({ page }) => {
      await page.goto('/scan/new');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('settings page should redirect to login', async ({ page }) => {
      await page.goto('/settings');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('onboarding page should redirect to login', async ({ page }) => {
      await page.goto('/onboarding');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('scan detail page should redirect to login', async ({ page }) => {
      // Use a random UUID for the scan ID
      await page.goto('/scan/550e8400-e29b-41d4-a716-446655440000');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });
  });
});
