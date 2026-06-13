/**
 * Gaming tracker module — session logging, build optimization, meta analysis, stat tracking.
 */

// ─── Game Session ───────────────────────────────────────────────────────────

export interface GameSessionEntry {
  id: string;
  userId: string;
  game: string;
  mode: string;
  result: 'win' | 'loss' | 'draw';
  durationMin: number;
  character?: string;
  build?: string;
  rank?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  notes: string;
  playedAt: string;
}

export class GameSession {
  /** Log a completed game session to D1. */
  static async log(db: D1Database, entry: Omit<GameSessionEntry, 'id' | 'playedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const playedAt = new Date().toISOString();
    await db.prepare(
      `INSERT INTO game_sessions (id, user_id, game, mode, result, duration_min, character, build, rank, kills, deaths, assists, notes, played_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, entry.userId, entry.game, entry.mode, entry.result, entry.durationMin,
      entry.character ?? null, entry.build ?? null, entry.rank ?? null,
      entry.kills ?? null, entry.deaths ?? null, entry.assists ?? null,
      entry.notes, playedAt).run();
    return id;
  }

  /** Get recent sessions for a user. */
  static async list(db: D1Database, userId: string, limit = 50): Promise<GameSessionEntry[]> {
    const { results } = await db.prepare(
      `SELECT id, user_id as userId, game, mode, result, duration_min as durationMin,
              character, build, rank, kills, deaths, assists, notes, played_at as playedAt
       FROM game_sessions WHERE user_id = ? ORDER BY played_at DESC LIMIT ?`
    ).bind(userId, limit).all<GameSessionEntry>();
    return results ?? [];
  }

  /** Win rate over last N sessions for a given game. */
  static async winRate(db: D1Database, userId: string, game: string, sampleSize = 20): Promise<{ wins: number; total: number; rate: number }> {
    const row = await db.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins
       FROM (SELECT result FROM game_sessions WHERE user_id = ? AND game = ? ORDER BY played_at DESC LIMIT ?)`
    ).bind(userId, game, sampleSize).first<{ total: number; wins: number }>();
    const total = row?.total ?? 0;
    const wins = row?.wins ?? 0;
    return { wins, total, rate: total > 0 ? wins / total : 0 };
  }
}

// ─── Build Optimizer ────────────────────────────────────────────────────────

export interface BuildSuggestion {
  game: string;
  character: string;
  build: string;
  winRate: number;
  pickRate: number;
  sampleSize: number;
  notes: string;
}

export class BuildOptimizer {
  /** Fetch top-performing builds from aggregated data in KV. */
  static async getTopBuilds(kv: KVNamespace, game: string, character: string): Promise<BuildSuggestion[]> {
    const raw = await kv.get(`builds:${game}:${character}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as BuildSuggestion[];
    } catch {
      return [];
    }
  }

  /** Analyze user's own build performance. */
  static async analyzePerformance(db: D1Database, userId: string, game: string, character: string): Promise<{ build: string; wins: number; losses: number; rate: number }[]> {
    const { results } = await db.prepare(
      `SELECT build,
              SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
              COUNT(*) as total
       FROM game_sessions
       WHERE user_id = ? AND game = ? AND character = ? AND build IS NOT NULL
       GROUP BY build ORDER BY total DESC LIMIT 10`
    ).bind(userId, game, character).all<{ build: string; wins: number; losses: number; total: number }>();
    return (results ?? []).map(r => ({ build: r.build, wins: r.wins, losses: r.losses, rate: r.total > 0 ? r.wins / r.total : 0 }));
  }
}

// ─── Meta Analyzer ──────────────────────────────────────────────────────────

export interface MetaSnapshot {
  game: string;
  timestamp: string;
  topCharacters: { name: string; winRate: number; pickRate: number }[];
  topBuilds: { character: string; build: string; winRate: number }[];
  patches: string[];
}

export class MetaAnalyzer {
  /** Get the latest meta snapshot from KV. */
  static async getSnapshot(kv: KVNamespace, game: string): Promise<MetaSnapshot | null> {
    const raw = await kv.get(`meta:${game}:latest`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MetaSnapshot;
    } catch {
      return null;
    }
  }

  /** Compare user's picks vs meta. Returns divergence score (0 = fully on-meta, 1 = fully off-meta). */
  static compareVsMeta(userPicks: { character: string; games: number }[], metaCharacters: string[]): { character: string; games: number; onMeta: boolean }[] {
    const metaSet = new Set(metaCharacters.map(c => c.toLowerCase()));
    return userPicks.map(p => ({ ...p, onMeta: metaSet.has(p.character.toLowerCase()) }));
  }
}

// ─── Stat Tracker ───────────────────────────────────────────────────────────

export interface RankProgression {
  game: string;
  entries: { date: string; rank: string; gamesPlayed: number }[];
  trend: 'climbing' | 'declining' | 'stable';
}

export interface StatSummary {
  game: string;
  totalGames: number;
  winRate: number;
  avgKDA: { kills: number; deaths: number; assists: number };
  bestCharacter: string | null;
  worstCharacter: string | null;
  avgDurationMin: number;
}

export class StatTracker {
  /** Get aggregated stats for a user in a given game. */
  static async summary(db: D1Database, userId: string, game: string): Promise<StatSummary> {
    const row = await db.prepare(
      `SELECT COUNT(*) as totalGames,
              AVG(CASE WHEN result = 'win' THEN 1.0 ELSE 0.0 END) as winRate,
              AVG(kills) as avgKills, AVG(deaths) as avgDeaths, AVG(assists) as avgAssists,
              AVG(duration_min) as avgDuration
       FROM game_sessions WHERE user_id = ? AND game = ?`
    ).bind(userId, game).first<{ totalGames: number; winRate: number; avgKills: number; avgDeaths: number; avgAssists: number; avgDuration: number }>();

    const best = await db.prepare(
      `SELECT character, COUNT(*) as c FROM game_sessions WHERE user_id = ? AND game = ? AND result = 'win' AND character IS NOT NULL GROUP BY character ORDER BY c DESC LIMIT 1`
    ).bind(userId, game).first<{ character: string }>();

    const worst = await db.prepare(
      `SELECT character, COUNT(*) as c FROM game_sessions WHERE user_id = ? AND game = ? AND result = 'loss' AND character IS NOT NULL GROUP BY character ORDER BY c DESC LIMIT 1`
    ).bind(userId, game).first<{ character: string }>();

    return {
      game,
      totalGames: row?.totalGames ?? 0,
      winRate: row?.winRate ?? 0,
      avgKDA: { kills: row?.avgKills ?? 0, deaths: row?.avgDeaths ?? 0, assists: row?.avgAssists ?? 0 },
      bestCharacter: best?.character ?? null,
      worstCharacter: worst?.character ?? null,
      avgDurationMin: row?.avgDuration ?? 0,
    };
  }

  /** Get rank progression over time. */
  static async rankHistory(db: D1Database, userId: string, game: string): Promise<RankProgression> {
    const { results } = await db.prepare(
      `SELECT DATE(played_at) as date, rank, COUNT(*) as gamesPlayed
       FROM game_sessions
       WHERE user_id = ? AND game = ? AND rank IS NOT NULL
       GROUP BY DATE(played_at), rank
       ORDER BY DATE(played_at) ASC`
    ).bind(userId, game).all<{ date: string; rank: string; gamesPlayed: number }>();

    const entries = results ?? [];
    let trend: RankProgression['trend'] = 'stable';
    if (entries.length >= 2) {
      const last = entries[entries.length - 1].rank;
      const prev = entries[entries.length - 2].rank;
      if (last > prev) trend = 'climbing';
      else if (last < prev) trend = 'declining';
    }

    return { game, entries, trend };
  }
}
