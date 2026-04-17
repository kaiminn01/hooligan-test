'use client';
import { useState } from 'react';

const CLIENTS = [
  { id: 'superclaw', name: 'SuperClaw', url: 'https://superclaw.com', desc: 'Managed cloud hosting for OpenClaw AI agents. Always-on, no DevOps, no crashes.', keywords: ['OpenClaw hosting', 'AI agent hosting', 'chatbot hosting', 'n8n hosting'], competitors: ['myclaw.ai', 'hostinger.com', 'xcloud.host'] },
  { id: 'omenx', name: 'OmenX', url: 'https://omenx.com', desc: 'Leveraged prediction market platform on Base and BNB Chain. Up to 10x leverage on real-world events.', keywords: ['prediction market', 'crypto trading', 'leveraged predictions', 'DeFi trading'], competitors: ['polymarket.com', 'kalshi.com'] },
  { id: 'custom', name: '+ New client', url: '', desc: '', keywords: [], competitors: [] }
];

const PAIN_COLORS = { critical: { bg: '#fff0f0', text: '#c33', border: '#fcc', label: '🔴 Critical' }, moderate: { bg: '#fff8f0', text: '#e65100', border: '#ffd9b3', label: '🟠 Moderate' }, mild: { bg: '#fffde0', text: '#856404', border: '#ffe58f', label: '🟡 Mild' } };
const CONFIDENCE_COLORS = { high: '#2e7d32', medium: '#e65100', low: '#888' };
const VAR_COLORS = { 'problem-led': '#e8f4fd', 'solution-led': '#edf7ed', 'offer-led': '#fff3e0', 'fear-led': '#fff0f0', 'question': '#f3e5f5', 'keyword-mirror': '#e8f5e9', 'competitor-counter': '#fce4ec' };

export default function Home() {
  const [step, setStep] = useState(0);
  const [client, setClient] = useState(CLIENTS[0]);
  const [customClient, setCustomClient] = useState({ name: '', url: '', desc: '', keywords: [], competitors: [] });
  const [audience, setAudience] = useState('');
  const [timeframe, setTimeframe] = useState('30d');
  const [ytKey, setYtKey] = useState('');
  const [showYtKey, setShowYtKey] = useState(false);
  const [kwInput, setKwInput] = useState('');
  const [compInput, setCompInput] = useState('');
  const [themeCount, setThemeCount] = useState('7');
  const [variations, setVariations] = useState('10');
  const [offer, setOffer] = useState('');
  const [showScoring, setShowScoring] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  const [scrapeResult, setScrapeResult] = useState(null);
  const [approvedThemes, setApprovedThemes] = useState({});
  const [competitorResult, setCompetitorResult] = useState(null);
  const [approvedGaps, setApprovedGaps] = useState({});
  const [generateResult, setGenerateResult] = useState(null);
  const [negativesResult, setNegativesResult] = useState(null);
  const [approvedNegatives, setApprovedNegatives] = useState({});
  const [approvedPresets, setApprovedPresets] = useState({});
  const [expandedTheme, setExpandedTheme] = useState(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState({});

  const activeClient = client.id === 'custom' ? customClient : client;

  const addKw = () => { const v = kwInput.trim(); if (!v) return; client.id === 'custom' ? setCustomClient(c => ({ ...c, keywords: [...c.keywords, v] })) : setClient(c => ({ ...c, keywords: [...c.keywords, v] })); setKwInput(''); };
  const removeKw = (i) => { client.id === 'custom' ? setCustomClient(c => ({ ...c, keywords: c.keywords.filter((_, idx) => idx !== i) })) : setClient(c => ({ ...c, keywords: c.keywords.filter((_, idx) => idx !== i) })); };
  const addComp = () => { const v = compInput.trim(); if (!v) return; client.id === 'custom' ? setCustomClient(c => ({ ...c, competitors: [...c.competitors, v] })) : setClient(c => ({ ...c, competitors: [...c.competitors, v] })); setCompInput(''); };
  const removeComp = (i) => { client.id === 'custom' ? setCustomClient(c => ({ ...c, competitors: c.competitors.filter((_, idx) => idx !== i) })) : setClient(c => ({ ...c, competitors: c.competitors.filter((_, idx) => idx !== i) })); };

  const runScrape = async () => {
    setError(''); setLoading(true); setStatus('Scraping Reddit, YouTube, HackerNews, ProductHunt...');
    try {
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: activeClient.keywords, youtubeKey: ytKey, themeCount: parseInt(themeCount), timeframe, audience: audience || 'developers and technical founders', productName: activeClient.name }) });
      setStatus('Analyzing pain points...');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScrapeResult(data);
      const init = {}; data.themes?.forEach((_, i) => init[i] = true); setApprovedThemes(init);
      setStep(2);
    } catch (e) { setError(e.message); }
    setLoading(false); setStatus('');
  };

  const runCompetitors = async () => {
    setError(''); setLoading(true); setStatus('Scraping competitor Google Ads...');
    try {
      const approved = scrapeResult.themes.filter((_, i) => approvedThemes[i]);
      const res = await fetch('/api/competitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ competitors: activeClient.competitors, approvedThemes: approved, productName: activeClient.name, audience: audience || 'developers', keywords: activeClient.keywords }) });
      setStatus('Analyzing competitor gaps...');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompetitorResult(data);
      const init = {}; data.gaps?.forEach((_, i) => init[i] = true); setApprovedGaps(init);
      setStep(3);
    } catch (e) { setError(e.message); }
    setLoading(false); setStatus('');
  };

  const runGenerate = async () => {
    setError(''); setLoading(true); setStatus('Generating ' + variations + ' ad variations per theme...');
    try {
      const approved = scrapeResult.themes.filter((_, i) => approvedThemes[i]);
      const gaps = competitorResult?.gaps?.filter((_, i) => approvedGaps[i]) || [];
      const [genRes, negRes] = await Promise.all([
        fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedThemes: approved, approvedGaps: gaps, offer, productName: activeClient.name, audience: audience || 'developers', keywords: activeClient.keywords, finalUrl: activeClient.url, variationsPerTheme: parseInt(variations) }) }),
        fetch('/api/negatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productName: activeClient.name, keywords: activeClient.keywords }) })
      ]);
      setStatus('Scoring ad strength...');
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error);
      setGenerateResult(genData);
      const negData = await negRes.json();
      if (negRes.ok) {
        setNegativesResult(negData);
        const initN = {}; negData.custom_negatives?.forEach((_, i) => initN[i] = true); setApprovedNegatives(initN);
        const initP = {}; Object.keys(negData.preset_negatives || {}).forEach(k => initP[k] = true); setApprovedPresets(initP);
      }
      setStep(4);
    } catch (e) { setError(e.message); }
    setLoading(false); setStatus('');
  };

  const exportCSV = () => {
    const adRows = [['Campaign', 'Ad Group', 'Ad Type', 'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5', 'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10', 'Description 1', 'Description 2', 'Description 3', 'Description 4', 'Final URL']];
    generateResult?.themes?.forEach(t => {
      const headlines = t.headlines?.filter(h => h.chars <= 30).map(h => h.text) || [];
      const descs = t.descriptions?.filter(d => d.chars <= 90).map(d => d.text) || [];
      while (headlines.length < 10) headlines.push('');
      while (descs.length < 4) descs.push('');
      adRows.push([activeClient.name + ' - Search', t.theme, 'Responsive search ad', ...headlines.slice(0, 10), ...descs.slice(0, 4), activeClient.url]);
    });
    const negRows = [['Keyword', 'Match Type', 'Campaign', 'Ad Group']];
    if (negativesResult) {
      Object.entries(negativesResult.preset_negatives || {}).forEach(([cat, words]) => { if (approvedPresets[cat]) words.forEach(w => negRows.push([w, 'Broad', activeClient.name + ' - Search', ''])); });
      (negativesResult.custom_negatives || []).forEach((n, i) => { if (approvedNegatives[i]) negRows.push([n.keyword, n.match_type || 'Broad', activeClient.name + ' - Search', '']); });
    }
    const toCSV = rows => rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const combined = 'AD COPY\n' + toCSV(adRows) + '\n\nNEGATIVE KEYWORDS\n' + toCSV(negRows);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([combined], { type: 'text/csv' })); a.download = activeClient.name.replace(/\s/g, '-') + '-google-ads.csv'; a.click();
  };

  const copy = (id, text) => { navigator.clipboard.writeText(text); setCopied(c => ({ ...c, [id]: true })); setTimeout(() => setCopied(c => ({ ...c, [id]: false })), 1500); };
  const scoreColor = s => s >= 80 ? '#2e7d32' : s >= 60 ? '#e65100' : '#c33';
  const scoreBg = s => s >= 80 ? '#edf7ed' : s >= 60 ? '#fff3e0' : '#fff3f3';

  const STEPS = ['Client', 'Scrape', 'Themes', 'Competitors', 'Review'];

  return (
    <main style={{ maxWidth: 940, margin: '0 auto', padding: '2rem 1rem', color: '#1a1a1a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Google Ads Generator</h1>
          <p style={{ fontSize: 13, color: '#666' }}>Reddit · YouTube · HackerNews · ProductHunt → pain points → competitor gaps → scored ad copy</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowThemes(!showThemes)} style={{ ...secBtn, fontSize: 12 }}>📖 How themes work</button>
          <button onClick={() => setShowScoring(!showScoring)} style={{ ...secBtn, fontSize: 12 }}>📊 Scoring guide</button>
        </div>
      </div>

      {showThemes && (
        <div style={{ ...card, background: '#f8f8ff', border: '1px solid #e0deff', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>How themes work</div><button onClick={() => setShowThemes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>×</button></div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
            <p><strong>What is a theme?</strong> A cluster of related complaints from real people. If 12 people complained about crashes, downtime, and restarts — that becomes one "Uptime & Reliability" theme.</p>
            <p style={{ marginTop: 8 }}><strong>Pain levels:</strong> 🔴 Critical = people losing money, actively switching. 🟠 Moderate = regular annoyance. 🟡 Mild = nice to fix but not urgent. Put most budget behind critical.</p>
            <p style={{ marginTop: 8 }}><strong>Signal count:</strong> How many posts expressed this pain out of total scraped. 18/77 = 23% of your audience has this problem.</p>
            <p style={{ marginTop: 8 }}><strong>Confidence:</strong> High = multiple independent sources saying the same thing. Low = 1-2 posts, could be noise.</p>
          </div>
        </div>
      )}

      {showScoring && (
        <div style={{ ...card, background: '#f8fff8', border: '1px solid #c8e6c9', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ad strength scoring (out of 100)</div><button onClick={() => setShowScoring(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>×</button></div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
            <p><strong>Headlines:</strong> Char limit (30pts) + Keyword present (25pts) + Pain signal (20pts) + Outcome/number (15pts) + Not generic (10pts)</p>
            <p style={{ marginTop: 4 }}><strong>Descriptions:</strong> Char limit (30pts) + Clear benefit (35pts) + CTA verb (20pts) + Specific enough (15pts)</p>
            <p style={{ marginTop: 8 }}>✅ 80-100 = Ready to use &nbsp; 🟠 60-79 = Review first &nbsp; ❌ Below 60 = Needs rewrite</p>
            <p style={{ marginTop: 8 }}><strong>Variation types:</strong> Problem-led (frustration), Solution-led (outcome), Offer-led (price/trial), Fear-led (loss), Question (CTR), Keyword-mirror (Quality Score), Competitor-counter (conquest)</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: step === i ? '#6C63FF' : step > i ? '#edf7ed' : '#f0f0f0', color: step === i ? '#fff' : step > i ? '#2e7d32' : '#888', fontWeight: step === i ? 600 : 400 }}>
            {step > i ? '✓ ' : (i + 1) + '. '}{s}
          </div>
        ))}
      </div>

      {error && <div style={{ background: '#fff3f3', border: '1px solid #fcc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c33', marginBottom: 16 }}>{error}</div>}
      {loading && <div style={{ fontSize: 13, color: '#555', padding: '10px 14px', background: '#f8f8ff', border: '1px solid #e0deff', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #c5c0ff', borderTopColor: '#6C63FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />{status}
      </div>}

      {/* STEP 0: Client + Audience */}
      {step === 0 && (
        <div>
          <div style={card}>
            <div style={label}>Select client</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {CLIENTS.map(c => <button key={c.id} onClick={() => setClient(c)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid ' + (client.id === c.id ? '#6C63FF' : '#ddd'), background: client.id === c.id ? '#6C63FF' : '#fff', color: client.id === c.id ? '#fff' : '#555', fontSize: 13, cursor: 'pointer', fontWeight: client.id === c.id ? 600 : 400 }}>{c.name}</button>)}
            </div>
            {client.id === 'custom' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}><div style={fieldLabel}>Client name</div><input value={customClient.name} onChange={e => setCustomClient(c => ({ ...c, name: e.target.value }))} style={inputStyle} placeholder="Acme Corp" /></div>
                  <div style={{ flex: 1, minWidth: 200 }}><div style={fieldLabel}>Landing page URL</div><input value={customClient.url} onChange={e => setCustomClient(c => ({ ...c, url: e.target.value }))} style={inputStyle} placeholder="https://..." /></div>
                </div>
                <div><div style={fieldLabel}>Product description</div><input value={customClient.desc} onChange={e => setCustomClient(c => ({ ...c, desc: e.target.value }))} style={inputStyle} placeholder="What does this product do?" /></div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#555', background: '#f8f8f8', padding: '10px 12px', borderRadius: 8 }}>{client.desc}</div>
            )}
          </div>

          <div style={card}>
            <div style={label}>Target audience <span style={{ fontWeight: 400, color: '#aaa', fontSize: 11 }}>(be specific — this shapes all ad language)</span></div>
            <textarea value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Non-technical founders in Southeast Asia who want AI agents for their business but don't have a developer on their team. They use Telegram daily and are frustrated with things breaking." style={{ ...inputStyle, height: 80, resize: 'vertical', lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>The more specific you are, the better Claude will tailor the ad language. Include location, tech level, how they communicate, and what frustrates them.</div>
          </div>

          <button onClick={() => setStep(1)} style={primaryBtn}>Next → Configure scrape</button>
        </div>
      )}

      {/* STEP 1: Scrape Config */}
      {step === 1 && (
        <div>
          <div style={card}>
            <div style={label}>Keywords to scrape</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>These are searched across Reddit, YouTube, HackerNews, ProductHunt and Google Autocomplete.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKw()} placeholder="Add keyword..." style={inputStyle} />
              <button onClick={addKw} style={secBtn}>Add</button>
            </div>
            <div>{activeClient.keywords.map((k, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0effe', color: '#4c44b8', fontSize: 12, padding: '4px 10px', borderRadius: 20, margin: 3 }}>{k}<button onClick={() => removeKw(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4c44b8', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button></span>)}</div>
          </div>

          <div style={card}>
            <div style={label}>Competitor domains</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>We'll scrape their Google Ads and find gaps they're missing.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={compInput} onChange={e => setCompInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComp()} placeholder="e.g. myclaw.ai" style={inputStyle} />
              <button onClick={addComp} style={secBtn}>Add</button>
            </div>
            <div>{activeClient.competitors.map((c, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff3e0', color: '#e65100', fontSize: 12, padding: '4px 10px', borderRadius: 20, margin: 3 }}>{c}<button onClick={() => removeComp(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e65100', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button></span>)}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ ...card, flex: 1, minWidth: 220 }}>
              <div style={label}>Scrape timeframe</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>How far back to look for complaints.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[{ value: '30d', label: 'Last 30 days', tip: 'Most current' }, { value: '3m', label: 'Last 3 months', tip: 'Balanced' }, { value: '12m', label: 'Last 12 months', tip: 'More data' }].map(t => (
                  <button key={t.value} onClick={() => setTimeframe(t.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (timeframe === t.value ? '#6C63FF' : '#ddd'), background: timeframe === t.value ? '#6C63FF' : '#fff', color: timeframe === t.value ? '#fff' : '#555', fontSize: 12, cursor: 'pointer' }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 200 }}>
              <div style={label}>Settings</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, color: '#555' }}>Themes</label>
                  <select value={themeCount} onChange={e => setThemeCount(e.target.value)} style={selectStyle}>{['5', '7', '10'].map(o => <option key={o}>{o}</option>)}</select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, color: '#555' }}>Variations</label>
                  <select value={variations} onChange={e => setVariations(e.target.value)} style={selectStyle}>{['5', '10', '15'].map(o => <option key={o}>{o}</option>)}</select>
                </div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={label}>YouTube API Key <span style={{ fontWeight: 400, color: '#aaa' }}>(optional but recommended)</span></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type={showYtKey ? 'text' : 'password'} value={ytKey} onChange={e => setYtKey(e.target.value)} placeholder="AIza..." style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} />
              <span onClick={() => setShowYtKey(!showYtKey)} style={{ fontSize: 12, color: '#6C63FF', cursor: 'pointer', whiteSpace: 'nowrap' }}>{showYtKey ? 'hide' : 'show'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(0)} style={secBtn}>← Back</button>
            <button onClick={runScrape} disabled={loading} style={primaryBtn}>{loading ? 'Scraping...' : '▶ Run scrape'}</button>
          </div>
        </div>
      )}

      {/* STEP 2: Approve themes */}
      {step === 2 && scrapeResult && (
        <div>
          <div style={{ ...card, background: '#f8f8ff', border: '1px solid #e0deff' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Scrape complete via {scrapeResult.model_used}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
              <span>📥 {scrapeResult.scraped_count} total posts</span>
              {scrapeResult.sources && Object.entries(scrapeResult.sources).map(([src, count]) => count > 0 && <span key={src}>• {src}: {count}</span>)}
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Tick the themes you want to target. Each theme becomes one Ad Group in Google Ads.</div>

          {scrapeResult.themes?.map((theme, i) => {
            const pc = PAIN_COLORS[theme.pain_level] || PAIN_COLORS.moderate;
            const isExpanded = expandedTheme === i;
            return (
              <div key={i} style={{ ...card, border: '1px solid ' + (approvedThemes[i] ? '#6C63FF' : '#e5e5e5'), marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setApprovedThemes(p => ({ ...p, [i]: !p[i] }))}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid ' + (approvedThemes[i] ? '#6C63FF' : '#ddd'), background: approvedThemes[i] ? '#6C63FF' : '#fff', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {approvedThemes[i] && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{theme.theme}</span>
                      <span style={{ fontSize: 11, background: pc.bg, color: pc.text, border: '1px solid ' + pc.border, padding: '2px 8px', borderRadius: 10 }}>{pc.label}</span>
                      <span style={{ fontSize: 11, color: CONFIDENCE_COLORS[theme.confidence] || '#888' }}>{theme.confidence} confidence</span>
                      <span style={{ fontSize: 11, background: '#f0effe', color: '#4c44b8', padding: '2px 8px', borderRadius: 10 }}>{theme.signal_count} signals</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{theme.description}</div>
                    {theme.grouping_reason && <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>Why grouped: {theme.grouping_reason}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setExpandedTheme(isExpanded ? null : i); }} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#666', flexShrink: 0 }}>{isExpanded ? 'less' : 'quotes'}</button>
                </div>
                {isExpanded && theme.quotes?.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0', paddingLeft: 32 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Real quotes from the data:</div>
                    {theme.quotes.map((q, qi) => <div key={qi} style={{ fontSize: 12, color: '#333', background: '#f8f8f8', border: '1px solid #eee', borderRadius: 6, padding: '6px 10px', marginBottom: 4, fontStyle: 'italic' }}>"{q}"</div>)}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setStep(1)} style={secBtn}>← Back</button>
            <button onClick={runCompetitors} disabled={loading || !Object.values(approvedThemes).some(Boolean)} style={primaryBtn}>{loading ? 'Loading...' : 'Proceed to competitor intel →'}</button>
          </div>
        </div>
      )}

      {/* STEP 3: Competitor + Offer */}
      {step === 3 && competitorResult && (
        <div>
          {competitorResult.competitor_summary?.length > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={label}>What competitors are currently saying in their ads</div>
              {competitorResult.competitor_summary.map((c, i) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < competitorResult.competitor_summary.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e65100', marginBottom: 4 }}>{c.domain}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>{c.angles?.map((a, ai) => <span key={ai} style={{ fontSize: 12, background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: 6 }}>{a}</span>)}</div>
                  {c.weakness && <div style={{ fontSize: 11, color: '#888' }}>Weakness: {c.weakness}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={label}>Gaps competitors are missing — tick which to exploit</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>These are pain points your audience has that nobody is addressing in their ads. These are your biggest opportunities.</div>

          {competitorResult.gaps?.map((gap, i) => (
            <div key={i} style={{ ...card, border: '1px solid ' + (approvedGaps[i] ? '#2e7d32' : '#e5e5e5'), marginBottom: 8, cursor: 'pointer' }} onClick={() => setApprovedGaps(p => ({ ...p, [i]: !p[i] }))}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid ' + (approvedGaps[i] ? '#2e7d32' : '#ddd'), background: approvedGaps[i] ? '#2e7d32' : '#fff', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {approvedGaps[i] && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{gap.gap}</span>
                    <span style={{ fontSize: 11, background: gap.priority === 'high' ? '#fce8e8' : gap.priority === 'medium' ? '#fff3e0' : '#f0f0f0', color: gap.priority === 'high' ? '#c33' : gap.priority === 'medium' ? '#e65100' : '#888', padding: '2px 8px', borderRadius: 6 }}>{gap.priority} priority</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#2e7d32', marginBottom: 4 }}>→ {gap.opportunity}</div>
                  {gap.reason && <div style={{ fontSize: 11, color: '#888' }}>{gap.reason}</div>}
                </div>
              </div>
            </div>
          ))}

          <div style={{ ...card, marginTop: 16 }}>
            <div style={label}>Your offer / hook <span style={{ fontWeight: 400, color: '#aaa', fontSize: 11 }}>(gets baked into every headline and description)</span></div>
            <input value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. Deploy in 60 seconds, $14/mo, First month free, No DevOps needed, Always-on guarantee" style={inputStyle} />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Be specific. Numbers convert better than vague promises.</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setStep(2)} style={secBtn}>← Back</button>
            <button onClick={runGenerate} disabled={loading} style={primaryBtn}>{loading ? 'Generating...' : 'Generate ads →'}</button>
          </div>
        </div>
      )}

      {/* STEP 4: Review + Export */}
      {step === 4 && generateResult && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[['📊', generateResult.themes?.length, 'Ad groups'], ['✍️', generateResult.themes?.reduce((a, t) => a + (t.headlines?.length || 0), 0), 'Headlines'], ['📝', generateResult.themes?.reduce((a, t) => a + (t.descriptions?.length || 0), 0), 'Descriptions']].map(([icon, n, l]) => (
              <div key={l} style={{ background: '#f8f8ff', border: '1px solid #e0deff', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#6C63FF' }}>{n}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: '#888', marginBottom: 16, background: '#f8f8f8', padding: '8px 12px', borderRadius: 8 }}>
            Generated via {generateResult.model_used} &nbsp;|&nbsp; Score: <span style={{ color: '#2e7d32' }}>80+ ready</span> · <span style={{ color: '#e65100' }}>60-79 review</span> · <span style={{ color: '#c33' }}>below 60 rewrite</span> &nbsp;|&nbsp; <button onClick={() => setShowScoring(!showScoring)} style={{ background: 'none', border: 'none', color: '#6C63FF', cursor: 'pointer', fontSize: 12, padding: 0 }}>scoring guide</button>
          </div>

          {generateResult.themes?.map((theme, ti) => {
            const pc = PAIN_COLORS[theme.pain_level] || PAIN_COLORS.moderate;
            return (
              <div key={ti} style={{ ...card, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{theme.theme}</span>
                    <span style={{ fontSize: 11, background: pc.bg, color: pc.text, border: '1px solid ' + pc.border, padding: '2px 8px', borderRadius: 10 }}>{pc.label}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1a6fa8', marginBottom: 8 }}>
                    <span style={{ background: '#e8f4fd', padding: '2px 8px', borderRadius: 6 }}>Headlines — max 30 chars</span>
                    <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>{theme.headlines?.filter(h => h.chars <= 30).length} valid of {theme.headlines?.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {theme.headlines?.map((h, hi) => {
                      const id = 'h-' + ti + '-' + hi;
                      const varColor = VAR_COLORS[h.variation_type] || '#f8f8f8';
                      return (
                        <div key={hi} style={{ display: 'flex', alignItems: 'center', gap: 8, background: h.chars > 30 ? '#fff3f3' : '#f8fbff', border: '1px solid ' + (h.chars > 30 ? '#fcc' : '#d0e8ff'), borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: scoreBg(h.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: scoreColor(h.score), flexShrink: 0 }}>{h.score}</div>
                          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: h.chars > 30 ? '#c33' : '#1a1a1a' }}>{h.text}</div>
                          {h.variation_type && <span style={{ fontSize: 10, background: varColor, color: '#555', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{h.variation_type}</span>}
                          <span style={{ fontSize: 11, color: h.chars > 30 ? '#c33' : '#888', whiteSpace: 'nowrap' }}>{h.chars}/30</span>
                          {h.flags?.length > 0 && <span style={{ fontSize: 10, color: '#e65100', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={h.flags.join(', ')}>⚠ {h.flags[0]}</span>}
                          <button onClick={() => copy(id, h.text)} style={{ background: 'none', border: '1px solid ' + (copied[id] ? '#4caf50' : '#ddd'), color: copied[id] ? '#4caf50' : '#888', padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>{copied[id] ? '✓' : 'copy'}</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: theme.landing_page_brief ? 14 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2e7d32', marginBottom: 8 }}>
                    <span style={{ background: '#edf7ed', padding: '2px 8px', borderRadius: 6 }}>Descriptions — max 90 chars</span>
                    <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>{theme.descriptions?.filter(d => d.chars <= 90).length} valid of {theme.descriptions?.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {theme.descriptions?.map((d, di) => {
                      const id = 'd-' + ti + '-' + di;
                      return (
                        <div key={di} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: d.chars > 90 ? '#fff3f3' : '#f8fff8', border: '1px solid ' + (d.chars > 90 ? '#fcc' : '#c8e6c9'), borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: scoreBg(d.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: scoreColor(d.score), flexShrink: 0, marginTop: 2 }}>{d.score}</div>
                          <div style={{ flex: 1, fontSize: 13, color: d.chars > 90 ? '#c33' : '#1a1a1a', lineHeight: 1.5 }}>{d.text}</div>
                          <span style={{ fontSize: 11, color: d.chars > 90 ? '#c33' : '#888', whiteSpace: 'nowrap', marginTop: 2 }}>{d.chars}/90</span>
                          {d.flags?.length > 0 && <span style={{ fontSize: 10, color: '#e65100', whiteSpace: 'nowrap' }} title={d.flags.join(', ')}>⚠</span>}
                          <button onClick={() => copy(id, d.text)} style={{ background: 'none', border: '1px solid ' + (copied[id] ? '#4caf50' : '#ddd'), color: copied[id] ? '#4caf50' : '#888', padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>{copied[id] ? '✓' : 'copy'}</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {theme.landing_page_brief && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#fffde0', border: '1px solid #ffe58f', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#856404', marginBottom: 4 }}>📄 Landing page brief</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{theme.landing_page_brief}</div>
                  </div>
                )}
              </div>
            );
          })}

          {negativesResult && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={label}>Negative keywords — tick to include in export</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>These block irrelevant searches so your budget only goes to people who might actually buy.</div>
              {Object.entries(negativesResult.preset_negatives || {}).map(([cat, words]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }} onClick={() => setApprovedPresets(p => ({ ...p, [cat]: !p[cat] }))}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid ' + (approvedPresets[cat] ? '#c33' : '#ddd'), background: approvedPresets[cat] ? '#c33' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{approvedPresets[cat] && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{cat}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>{words.map((w, wi) => <span key={wi} style={{ fontSize: 11, background: '#fce8e8', color: '#c33', padding: '2px 8px', borderRadius: 6 }}>{w}</span>)}</div>
                </div>
              ))}
              {negativesResult.custom_negatives?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Custom negatives (detected from your data)</div>
                  {negativesResult.custom_negatives.map((n, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }} onClick={() => setApprovedNegatives(p => ({ ...p, [i]: !p[i] }))}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid ' + (approvedNegatives[i] ? '#c33' : '#ddd'), background: approvedNegatives[i] ? '#c33' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{approvedNegatives[i] && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}</div>
                      <span style={{ fontSize: 12, background: '#fce8e8', color: '#c33', padding: '2px 8px', borderRadius: 6 }}>{n.keyword}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>{n.match_type}</span>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{n.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={exportCSV} style={primaryBtn}>⬇ Export Google Ads CSV</button>
            <button onClick={() => { setStep(0); setScrapeResult(null); setCompetitorResult(null); setGenerateResult(null); setNegativesResult(null); }} style={secBtn}>Start over</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' };
const label = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: 8, display: 'block' };
const fieldLabel = { fontSize: 12, color: '#666', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const selectStyle = { padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none' };
const primaryBtn = { background: '#6C63FF', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const secBtn = { background: '#fff', color: '#555', border: '1px solid #ddd', padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer' };
