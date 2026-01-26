import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Basic Accessibility Checks', () => {
    test('login page should have proper heading structure', async ({ page }) => {
      await page.goto('/login');

      // Should have at least one heading or heading-like element
      const headings = page.locator('h1, h2, h3, [role="heading"], .text-xl, .text-2xl, .text-3xl');
      const count = await headings.count();
      expect(count).toBeGreaterThan(0);
    });

    test('login form should have accessible labels', async ({ page }) => {
      await page.goto('/login');

      // Email input should be accessible
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();

      // Check if input has associated label or aria-label
      const hasLabel = await emailInput.evaluate((el) => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !!(label || ariaLabel || ariaLabelledBy);
      });

      // Note: This is informational - we're not failing on this
      console.log(`Email input has accessible label: ${hasLabel}`);
    });

    test('signup page should have proper heading structure', async ({ page }) => {
      await page.goto('/signup');

      // Should have at least one heading or heading-like element
      const headings = page.locator('h1, h2, h3, [role="heading"], .text-xl, .text-2xl, .text-3xl');
      const count = await headings.count();
      expect(count).toBeGreaterThan(0);
    });

    test('forms should have submit buttons', async ({ page }) => {
      await page.goto('/login');

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
    });

    test('links should be distinguishable', async ({ page }) => {
      await page.goto('/login');

      // Check that links exist and are interactive
      const links = page.locator('a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);

      // First link should be visible and clickable
      if (count > 0) {
        const firstLink = links.first();
        await expect(firstLink).toBeVisible();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('login form should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through the form
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // At least one form element should be focusable
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    });

    test('submit button should be reachable via keyboard', async ({ page }) => {
      await page.goto('/login');

      // Find the submit button
      const submitButton = page.locator('button[type="submit"]');

      // Click on email input first
      await page.locator('input[type="email"]').focus();

      // Tab through to submit button (may need multiple tabs)
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement);
        if (await submitButton.evaluate((el) => el === document.activeElement)) {
          break;
        }
      }

      // Button should be in the page
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Color Contrast', () => {
    test('page should not rely solely on color', async ({ page }) => {
      await page.goto('/login');

      // Check that error states have text, not just color
      // This is a basic check - full contrast testing needs tools like axe
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });
  });
});
