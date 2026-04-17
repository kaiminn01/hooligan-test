# Google Ads Generator v2

Scrapes Reddit, YouTube, HackerNews, ProductHunt, and Google Autocomplete → finds real user pain points → analyzes competitor ads → generates scored Google Ads copy → exports ready-to-import CSV.

Built for Emerge Growth & Marketing. Currently configured for SuperClaw and OmenX with multi-client support.

---

## How it works

**Step 0 — Client + Audience**
Select your client (SuperClaw, OmenX, or add a new one). Type a detailed description of your target audience — the more specific, the better the ad language.

**Step 1 — Scrape config**
Set keywords, competitor domains, timeframe (30d / 3m / 12m), and YouTube API key. Hit Run — the tool scrapes 5 sources simultaneously.

**Step 2 — Approve themes**
See 5-10 pain themes with signal count, pain level (Critical / Moderate / Mild), confidence rating, grouping reason, and real quotes. Tick which to use.

**Step 3 — Competitor intel + Offer**
Scrapes Google Ads Transparency + live Google search results for your competitor domains and keywords. Shows what they're saying vs what gaps they're missing. You tick which gaps to exploit, then enter your offer.

**Step 4 — Review + Export**
See all headlines and descriptions scored out of 100. Each headline tagged with variation type. Landing page brief per ad group. Export dual-tab Google Ads CSV (ad copy + negative keywords).

---

## Setup

### 1. Clone or upload to GitHub
Create a new GitHub repo and upload all files maintaining the folder structure:
```
ads-generator-v2/
├── package.json
├── next.config.js
├── docs/
│   ├── SCORING.md
│   └── THEMES.md
└── app/
    ├── layout.js
    ├── page.js
    └── api/
        ├── lib.js
        ├── scrape/route.js
        ├── competitors/route.js
        ├── generate/route.js
        └── negatives/route.js
```

### 2. Deploy on Vercel
1. Go to vercel.com → Add New Project → Import your GitHub repo
2. Framework Preset: **Next.js**
3. Root Directory: leave empty (or `./`)
4. Add Environment Variables (see below)
5. Click Deploy

### 3. Environment Variables
Add these in Vercel → Settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From console.anthropic.com → API Keys |
| `OPENAI_API_KEY` | Yes | From platform.openai.com → API Keys (fallback if Claude hits billing limit) |

YouTube API key is entered in the tool UI per session — no need to add to Vercel.

---

## API keys needed

### Anthropic (Claude)
1. Go to console.anthropic.com
2. Settings → API Keys → Create Key
3. Add to Vercel as `ANTHROPIC_API_KEY`

### OpenAI (GPT-4o fallback)
1. Go to platform.openai.com
2. API Keys → Create new secret key
3. Add to Vercel as `OPENAI_API_KEY`

### YouTube Data API v3 (optional but recommended)
1. Go to console.cloud.google.com
2. Create a project → Enable YouTube Data API v3
3. Credentials → Create Credentials → API Key
4. Paste into the tool UI when running a scrape

### Reddit OAuth (optional — improves Reddit scraping)
Reddit's public API now requires OAuth for server-side requests. Without it, Reddit scraping may return 0 results.
1. Go to reddit.com/prefs/apps
2. Register as a developer → Create app → Script type
3. Get Client ID + Secret
4. Add as `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` in Vercel (future update)

---

## Scrape sources

| Source | What it scrapes | Auth needed |
|---|---|---|
| Reddit | Posts and body text matching keywords | Optional OAuth (improves results) |
| YouTube | Video comments on relevant videos | YouTube Data API key |
| HackerNews | Comments via Algolia HN API | None |
| ProductHunt | Product taglines matching keywords | None |
| Google Autocomplete | What people actually search for | None |

---

## Ad scoring system

Every headline and description is scored out of 100. See `docs/SCORING.md` for full breakdown.

**Headlines (max 30 chars):**
- Char limit: 30 pts
- Keyword present: 25 pts
- Pain signal word: 20 pts
- Outcome/number: 15 pts
- Not generic: 10 pts

**Descriptions (max 90 chars):**
- Char limit: 30 pts
- Clear benefit: 35 pts
- CTA verb: 20 pts
- Specific enough: 15 pts

Score bands: 80+ = ready · 60-79 = review · below 60 = rewrite

---

## Headline variation types

Each theme gets a mix of 7 variation types:

| Type | Example | Purpose |
|---|---|---|
| Problem-led | "OpenClaw Down Again?" | Speaks to active frustration |
| Solution-led | "Always-On OpenClaw Host" | Desired outcome |
| Offer-led | "OpenClaw for $14/mo" | Price-motivated |
| Fear-led | "Stop Losing Work to Crashes" | Loss aversion |
| Question | "Tired of Restarting OpenClaw?" | High CTR |
| Keyword-mirror | "OpenClaw Managed Hosting" | Quality Score boost |
| Competitor-counter | "Better Than MyClaw" | Conquest traffic |

---

## Pain levels

| Level | Meaning | Budget priority |
|---|---|---|
| 🔴 Critical | People losing money, switching products | Highest |
| 🟠 Moderate | Regular annoyance, workarounds exist | Medium |
| 🟡 Mild | Nice to fix, not urgent | Low / retargeting only |

---

## CSV export format

The exported CSV has two sections:

**AD COPY section** — Google Ads RSA format:
- Campaign, Ad Group, Ad Type
- Headline 1-10 (30 char max each)
- Description 1-4 (90 char max each)
- Final URL

**NEGATIVE KEYWORDS section:**
- Keyword, Match Type, Campaign, Ad Group

Import directly into Google Ads via: Campaigns → Import → Google Ads Editor format.

---

## Clients

Pre-configured clients:
- **SuperClaw** — managed OpenClaw hosting, superclaw.com
- **OmenX** — leveraged prediction markets, omenx.com
- **+ New client** — add any product with custom keywords, competitors, URL

---

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Hosting**: Vercel (free tier)
- **Primary AI**: Claude Sonnet (Anthropic)
- **Fallback AI**: GPT-4o (OpenAI)
- **Scraping**: Native fetch — no scraping libraries needed
- **Export**: Client-side CSV generation

---

## Docs

- `docs/SCORING.md` — full scoring criteria breakdown
- `docs/THEMES.md` — how pain themes work, pain levels, confidence ratings

---

## Roadmap

- [ ] Reddit OAuth integration (fix 0 Reddit results issue)
- [ ] Winner tracker — mark which ads converted, feed back into generation
- [ ] Multi-workspace — separate histories per client
- [ ] Telegram output — send top hooks to phone
- [ ] Budget estimator — rough CPC estimate per theme
