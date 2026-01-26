import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.playwright/auth.json');

/**
 * Global setup for Playwright tests
 * This runs once before all tests and sets up authentication state
 */
async function globalSetup(config: FullConfig) {
  // Check if we have test credentials
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    console.log('⚠️ No test credentials provided. Skipping auth setup.');
    console.log('Set TEST_USER_EMAIL and TEST_USER_PASSWORD to enable authenticated tests.');
    return;
  }

  // Ensure the .playwright directory exists
  const playwrightDir = path.dirname(authFile);
  if (!fs.existsSync(playwrightDir)) {
    fs.mkdirSync(playwrightDir, { recursive: true });
  }

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  console.log('🔐 Setting up authentication...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login
    await page.goto(`${baseURL}/login`);

    // Fill credentials
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to authenticated area
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 });

    // Save storage state (cookies, localStorage, etc.)
    await page.context().storageState({ path: authFile });

    console.log('✅ Authentication state saved');
  } catch (error) {
    console.error('❌ Failed to authenticate:', error);
    // Don't throw - allow tests to run without auth
  } finally {
    await browser.close();
  }
}

export default globalSetup;
