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
    `Write ONE short, funny, smug comment about your move. 10–20 words. No quotation marks.`
  )
}

export function parsePit(text: string, validPits: number[]): number | null {
  const numbers = [...text.matchAll(/\d+/g)].map(m => parseInt(m[0], 10))
  return numbers.find(n => validPits.includes(n)) ?? null
}
