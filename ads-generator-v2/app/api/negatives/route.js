export const maxDuration = 30;
import { callAI, parseJSON } from '../lib.js';

const PRESET_NEGATIVES = {
  'Gaming & entertainment': ['gaming', 'game server', 'minecraft', 'roblox', 'discord bot', 'twitch', 'steam', 'xbox', 'playstation'],
  'Free seekers': ['free', 'free trial', 'free hosting', 'free tier', 'no cost', 'gratis', 'freeware', 'open source free'],
  'Self-hosting / DIY': ['self host', 'self-host', 'home server', 'raspberry pi', 'diy', 'local install', 'on premise'],
  'Jobs & careers': ['jobs', 'career', 'salary', 'hire', 'intern', 'resume', 'cv', 'job posting'],
  'Education': ['tutorial', 'how to', 'learn', 'course', 'school', 'homework', 'beginner guide'],
  'Piracy': ['crack', 'cracked', 'torrent', 'pirate', 'nulled', 'keygen', 'serial key'],
  'Wrong product': ['vpn', 'proxy', 'web hosting', 'wordpress', 'shared hosting', 'cpanel']
};

export async function POST(req) {
  try {
    const { productName, keywords, approvedThemes } = await req.json();

    const prompt = 'You are a Google Ads negative keyword specialist for ' + productName + '.\n'
      + 'Targeting keywords: ' + keywords.join(', ') + '\n\n'
      + 'Identify additional negative keywords specific to this product and niche.\n'
      + 'Focus on: wrong intent, wrong audience, competitor brand names, irrelevant use cases.\n\n'
      + 'Return ONLY valid JSON:\n'
      + '{"custom_negatives":[{"keyword":"word","match_type":"exact/phrase/broad","reason":"why to block this"}]}';

    const { text, model } = await callAI(prompt, process.env.ANTHROPIC_API_KEY, process.env.OPENAI_API_KEY);
    const result = parseJSON(text);
    result.preset_negatives = PRESET_NEGATIVES;
    result.model_used = model;
    return Response.json(result);

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
