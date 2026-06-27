const MODELS = [
  'openrouter/owl-alpha',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'poolside/laguna-m.1:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
  'poolside/laguna-xs.2:free',
  'cohere/north-mini-code:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
]

async function callModel(apiKey: string, model: string, prompt: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.choices[0].message.content as string
  } finally {
    clearTimeout(timer)
  }
}

export async function askAI(apiKey: string, prompt: string): Promise<string | null> {
  for (const model of MODELS) {
    try {
      return await callModel(apiKey, model, prompt)
    } catch {
      // try next
    }
  }
  return null
}
