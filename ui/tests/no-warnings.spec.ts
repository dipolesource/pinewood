import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock Tauri API calls
  await page.addInitScript(() => {
    const mockScouts: any[] = [];
    let nextCarNumber = 1;

    (window as any).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args?: any) => {
        console.log('Mock invoke:', cmd, args);

        switch (cmd) {
          case 'init_database':
            return 'Database initialized';

          case 'get_checked_in_scouts':
            return [...mockScouts];

          case 'get_next_car_number':
            return nextCarNumber;

          case 'checkin_scout':
            const newScout = {
              id: mockScouts.length + 1,
              name: args.name,
              den: args.den,
              car_number: args.carNumber,
              car_weight: args.carWeight,
              checked_in: true,
              created_at: new Date().toISOString(),
            };
            mockScouts.unshift(newScout);
            nextCarNumber++;
            return newScout;

          default:
            throw new Error(`Unknown command: ${cmd}`);
        }
      },
    };
  });

  await page.goto('/');
});

test.describe('UI Health', () => {
  test('should load without errors or warnings', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for error elements in the UI
    const errorElement = page.locator('.error');
    await expect(errorElement).not.toBeVisible();

    // Check for any error text visible on the page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Failed to initialize database');
    expect(bodyText).not.toContain('error returned from database');
    expect(bodyText).not.toContain('Failed to');
    expect(bodyText).not.toContain('Error:');

    // Verify the form is functional (not blocked by errors)
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await expect(page.locator('#name')).toBeEnabled();
    await expect(page.locator('#den')).toBeEnabled();

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Give it a moment for any async errors
    await page.waitForTimeout(1000);

    // Should have no console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should successfully initialize on first load', async ({ page }) => {
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
