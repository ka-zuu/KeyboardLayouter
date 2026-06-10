import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the MKD title', async ({ page }) => {
    // Check for the main logo/title in the top bar
    await expect(page.locator('h1')).toHaveText('MKD');
  });

  test('should display the project name', async ({ page }) => {
    // Sidebar shows "Untitled Project (Active)"; use partial match
    await expect(page.getByText('Untitled Project')).toBeVisible();
  });

  test('should have "Add Keys" button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add Keys' })).toBeVisible();
  });

  test('should have canvas', async ({ page }) => {
     // Konva creates one canvas per layer; use .first() to avoid strict mode violation
     await expect(page.locator('canvas').first()).toBeVisible();
  });
});
