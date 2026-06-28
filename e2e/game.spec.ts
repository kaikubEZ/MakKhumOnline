import { test, expect, Page } from '@playwright/test'

// Inject a turn-based board state via the exposed store, bypassing racing phase
async function jumpToTurnBased(page: Page) {
  await page.evaluate(() => {
    const store = (window as Record<string, unknown>).__gameStore as { setState: (s: object) => void }
    const board = new Array(16).fill(7)
    board[7] = 0   // player store starts empty
    board[15] = 0  // ai store starts empty
    store.setState({
      phase: 'turnbased',
      racing: null,
      transitioning: false,
      isAITurn: false,
      isThinking: false,
      turn: { board, currentTurn: 'player', events: [], phase: 'turnbased' },
    })
  })
}

test.describe('Main Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders title and all buttons', async ({ page }) => {
    await expect(page.getByText('MAK KHUM')).toBeVisible()
    await expect(page.getByText('หมากขุม')).toBeVisible()
    await expect(page.getByRole('button', { name: /Play Game/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Rules/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible()
  })

  test('Rules modal opens, all tabs work, closes', async ({ page }) => {
    await page.getByRole('button', { name: /Rules/i }).click()
    await expect(page.getByText('Board Layout')).toBeVisible()

    for (const tab of ['Racing Phase', 'Turn-Based', 'Special Rules', 'Win Condition']) {
      await page.getByRole('button', { name: tab }).click()
    }

    await page.getByRole('button', { name: /Got it/i }).click()
    await expect(page.getByText('Board Layout')).not.toBeVisible()
  })

  test('Settings modal opens and closes via Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /Settings/i }).click()
    await expect(page.getByText(/OpenRouter API Key/i)).toBeVisible()
    await page.getByRole('button', { name: /Cancel/i }).click()
    await expect(page.getByText(/OpenRouter API Key/i)).not.toBeVisible()
  })
})

test.describe('Racing Phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Play Game/i }).click()
  })

  test('Racing Phase banner is shown', async ({ page }) => {
    await expect(page.getByText('Racing Phase', { exact: false })).toBeVisible()
  })

  test('board renders at least 16 pit elements', async ({ page }) => {
    const count = await page.locator('button').count()
    expect(count).toBeGreaterThanOrEqual(16)
  })

  test('board shows pit index labels 0-6 and 8-14', async ({ page }) => {
    for (const idx of [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14]) {
      await expect(page.locator(`text="${idx}"`).first()).toBeVisible()
    }
  })

  test('action helper prompts pit selection on start', async ({ page }) => {
    await expect(page.getByText(/Select any non-empty pit/i)).toBeVisible()
  })

  test('player can click a valid pit to start racing', async ({ page }) => {
    await page.locator('button.ring-2').first().click()
    await expect(page.getByText(/Select any non-empty pit/i)).not.toBeVisible({ timeout: 2000 })
  })

  test('pause overlay appears and resume works', async ({ page }) => {
    await page.getByRole('button', { name: /Pause/i }).click()
    // The overlay shows PAUSED heading and its own Resume button
    await expect(page.getByRole('heading', { name: /PAUSED/i }).or(page.getByText('PAUSED', { exact: true }))).toBeVisible()
    // Click the Resume button inside the overlay (not the header button hidden behind it)
    await page.locator('.fixed button', { hasText: /Resume/i }).first().click()
    await expect(page.getByText('PAUSED', { exact: true })).not.toBeVisible()
  })

  test('pause → main menu returns to menu', async ({ page }) => {
    await page.getByRole('button', { name: /Pause/i }).click()
    await page.locator('.fixed button', { hasText: /Main Menu/i }).click()
    await expect(page.getByText('หมากขุม')).toBeVisible()
  })
})

test.describe('Turn-Based Phase (injected state)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Play Game/i }).click()
    await jumpToTurnBased(page)
    await expect(page.getByText('Turn-Based Phase', { exact: false })).toBeVisible()
  })

  test('Turn-Based Phase banner visible', async ({ page }) => {
    await expect(page.getByText('Turn-Based Phase', { exact: false })).toBeVisible()
  })

  test('action helper says Your turn', async ({ page }) => {
    await expect(page.getByText(/Your turn/i)).toBeVisible()
  })

  test('valid player pits are highlighted', async ({ page }) => {
    // Player pits with seeds should be selectable (ring-2 class)
    const highlighted = page.locator('button.ring-2')
    await expect(highlighted.first()).toBeVisible()
  })

  test('Hint button visible on player turn', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Hint/i })).toBeVisible()
  })

  test('player can click a pit and board updates', async ({ page }) => {
    const first = page.locator('button.ring-2').first()
    await first.click()
    // Move processed: either AI's turn or free turn (player goes again)
    await expect(
      page.getByText(/AI is/i).or(page.getByText(/Your turn/i))
    ).toBeVisible({ timeout: 3000 })
  })

  test('pause works in turn-based phase', async ({ page }) => {
    await page.locator('button', { hasText: /Pause/i }).first().click()
    await expect(page.getByText('PAUSED', { exact: true })).toBeVisible()
    await page.locator('.fixed button', { hasText: /Resume/i }).first().click()
    await expect(page.getByText('PAUSED', { exact: true })).not.toBeVisible()
  })
})

test.describe('Game Over', () => {
  test('game over modal shows result and play again works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Play Game/i }).click()

    // Inject a near-game-over state: player has all seeds, AI has none → player move triggers gameover
    await page.evaluate(() => {
      const store = (window as Record<string, unknown>).__gameStore as { setState: (s: object) => void }
      const board = new Array(16).fill(0)
      board[0] = 1   // player has 1 seed in pit 0
      board[7] = 45  // player store
      board[15] = 30 // ai store
      // AI pits all empty → after player moves, gameover
      store.setState({
        phase: 'turnbased',
        racing: null,
        transitioning: false,
        isAITurn: false,
        isThinking: false,
        turn: { board, currentTurn: 'player', events: [], phase: 'turnbased' },
      })
    })

    await expect(page.locator('button.ring-2').first()).toBeVisible()
    await page.locator('button.ring-2').first().click()

    // Game Over modal
    await expect(page.getByText(/You Win!|AI Wins!|Draw/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Play Again/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Main Menu/i })).toBeVisible()

    await page.getByRole('button', { name: /Play Again/i }).click()
    await expect(page.getByText('Racing Phase', { exact: false })).toBeVisible()
  })
})

test.describe('Settings — API key', () => {
  test('key saves and masked display shows', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Settings/i }).click()
    await page.locator('input[type="password"]').fill('sk-test-key-12345')
    await page.getByRole('button', { name: /Save/i }).click()

    // Reopen — masked key display should appear
    await page.getByRole('button', { name: /Settings/i }).click()
    await expect(page.locator('text=sk-test-')).toBeVisible() // first 8 chars visible, rest masked
    await page.getByRole('button', { name: /Clear/i }).click()
  })
})
