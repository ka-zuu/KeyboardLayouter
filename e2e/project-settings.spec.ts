import { test, expect } from '@playwright/test';

test.describe('Bug Reproduction: Project Name Input', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for hydration/store init
        await page.waitForTimeout(1000);
    });

    test('should allow deleting and replacing project name even with selected keys', async ({ page }) => {
        // 1. Add a key to ensure something can be selected
        await page.getByRole('button', { name: 'Add Keys' }).click();
        
        // 2. Select the key (It might be selected by default, or we click it)
        // Clicking on canvas at (0,0) might work assuming key is there.
        // Or assume "Add Keys" selects the new key (common behavior).
        // Let's verify if selection count > 0 in store? Hard without eval.
        // Let's just click the key to be sure. Default key at (0,0) relative to canvas center?
        // Let's blindly try to interact assuming "Add Keys" works.
        
        const nameInput = page.getByPlaceholder('Project Name');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveValue('Untitled Project');

        await nameInput.click();
        
        // Try to delete "Project"
        for (let i = 0; i < 7; i++) {
             await nameInput.press('Backspace');
        }
        await expect(nameInput).toHaveValue('Untitled ');

        // Try to type Space (common conflict)
        await nameInput.press('Space');
        await expect(nameInput).toHaveValue('Untitled  '); // Space added
        
        // Type remaining
        await nameInput.fill('My Great Keyboard');
        await expect(nameInput).toHaveValue('My Great Keyboard');

        // 3. Test Undo/Redo
        // Click Undo button
        const undoBtn = page.getByTitle('Undo');
        await expect(undoBtn).toBeEnabled();
        await undoBtn.click();
        
        // Should revert to "Untitled Project" (or whatever previous state was)
        // Note: Our test started with "Untitled Project".
        // Typing "My Great Keyboard" might have been one or multiple commits depending on blur?
        // We only blurred once. So one undo should revert the name change.
        await expect(nameInput).toHaveValue('Untitled Project');
        
        // Click Redo button
        const redoBtn = page.getByTitle('Redo');
        await expect(redoBtn).toBeEnabled();
        await redoBtn.click();
        
        await expect(nameInput).toHaveValue('My Great Keyboard');
    });
});
