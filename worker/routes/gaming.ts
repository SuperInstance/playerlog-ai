/**
 * Gaming API routes — sessions, builds, meta, coaching.
 */
import { Hono } from 'hono';
import type { Env, Variables } from '../../src/types.js';
import { GameSession, BuildOptimizer, MetaAnalyzer, StatTracker } from '../../src/gaming/tracker.js';
import { WeaknessFinder, MentalGameTips } from '../../src/gaming/coach.js';

const gaming = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Sessions ─────────────────────────────────────────────────────────────

gaming.get('/sessions', async (c) => {
  const userId = c.get('userId');
  const sessions = await GameSession.list(c.env.DB, userId);
  return c.json({ sessions });
});

gaming.post('/sessions', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const id = await GameSession.log(c.env.DB, {
    userId,
    game: body.game ?? 'unknown',
    mode: body.mode ?? 'ranked',
    result: body.result ?? 'loss',
    durationMin: body.durationMin ?? 0,
    character: body.character,
    build: body.build,
    rank: body.rank,
    kills: body.kills,
    deaths: body.deaths,
    assists: body.assists,
    notes: body.notes ?? '',
  });
  return c.json({ id });
});

// ─── Stats ────────────────────────────────────────────────────────────────

gaming.get('/stats', async (c) => {
  const userId = c.get('userId');
  const game = c.req.query('game') ?? 'valorant';
  const stats = await StatTracker.summary(c.env.DB, userId, game);
  const rankProgress = await StatTracker.rankHistory(c.env.DB, userId, game);
  return c.json({ ...stats, trend: rankProgress.trend });
});

// ─── Builds ───────────────────────────────────────────────────────────────

gaming.get('/builds', async (c) => {
  const userId = c.get('userId');
  const game = c.req.query('game') ?? 'valorant';
  const character = c.req.query('character') ?? '';
  const [topBuilds, myBuilds] = await Promise.all([
    BuildOptimizer.getTopBuilds(c.env.KV, game, character),
    BuildOptimizer.analyzePerformance(c.env.DB, userId, game, character),
  ]);
  return c.json({ builds: topBuilds, myBuilds });
});

// ─── Meta ─────────────────────────────────────────────────────────────────

gaming.get('/meta', async (c) => {
  const game = c.req.query('game') ?? 'valorant';
  const snapshot = await MetaAnalyzer.getSnapshot(c.env.KV, game);
  return c.json(snapshot ?? { game, topCharacters: [], topBuilds: [], patches: [] });
});

// ─── Rank Progression ─────────────────────────────────────────────────────

gaming.get('/rank', async (c) => {
  const userId = c.get('userId');
  const game = c.req.query('game') ?? 'valorant';
  const progression = await StatTracker.rankHistory(c.env.DB, userId, game);
  return c.json(progression);
});

// ─── Weaknesses ───────────────────────────────────────────────────────────

gaming.get('/weaknesses', async (c) => {
  const userId = c.get('userId');
  const sessions = await GameSession.list(c.env.DB, userId, 30);
  const weaknesses = WeaknessFinder.analyze(sessions);
  return c.json({ weaknesses });
});

// ─── Coaching ─────────────────────────────────────────────────────────────

gaming.post('/coaching', async (c) => {
  const userId = c.get('userId');
  const { message } = await c.req.json();
  if (!message) return c.json({ error: 'Message required' }, 400);

  // Get context for coaching
  const sessions = await GameSession.list(c.env.DB, userId, 10);
  const context = sessions.map(s => `${s.game} ${s.result} K:${s.kills ?? '-'} D:${s.deaths ?? '-'} A:${s.assists ?? '-'}`).join('\n');

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${c.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are PlayerLog.ai — an expert gaming coach. Give concise, actionable advice. Use the player\'s recent session data to personalize your response. Be direct and strategic.' },
          { role: 'user', content: `Recent sessions:\n${context}\n\nPlayer asks: ${message}` },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    const data: any = await res.json();
    const response = data.choices?.[0]?.message?.content ?? 'Could not generate coaching response.';
    return c.json({ response });
  } catch {
    // Fallback coaching
    const tip = MentalGameTips.getTip(message);
    return c.json({ response: `Here's a tip while I'm thinking: ${tip}` });
  }
});

export default gaming;
