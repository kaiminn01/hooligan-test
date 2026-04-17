export const maxDuration = 60;
import { callAI, parseJSON } from '../lib.js';

function scoreHeadline(text, keywords, chars) {
  if (chars > 30) return { score: 0, flags: ['Over 30 chars — Google will reject'] };
  let score = 30;
  const flags = [];
  const lower = text.toLowerCase();
  const hasKeyword = keywords.some(k => lower.includes(k.toLowerCase().split(' ')[0]));
  if (hasKeyword) score += 25; else flags.push('No keyword — add your main keyword');
  const hasPain = /\?|crash|fail|down|fix|stop|tired|broken|slow|lose|waste|stuck|never|always|keep|still|restart|offline|dead/.test(lower);
  if (hasPain) score += 20; else flags.push('No pain signal — call out a specific frustration');
  const hasOutcome = /\d|free|fast|instant|minute|second|hour|day|guarantee|never|always|no more|without|24\/7/.test(lower);
  if (hasOutcome) score += 15; else flags.push('No outcome/number — add a specific result or number');
  const isGeneric = /best|great|solution|service|platform|tool|help|support|easy|simple|powerful/.test(lower);
  if (!isGeneric) score += 10; else flags.push('Too generic — avoid words like "best", "solution", "platform"');
  return { score, flags };
}

function scoreDescription(text, chars) {
  if (chars > 90) return { score: 0, flags: ['Over 90 chars — Google will reject'] };
  let score = 30;
  const flags = [];
  const lower = text.toLowerCase();
  const hasBenefit = /no |without |never |always |24\/7|instant|minute|second|\$|free|guarantee|zero|eliminate/.test(lower);
  if (hasBenefit) score += 35; else flags.push('No clear benefit — show what the user gains');
  const hasCTA = /get|start|try|deploy|move|switch|sign|join|see|learn|discover|stop|fix/.test(lower);
  if (hasCTA) score += 20; else flags.push('No CTA — add an action word');
  if (text.split(' ').length > 8) score += 15; else flags.push('Too short — add more specific detail');
  return { score, flags };
}

export async function POST(req) {
  try {
    const { approvedThemes, approvedGaps, offer, productName, audience, keywords, finalUrl, variationsPerTheme } = await req.json();

    const themesStr = approvedThemes.map(t =>
      'Theme: ' + t.theme + ' [Pain level: ' + t.pain_level + ']\n' +
      'Pain: ' + t.description + '\n' +
      'Real quotes: ' + (t.quotes || []).join(' | ') + '\n' +
      'Why people feel this: ' + (t.grouping_reason || '')
    ).join('\n\n');

    const gapsStr = approvedGaps?.length
      ? 'Competitor gaps to exploit:\n' + approvedGaps.map(g => '- ' + g.gap + ' → ' + g.opportunity).join('\n')
      : '';

    const varCount = variationsPerTheme || 10;

    const prompt = 'You are a high-converting Google Ads copywriter for ' + productName + '.\n'
      + 'Target audience: ' + (audience || 'developers and technical founders') + '\n'
      + 'Offer/hook: ' + (offer || 'managed hosting, always-on, no DevOps') + '\n'
      + 'Keywords to include: ' + keywords.join(', ') + '\n\n'
      + 'Pain themes (use real quotes and language):\n' + themesStr + '\n\n'
      + gapsStr + '\n\n'
      + 'For each theme generate ' + varCount + ' headlines and 5 descriptions.\n\n'
      + 'VARIATION TYPES — generate a mix of these per theme:\n'
      + '- Problem-led: "OpenClaw Down Again?" (speaks to active frustration)\n'
      + '- Solution-led: "Always-On OpenClaw Host" (desired outcome)\n'
      + '- Offer-led: lead with price, trial, speed\n'
      + '- Fear-led: loss aversion, "Stop Losing Work to Crashes"\n'
      + '- Question: conversational, high CTR\n'
      + '- Keyword-mirror: exact match to what they searched\n'
      + '- Competitor-counter: directly counter a competitor weakness\n\n'
      + 'STRICT RULES:\n'
      + '- Headlines: MAX 30 characters including spaces. Count every character carefully.\n'
      + '- Descriptions: MAX 90 characters including spaces.\n'
      + '- Use real language from the quotes — not polished marketing speak\n'
      + '- Offer must appear in at least 2 headlines and 2 descriptions per theme\n'
      + '- At least 3 headlines per theme must contain a main keyword\n\n'
      + 'Return ONLY valid JSON:\n'
      + '{"themes":[{"theme":"name","pain_level":"critical/moderate/mild","headlines":[{"text":"headline","chars":0,"variation_type":"problem-led/solution-led/offer-led/fear-led/question/keyword-mirror/competitor-counter"}],"descriptions":[{"text":"description","chars":0}],"landing_page_brief":"what the landing page headline and copy should say to match this ad"}]}';

    const { text, model } = await callAI(prompt, process.env.ANTHROPIC_API_KEY, process.env.OPENAI_API_KEY);
    const result = parseJSON(text);

    result.themes = result.themes.map(theme => ({
      ...theme,
      headlines: theme.headlines.map(h => ({
        ...h,
        chars: h.text.length,
        ...scoreHeadline(h.text, keywords, h.text.length)
      })).sort((a, b) => b.score - a.score),
      descriptions: theme.descriptions.map(d => ({
        ...d,
        chars: d.text.length,
        ...scoreDescription(d.text, d.text.length)
      })).sort((a, b) => b.score - a.score)
    }));

    result.model_used = model;
    result.final_url = finalUrl;
    return Response.json(result);

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
