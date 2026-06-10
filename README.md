# PlayerLog

> Match history and stats that live on your machine.

**[playerlog.ai](https://playerlog.ai)**

Track your matches, weapons, loadouts, and improvement across every game you play. Your data stays on your machine. No accounts, no social features, no tilted teammates in your DMs.

## What It Does

- **Auto-import** — Pulls match data from game APIs (Apex, Valorant, CS2, Destiny 2, Fortnite)
- **Cross-game tracking** — All your stats in one place, compare improvement curves side by side
- **Weapon/loadout meta** — Which loadout actually wins you games based on YOUR data
- **Session tagging** — Tag sessions by mental state (warmed up, tilted, tryhard) and see correlations
- **Improvement timeline** — Rolling 30-day K/D, win rate, damage charts
- **No account required** — Local data. Export as JSON or CSV anytime

## Tech Stack

- Cloudflare Workers (edge deployment)
- Single-file HTML response
- Custom domain via Cloudflare

## Deployment

```bash
npx wrangler deploy
```

## Part of [SuperInstance](https://superinstance.ai)
