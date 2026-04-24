import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, boardState, currentPlayer, apiKeyOverride } = body;
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 401 });

    // 1. THE ULTIMATE 2026 MODEL POOL (Ordered by best rate limits)
    const MODEL_POOL = [
      "gemini-3.1-flash-lite-preview", // #1 Priority: Huge free tier
      "gemini-3.1-flash-preview",      // Smartest 3.1 series
      "gemini-3-flash-preview",        // Stable 3.0 version
      "gemini-2.5-flash",              // High stability workhorse
      "gemini-2.5-flash-lite",         // Massive limits, low cost
      "gemini-2.5-pro",                // Smartest fallback
      "gemini-3.1-pro-preview",        // Elite fallback
      "gemma-4-26b-it",                // Open model (very high limits)
      "gemma-4-31b-it",                // High-limit fallback
      "gemini-2.0-flash-001"           // The old reliable (until June 2026)
    ];

    // 2. Build Prompts
    const boardContext = `Board: ${JSON.stringify(boardState)}. Player: ${currentPlayer}. Score: P0:${boardState[7]}, P1:${boardState[15]}.`;
    let systemPrompt = "";
    if (action === 'move') systemPrompt = "Reply ONLY with an integer (8-14) for the best move.";
    else if (action === 'trash_talk') systemPrompt = "Give a 1-sentence snarky comment.";
    else systemPrompt = "Suggest a move (0-6) for the human.";

    const combinedPrompt = `${systemPrompt}\nContext: ${boardContext}`;

    // 3. THE FAILOVER ENGINE
    let finalData = null;
    let successfulModel = "";

    for (const model of MODEL_POOL) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: combinedPrompt }] }]
          })
        });

        // If 404 (Model removed) or 429 (Too many requests), keep moving!
        if (!response.ok) {
          console.warn(`Model ${model} failed (${response.status}). Trying next...`);
          continue;
        }

        finalData = await response.json();
        successfulModel = model;
        break; // We found a winner!
      } catch (err) {
        continue; // Network error, try next
      }
    }

    if (!finalData) {
      return NextResponse.json({ error: 'All 10 models failed. Check API Key or Connection.' }, { status: 500 });
    }

    console.log(`Success with: ${successfulModel}`);
    const result = finalData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return NextResponse.json({ result, modelUsed: successfulModel });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}