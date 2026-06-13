# PlayerLog AI

**PlayerLog** is a privacy-first match history and statistics tracker for competitive gamers. It pulls match data from game APIs (Apex Legends, Valorant, CS2, Destiny 2, Fortnite), tracks K/D ratios, weapon performance, and improvement trends — all stored locally, no accounts required. It runs as a Cloudflare Worker serving a responsive analytics dashboard.

## Why It Matters

Gaming stats platforms (tracker.gg, op.gg) monetize player data through ads and premium subscriptions, require account creation, and often lack cross-game aggregation. PlayerLog flips the model: your match data lives on your device, exportable as JSON/CSV anytime. The analytics that matter — rolling 30-day K/D trends, per-weapon headshot rates, session-tagging ("tilted", "warmed up", "tryhard") correlated with performance — are computed locally. This is especially valuable for players who main multiple games and want unified tracking without surrendering their data to third-party services.

## How It Works

### Data Pipeline

```
Game API → Match JSON → Local storage → Analytics engine → Dashboard
```

Each match is fetched via the game's official API (Apex Tracker API, Valorant API, Steam Web API) and normalized into a common schema:

```
MatchRecord {
    game: String,        // "apex", "valorant", "cs2"
    mode: String,        // "ranked", "casual"
    result: WinLoss,
    kda: (u32, u32, u32),
    damage: u32,
    duration_secs: u32,
    weapon_stats: Vec<WeaponStat>,
    timestamp: i64,
    session_tags: Vec<String>,
}
```

### Key Metrics

| Metric | Formula | Insight |
|--------|---------|---------|
| K/D Ratio | kills / deaths | Core skill metric |
| Win Rate | wins / total | Team/positioning skill |
| Avg Damage | Σ damage / N | Consistency indicator |
| Headshot % | headshots / total_shots | Aim precision |
| Improvement slope | slope(K/D, 30-day window) | Trend direction |

### Session Tagging

Players tag sessions with mental states. The analytics engine correlates tags with performance:

```
performance("tilted")   = mean(K/D | tag = "tilted")
performance("tryhard")  = mean(K/D | tag = "tryhard")
delta = performance("tryhard") - performance("tilted")
```

This quantifies the impact of mental state on gameplay — actionable data for self-improvement.

### Cross-Game Comparison

All games normalize to the common schema, enabling:
- Unified improvement timeline across all games
- Per-game weapon/loadout meta analysis
- Time-investment vs. skill-gain ROI comparison

## Quick Start

```bash
# Deploy as Cloudflare Worker
npx wrangler deploy

# Local development
npx wrangler dev
```

The worker serves the full dashboard at the root URL. Match data is fetched client-side from game APIs using user-provided API keys (stored locally, never transmitted).

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Full dashboard with match history, stats, weapons |

*Client-side: localStorage for match records, Chart.js for trend visualization.*

## Architecture Notes

PlayerLog applies γ + η = C to gaming performance: γ (gamma) is the constructive tracking and analysis that builds improvement insight, while η (eta) is the elimination of tilt-induced losses identified through session tagging. The weapon/loadout win-rate analysis reveals which strategies (γ) actually produce competence C — vs. which are wasted effort. The local-first privacy model ensures η extends to data sovereignty: your performance data isn't monetized by third parties. See [ARCHITECTURE.md](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md).

## References

1. Buckley, J. (2017). "Data Analytics in Esports." *International Journal of Sports Marketing*. — On performance metrics in competitive gaming.
2. Ste-Yves, J. (2015). "Skill Rating Systems for Multiplayer Games." *GDC Talk*. — ELO, TrueSkill, and Glicko rating systems.
3. Cloudflare. (2024). *Workers Documentation*. — Edge deployment model for serverless applications.

## License

MIT
