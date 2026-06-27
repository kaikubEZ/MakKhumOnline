import { describe, it, expect } from 'vitest'
import { movePrompt, hintPrompt, trashTalkPrompt, parsePit } from './prompts'

const board = Array(16).fill(7)
const validPits = [9, 10, 11]

describe('prompts', () => {
  it('movePrompt includes board and valid pits', () => {
    const p = movePrompt(board, validPits)
    expect(p).toContain('9, 10, 11')
    expect(p).toContain('7, 7, 7')
  })

  it('hintPrompt includes valid pits', () => {
    const p = hintPrompt(board, validPits)
    expect(p).toContain('9, 10, 11')
  })

  it('trashTalkPrompt returns non-empty string', () => {
    expect(trashTalkPrompt().length).toBeGreaterThan(10)
  })
})

describe('parsePit', () => {
  it('extracts valid pit from "I choose 10"', () => {
    expect(parsePit('I choose 10', [9, 10, 11])).toBe(10)
  })

  it('returns null for pit not in validPits', () => {
    expect(parsePit('pit 5', [9, 10, 11])).toBeNull()
  })

  it('returns null when no number found', () => {
    expect(parsePit('no idea', [9, 10, 11])).toBeNull()
  })

  it('returns first valid pit number found', () => {
    expect(parsePit('9 then 11', [9, 10, 11])).toBe(9)
  })
})
