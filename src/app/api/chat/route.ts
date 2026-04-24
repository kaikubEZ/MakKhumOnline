import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, boardState, currentPlayer, apiKeyOverride } = body;

    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 401 });
    }

    if (!action || !boardState) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let systemPrompt = '';
    let userPrompt = '';

    const boardContext = `
The game is Mak Khum (Mancala). Board is an array of 16 integers:
- Indices 0-6: Player 0 (Human) pits.
- Index 7: Player 0's store.
- Indices 8-14: Player 1 (AI) pits.
- Index 15: Player 1's store.
Current Player: ${currentPlayer} (0 is Human, 1 is AI).
Current Board State: ${JSON.stringify(boardState)}.
Player 0's score is ${boardState[7]}, Player 1's score is ${boardState[15]}.
`;

    if (action === 'move') {
      systemPrompt = `INSTRUCTIONS: You are the AI opponent (Player 1) in a game of Mak Khum (Mancala). Your pits are indices 8 to 14. You must choose a valid pit to play. A valid pit has > 0 seeds. Evaluate the board and pick the best move to maximize your score (index 15) and minimize the opponent's score (index 7). Reply ONLY with a single integer (8-14) representing the index of the pit you choose. Do not include any other text.\n\n`;
      userPrompt = boardContext + "\nWhat is your move? Reply with only the integer.";
    } else if (action === 'trash_talk') {
      systemPrompt = `INSTRUCTIONS: You are a snarky, competitive, and witty AI opponent playing Mak Khum. Keep your response short (1-2 sentences). You are Player 1. Be sarcastic if you're winning, or defensively witty if you're losing.\n\n`;
      userPrompt = boardContext + "\nSay something to your opponent based on the current score and board state.";
    } else if (action === 'hint') {
      systemPrompt = `INSTRUCTIONS: You are a helpful and strategic Mak Khum coach for the human player (Player 0). Analyze the board and suggest the best pit (0-6) for Player 0 to play. Explain your reasoning briefly. Keep it concise (2-3 sentences).\n\n`;
      userPrompt = boardContext + "\nWhat move should Player 0 make and why?";
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const combinedPrompt = systemPrompt + userPrompt;

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: combinedPrompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      let errorData;
      const errorText = await response.text();
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('Gemini API Error:', errorData);
      return NextResponse.json({ error: 'Failed to communicate with Gemini API', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!result) {
      throw new Error('Unexpected response format from Gemini');
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
