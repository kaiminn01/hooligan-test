export const maxDuration = 60;
import { callAI, parseJSON } from '../lib.js';

async function scrapeReddit(keywords, timeframe, redditToken) {
  const posts = [];
  const t = timeframe === '30d' ? 'month' : timeframe === '3m' ? 'quarter' : 'year';
  for (const kw of keywords.slice(0, 3)) {
    try {
      const headers = redditToken
        ? { 'Authorization': 'Bearer ' + redditToken, 'User-Agent': 'AdsResearch/2.0' }
        : { 'User-Agent': 'AdsResearch/2.0 (research tool)' };
      const url = redditToken
        ? 'https://oauth.reddit.com/search.json?q=' + encodeURIComponent(kw) + '&sort=relevance&limit=15&t=' + t
        : 'https://www.reddit.com/search.json?q=' + encodeURIComponent(kw) + '&sort=relevance&limit=15&t=' + t;
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      for (const child of (data?.data?.children || [])) {
        const p = child.data;
        if (p.title) posts.push('[Reddit r/' + p.subreddit + '] "' + p.title + '" ' + (p.selftext ? '-- ' + p.selftext.slice(0, 400) : ''));
      }
    } catch (e) {}
  }
  return posts;
}

async function scrapeYouTube(keywords, apiKey) {
  if (!apiKey) return [];
  const comments = [];
  for (const kw of keywords.slice(0, 2)) {
    try {
      const searchRes = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(kw) + '&type=video&maxResults=5&key=' + apiKey);
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      for (const video of (searchData.items || []).slice(0, 3)) {
        const vid = video.id.videoId;
        const commRes = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' + vid + '&maxResults=20&order=relevance&key=' + apiKey);
        if (!commRes.ok) continue;
        const commData = await commRes.json();
        for (const item of (commData.items || [])) {
          const text = item.snippet?.topLevelComment?.snippet?.textDisplay;
          if (text && text.length > 20) comments.push('[YouTube on "' + video.snippet.title + '"] ' + text.slice(0, 300));
        }
      }
    } catch (e) {}
  }
  return comments;
}

async function scrapeHackerNews(keywords) {
  const posts = [];
  for (const kw of keywords.slice(0, 2)) {
    try {
      const res = await fetch('https://hn.algolia.com/api/v1/search?query=' + encodeURIComponent(kw) + '&tags=comment&hitsPerPage=20');
      if (!res.ok) continue;
      const data = await res.json();
      for (const hit of (data.hits || [])) {
        if (hit.comment_text && hit.comment_text.length > 30) {
          posts.push('[HackerNews] ' + hit.comment_text.slice(0, 400).replace(/<[^>]*>/g, ''));
        }
      }
    } catch (e) {}
  }
  return posts;
}

async function scrapeGoogleAutocomplete(keywords) {
  const suggestions = [];
  for (const kw of keywords.slice(0, 3)) {
    try {
      const res = await fetch('https://suggestqueries.google.com/complete/search?client=firefox&q=' + encodeURIComponent(kw));
      if (!res.ok) continue;
      const data = await res.json();
      const terms = data[1] || [];
      terms.forEach(t => suggestions.push('[Google Search] People search for: "' + t + '"'));
    } catch (e) {}
  }
  return suggestions;
}

async function scrapeProductHunt(keywords) {
  const posts = [];
  for (const kw of keywords.slice(0, 2)) {
    try {
      const res = await fetch('https://www.producthunt.com/search?q=' + encodeURIComponent(kw), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdsResearch/2.0)' }
      });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = html.match(/"tagline":"([^"]{20,200})"/g) || [];
      matches.slice(0, 10).forEach(m => {
        const text = m.replace('"tagline":"', '').replace('"', '');
        posts.push('[ProductHunt] ' + text);
      });
    } catch (e) {}
  }
  return posts;
}

export async function POST(req) {
  try {
    const { keywords, youtubeKey, themeCount, timeframe, audience, productName, redditToken } = await req.json();
    if (!keywords?.length) return Response.json({ error: 'No keywords provided' }, { status: 400 });

    const [redditPosts, ytComments, hnPosts, autocomplete, phPosts] = await Promise.all([
      scrapeReddit(keywords, timeframe || '12m', redditToken),
      scrapeYouTube(keywords, youtubeKey),
      scrapeHackerNews(keywords),
      scrapeGoogleAutocomplete(keywords),
      scrapeProductHunt(keywords)
    ]);

    const allData = [...redditPosts, ...ytComments, ...hnPosts, ...autocomplete, ...phPosts];
    if (allData.length === 0) return Response.json({ error: 'No data scraped. Try different keywords or add a YouTube API key.' }, { status: 400 });

    const prompt = 'You are a Google Ads strategist analyzing online data for ' + productName + '.\n'
      + 'Target audience: ' + (audience || 'developers and technical founders') + '\n\n'
      + 'Scraped data (' + allData.length + ' posts from Reddit, YouTube, HackerNews, ProductHunt, Google Autocomplete):\n---\n'
      + allData.join('\n\n').slice(0, 12000)
      + '\n---\n\n'
      + 'Tasks:\n'
      + '1. Find top ' + (themeCount || 7) + ' pain point themes FROM THIS DATA ONLY\n'
      + '2. For each theme:\n'
      + '   - Give a clear name (3-5 words)\n'
      + '   - Write a 1-sentence description of the pain\n'
      + '   - Rate pain level: critical / moderate / mild\n'
      + '   - Explain WHY you grouped these complaints together (1-2 sentences)\n'
      + '   - Give confidence level: high / medium / low\n'
      + '   - Count how many posts express this pain (signal_count)\n'
      + '   - Extract 2-3 exact quotes from the data\n'
      + '   - List negative keyword candidates (irrelevant searches to block)\n'
      + '3. List global negative keywords (gaming, free, self-host, jobs, tutorials etc)\n\n'
      + 'Return ONLY valid JSON:\n'
      + '{"scraped_count":' + allData.length + ',"sources":{"reddit":' + redditPosts.length + ',"youtube":' + ytComments.length + ',"hackernews":' + hnPosts.length + ',"autocomplete":' + autocomplete.length + ',"producthunt":' + phPosts.length + '},"themes":[{"theme":"name","description":"pain","pain_level":"critical/moderate/mild","grouping_reason":"why grouped","confidence":"high/medium/low","signal_count":0,"quotes":["quote1","quote2"],"negative_candidates":["word1"]}],"global_negatives":["free","self host","gaming","tutorial","jobs","download"]}';

    const { text, model } = await callAI(prompt, process.env.ANTHROPIC_API_KEY, process.env.OPENAI_API_KEY);
    const result = parseJSON(text);
    result.model_used = model;
    return Response.json(result);

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
