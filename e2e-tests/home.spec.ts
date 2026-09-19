import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('filters games by title as the user types', async ({ page }) => {
    const searchInput = page.getByTestId('game-search-input');

    await expect(page.getByTestId('game-card')).toHaveCount(21);

    await searchInput.fill('devops');

    await expect(page.getByTestId('game-card')).toHaveCount(21);
    const matchingCard = page.locator('[data-testid="game-card"]:not([hidden])');
    await expect(matchingCard).toHaveCount(1);
    await expect(matchingCard.getByTestId('game-title')).toHaveText('DevOps Dominion');
    await expect(page.getByTestId('game-search-status')).toHaveText('Showing 1 game');
  });

  test('shows an empty state when no games match', async ({ page }) => {
    await page.getByTestId('game-search-input').fill('not a real game');

    await expect(page.getByTestId('search-empty-state')).toBeVisible();
    await expect(page.getByTestId('empty-state-text')).toHaveText('No games match your search.');
    await expect(page.getByTestId('game-search-status')).toHaveText('Showing 0 games');
  });
});
