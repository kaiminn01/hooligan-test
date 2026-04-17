export async function callAI(prompt, anthropicKey, openaiKey) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!res.ok) throw new Error('Claude error');
    return { text: data.content?.find(b => b.type === 'text')?.text || '', model: 'Claude Sonnet' };
  } catch (e) {
    console.log('Claude failed:', e.message, '— falling back to GPT-4o');
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'GPT-4o error');
  }
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || '', model: 'GPT-4o' };
}

export function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}
