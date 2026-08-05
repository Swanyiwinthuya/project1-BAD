const categories = new Set(['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCOUNT_ACCESS', 'AUDIO_VISUAL', 'OTHER']);
const priorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

function fallbackClassification(text) {
  const value = text.toLowerCase();
  let category = 'OTHER';
  if (/projector|screen|microphone|speaker|hdmi/.test(value)) category = 'AUDIO_VISUAL';
  else if (/wifi|network|internet|ethernet|router/.test(value)) category = 'NETWORK';
  else if (/password|login|account|mfa|access/.test(value)) category = 'ACCOUNT_ACCESS';
  else if (/computer|laptop|keyboard|mouse|printer|broken/.test(value)) category = 'HARDWARE';
  else if (/software|application|app|windows|update|install/.test(value)) category = 'SOFTWARE';

  const priority = /emergency|urgent|exam|class now|all users|security/.test(value) ? 'HIGH' : 'MEDIUM';
  return { category, priority, reason: 'Keyword-based fallback classification.' };
}

export async function classifyTicket({ title, description, room }) {
  const fallback = fallbackClassification(`${title} ${description} ${room || ''}`);
  if (!process.env.GEMINI_API_KEY) return fallback;

  const prompt = `Classify this university IT ticket. Return only JSON with category, priority, and reason. Categories: HARDWARE, SOFTWARE, NETWORK, ACCOUNT_ACCESS, AUDIO_VISUAL, OTHER. Priorities: LOW, MEDIUM, HIGH. Title: ${title}\nDescription: ${description}\nRoom: ${room || 'Not supplied'}`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return fallback;
    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    return {
      category: categories.has(parsed.category) ? parsed.category : fallback.category,
      priority: priorities.has(parsed.priority) && parsed.priority !== 'URGENT' ? parsed.priority : fallback.priority,
      reason: String(parsed.reason || fallback.reason).slice(0, 500)
    };
  } catch {
    return fallback;
  }
}

