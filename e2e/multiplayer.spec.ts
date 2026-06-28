import { test, expect, chromium } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

// ── Server lifecycle ──────────────────────────────────────────────────────────

let serverProcess: ChildProcess

async function waitForPort(port: number, ms = 5000): Promise<void> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${port}/rooms`, { method: 'HEAD' })
      return
    } catch {
      await new Promise(r => setTimeout(r, 100))
    }
  }
  throw new Error(`Server on :${port} not ready after ${ms}ms`)
}

test.beforeAll(async () => {
  serverProcess = spawn('npx', ['tsx', 'index.ts'], {
    cwd: path.join(process.cwd(), 'server'),
    stdio: 'pipe',
    env: { ...process.env, PORT: '3001' },
  })
  await waitForPort(3001)
})

test.afterAll(() => {
  serverProcess?.kill()
})

// ── Navigation (no server interaction) ───────────────────────────────────────

test.describe('Multiplayer navigation', () => {
  test('Multiplayer button appears on main menu', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Multiplayer/i })).toBeVisible()
  })

  test('Multiplayer button opens lobby', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Multiplayer/i }).click()
    await expect(page.getByText('MULTIPLAYER')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Room' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Join Room' })).toBeVisible()
  })

  test('Back button returns to main menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Multiplayer/i }).click()
    await page.getByRole('button', { name: /← Back/i }).click()
    await expect(page.getByText('หมากขุม')).toBeVisible()
  })

  test('Join Room shows code input', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Multiplayer/i }).click()
    await page.getByRole('button', { name: 'Join Room' }).click()
    await expect(page.getByRole('heading', { name: 'Join Room' })).toBeVisible()
    await expect(page.locator('input[maxlength="6"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Join' })).toBeDisabled()
  })

  test('Join button enables only when 6 digits entered', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Multiplayer/i }).click()
    await page.getByRole('button', { name: 'Join Room' }).click()
    const input = page.locator('input[maxlength="6"]')
    await input.fill('123')
    await expect(page.getByRole('button', { name: 'Join' })).toBeDisabled()
    await input.fill('123456')
    await expect(page.getByRole('button', { name: 'Join' })).toBeEnabled()
  })

  test('Back inside Join Room returns to lobby menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Multiplayer/i }).click()
    await page.getByRole('button', { name: 'Join Room' }).click()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('button', { name: 'Create Room' })).toBeVisible()
  })
})

// ── Full 2-player flow ────────────────────────────────────────────────────────

test.describe('Multiplayer full flow', () => {
  test('Player1 creates room, Player2 joins, both reach Turn-Based Phase', async () => {
    const browser = await chromium.launch()
    const ctx1 = await browser.newContext()
    const ctx2 = await browser.newContext()
    const p1 = await ctx1.newPage()
    const p2 = await ctx2.newPage()

    try {
      // Player1: create room → waiting screen
      await p1.goto('http://localhost:5173')
      await p1.getByRole('button', { name: /Multiplayer/i }).click()
      await p1.getByRole('button', { name: 'Create Room' }).click()
      await expect(p1.getByText('Waiting for opponent')).toBeVisible({ timeout: 5000 })

      const code = (await p1.locator('p.tracking-\\[0\\.25em\\]').textContent())?.trim()
      expect(code).toMatch(/^\d{6}$/)

      // Player2: join with that code
      await p2.goto('http://localhost:5173')
      await p2.getByRole('button', { name: /Multiplayer/i }).click()
      await p2.getByRole('button', { name: 'Join Room' }).click()
      await p2.locator('input[maxlength="6"]').fill(code!)
      await p2.getByRole('button', { name: 'Join' }).click()

      // Both should reach Turn-Based Phase
      await expect(p1.getByText('Turn-Based Phase', { exact: false })).toBeVisible({ timeout: 8000 })
      await expect(p2.getByText('Turn-Based Phase', { exact: false })).toBeVisible({ timeout: 8000 })
    } finally {
      await browser.close()
    }
  })

  test('Player2 board is flipped: bottom row shows pits 8–14', async () => {
    const browser = await chromium.launch()
    const ctx1 = await browser.newContext()
    const ctx2 = await browser.newContext()
    const p1 = await ctx1.newPage()
    const p2 = await ctx2.newPage()

    try {
      await p1.goto('http://localhost:5173')
      await p1.getByRole('button', { name: /Multiplayer/i }).click()
      await p1.getByRole('button', { name: 'Create Room' }).click()
      await expect(p1.getByText('Waiting for opponent')).toBeVisible({ timeout: 5000 })
      const code = (await p1.locator('p.tracking-\\[0\\.25em\\]').textContent())?.trim()

      await p2.goto('http://localhost:5173')
      await p2.getByRole('button', { name: /Multiplayer/i }).click()
      await p2.getByRole('button', { name: 'Join Room' }).click()
      await p2.locator('input[maxlength="6"]').fill(code!)
      await p2.getByRole('button', { name: 'Join' }).click()

      await expect(p2.getByText('Turn-Based Phase', { exact: false })).toBeVisible({ timeout: 8000 })

      // Player2's board should show pit index 8 in the bottom row
      // Bottom row labels visible: 8,9,10,11,12,13,14
      const bottomRowLabels = await p2.evaluate(() => {
        const spans = [...document.querySelectorAll('span.text-amber-600\\/60')]
        return spans.map(s => s.textContent?.trim())
      })
      // flipped bottom row = [8,9,10,11,12,13,14], top row = [6,5,4,3,2,1,0]
      expect(bottomRowLabels).toContain('8')
      expect(bottomRowLabels).toContain('14')

      // Player1's board: standard layout, bottom row has 0–6
      const p1BottomLabels = await p1.evaluate(() => {
        const spans = [...document.querySelectorAll('span.text-amber-600\\/60')]
        return spans.map(s => s.textContent?.trim())
      })
      expect(p1BottomLabels).toContain('0')
      expect(p1BottomLabels).toContain('6')
    } finally {
      await browser.close()
    }
  })

  test('Player1 move is relayed: Player2 sees board change', async () => {
    const browser = await chromium.launch()
    const ctx1 = await browser.newContext()
    const ctx2 = await browser.newContext()
    const p1 = await ctx1.newPage()
    const p2 = await ctx2.newPage()

    try {
      await p1.goto('http://localhost:5173')
      await p1.getByRole('button', { name: /Multiplayer/i }).click()
      await p1.getByRole('button', { name: 'Create Room' }).click()
      await expect(p1.getByText('Waiting for opponent')).toBeVisible({ timeout: 5000 })
      const code = (await p1.locator('p.tracking-\\[0\\.25em\\]').textContent())?.trim()

      await p2.goto('http://localhost:5173')
      await p2.getByRole('button', { name: /Multiplayer/i }).click()
      await p2.getByRole('button', { name: 'Join Room' }).click()
      await p2.locator('input[maxlength="6"]').fill(code!)
      await p2.getByRole('button', { name: 'Join' }).click()

      await expect(p1.getByText('Turn-Based Phase', { exact: false })).toBeVisible({ timeout: 8000 })
      await expect(p2.getByText('Turn-Based Phase', { exact: false })).toBeVisible({ timeout: 8000 })

      // Snapshot P2 board before Player1 moves
      const boardBefore = await p2.evaluate(() =>
        [...document.querySelectorAll('span.text-xl.font-black')].map(s => s.textContent)
      )

      // Player1 clicks a highlighted pit
      await p1.locator('button.ring-2').first().click()

      // Wait for animation to complete and board to differ
      await p2.waitForFunction((before) => {
        const after = [...document.querySelectorAll('span.text-xl.font-black')].map(s => s.textContent)
        return JSON.stringify(after) !== JSON.stringify(before)
      }, boardBefore, { timeout: 5000 })

      const boardAfter = await p2.evaluate(() =>
        [...document.querySelectorAll('span.text-xl.font-black')].map(s => s.textContent)
      )
      expect(boardAfter).not.toEqual(boardBefore)
    } finally {
      await browser.close()
    }
  })

  test('Cancel waiting returns to lobby', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Multiplayer/i }).click()
    await page.getByRole('button', { name: 'Create Room' }).click()
    await expect(page.getByText('Waiting for opponent')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Create Room' })).toBeVisible()
  })
})
