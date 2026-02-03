import { test, expect } from '@playwright/test';

// This test runs against the REAL Tauri app (no mocks)
// It should catch actual database errors

test.beforeEach(async ({ page }) => {
  // NO MOCKS - testing the real app
  await page.goto('/');
});

test.describe('UI Health - Real App', () => {
  test('should load without errors or warnings', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Give async operations time to complete
    await page.waitForTimeout(2000);

    // Check for error elements in the UI
    const errorElement = page.locator('.error');
    const isErrorVisible = await errorElement.isVisible().catch(() => false);

    if (isErrorVisible) {
      const errorText = await errorElement.textContent();
      console.error('Found error in UI:', errorText);
    }

    await expect(errorElement).not.toBeVisible();

    // Check for any error text visible on the page
    const bodyText = await page.locator('body').textContent() || '';

    // Log the body text for debugging
    if (bodyText.includes('Failed') || bodyText.includes('Error')) {
      console.error('Found error text in body:', bodyText);
    }

    expect(bodyText).not.toContain('Failed to initialize database');
    expect(bodyText).not.toContain('error returned from database');
    expect(bodyText).not.toContain('unable to open database file');
    expect(bodyText).not.toContain('Failed to');

    // Verify the form is functional (not blocked by errors)
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await expect(page.locator('#name')).toBeEnabled();
    await expect(page.locator('#den')).toBeEnabled();
  });

  test('should successfully initialize on first load', async ({ page }) => {
    // Wait for initialization
    await page.waitForTimeout(2000);

    // Verify the main UI elements loaded correctly
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2').first()).toBeVisible();

    // Verify no error state
    const errorElement = page.locator('.error');
    await expect(errorElement).not.toBeVisible();

    // Verify scouts list shows empty state (not an error)
    await expect(page.locator('.empty-message')).toBeVisible();
  });
});
