import { test, expect } from '@playwright/test';
import testdata from './testData.json';
import locators from './locators.json';

// Example test using testdata
test('LOGIN TEST', async ({ page }) => {
    await page.goto(testdata.url);
    await page.fill(locators.username, testdata.credentials.username);
    await page.fill(locators.password, testdata.credentials.password);
    await page.click(locators.loginButton);
    await expect(page.locator(locators.welcomeMessage)).toBeVisible();  
});
