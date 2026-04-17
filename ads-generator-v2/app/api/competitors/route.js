export const maxDuration = 60;
import { callAI, parseJSON } from '../lib.js';

async function scrapeGoogleAds(keyword) {
  const ads = [];
  try {
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(keyword) + '&gl=us&hl=en';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return ads;
    const html = await res.text();
    const titleMatches = html.match(/data-dtld="([^"]+)"/g) || [];
    const headlineMatches = html.match(/<div class="[^"]*CCgQ5[^"]*"[^>]*>([^<]{10,80})<\/div>/g) || [];
    const descMatches = html.match(/<div class="[^"]*MUxGbd[^"]*"[^>]*>([^<]{20,150})<\/div>/g) || [];
    titleMatches.slice(0, 5).forEach(m => {
      const domain = m.replace('data-dtld="', '').replace('"', '');
      ads.push({ domain, type: 'advertiser' });
    });
    headlineMatches.slice(0, 10).forEach(m => {
      const text = m.replace(/<[^>]*>/g, '').trim();
      if (text.length > 5) ads.push({ text, type: 'headline' });
    });
    descMatches.slice(0, 5).forEach(m => {
      const text = m.replace(/<[^>]*>/g, '').trim();
      if (text.length > 10) ads.push({ text, type: 'description' });
    });
  } catch (e) {}
  return ads;
}

async function scrapeTransparencyCenter(domain) {
  const ads = [];
  try {
    const url = 'https://adstransparency.google.com/advertiser/search?query=' + encodeURIComponent(domain);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdsResearch/2.0)' } });
    if (!res.ok) return ads;
    const html = await res.text();
    const matches = html.match(/"headline":"([^"]+)"/g) || [];
    matches.slice(0, 10).forEach(m => {
      const text = m.replace('"headline":"', '').replace('"', '');
      if (text.length > 3) ads.push(text);
    });
  } catch (e) {}
  return ads;
}

export async function POST(req) {
  try {
    const { competitors, approvedThemes, productName, audience, keywords } = await req.json();
    if (!competitors?.length) return Response.json({ error: 'No competitors provided' }, { status: 400 });

    const competitorData = {};
    const googleAdsData = {};

    await Promise.all([
      ...competitors.slice(0, 4).map(async domain => {
        const ads = await scrapeTransparencyCenter(domain);
        competitorData[domain] = ads;
      }),
      ...keywords.slice(0, 2).map(async kw => {
        const ads = await scrapeGoogleAds(kw);
        googleAdsData[kw] = ads;
      })
    ]);

    const competitorStr = Object.entries(competitorData)
      .map(([d, ads]) => d + ': ' + (ads.length ? ads.join(' | ') : 'no ads found'))
      .join('\n');

    const googleStr = Object.entries(googleAdsData)
      .map(([kw, ads]) => 'Search "' + kw + '":\n' + ads.map(a => (a.text || a.domain) + ' (' + a.type + ')').join('\n'))
      .join('\n\n');

    const themesStr = approvedThemes.map(t => t.theme + ': ' + t.description).join('\n');

    const prompt = 'You are a competitive intelligence analyst for ' + productName + '.\n'
      + 'Target audience: ' + (audience || 'developers and technical founders') + '\n\n'
      + 'Our approved pain themes:\n' + themesStr + '\n\n'
      + 'Competitor ad data (from Google Ads Transparency):\n' + competitorStr + '\n\n'
      + 'Live Google Search ads for our keywords:\n' + googleStr + '\n\n'
      + 'Tasks:\n'
      + '1. Summarize what angles each competitor is using\n'
      + '2. Find GAPS — pain points our audience has that competitors are NOT addressing\n'
      + '3. For each gap suggest a specific counter-angle for ' + productName + '\n'
      + '4. Rate each gap priority: high / medium / low\n\n'
      + 'Return ONLY valid JSON:\n'
      + '{"competitor_summary":[{"domain":"domain.com","angles":["angle1"],"weakness":"what they are missing"}],"gaps":[{"gap":"gap description","opportunity":"specific counter-angle for ' + productName + '","priority":"high/medium/low","reason":"why this is an opportunity"}]}';

    const { text, model } = await callAI(prompt, process.env.ANTHROPIC_API_KEY, process.env.OPENAI_API_KEY);
    const result = parseJSON(text);
    result.model_used = model;
    result.raw_data = { competitorData, googleAdsData };
    return Response.json(result);

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
