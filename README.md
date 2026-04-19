# fastQuant

`fastQuant` is the migration workspace for moving Quanting from a React/Tauri/Rust desktop app to a SvelteKit 5 frontend with a FastAPI backend.

## Target Architecture

```text
apps/web
  SvelteKit 5 UI
  lightweight-charts rendering
  Svelte stores
  HTTP/WebSocket API client

backend
  FastAPI
  market data clients
  indicator engine
  strategy/backtest services
  cache layer
```

The migration keeps business logic in FastAPI. SvelteKit should focus on views, chart rendering, local UI state, and API consumption.

## Development

Backend uses `uv` for Python dependency and environment management.

```bash
cd fastQuant/backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Frontend uses SvelteKit 5.

```bash
cd fastQuant/apps/web
pnpm install
pnpm dev
```

## API Boundary

The first migration boundary mirrors the existing Tauri commands:

| Existing command | FastAPI route |
| --- | --- |
| `fetch_analysis` | `POST /api/analysis` |
| `fetch_watchlist_snapshots` | `POST /api/watchlist/snapshots` |
| `fetch_fundamentals` | `POST /api/fundamentals` |
| `fetch_multi_symbol_candles` | `POST /api/strategy/multi-symbol-candles` |
| `fetch_premarket_snapshots` | `POST /api/strategy/premarket-snapshots` |
| `search_symbols` | `GET /api/search/symbols` |
| Strategy A backtest | `POST /api/strategy/strategy-a/backtest` |
| Strategy B MACD/BB scan | `POST /api/strategy/macd-bb-scan` |
| Strategy B pair trading | `POST /api/strategy/pair-trading` |
| ORB scan | `POST /api/strategy/orb-scan` |

Realtime candle streaming is planned for:

```text
WS /ws/candles/{market}/{symbol}
```

## Migration Rule

Do not move UI-only concerns into FastAPI. Do move data fetching, indicator calculation, screening, strategy signals, and backtest logic into FastAPI.
