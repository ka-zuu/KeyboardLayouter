import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        // Add a test key
        await page.click('button:has-text("Add Keys")');
        
        // Wait for key to exist in store
        await page.waitForFunction(() => {
            const storage = localStorage.getItem('mkd-storage');
            if (!storage) return false;
            const data = JSON.parse(storage).state.project;
            return data.keys.length > 0;
        });
        
        // Move pan to (100, 100) to ensure keys at (0,0) are visible and not clipped
        await page.evaluate(() => {
            const storage = localStorage.getItem('mkd-storage');
            if (!storage) return;
            const state = JSON.parse(storage).state;
            state.pan = { x: 100, y: 100 };
            localStorage.setItem('mkd-storage', JSON.stringify({ state, version: 0 }));
        });
        await page.reload(); // Reload to apply store change
        
        // Wait for key again after reload
        await page.waitForFunction(() => {
             return document.querySelector('canvas') !== null;
        });
        await page.waitForTimeout(500);
    });

    test('should delete selected key with Delete/Backspace', async ({ page }) => {
        // Need to click the key to select it.
        // Assuming default key added at (0,0) 1U size.
        // Canvas usually fills the area.
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');
        
        // Programmatically select the key to ensure test stability
        // We are testing shortcuts, not the selection click logic (covered in other tests)
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

        // Delete
        await page.keyboard.press('Delete');
        
        // Verify key gone
        await page.waitForFunction(() => {
            const storage = localStorage.getItem('mkd-storage');
            const data = JSON.parse(storage!).state.project;
            return data.keys.length === 0;
        });
    });

    test('should move selected key with Arrow keys', async ({ page }) => {
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
        
        // Get initial position
        const initialPos = await page.evaluate(() => {
            const storage = localStorage.getItem('mkd-storage');
            return JSON.parse(storage!).state.project.keys[0].position;
        });
        
        // Move Right
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100); // Wait for update
        
        const afterRight = await page.evaluate(() => {
            const storage = localStorage.getItem('mkd-storage');
            return JSON.parse(storage!).state.project.keys[0].position;
        });
        
        expect(afterRight.x).toBeGreaterThan(initialPos.x);
        expect(afterRight.y).toBe(initialPos.y); // Y should not change
        
        // Move Down
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        
        const afterDown = await page.evaluate(() => {
            const storage = localStorage.getItem('mkd-storage');
            return JSON.parse(storage!).state.project.keys[0].position;
        });
        
        expect(afterDown.y).toBeGreaterThan(afterRight.y);
    });

    test('should copy and paste keys', async ({ page }) => {
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
        
        // Copy (Meta+C)
        await page.keyboard.press('Meta+c');
        await page.waitForTimeout(100);

        // Paste (Meta+V)
        await page.keyboard.press('Meta+v');
        await page.waitForTimeout(100);
        
        // Should have 2 keys
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length === 2;
        });
        
        // Verify selection by deleting the pasted key immediately
        // If Paste selects the new key, Delete should remove it.
        await page.keyboard.press('Delete');
        
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length === 1;
        });
    });
    
    test('should not trigger shortcuts when typing in input', async ({ page }) => {
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
        
        // Click Project Name input
        const nameInput = page.locator('input[value="Untitled Project"]');
        await nameInput.click();
        await nameInput.fill('Test');
        
        // Press Backspace inside input
        await page.keyboard.press('Backspace');
        
        // Key should still exist
        const keyCount = await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length;
        });
        expect(keyCount).toBe(1);
        
        await expect(nameInput).toHaveValue('Tes');
    });
});
