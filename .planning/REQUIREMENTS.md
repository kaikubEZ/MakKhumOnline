# Requirements: Mak Khum

## Phase 3: AI Integration

- REQ-13: Settings modal with API key input, save to localStorage, clear, mask (show/hide)
- REQ-14: OpenRouter API call for AI turn-based moves with model failover chain
- REQ-15: OpenRouter API call for player move hints (on demand, player's turn only)
- REQ-16: Trash talk generation via OpenRouter (~70% frequency per AI turn)
- REQ-17: Graceful fallback to random valid move when API key absent or API fails
- REQ-18: "AI is thinking..." loading state shown during API call; no double-submits

## Model Failover Order (REQ-14)

Try in sequence on failure/unavailability:
1. google/gemini-2.5-flash
2. anthropic/claude-haiku-4-5
3. meta-llama/llama-3.3-70b-instruct

Fallback: random valid move if all models fail. Show "AI used fallback move." message.

## AI Timeout (REQ-14, REQ-18)

8-second timeout per API call before falling back to random move.

## Trash Talk (REQ-16)

Pre-generate 10-15 lines at game start; randomly pick from them per AI turn.
~70% frequency (randomly skip 30% of turns).

## Hint (REQ-15)

Available only on player's turn, no animation running.
API call returns best pit recommendation with brief explanation.
