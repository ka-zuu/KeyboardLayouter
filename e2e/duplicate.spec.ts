import { test, expect } from '@playwright/test';

test.describe('Key Duplication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear storage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Add a test key and select it via localStorage manipulation
    await page.evaluate(() => {
        const storage = localStorage.getItem('mkd-storage');
        // Initial state might be empty if we cleared it, but the app initializes default.
        // Let's rely on the app initializing a default empty project on reload if storage is empty.
        // So we wait for storage to exist.
    });
    
    // Easier way: click "Add Key" button which we know works, then ensure it's selected.
    // The "Add Keys" button (plural) seems standard in home.spec.ts
    // Let's use the exact selector from shortcuts.spec.ts
    await page.click('button:has-text("Add Keys")');

    // Wait for key to exist
    await page.waitForFunction(() => {
        const storage = localStorage.getItem('mkd-storage');
        if (!storage) return false;
        const data = JSON.parse(storage).state.project;
        return data.keys.length > 0;
    });

    // Select the first key programmatically to be sure
    await page.evaluate(() => {
         const storage = localStorage.getItem('mkd-storage');
         if (!storage) return;
         const state = JSON.parse(storage).state;
         const keys = state.project.keys;
         if (keys.length > 0) {
             state.selectedKeyIds = [keys[0].id];
             localStorage.setItem('mkd-storage', JSON.stringify({ state, version: 0 }));
         }
    });
    await page.reload();
  });

  test('duplicating a key should select the new key', async ({ page }) => {
    // Get initial state
    const initialState = await page.evaluate(() => {
        const storage = localStorage.getItem('mkd-storage');
        return JSON.parse(storage!).state;
    });
    const initialKey = initialState.project.keys[0];
    const initialCount = initialState.project.keys.length;

    // Click Duplicate button in sidebar
    await page.getByRole('button', { name: 'Duplicate' }).click();

    // Verify key count increased
    await page.waitForFunction((count) => {
        const storage = localStorage.getItem('mkd-storage');
        const data = JSON.parse(storage!).state.project;
        return data.keys.length === count + 1;
    }, initialCount);

    // Verify selection via Sidebar UI
    // Should show Properties (implies single selection)
    await expect(page.getByText('Properties', { exact: true })).toBeVisible();
    
    // Verify position inputs show the NEW position
    // Original was at initialKey.position.x/y. New should be +0.5
    const expectedX = initialKey.position.x + 0.5;
    const expectedY = initialKey.position.y + 0.5;

    // The inputs are labeled X and Y.
    // We can find them by label or surrounding text.
    // In RightSidebar, they are inputs close to "X" and "Y" labels.
    // Let's use checking values of inputs.
    // Note: The input values might be strings.
    
    // Waiting for inputs to have the expected values
    // We iterate generic inputs and check if one has the value, or be more specific.
    // "Properties" section has "Position (U)" -> X input
    
    // Using a locator that finds the input following the X label might be robust
    // But let's trying to find an input with value matching expectedX
    
    // Actually, simply checking if the inputs contain the values is enough confidence for now
    await expect(page.locator('input[type="number"]').filter({ hasText: String(expectedX) })).toBeDefined();
    // Better: check the specific inputs
    // We can assume the X and Y inputs are the 3rd and 4th number inputs or similar? No, that's brittle.
    // Let's look for the inputs by value directly.
    
    // Since x and y are both 0.5 (0+0.5), we expect 2 inputs with this value.
    if (expectedX === expectedY) {
        await expect(page.locator(`input[value="${expectedX}"]`)).toHaveCount(2);
    } else {
        await expect(page.locator(`input[value="${expectedX}"]`)).toBeVisible();
        await expect(page.locator(`input[value="${expectedY}"]`)).toBeVisible();
    }
  });

  test('duplicating multiple keys should select all new keys', async ({ page }) => {
    // Add another key to have 2 keys
    await page.click('button:has-text("Add Keys")');
    
    // Select both keys
    await page.evaluate(() => {
         const storage = localStorage.getItem('mkd-storage');
         if (!storage) return;
         const state = JSON.parse(storage).state;
         const keys = state.project.keys;
         if (keys.length >= 2) {
             state.selectedKeyIds = [keys[0].id, keys[1].id];
             localStorage.setItem('mkd-storage', JSON.stringify({ state, version: 0 }));
         }
    });
    await page.reload();

    const initialKeys = await page.evaluate(() => {
        const storage = localStorage.getItem('mkd-storage');
        return JSON.parse(storage!).state.project.keys;
    });

    // Click Duplicate
    await page.getByRole('button', { name: 'Duplicate' }).click();

    // Verify count increased by 2
    await page.waitForFunction((count) => {
        const storage = localStorage.getItem('mkd-storage');
        const data = JSON.parse(storage!).state.project;
        return data.keys.length === count + 2;
    }, initialKeys.length);

    // Verify selection via Sidebar UI
    // Should show "2 items selected"
    await expect(page.getByText('2 items selected')).toBeVisible();
  });
});
