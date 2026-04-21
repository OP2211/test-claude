import { expect, test } from '@playwright/test';

test.describe('core site page coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });
  });

  test('home page exposes sign-in entrypoint for login/registration', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });

  test('match chat route requires authentication and redirects', async ({ page }) => {
    await page.goto('/matches/test-match-id');
    await expect(page).toHaveURL(/\/$/);
  });

  test('matches page requires authentication and redirects', async ({ page }) => {
    await page.goto('/matches');
    await expect(page).toHaveURL(/\/$/);
  });

  test('teams page renders main teams content', async ({ page }) => {
    await page.goto('/teams');
    await expect(page.getByLabel('Team list')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Teams' })).toBeVisible();
  });

  test('leaderboard page renders leaderboard section', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
    await expect(page.locator('.leaderboard-page')).toBeVisible();
  });

  test('profile page shows login prompt when signed out', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
    await expect(page.getByText('Sign in to view your account details.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });

  test('public profile page handles unknown user gracefully', async ({ page }) => {
    await page.goto('/profile/non-existent-e2e-user-12345');
    await expect(page.getByRole('heading', { name: /sent off/i })).toBeVisible();
  });
});
