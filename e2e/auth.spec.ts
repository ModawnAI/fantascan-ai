import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Should be on login page
      await expect(page).toHaveURL(/.*login/);

      // Should have email and password inputs
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Should have submit button with login text
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('로그인');
    });

    test('should have link to signup page', async ({ page }) => {
      await page.goto('/login');

      const signupLink = page.locator('a[href="/signup"]');
      await expect(signupLink).toBeVisible();
      await expect(signupLink).toContainText('회원가입');
    });

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login');

      const forgotLink = page.locator('a[href="/forgot-password"]');
      await expect(forgotLink).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Click submit without filling form
      await page.locator('button[type="submit"]').click();

      // HTML5 validation should prevent submission
      // Check that we're still on login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login');

      await page.locator('a[href="/signup"]').click();
      await expect(page).toHaveURL(/.*signup/);
    });
  });

  test.describe('Signup Page', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/signup');

      // Should be on signup page
      await expect(page).toHaveURL(/.*signup/);

      // Should have required inputs
      await expect(page.locator('input[type="email"]')).toBeVisible();
      // Signup has password and confirm password fields
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('input#confirmPassword')).toBeVisible();

      // Should have submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/signup');

      const loginLink = page.locator('a[href="/login"]');
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toContainText('로그인');
    });

    test('should display promotional text about free credits', async ({ page }) => {
      await page.goto('/signup');

      // Should mention free credits - use first() to handle multiple matches
      await expect(page.locator('text=100 크레딧').first()).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/signup');

      await page.locator('a[href="/login"]').click();
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');

      // Should have email input
      await expect(page.locator('input[type="email"]')).toBeVisible();

      // Should have submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });
});
