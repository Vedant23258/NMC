import { expect, test } from '@playwright/test';

test('login and dashboard smoke path', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue' }).first().click();
  await expect(page.getByText('Live Operations Dashboard')).toBeVisible();
  await page.getByRole('link', { name: 'Complaints' }).click();
  await expect(page.getByText('Complaints')).toBeVisible();
});
