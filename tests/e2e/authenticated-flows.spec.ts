import { expect, type Page, test } from '@playwright/test';

const SESSION = {
  user: {
    name: 'Test Fan',
    email: 'testfan@example.com',
    image: 'https://example.com/avatar.png',
    googleSub: 'google-sub-1',
  },
  expires: '2099-01-01T00:00:00.000Z',
};

const BASE_PROFILE = {
  google_sub: 'google-sub-1',
  full_name: 'Test Fan',
  email: 'testfan@example.com',
  image: null,
  username: 'testfan',
  phone: '9876543210',
  fan_team_id: 'arsenal',
  dob: null,
  city: 'London',
};

const MATCH_FIXTURE = {
  id: 'test-match-id',
  homeTeamId: 'arsenal',
  awayTeamId: 'chelsea',
  kickoff: '2099-01-01T18:00:00.000Z',
  competition: 'Premier League',
  venue: 'Emirates Stadium',
  status: 'upcoming',
  homeTeam: { name: 'Arsenal', shortName: 'ARS', badge: 'ARS', color: '#EF0107' },
  awayTeam: { name: 'Chelsea', shortName: 'CHE', badge: 'CHE', color: '#034694' },
  teamSheet: {
    home: { formation: '4-3-3', players: [], confirmed: false },
    away: { formation: '4-3-3', players: [], confirmed: false },
  },
};

async function mockAuthenticatedSession(page: Page): Promise<void> {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) });
  });
}

async function mockMatchesApis(page: Page): Promise<void> {
  await page.route('**/api/matches', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MATCH_FIXTURE]) });
  });
  await page.route('**/api/match?id=*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MATCH_FIXTURE) });
  });
  await page.route('**/api/messages?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [], hasMore: false }),
    });
  });
  await page.route('**/api/vote?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ home: 0, draw: 0, away: 0 }),
    });
  });
  await page.route('**/api/pusher-config', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

test.describe('authenticated flow coverage', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockMatchesApis(page);
  });

  test('signed-in user can access matches page', async ({ page }) => {
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: BASE_PROFILE, isOnboardingComplete: true }),
      });
    });

    await page.goto('/matches');
    await expect(page).toHaveURL(/\/matches$/);
    await expect(page.getByRole('button', { name: 'Matches', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Teams' })).toBeVisible();
  });

  test('signed-in user can open match chat room', async ({ page }) => {
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: BASE_PROFILE, isOnboardingComplete: true }),
      });
    });

    await page.goto('/matches/test-match-id');
    await expect(page).toHaveURL(/\/matches\/test-match-id$/);
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
    await expect(page.getByText('ARS').first()).toBeVisible();
    await expect(page.getByText('CHE').first()).toBeVisible();
  });

  test('signed-in new user can complete registration onboarding', async ({ page }) => {
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: null, isOnboardingComplete: false }),
      });
    });
    await page.route('**/api/profile/username-available?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true }),
      });
    });
    await page.route('**/api/profile/upsert', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: BASE_PROFILE }),
      });
    });

    await page.goto('/matches');
    await expect(page.getByRole('heading', { name: 'Complete Your Profile' })).toBeVisible();

    await page.getByPlaceholder('Username').fill('newfan');
    await page.getByPlaceholder('Phone number (10 digits)').fill('9876543210');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Pick Your Club' })).toBeVisible();

    await page.getByRole('button', { name: 'Arsenal', exact: true }).click();
    await page.getByRole('button', { name: "Let's Go" }).click();
    await expect(page.getByRole('heading', { name: 'Complete Your Profile' })).toBeHidden();
  });

  test('signed-in user can access profile page account data', async ({ page }) => {
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: BASE_PROFILE,
          referralCode: 'ABCDE',
          invitedBy: null,
          invitedMembers: [],
          foundingFanTier: null,
        }),
      });
    });

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Account info' })).toBeVisible();
    await expect(page.getByText('@testfan')).toBeVisible();
  });
});
