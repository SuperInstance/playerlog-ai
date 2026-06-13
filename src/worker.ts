import { addNode, addEdge, traverse, crossDomainQuery, findPath, domainStats, getDomainNodes } from './lib/knowledge-graph.js';
import { loadSeedIntoKG, FLEET_REPOS, loadAllSeeds } from './lib/seed-loader.js';
import { evapPipeline, getEvapReport, getLockStats } from './lib/evaporation-pipeline.js';
import { selectModel } from './lib/model-router.js';
import { trackConfidence, getConfidence } from './lib/confidence-tracker.js';
import { loadBYOKConfig, saveBYOKConfig, callLLM, generateSetupHTML } from './lib/byok.js';
import { evapPipeline } from './lib/evaporation-pipeline.js';

import { deadbandCheck, deadbandStore, getEfficiencyStats } from './lib/deadband.js';
import { logResponse } from './lib/response-logger.js';

import { storePattern, findSimilar, getNeighborhood, crossRepoTransfer, listPatterns } from './lib/structural-memory.js';
import { exportPatterns, importPatterns, fleetSync } from './lib/cross-cocapn-bridge.js';


const BRAND = '#f97316';
const NAME = 'PlayerLog.ai';
const TAGLINE = 'Watch AI coach your gameplay';

const FLEET = { name: NAME, tier: 2, domain: 'gaming-intelligence', fleetVersion: '2.0.0', builtBy: 'Superinstance & Lucineer (DiGennaro et al.)' };

const SEED_DATA = {
  gaming: {
    genres: ['FPS', 'MOBA', 'RPG', 'Strategy', 'Battle Royale', 'Roguelike', 'Simulation', 'Sports', 'Fighting', 'Puzzle'],
    coachingFrameworks: ['Deliberate Practice', 'VOD Review', 'Meta Analysis', 'Mechanic Drills', 'Mental Performance'],
    gameDesignPatterns: ['Progression Systems', 'Risk/Reward Balance', 'Emergent Gameplay', 'Feedback Loops', 'Skill Ceilings'],
    performanceMetrics: ['APM', 'Accuracy', 'Decision Latency', 'Map Awareness', 'Economy Management', 'Team Coordination'],
  },
};

function landingHTML(): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${NAME} — ${TAGLINE}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui;background:#0a0a0a;color:#e0e0e0;overflow-x:hidden}
.hero{background:linear-gradient(135deg,#f97316,#ea580c);padding:3rem 2rem 2rem;text-align:center;position:relative}
.hero::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.08) 0%,transparent 60%);pointer-events:none}
.hero h1{font-size:2.8rem;color:#fff;margin-bottom:.5rem;font-weight:800}.hero p{color:#fed7aa;font-size:1.1rem}
.badge{display:inline-block;background:rgba(0,0,0,.2);padding:.4rem 1rem;border-radius:20px;font-size:.8rem;color:#fff;margin-top:1rem}

.demo{max-width:860px;margin:2rem auto;padding:0 1rem}
.demo-label{text-align:center;color:#f97316;font-size:.85rem;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:1rem}
.terminal{background:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;font-family:'JetBrains Mono',monospace;font-size:.82rem;line-height:1.7}
.term-bar{background:#1a1a1a;padding:.6rem 1rem;display:flex;gap:.5rem;align-items:center}
.dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f57}.y{background:#febc2e}.g{background:#28c840}
.term-title{margin-left:.75rem;color:#555;font-size:.75rem}
.term-body{padding:1rem 1.25rem;max-height:520px;overflow-y:auto}
.msg{margin-bottom:.85rem;animation:fadein .4s ease both}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.msg:nth-child(1){animation-delay:.1s}.msg:nth-child(2){animation-delay:.4s}.msg:nth-child(3){animation-delay:.7s}.msg:nth-child(4){animation-delay:1s}.msg:nth-child(5){animation-delay:1.3s}.msg:nth-child(6){animation-delay:1.6s}.msg:nth-child(7){animation-delay:1.9s}.msg:nth-child(8){animation-delay:2.2s}.msg:nth-child(9){animation-delay:2.5s}
.ts{color:#555;font-size:.72rem}
.msg-user{color:#fed7aa}.msg-user strong{color:#fff}
.msg-agent{color:#fb923c}.msg-agent strong{color:#fbbf24}
.msg-sys{color:#666;font-style:italic}
.msg-success{color:#34d399;padding:.5rem .75rem;background:rgba(52,211,153,.06);border-left:3px solid #34d399;border-radius:0 6px 6px 0}
.msg-tip{color:#fbbf24;padding:.5rem .75rem;background:rgba(251,191,36,.06);border-left:3px solid #fbbf24;border-radius:0 6px 6px 0}

.metrics{max-width:860px;margin:2rem auto;padding:0 1rem}
.metrics h2{color:#f97316;font-size:1.1rem;margin-bottom:1rem}
.metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem}
.mcard{background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:1rem;text-align:center}
.mcard .val{font-size:1.8rem;font-weight:800;color:#f97316}.mcard .label{color:#666;font-size:.75rem;margin-top:.25rem}
.mcard .trend{font-size:.7rem;margin-top:.3rem}.up{color:#34d399}.down{color:#f87171}

.drills{max-width:860px;margin:2rem auto;padding:0 1rem}
.drills h2{color:#f97316;font-size:1.1rem;margin-bottom:1rem}
.drill-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem}
.dcard{background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:1rem}
.dcard h3{color:#fbbf24;font-size:.85rem;margin-bottom:.5rem}.dcard p{color:#888;font-size:.78rem;line-height:1.5}
.diff{display:inline-block;padding:.1rem .4rem;border-radius:3px;font-size:.65rem;font-weight:700;margin-top:.5rem}
.easy{background:#22c55e22;color:#22c55e}.med{background:#f59e0b22;color:#f59e0b}.hard{background:#ef444422;color:#ef4444}

.byok{max-width:560px;margin:2.5rem auto;padding:0 1rem;text-align:center}
.byok h2{color:#fed7aa;font-size:1.2rem;margin-bottom:.75rem}
.byok p{color:#666;font-size:.85rem;margin-bottom:1rem}
.byok form{display:flex;gap:.5rem}
.byok input{flex:1;background:#111;border:1px solid #2a2a2a;color:#e0e0e0;padding:.7rem 1rem;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:.8rem;outline:none}
.byok input:focus{border-color:#f97316}
.byok button{background:#f97316;color:#fff;border:none;padding:.7rem 1.5rem;border-radius:8px;font-weight:700;cursor:pointer}

.fork-bar{max-width:860px;margin:2rem auto;padding:0 1rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.fork-bar a{display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;background:#111;border:1px solid #2a2a2a;border-radius:8px;color:#fed7aa;text-decoration:none;font-size:.85rem;font-weight:600;transition:border-color .2s}
.fork-bar a:hover{border-color:#f97316}

.footer{text-align:center;padding:2rem;color:#333;font-size:.75rem;border-top:1px solid #1a1a1a}
</style></head><body>
<div class="hero">
  
      <img src="https://cocapn-logos.casey-digennaro.workers.dev/img/cocapn-logo-v1.png" alt="Cocapn" style="width:64px;height:auto;margin-bottom:.5rem;border-radius:8px;display:block;margin-left:auto;margin-right:auto">
      <h1>${NAME}</h1>
  <p>${TAGLINE}</p>
  <div class="badge">🎮 AI Gaming Coach · BYOK · Fleet Protocol</div>
</div>

<div class="demo">
  <div class="demo-label">⚡ Live Coaching Session</div>
  <div class="terminal">
    <div class="term-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="term-title">playerlog://coaching-session</div></div>
    <div class="term-body">
      <div class="msg msg-user"><span class="ts">19:32:01</span> <strong>You:</strong> [Screenshot uploaded] Just finished a ranked match. Went 12-8. Feels like I'm stuck in Gold.</div>
      <div class="msg msg-agent"><span class="ts">19:32:04</span> <strong>PlayerLog Coach:</strong> Analyzing your screenshot and match data...</div>
      <div class="msg msg-sys"><span class="ts">19:32:07</span> ── Map: Haven · Role: Controller · Agent: Omen · Round: 24 · Score: 12-8 W</div>
      <div class="msg msg-agent"><span class="ts">19:32:12</span> <strong>Positioning Analysis:</strong> I notice you're anchoring B site alone 73% of the time. Your crosshair placement is solid, but you're over-rotating to help A too early, leaving B exposed for retakes.</div>
      <div class="msg msg-tip"><span class="ts">19:32:15</span> 💡 <strong>Key Fix:</strong> On Haven, stay on B until you hear 2+ A players committed. Your smoke lineups are on point — use them to cut rotation timing, not to push early.</div>
      <div class="msg msg-agent"><span class="ts">19:32:20</span> <strong>Performance Trend:</strong> Your KD has improved from 0.9 → 1.1 over the last 2 weeks. Headshot % is up 8%. The climb is working — you're likely 3-4 wins from Plat promos.</div>
      <div class="msg msg-agent"><span class="ts">19:32:24</span> <strong>Recommended Drills:</strong> ① Crosshair placement on B long (15 min) ② Smoke lineup practice — 3 essential cuts (10 min) ③ 1v1 retake scenarios in aim trainer (20 min)</div>
      <div class="msg msg-success"><span class="ts">19:32:28</span> ✓ Session logged. Next session reminder set for tomorrow. Focus drill: B-site anchor discipline.</div>
    </div>
  </div>
</div>

<div class="metrics">
  <h2>📈 Performance Metrics (Last 30 Days)</h2>
  <div class="metrics-grid">
    <div class="mcard"><div class="val">1.12</div><div class="label">Avg K/D</div><div class="trend up">▲ +0.22 from prev</div></div>
    <div class="mcard"><div class="val">34%</div><div class="label">Headshot %</div><div class="trend up">▲ +8% from prev</div></div>
    <div class="mcard"><div class="val">67%</div><div class="label">Win Rate</div><div class="trend up">▲ +5% from prev</div></div>
    <div class="mcard"><div class="val">0.8s</div><div class="label">Avg Reaction</div><div class="trend down">▼ -0.15s improved</div></div>
  </div>
</div>

<div class="drills">
  <h2>🎯 Recommended Drills</h2>
  <div class="drill-list">
    <div class="dcard"><h3>📌 Crosshair Discipline</h3><p>Keep crosshair at head height while moving between angles. Focus on pre-aiming common spots.</p><span class="diff easy">EASY</span></div>
    <div class="dcard"><h3>💨 Smoke Lineup Mastery</h3><p>Learn 3 essential smoke cuts for your main map. Consistency > creativity in ranked.</p><span class="diff med">MEDIUM</span></div>
    <div class="dcard"><h3>🔄 1v1 Retake Scenarios</h3><p>Practice retake timing and trade patterns. Learn when to commit vs. play time.</p><span class="diff hard">HARD</span></div>
  </div>
</div>

<div class="byok">
  <h2>🔑 Bring Your Own Key</h2>
  <p>Add your LLM API key to get personalized coaching.</p>
  <form action="/setup" method="get"><input type="text" placeholder="sk-... or your provider key" readonly><button type="submit">Configure</button></form>
</div>

<div class="fork-bar">
  <a href="https://github.com/Lucineer/playerlog-ai" target="_blank">⭐ Star</a>
  <a href="https://github.com/Lucineer/playerlog-ai/fork" target="_blank">🔀 Fork</a>
  <a href="https://github.com/Lucineer/playerlog-ai" target="_blank">📋 git clone https://github.com/Lucineer/playerlog-ai.git</a>
</div>

<div class="footer">${NAME} — Built by Superinstance & Lucineer (DiGennaro et al.) · Part of the Cocapn Fleet</div>
<div style="text-align:center;padding:24px;color:#475569;font-size:.75rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">⚓ The Fleet</a> · <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div></body></html>`;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'text/html;charset=utf-8' };
    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    }

    if (url.pathname === '/health') return new Response(JSON.stringify({ status: 'ok', repo: 'playerlog-ai', timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        if (url.pathname === '/vessel.json') { try { const vj = await import('./vessel.json', { with: { type: 'json' } }); return new Response(JSON.stringify(vj.default || vj), { headers: { 'Content-Type': 'application/json' } }); } catch { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); } }
    if (url.pathname === '/') return new Response(landingHTML(), { headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': 'default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*; frame-ancestors 'none';' } });
    'X-Frame-Options': 'DENY',
    if (url.pathname === '/api/efficiency') return new Response(JSON.stringify({ totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0, repo: 'playerlog-ai', timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    if (url.pathname === '/setup') return new Response(generateSetupHTML(NAME, BRAND), { headers });

    if (url.pathname === '/api/seed') {
      return new Response(JSON.stringify({ service: NAME, seed: SEED_DATA, fleet: FLEET }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/byok/config') {
      if (request.method === 'GET') {
        const config = await loadBYOKConfig(env);
        return new Response(JSON.stringify({ configured: !!config, provider: config?.provider || null }), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        await saveBYOKConfig(env, body);
        return new Response(JSON.stringify({ saved: true }), { headers: jsonHeaders });
      }
    }
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const config = await loadBYOKConfig(env);
        if (!config) return new Response(JSON.stringify({ error: 'No provider configured. Visit /setup' }), { status: 401, headers: jsonHeaders });
        const body = await request.json();
        const messages = [{ role: 'system', content: 'You are PlayerLog.ai, an AI gaming coach and intelligence agent.' }, ...(body.messages || [{ role: 'user', content: body.message || '' }])];
        const userMessage = (body.messages || [{ role: 'user', content: body.message || '' }]).map((m) => m.content).join(' ');
        const result = await evapPipeline(env, userMessage, () => callLLM(config.apiKey, messages, config.provider, config.model), 'playerlog-ai');
        return new Response(JSON.stringify({ response: result.response, source: result.source, tokensUsed: result.tokensUsed }), { headers: jsonHeaders });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: jsonHeaders }); }
    }
    if (url.pathname === '/api/coaching') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/coaching', message: 'Coaching sessions — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/agents') {
      return new Response(JSON.stringify({ service: NAME, agents: [], message: 'Repo-agent players — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/games') {
      return new Response(JSON.stringify({ service: NAME, games: [], message: 'Game library — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/sessions') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/sessions', message: 'Game session tracking — coming soon' }), { headers: jsonHeaders });
    }

    if (url.pathname === '/api/kg') {
      return new Response(JSON.stringify({ nodes: [], edges: [], domain: 'playerlog-ai', timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/api/evaporation') {
      return new Response(JSON.stringify({ hot: [], warm: [], coverage: 0, repo: 'playerlog-ai', timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/api/confidence') {
      const scores = await getConfidence(env);
      return new Response(JSON.stringify(scores), { headers: jsonHeaders });
    }
    // ── Phase 4: Structural Memory Routes ──
    if (url.pathname === '/api/memory' && request.method === 'GET') {
      const source = url.searchParams.get('source') || undefined;
      const patterns = await listPatterns(env, source);
      return new Response(JSON.stringify(patterns), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory' && request.method === 'POST') {
      const body = await request.json();
      await storePattern(env, body);
      return new Response(JSON.stringify({ ok: true, id: body.id }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory/similar') {
      const structure = url.searchParams.get('structure') || '';
      const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
      const similar = await findSimilar(env, structure, threshold);
      return new Response(JSON.stringify(similar), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory/transfer') {
      const fromRepo = url.searchParams.get('from') || '';
      const toRepo = url.searchParams.get('to') || '';
      const problem = url.searchParams.get('problem') || '';
      const transfers = await crossRepoTransfer(env, fromRepo, toRepo, problem);
      return new Response(JSON.stringify(transfers), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory/sync' && request.method === 'POST') {
      const body = await request.json();
      const repos = body.repos || [];
      const result = await fleetSync(env, repos);
      return new Response(JSON.stringify(result), { headers: jsonHeaders });
    }

    return new Response('{"error":"Not Found"}', { status: 404, headers: jsonHeaders });
  },
};