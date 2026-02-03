import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock Tauri API calls
  await page.addInitScript(() => {
    // Mock invoke function
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

test.describe('Pinewood Derby Check-In', () => {
  test('should display the check-in form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Pinewood Derby Check-In');
    await expect(page.locator('h2').first()).toContainText('Scout Check-In');

    // Check form fields exist
    await expect(page.locator('#den')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#carNumber')).toBeVisible();
    await expect(page.locator('#carWeight')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show all dens in dropdown', async ({ page }) => {
    const denSelect = page.locator('#den');
    const options = await denSelect.locator('option').allTextContents();

    expect(options).toEqual(['Tiger', 'Wolf', 'Bear', 'Webelos', 'Arrow of Light']);
  });

  test('should auto-populate car number 1 on first load', async ({ page }) => {
    const carNumberInput = page.locator('#carNumber');
    await expect(carNumberInput).toHaveValue('1');
  });

  test('should show weight warning when over 5.0 oz', async ({ page }) => {
    const weightInput = page.locator('#carWeight');

    // Initially at 5.0, no warning
    await expect(page.locator('.weight-warning')).not.toBeVisible();

    // Set to 5.1
    await weightInput.fill('5.1');
    await expect(page.locator('.weight-warning')).toContainText('Over 5.0 oz limit!');

    // Button should be disabled
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should check in a scout successfully', async ({ page }) => {
    // Fill out the form
    await page.locator('#den').selectOption('Wolf');
    await page.locator('#name').fill('Joey Smith');
    await page.locator('#carNumber').fill('23');
    await page.locator('#carWeight').fill('4.8');

    // Submit
    await page.locator('button[type="submit"]').click();

    // Wait for scout to appear in list
    await expect(page.locator('.scout-card')).toBeVisible();
    await expect(page.locator('.scout-name')).toContainText('Joey Smith');
    await expect(page.locator('.car-number')).toContainText('#23');
    await expect(page.locator('.den-badge')).toContainText('Wolf');
    await expect(page.locator('.scout-weight')).toContainText('4.80 oz');

    // Check that scout count is updated
    await expect(page.locator('h2').last()).toContainText('Checked-In Scouts (1)');
  });

  test('should reset form after successful check-in', async ({ page }) => {
    // Fill and submit
    await page.locator('#den').selectOption('Bear');
    await page.locator('#name').fill('Emma Jones');
    await page.locator('#carWeight').fill('4.5');
    await page.locator('button[type="submit"]').click();

    // Wait for submission
    await expect(page.locator('.scout-card')).toBeVisible();

    // Form should reset
    await expect(page.locator('#name')).toHaveValue('');
    await expect(page.locator('#den')).toHaveValue('Tiger'); // Back to first den
    await expect(page.locator('#carWeight')).toHaveValue('5'); // Default weight
    await expect(page.locator('#carNumber')).toHaveValue('2'); // Incremented
  });

  test('should show error for empty name', async ({ page }) => {
    // Leave name empty and try to submit
    await page.locator('#name').fill('');

    // HTML5 validation should prevent submission
    const nameInput = page.locator('#name');
    await expect(nameInput).toHaveAttribute('required', '');

    // Form validation will prevent the button from submitting
    const validationMessage = await nameInput.evaluate((el: any) => {
      return el.validationMessage;
    });

    // The input should be required
    expect(validationMessage).toBeTruthy();
  });

  test('should prevent submission for weight over 5.0 oz', async ({ page }) => {
    await page.locator('#name').fill('Test Scout');
    await page.locator('#carWeight').fill('5.5');

    // Button should be disabled when weight > 5.0
    await expect(page.locator('button[type="submit"]')).toBeDisabled();

    // Warning should be visible
    await expect(page.locator('.weight-warning')).toBeVisible();
    await expect(page.locator('.weight-warning')).toContainText('Over 5.0 oz limit!');
  });

  test('should prevent zero or negative weight via HTML5 validation', async ({ page }) => {
    await page.locator('#name').fill('Test Scout');

    // HTML5 min attribute should prevent values below 0.01
    const weightInput = page.locator('#carWeight');
    await expect(weightInput).toHaveAttribute('min', '0.01');

    // Try to set invalid value
    await weightInput.fill('0');

    // Check that HTML5 validation is in place
    const validationMessage = await weightInput.evaluate((el: any) => {
      return el.validity.rangeUnderflow;
    });

    expect(validationMessage).toBeTruthy();
  });

  test('should show "Start Race" button when 4+ scouts checked in', async ({ page }) => {
    // Should not be visible initially
    await expect(page.locator('.start-race-btn')).not.toBeVisible();

    // Check in 4 scouts
    for (let i = 1; i <= 4; i++) {
      await page.locator('#name').fill(`Scout ${i}`);
      await page.locator('#carWeight').fill('4.5');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(100); // Small delay for state updates
    }

    // Now button should appear
    await expect(page.locator('.start-race-btn')).toBeVisible();
    await expect(page.locator('.start-race-btn')).toContainText('Start Race');
  });

  test('should show empty state when no scouts checked in', async ({ page }) => {
    await expect(page.locator('.empty-message')).toContainText('No scouts checked in yet');
    await expect(page.locator('.scout-card')).not.toBeVisible();
  });

  test('should display multiple checked-in scouts', async ({ page }) => {
    // Check in 3 scouts
    const scouts = [
      { name: 'Alice', den: 'Tiger', weight: '4.2' },
      { name: 'Bob', den: 'Wolf', weight: '4.8' },
      { name: 'Charlie', den: 'Bear', weight: '5.0' },
    ];

    for (const scout of scouts) {
      await page.locator('#den').selectOption(scout.den);
      await page.locator('#name').fill(scout.name);
      await page.locator('#carWeight').fill(scout.weight);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(100);
    }

    // Should have 3 scout cards
    await expect(page.locator('.scout-card')).toHaveCount(3);

    // Verify they're in reverse order (newest first)
    const scoutNames = await page.locator('.scout-name').allTextContents();
    expect(scoutNames).toEqual(['Charlie', 'Bob', 'Alice']);
  });
});
