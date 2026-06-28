export function movePrompt(board: number[], validPits: number[]): string {
  return (
    `You are playing Mak Khum (Thai mancala). ` +
    `Board seeds by index 0–15: [${board.join(', ')}]. ` +
    `Your pits are 8–14; index 15 is your store. ` +
    `Valid pits you can choose: [${validPits.join(', ')}]. ` +
    `Reply with ONLY a single integer — the pit index you choose. No explanation.`
  )
}

export function hintPrompt(board: number[], validPits: number[]): string {
  return (
    `You are advising a Mak Khum player. ` +
    `Board seeds by index 0–15: [${board.join(', ')}]. ` +
    `Player pits are 0–6; index 7 is their store. ` +
    `Valid pits: [${validPits.join(', ')}]. ` +
    `Suggest ONE pit and explain why in one short sentence. Format exactly: "Try pit N — reason."`
  )
}

export function trashTalkPrompt(): string {
  return (
    `You are a smug AI opponent in a Thai mancala game called Mak Khum. ` +
    `Reply with ONLY one short smug taunt, 8–15 words, no quotes, no explanation, no extra text.`
  )
}

const META_RE = /^(the user|count:|let'?s|constraint|we need|that'?s|add |step |here |ok |sure |i |write|reply|must be|example:|class=)/i

export function extractTrashTalk(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
  const clean = lines.filter(l => {
    if (l.length > 120 || META_RE.test(l)) return false
    const words = l.split(/\s+/).filter(Boolean).length
    return words >= 4 && words <= 25
  })
  return clean.at(-1) ?? null
}

export function parsePit(text: string, validPits: number[]): number | null {
  const numbers = [...text.matchAll(/\d+/g)].map(m => parseInt(m[0], 10))
  return numbers.find(n => validPits.includes(n)) ?? null
}
