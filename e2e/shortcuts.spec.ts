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
        
        // Copy (Control+C or Meta+C)
        await page.keyboard.press('Control+c');
        await page.waitForTimeout(100);

        // Paste (Control+V or Meta+V)
        await page.keyboard.press('Control+v');
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

    test('should cut and paste keys', async ({ page }) => {
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

        // Cut
        await page.keyboard.press('Control+x');
        await page.waitForTimeout(100);

        // Should have 0 keys
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length === 0;
        });

        // Paste
        await page.keyboard.press('Control+v');
        await page.waitForTimeout(100);

        // Should have 1 key again
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length === 1;
        });
    });

    test('should duplicate selected keys with Cmd+D', async ({ page }) => {
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

        await page.keyboard.press('Control+d');
        await page.waitForTimeout(100);

        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length === 2;
        });
    });

    test('should select all keys with Cmd+A', async ({ page }) => {
        // Add one more key
        await page.click('button:has-text("Add Keys")');
        await page.waitForTimeout(500);

        // Select All
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(100);

        // Verify by deleting all
        await page.keyboard.press('Delete');

        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             const data = JSON.parse(storage!).state.project;
             return data.keys.length === 0;
        });
    });

    test('should deselect all keys with Escape', async ({ page }) => {
        await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             if (!storage) return;
             const state = JSON.parse(storage).state;
             const keys = state.project.keys;
             if (keys.length > 0) {
                 // We can't easily set selection via localStorage if it's not persisted,
                 // so let's use the UI to select it or just assume the last added key is NOT selected if we don't click it.
                 // Actually, the easiest way to test Deselect is:
                 // 1. Add key (it's NOT selected by default in this app's Add Key logic, wait let me check TopBar)
             }
        });

        // Select All first
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(100);

        // Escape to deselect
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Verify by trying to delete (should do nothing)
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);

        const keyCount = await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             return JSON.parse(storage!).state.project.keys.length;
        });
        expect(keyCount).toBe(1);
    });

    test('should undo and redo', async ({ page }) => {
        // Initial count is 1 (added in beforeEach)

        // Delete the key
        await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             if (!storage) return;
             const state = JSON.parse(storage).state;
             state.selectedKeyIds = [state.project.keys[0].id];
             localStorage.setItem('mkd-storage', JSON.stringify({ state, version: 0 }));
        });
        await page.reload();
        await page.keyboard.press('Delete');

        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             return JSON.parse(storage!).state.project.keys.length === 0;
        });

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             return JSON.parse(storage!).state.project.keys.length === 1;
        });

        // Redo
        if (process.platform === 'darwin') {
            await page.keyboard.press('Meta+Shift+z');
        } else {
            await page.keyboard.press('Control+Shift+z');
        }

        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             return JSON.parse(storage!).state.project.keys.length === 0;
        });

        // Redo with Ctrl+Y
        await page.keyboard.press('Control+z'); // Back to 1
        await page.keyboard.press('Control+y'); // Back to 0
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             return JSON.parse(storage!).state.project.keys.length === 0;
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
