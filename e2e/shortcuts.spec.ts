import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('[data-testid="key-object"]');
        
        // Ensure grid size is set (default is usually 0.25)
        // Reset project to a known state if possible, or just start fresh
        // The default project has no keys? No, it usually has some or we add them.
        // Let's clear keys first? Or just work with added keys.
        
        // Add a test key
        await page.click('button:has-text("Add 1U")');
        // Wait for key to appear - there should be at least one
    });

    test('should delete selected key with Delete/Backspace', async ({ page }) => {
        const key = page.locator('[data-testid="key-object"]').first();
        await key.click(); // Select
        
        // Check it exists
        await expect(key).toHaveCount(1);
        
        // Press Delete
        await page.keyboard.press('Delete');
        
        // Check it's gone
        await expect(key).toHaveCount(0);
        
        // Add another key and test Backspace
        await page.click('button:has-text("Add 1U")');
        const key2 = page.locator('[data-testid="key-object"]').first();
        await key2.click();
        await page.keyboard.press('Backspace');
        await expect(key2).toHaveCount(0);
    });

    test('should move selected key with Arrow keys', async ({ page }) => {
        const key = page.locator('[data-testid="key-object"]').first();
        await key.click(); // Select
        
        // Get initial position
        const boxBefore = await key.boundingBox();
        if (!boxBefore) throw new Error('Key not found');
        
        // Move Right 4 times (4 * 0.25U = 1U approx, but depends on pixel scaling)
        // We just check if x increases
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        
        const boxAfter = await key.boundingBox();
        if (!boxAfter) throw new Error('Key not found');
        
        expect(boxAfter.x).toBeGreaterThan(boxBefore.x);
        
        // Move Down
        await page.keyboard.press('ArrowDown');
        const boxAfterDown = await key.boundingBox();
        expect(boxAfterDown!.y).toBeGreaterThan(boxAfter.y);
    });

    test('should copy and paste keys', async ({ page }) => {
        const key = page.locator('[data-testid="key-object"]').first();
        await key.click(); // Select
        
        await expect(page.locator('[data-testid="key-object"]')).toHaveCount(1);
        
        // Copy (Cmd+C)
        // Note: On Linux/Windows it is Control+C. Playwright handles 'Control+C' or 'Meta+C'
        // We implemented both metaKey and ctrlKey.
        // Let's try Meta+C which works on Mac (runner is Mac)
        await page.keyboard.press('Meta+c');
        
        // Paste (Meta+V)
        await page.keyboard.press('Meta+v');
        
        // Should have 2 keys now
        await expect(page.locator('[data-testid="key-object"]')).toHaveCount(2);
        
        // The new key should be selected, so another paste should paste a new one?
        // Wait, copyKeys copies *currently selected* keys.
        // pasteKeys pastes *clipboard* keys and selects them.
        // So clipboard still has the original key? Yes.
        
        await page.keyboard.press('Meta+v');
        await expect(page.locator('[data-testid="key-object"]')).toHaveCount(3);
    });
    
    test('should not trigger shortcuts when typing in input', async ({ page }) => {
        const key = page.locator('[data-testid="key-object"]').first();
        await key.click(); // Select
        
        // Click on project name to edit
        const nameInput = page.locator('input[value="Untitled Project"]');
        // Determine layout: TopBar usually has it.
        // If not found by value, try placeholder or selector.
        // We need a specific selector for the project name input.
        // TopBar.tsx: <input ... value={project.name} ... />
        
        // Use a generic input selector if specific one is hard to find, but we can try locator by value
        await nameInput.click();
        await nameInput.fill('Test Project');
        
        // Now pressed Delete/Backspace should NOT delete the key
        await page.keyboard.press('Backspace');
        
        // Key should still exist
        await expect(key).toHaveCount(1);
        
        // Check input value changed (Backspace deleted 't')
        await expect(nameInput).toHaveValue('Test Projec');
    });
});
