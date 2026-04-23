# fastQuant 아키텍처

**스택**: SvelteKit 5 + Svelte 5 (runes) + Tailwind 4 + FastAPI 0.115+ (Python 3.11, uv)
**배포 기본 가정**: 브라우저 웹 (adapter-node), 데스크톱 쉘 병행은 Phase 11에서 재검토
**원본**: `/Users/1ncarnati0n/Desktop/xDev/quanting` (React 19 + Tauri 2)

> 이 문서는 fastQuant의 골격 아키텍처를 정의한다. 모든 Phase 작업(`docs/roadmap.md`)은 여기서 정의된 레이어 경계와 디렉토리 규약을 따른다.

---

## 1. 설계 원칙

1. **비즈니스 로직은 FastAPI, 표현은 SvelteKit**. 인디케이터 계산·스크리너·백테스트·실시간 스트림은 서버가 책임진다. SvelteKit은 렌더링·UI 상태·입력·단축키·차트 그리기만 담당한다.
2. **단방향 데이터 흐름**. `Route → Feature(ViewModel) → Query/Store → API/WS → Router → Service → Provider → Cache`. 역류 금지.
3. **계약 우선(Contract-first)**. Pydantic 모델이 단일 소스. OpenAPI를 통해 프론트로 타입 생성. 수동 타입 중복은 금지.
4. **서버 상태와 클라이언트 상태 분리**. 서버에서 온 데이터는 쿼리 캐시, 로컬 UI 상태는 runes store. 둘을 한 스토어에 섞지 않는다.
5. **경계에서만 검증, 내부는 신뢰**. HTTP/WS 진입점과 프로바이더 응답 경계에서 Pydantic 검증, 내부 함수 호출에는 중복 검증을 두지 않는다.
6. **부작용은 레이어 바깥쪽에만**. 네트워크/캐시/파일/로깅은 `providers`·`cache`·`streams`에만 허용한다. `services`는 순수 함수 지향.
7. **테스트 가능성이 곧 아키텍처의 증거**. 레이어를 자를 때마다 "이 경계에서 모킹이 자연스러운가?"를 확인한다.

---

## 2. 시스템 개요

```
┌──────────────────────────────── apps/web (SvelteKit 5) ────────────────────────────────┐
│                                                                                        │
│  routes/            features/                stores/                                   │
│  +page.svelte  ──▶  dashboard/       ──▶     workspace.svelte.ts                       │
│  +layout.svelte     strategy-{a,b,orb}/      chart.svelte.ts, crosshair, drawing,      │
│                     watchlist/               replay, strategy, query(캐시)             │
│                                              ▲                                         │
│                     components/ (복합 UI)    │                                         │
│                     ui/ (프리미티브)          │                                         │
│                     chart/ (lightweight-charts 래퍼)                                   │
│                                              │                                         │
│                                      api/ ◀──┘                   ws/                   │
│                                      endpoints/*                 candles.svelte.ts    │
│                                      generated/ (OpenAPI)        client.ts, backoff   │
│                                      client.ts, errors.ts                              │
└────────────────────────┬─────────────────────────────────────────┬────────────────────┘
                         │ HTTP /api/*                              │ WS /ws/candles/...
                         ▼                                          ▼
┌──────────────────────────────────── backend (FastAPI) ─────────────────────────────────┐
│                                                                                        │
│  app/main.py (create_app + CORS + routers + ws)                                        │
│  api/                    services/             providers/          cache/              │
│    routes/*              analysis/             binance.py          ttl.py              │
│    ws/candles.py         market_data/          yahoo.py            keys.py             │
│    deps.py               strategy/{a,b,orb}    kis.py              │                   │
│                          fundamentals/         fallback.py         streams/            │
│    core/config, errors   search/                                    binance.py (WS)    │
│    models/ (Pydantic)                                                                  │
│                                                                                        │
└─────────────────────────────┬────────────────────────────────┬──────────────────────────┘
                              │ HTTP                            │ WS upstream
                              ▼                                 ▼
                       Yahoo / KIS REST                   Binance WS stream
```

---

## 3. 프론트엔드 아키텍처 (SvelteKit 5 + Svelte 5 runes + Tailwind 4)

### 3.1 디렉토리 구조

```
apps/web/
├─ src/
│  ├─ app.html
│  ├─ app.css                # Tailwind 4 @theme + 전역 토큰
│  ├─ app.d.ts
│  ├─ hooks.client.ts        # 전역 에러 로깅 / fetch 인터셉트
│  ├─ lib/
│  │  ├─ api/
│  │  │  ├─ client.ts        # fetch 래퍼 + 에러/재시도/취소
│  │  │  ├─ errors.ts        # ApiError, isApiError
│  │  │  ├─ endpoints/
│  │  │  │  ├─ analysis.ts
│  │  │  │  ├─ watchlist.ts
│  │  │  │  ├─ fundamentals.ts
│  │  │  │  ├─ search.ts
│  │  │  │  └─ strategy.ts
│  │  │  ├─ generated/
│  │  │  │  └─ schema.d.ts   # openapi-typescript 산출물
│  │  │  └─ defaults.ts
│  │  ├─ ws/
│  │  │  ├─ client.ts        # 재접속·백오프·하트비트 포함 WS 래퍼
│  │  │  ├─ backoff.ts
│  │  │  └─ candles.svelte.ts # 심볼/인터벌 구독 rune 스토어
│  │  ├─ stores/             # .svelte.ts (runes) 표준
│  │  │  ├─ workspace.svelte.ts
│  │  │  ├─ chart.svelte.ts
│  │  │  ├─ crosshair.svelte.ts
│  │  │  ├─ drawing.svelte.ts
│  │  │  ├─ replay.svelte.ts
│  │  │  ├─ strategy.svelte.ts
│  │  │  └─ query.svelte.ts  # SWR-like 서버 상태 캐시
│  │  ├─ chart/              # lightweight-charts 5 도메인 래퍼
│  │  │  ├─ surface.ts       # 차트 생성/파괴/리사이즈
│  │  │  ├─ series/
│  │  │  │  ├─ candle.ts
│  │  │  │  ├─ volume.ts
│  │  │  │  └─ line.ts
│  │  │  ├─ overlays/
│  │  │  │  ├─ bollinger.ts
│  │  │  │  ├─ sma.ts
│  │  │  │  ├─ ema.ts
│  │  │  │  ├─ hma.ts
│  │  │  │  ├─ donchian.ts
│  │  │  │  ├─ keltner.ts
│  │  │  │  ├─ sar.ts
│  │  │  │  ├─ supertrend.ts
│  │  │  │  ├─ ichimoku.ts
│  │  │  │  ├─ autofib.ts
│  │  │  │  └─ anchoredVwap.ts
│  │  │  ├─ panes/
│  │  │  │  ├─ rsi.ts, macd.ts, stochastic.ts, mfi.ts, cmf.ts,
│  │  │  │  ├─ adx.ts, stc.ts, cvd.ts, obv.ts, atr.ts
│  │  │  │  └─ frame.ts     # 페인 라이프사이클
│  │  │  ├─ drawing/
│  │  │  │  ├─ layer.ts, hit.ts, primitives/{line,rect,fib,...}.ts
│  │  │  └─ coords.ts        # time↔x / price↔y 변환
│  │  ├─ features/           # 기능 단위 ViewModel (stores + API 조립)
│  │  │  ├─ dashboard/
│  │  │  │  ├─ useDashboardPage.svelte.ts  # dashboard thin route controller
│  │  │  │  ├─ useAnalysis.svelte.ts
│  │  │  │  ├─ useWatchlist.svelte.ts
│  │  │  │  └─ useShortcuts.svelte.ts
│  │  │  ├─ strategy-a/
│  │  │  ├─ strategy-b/
│  │  │  └─ strategy-orb/
│  │  ├─ components/         # 복합 UI (Route-ready)
│  │  │  ├─ dashboard/
│  │  │  │  ├─ TopBar.svelte, ChartHeader.svelte, RightDock.svelte,
│  │  │  │  └─ CrosshairLegend.svelte, StatusBar.svelte, TimeRangeBar.svelte
│  │  │  ├─ watchlist/
│  │  │  │  ├─ WatchlistPanel.svelte, SymbolSearch.svelte
│  │  │  ├─ chart/
│  │  │  │  ├─ MarketChart.svelte, ChartToolbar.svelte, DrawingToolbar.svelte,
│  │  │  │  └─ ReplayControls.svelte, FundamentalsOverlay.svelte, …
│  │  │  ├─ strategy/
│  │  │  │  ├─ a/{EquityCurve,TradesTable,Allocation}.svelte
│  │  │  │  ├─ b/{SignalTable,PairPicker,ZScoreChart}.svelte
│  │  │  │  └─ orb/{StocksInPlay,OrbSignals}.svelte
│  │  │  ├─ command/
│  │  │  │  └─ CommandPalette.svelte, ShortcutsModal.svelte
│  │  │  └─ shared/
│  │  │     └─ StateMessage.svelte, Spinner.svelte, Toast.svelte
│  │  ├─ ui/                 # 프리미티브 (bits-ui + melt-ui 래핑)
│  │  │  ├─ button.svelte, dialog.svelte, dropdown.svelte, tabs.svelte,
│  │  │  ├─ select.svelte, sheet.svelte, slider.svelte, switch.svelte,
│  │  │  ├─ toggle-group.svelte, command.svelte, scroll-area.svelte,
│  │  │  ├─ accordion.svelte, separator.svelte, input.svelte, badge.svelte
│  │  ├─ utils/
│  │  │  ├─ formatters.ts, shortcuts.ts, typography.ts, throttle.ts
│  │  └─ types/
│  │     ├─ domain.ts         # API 타입에서 파생된 도메인 타입
│  │     └─ brand.ts          # brand 타입 (Symbol, Interval 등)
│  └─ routes/
│     ├─ +layout.svelte       # 3단 쉘 (TopBar / Watchlist / Main / RightDock)
│     ├─ +layout.ts           # SSR 비활성(ssr=false), prerender=false
│     ├─ +page.svelte         # /dashboard로 redirect
│     ├─ dashboard/
│     │  ├─ +page.svelte      # thin route: controller 조립 + view wiring only
│     │  └─ +page.ts
│     └─ strategy/
│        ├─ +page.svelte      # 탭 쉘
│        ├─ a/+page.svelte
│        ├─ b/+page.svelte
│        └─ orb/+page.svelte
├─ scripts/                   # UX gate / a11y / perf 시뮬
│  ├─ ux-gate.mjs, a11y-audit.mjs, a11y-scenario-audit.mjs,
│  ├─ perf-realtime-sim.mjs, perf-watchlist-sim.mjs,
│  └─ ux-qa-gate.mjs, ux-kpi-remeasure.mjs
└─ tests/
   ├─ unit/                   # Vitest
   └─ e2e/                    # Playwright
```

### 3.2 레이어 책임

| 레이어 | 책임 | 의존 허용 대상 |
| --- | --- | --- |
| `routes/` | URL → 페이지 조립, layout 제공, controller/view 연결. 비즈니스 분기 최소화 | `features`, `components`, `stores` |
| `features/` | Route 화면의 ViewModel. 쿼리 호출 + store 조합 + 이벤트 핸들러. 프론트엔드 MVC의 controller 역할 | `stores`, `api`, `ws`, `utils`, `types` |
| `components/` | 복합 UI. props in, events out | `ui`, `utils`, `types` (스토어 직접 의존 금지 — props로 주입) |
| `ui/` | 헤드리스 프리미티브 래핑. Tailwind 스타일 적용 | 외부 라이브러리만 |
| `chart/` | lightweight-charts 5를 도메인 API로 감쌈. Svelte 무의존 | `utils`, `types` |
| `stores/` | 로컬 UI 상태 + 서버 쿼리 캐시. runes 기반 | `api`, `ws`, `types` |
| `api/` | HTTP 클라이언트 + OpenAPI 생성 타입 | `generated/`, `errors`, `utils` |
| `ws/` | WebSocket 클라이언트 + 재접속 | `api/errors`, `utils` |
| `utils/`, `types/` | 순수 유틸 | 없음 |

**금지 사항**: `components/`가 `stores/`·`api/`를 직접 import 하지 않는다(테스트/스토리북 안정성). 그런 조립은 `features/`에서만.

### 3.2.1 프론트엔드 MVC 해석

- `Model`: FastAPI 계약 타입, query 응답, runes store의 직렬화 가능한 상태.
- `View`: `lib/components/**`, `lib/ui/**`. props를 받아 렌더링하고 이벤트만 내보낸다.
- `Controller`: `lib/features/**`와 thin `routes/**`. dashboard는 `useDashboardPage.svelte.ts`가 fetch, compare overlay, replay, snapshot, dock resize, command orchestration을 맡는다.

이 규약은 고전적 MVC를 그대로 복제하려는 목적이 아니다. SvelteKit 현재 구조를 유지한 채, fat route와 smart component를 줄여 테스트 가능성과 변경 비용을 낮추는 pragmatic MVC 규약이다.

### 3.3 상태 관리 모델 (Svelte 5 runes)

```ts
// lib/stores/workspace.svelte.ts (예시)
import { browser } from "$app/environment";

const STORAGE_KEY = "fastquant-workspace-v3";

function createWorkspace() {
  let params = $state(loadParams());
  let dockTab = $state<DockTab>("watchlist");
  let recentSymbols = $state<RecentSymbol[]>(loadRecents());

  $effect.root(() => {
    if (!browser) return;
    $effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, dockTab, recentSymbols }));
    });
  });

  return {
    get params() { return params; },
    get dockTab() { return dockTab; },
    get recentSymbols() { return recentSymbols; },
    setDockTab(next: DockTab) { dockTab = next; },
    patchParams(patch: Partial<AnalysisParams>) { params = { ...params, ...patch }; },
    selectSymbol(symbol: string, market: MarketType) {
      params = { ...params, symbol, market };
      recentSymbols = upsertRecent(recentSymbols, { symbol, market });
    },
  };
}

export const workspace = createWorkspace();
```

- **모든 신규 스토어는 `.svelte.ts`로 작성**하고 runes(`$state`/`$derived`/`$effect`)만 사용한다.
- 기존 `lib/stores/workspace.ts`(`writable` 기반)는 Phase 1 완료 시점에 위 패턴으로 대체한다.
- **모듈 스코프에서 `$state`를 직접 쓰지 않는다** — 팩토리 함수 안에서만 초기화한다(SSR 안전).
- Cross-component 이벤트는 store getter/setter로 통일. 콜백 prop 체인은 피한다.

### 3.4 서버 상태 캐시 (`query.svelte.ts`)

```ts
// lib/stores/query.svelte.ts (요지)
export function createQuery<Params, Data>(
  fetcher: (p: Params) => Promise<Data>,
  opts?: { staleMs?: number; keepPrevious?: boolean },
) {
  let state = $state<{ data?: Data; error?: ApiError; loading: boolean; fetchedAt?: number }>({
    loading: false,
  });
  let lastKey: string | undefined;
  let abort: AbortController | undefined;

  async function run(params: Params) {
    const key = JSON.stringify(params);
    if (key === lastKey && state.fetchedAt && Date.now() - state.fetchedAt < (opts?.staleMs ?? 5000)) {
      return state.data;
    }
    abort?.abort();
    abort = new AbortController();
    lastKey = key;
    state = { ...state, loading: true, error: undefined };
    try {
      const data = await fetcher(params);
      state = { data, loading: false, fetchedAt: Date.now() };
      return data;
    } catch (error) {
      if ((error as Error).name !== "AbortError") state = { ...state, error: toApiError(error), loading: false };
      throw error;
    }
  }
  return { get state() { return state; }, run };
}
```

- 외부 라이브러리 대신 내장 쿼리 스토어 — lightweight. 동시 요청 취소, stale window, keep-previous만 지원한다.
- 라이브러리가 더 필요해지면 `@tanstack/svelte-query`로 승격(Phase 0-F 결정 포인트).

### 3.5 차트 추상화 (`lib/chart/`)

- `MarketChart.svelte`는 DOM/라이프사이클만 담당. 내부에서 `chart/surface.ts`로 위임.
- 인디케이터 오버레이/페인은 **순수 TS 모듈**로 작성해 Svelte 의존을 차단 → 테스트 용이(JSDOM + canvas 모킹).
- 재계산 타입은 FastAPI가 보낸 값 그대로 시계열 변환만 수행한다. 브라우저에서 다시 계산하지 않는다(브라우저 중복 구현 방지).
- 드로잉 레이어는 lightweight-charts `time-scale` coord API를 사용해 픽셀 변환. 별도 HTML canvas 오버레이로 렌더.

### 3.6 WebSocket 클라이언트 (`lib/ws/`)

- 단일 `WsClient` 클래스(재접속·지수 백오프·하트비트·구독 재등록).
- `candles.svelte.ts`에서 `WsClient` 위에 rune 스토어를 얹어 특정 `market/symbol/interval` 마지막 봉을 반환.
- Live 모드와 Replay 모드는 `chart.svelte.ts`에서 상호배제.

### 3.7 라우팅 / 렌더링

- **SSR off, CSR 전용**. `+layout.ts`에서 `export const ssr = false; export const prerender = false;`.
  - 이유: 실시간 차트/WebSocket/lightweight-charts는 브라우저 전용. SSR로 얻을 이득이 사실상 0.
- 코드 스플리팅은 라우트 단위만 신뢰. 드로잉·고급 인디케이터는 dynamic import로 초기 번들에서 분리.
- `hooks.client.ts`에서 전역 unhandled rejection을 포착해 토스트로 노출.

### 3.8 스타일링 (Tailwind 4)

- `app.css` 상단에서 `@import "tailwindcss";` + `@theme { ... }` 로 토큰 정의.
- 색/타이포/간격/그림자는 전부 토큰 기반. 컴포넌트 단에서 임의 hex/px 금지.
- `docs/UI/ui.html` 시안을 원본 토큰 소스로 삼고, `quanting/src/globals.css`에서 **유효 토큰만** 발췌.
- 글로벌 CSS는 `app.css` 하나로 제한. 컴포넌트 스코프는 Svelte `<style>` 또는 Tailwind 유틸 사용.

---

## 4. 백엔드 아키텍처 (FastAPI + uv)

### 4.1 디렉토리 구조

```
backend/
├─ app/
│  ├─ main.py                 # create_app() + CORS + routers + ws
│  ├─ core/
│  │  ├─ config.py            # Settings (pydantic-settings)
│  │  ├─ errors.py            # 도메인 예외 + FastAPI exception handlers
│  │  └─ logging.py           # structlog/기본 logging 초기화
│  ├─ api/
│  │  ├─ deps.py              # Depends(get_*) 공장 — 캐시/서비스 주입
│  │  ├─ routes/
│  │  │  ├─ analysis.py
│  │  │  ├─ watchlist.py
│  │  │  ├─ fundamentals.py
│  │  │  ├─ search.py
│  │  │  └─ strategy.py
│  │  └─ ws/
│  │     └─ candles.py        # WS /ws/candles/{market}/{symbol}
│  ├─ services/
│  │  ├─ analysis/
│  │  │  ├─ engine.py         # 인디케이터 합성
│  │  │  └─ indicators/       # 개별 인디케이터 (순수 함수)
│  │  ├─ market_data/
│  │  │  ├─ candles.py        # 캔들 수집 오케스트레이션
│  │  │  ├─ interval.py       # 인터벌 plan / 리샘플링
│  │  │  └─ snapshots.py
│  │  ├─ strategy/
│  │  │  ├─ strategy_a/
│  │  │  ├─ strategy_b/
│  │  │  └─ orb/
│  │  ├─ fundamentals/
│  │  └─ search/
│  ├─ providers/              # 외부 데이터 소스 어댑터
│  │  ├─ base.py              # Provider Protocol
│  │  ├─ binance.py
│  │  ├─ yahoo.py
│  │  ├─ kis.py
│  │  └─ fallback.py          # 우선순위 체인 + 조건
│  ├─ cache/
│  │  ├─ ttl.py               # 메모리 TTL 캐시 (asyncio-lock 기반)
│  │  └─ keys.py              # 캐시 키 규약
│  ├─ streams/
│  │  └─ binance.py           # Binance WS 업스트림 구독 + fan-out
│  ├─ models/                 # Pydantic (request/response + 도메인 DTO)
│  │  ├─ base.py
│  │  ├─ market.py
│  │  ├─ analysis.py
│  │  ├─ strategy.py
│  │  └─ fundamentals.py
│  └─ fixtures/               # 테스트용 결정론적 캔들 데이터
└─ tests/
   ├─ unit/                   # services/indicators 순수 함수 테스트
   ├─ contract/               # API 응답 shape 테스트
   ├─ integration/            # 프로바이더 mock 통합
   └─ conftest.py
```

### 4.2 레이어 책임

| 레이어 | 책임 | 부작용 허용 |
| --- | --- | --- |
| `api/routes/` | URL 바인딩, 요청/응답 직렬화, 인증, 검증 | X |
| `api/ws/` | WebSocket 핸드셰이크, 구독/해제, fan-in/out | 스트림 구독만 |
| `api/deps.py` | 싱글턴/요청 스코프 의존성 공장 | X |
| `services/` | 도메인 로직. **순수 함수 지향**. 입력=DTO, 출력=DTO | X (테스트 가능) |
| `providers/` | 외부 API/WS 호출 | O — 네트워크/로깅 |
| `cache/` | 키-값 저장, TTL, 락 | O — 메모리 |
| `streams/` | 업스트림 WS 유지, fan-out | O — 네트워크 |
| `models/` | Pydantic 스키마 | X |
| `core/` | 설정, 로깅, 에러 타입 | O — 한정 |

### 4.3 의존성 주입 패턴

```python
# app/api/deps.py (요지)
from functools import lru_cache
from fastapi import Depends
from app.cache.ttl import TTLCache
from app.providers.fallback import FallbackProviderChain
from app.services.analysis.engine import AnalysisEngine

@lru_cache
def get_cache() -> TTLCache: ...
@lru_cache
def get_providers() -> FallbackProviderChain: ...

def get_analysis_engine(
    cache: TTLCache = Depends(get_cache),
    providers: FallbackProviderChain = Depends(get_providers),
) -> AnalysisEngine:
    return AnalysisEngine(providers=providers, cache=cache)
```

- 서비스 클래스는 `Depends` 통해서만 상태를 받는다. 모듈-레벨 전역 금지.
- `lru_cache`는 프로세스 싱글턴 용. 테스트에서는 `app.dependency_overrides`로 교체.

### 4.4 프로바이더 fallback 정책

- 각 프로바이더는 `providers.base.Provider` Protocol 준수 (candles / snapshot / search / fundamentals 메서드 서브셋).
- `FallbackProviderChain`이 (market, data_kind)별 우선순위 매트릭스를 가진다.

| market | data_kind | primary | fallback |
| --- | --- | --- | --- |
| crypto | candles / snapshot | binance | — |
| usStock | candles / snapshot / fundamentals | yahoo | — |
| forex | candles | yahoo | — |
| krStock | daily/weekly/monthly candles | kis (credential 있을 때) | yahoo |
| krStock | intraday candles | yahoo | — |

- 각 호출은 **타임아웃(기본 5s)**, **제한된 재시도(최대 2회, exponential backoff)**를 통과한다.
- 실패 시 `ProviderError` → `api/errors`에서 정규화되어 `{ code, message, provider }` 로 내려간다.

### 4.5 캐시 정책

| 종류 | TTL | 키 |
| --- | --- | --- |
| 캔들 (완결 봉) | 인터벌 × 60 (예: 1m → 60s) | `candles:{provider}:{market}:{symbol}:{interval}:{to}` |
| 스냅샷 | 30s | `snapshot:{market}:{symbol}` |
| 심볼 검색 | 5분 | `search:{query}:{market?}` |
| 펀더멘털 | 30분 | `fundamentals:{market}:{symbol}` |

- `TTLCache`는 `asyncio.Lock`으로 stampede 방지(singleflight 패턴).
- 최대 크기는 1만 항목, LRU 축출.
- 캐시 실패는 silent fallback(원본 조회).

### 4.6 실시간 스트림 아키텍처

```
 Client ws://backend/ws/candles/crypto/BTCUSDT?interval=1m
   │
   ▼
 api/ws/candles.py
   │  subscribe(market, symbol, interval)
   ▼
 streams/binance.py
   │  ensure_upstream(channel)        # 동일 채널은 1개만
   ▼
 Binance WS kline stream (upstream)
   │  on_message → parsed candle
   ▼
 fan-out → 각 subscriber 큐(asyncio.Queue)
   ▼
 WebSocket send_json
```

- 동일 `(market, symbol, interval)` 구독이 여러 클라이언트에서 들어와도 업스트림은 1개만 유지.
- 클라이언트 연결이 모두 끊기면 업스트림도 종료.
- crypto 이외 마켓은 폴링 기반(`market_data.candles` 반복)으로 동일한 인터페이스 제공.

### 4.7 에러 정규화

```python
# core/errors.py
class ApiError(Exception):
    code: str                      # "provider_timeout", "invalid_symbol"
    message: str
    status_code: int = 500
    details: dict[str, Any] | None = None

class ProviderError(ApiError): ...
class ValidationError(ApiError): ...
```

- `main.py`에서 `ApiError` 핸들러 등록 → `{"error": {"code","message","details"}}` 응답.
- `HTTPException`도 동일한 shape로 래핑.
- 프론트는 `lib/api/errors.ts` `ApiError` 클래스로 파싱해 토스트/보더 렌더.

### 4.8 로깅 / 관측

- `structlog` 기반 JSON 로깅 (핵심 키: `request_id`, `provider`, `market`, `symbol`, `duration_ms`, `cache_hit`).
- 요청별 `request_id`는 미들웨어에서 ULID 생성, 응답 헤더 `x-request-id`로 반환.
- 메트릭은 Phase 11에서 prometheus 어댑터를 선택적으로 붙인다(1차는 로그만).

---

## 5. 타입 및 계약 공유 (Contract-first)

### 5.1 파이프라인

```
Pydantic models (backend/app/models/*.py)
   │
   ▼
FastAPI → /openapi.json (자동)
   │
   ▼
openapi-typescript  →  apps/web/src/lib/api/generated/schema.d.ts
   │
   ▼
lib/api/types.ts  (도메인 편의 타입은 여기서 파생만)
```

### 5.2 규약

- 수동 타입 복제 금지. 수동 타입은 `lib/types/domain.ts`에서 **파생형**만(예: `type Market = components['schemas']['MarketType']`).
- `pnpm codegen:api`: 로컬 dev 서버가 떠 있을 때 `openapi-typescript http://localhost:8000/openapi.json -o src/lib/api/generated/schema.d.ts`.
- CI 및 pre-push hook에서 재생성 후 diff 검사(계약 드리프트 경보).
- brand 타입은 runtime 검증 없이 TS 레벨에서만(`type Symbol = string & { readonly __brand: "Symbol" }`).

---

## 6. 데이터 흐름 (주요 시퀀스)

### 6.1 분석 요청

```
User selects symbol/interval
  → features/dashboard/useAnalysis.svelte.ts  .run(params)
  → lib/api/endpoints/analysis.ts .fetchAnalysis(params)
  → HTTP POST /api/analysis
  → api/routes/analysis.py  (Pydantic 검증)
  → services/analysis/engine.AnalysisEngine.run(params)
    → services/market_data/candles.get_candles(...)   (cache 조회 → miss → provider)
    → services/analysis/indicators/*.compute(...)
  → Pydantic 응답
  → client receives AnalysisResponse
  → query store 캐시 → MarketChart.svelte 재렌더
```

### 6.2 실시간 구독

```
Route mount / symbol 변경
  → features/dashboard/useLiveCandles.svelte.ts
  → lib/ws/candles.svelte.ts .subscribe({market, symbol, interval})
  → WsClient.ensure(url) → send(subscribe msg)
  → api/ws/candles.py  receives subscribe
  → streams/binance.py attach_listener
  → upstream candle → fan-out → WS frame → client
  → ws store 상태 업데이트 → chart overlay merge
```

### 6.3 전략 백테스트

```
Strategy A 폼 제출
  → features/strategy-a/useBacktest.svelte.ts
  → POST /api/strategy/strategy-a/backtest
  → services/strategy/strategy_a/run.py
    → services/market_data (월봉 수집)
    → 서브 전략 계산 (GEM / TAA / Sector)
  → StrategyABacktestResult
  → Strategy A UI (Equity / Trades / Allocation)
```

---

## 7. 환경변수 및 설정

| 변수 | 위치 | 용도 |
| --- | --- | --- |
| `FASTQUANT_ALLOWED_ORIGINS` | backend | CORS 허용 오리진 |
| `FASTQUANT_LOG_LEVEL` | backend | `INFO`/`DEBUG` |
| `KIS_APP_KEY`, `KIS_APP_SECRET` | backend | KR 일봉 프로바이더 |
| `FASTQUANT_CACHE_MAX` | backend | 캐시 최대 크기 |
| `VITE_FASTQUANT_API_URL` | apps/web | HTTP base URL |
| `VITE_FASTQUANT_WS_URL` | apps/web | WS base URL |

- `.env` 파일은 `backend/.env`, `apps/web/.env`로 분리.
- 공통 값이 필요하면 루트 `Makefile`에서 export.

---

## 8. 테스트 전략

### 8.1 Backend

- **unit** (`tests/unit`): `services/analysis/indicators/*` 순수 함수, 결정론적 fixture 캔들로 수치 테스트.
- **contract** (`tests/contract`): 각 라우트별 응답 shape 스냅샷 + Pydantic 필드 존재 검증 (원본 TS 타입 기준 참조).
- **integration** (`tests/integration`): `providers/*` 를 `respx`/`httpx.MockTransport`로 mock, 경로 전체 통합.
- **ws**: `websockets` 테스트 클라이언트로 구독/브로드캐스트 검증.
- 실제 네트워크는 호출 금지. 프로바이더 응답은 JSON 고정 파일.

### 8.2 Frontend

- **unit** (Vitest): `lib/utils/*`, `lib/chart/overlays/*`, `lib/stores/*`(runes 팩토리 단위).
- **component** (Vitest + testing-library/svelte): `components/chart/MarketChart.svelte` 같은 대표 컴포넌트.
- **e2e** (Playwright): `dashboard` 로딩 → 심볼 변경 → 차트 렌더 → 단축키 흐름.
- **UX gate** (`scripts/*`): a11y(axe), perf 시뮬, KPI 재측정. Phase 10에서 이식.

### 8.3 계약 테스트

- Phase 1 완료 시점부터 backend 응답 snapshot + frontend `openapi-typescript` 생성 diff가 같이 PR 리뷰 대상.

---

## 9. 빌드 / 패키징

### 9.1 로컬 실행

```bash
# 공통
pnpm -C apps/web install
uv sync --directory backend

# 동시 실행 (루트 Makefile 또는 turborepo 대체)
make dev            # backend + apps/web
# 또는
uv run --directory backend uvicorn app.main:app --reload --port 8000
pnpm -C apps/web dev
```

### 9.2 프로덕션 빌드

- Frontend: `adapter-node`로 전환 예정. 컨테이너/Node 런타임에서 `node build`.
- Backend: `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`.
- 단일 컨테이너 조합 옵션(Phase 11 결정): Node 런타임 + Python을 reverse proxy로 묶거나, 두 서비스 배포.

### 9.3 검증 명령

```bash
# backend
uv run --directory backend ruff check app tests
uv run --directory backend pytest

# frontend
pnpm -C apps/web check
pnpm -C apps/web build
pnpm -C apps/web test                  # (Vitest, Phase 10부터 활성)
pnpm -C apps/web e2e                   # (Playwright, Phase 10부터 활성)
pnpm -C apps/web ux:verify             # (UX gate, Phase 10부터 활성)
```

---

## 10. 원본 → 타겟 매핑 보조표 (아키텍처 관점)

| quanting 요소 | 이식 위치 (fastQuant) | 레이어 |
| --- | --- | --- |
| Zustand `useChartStore` | `lib/stores/chart.svelte.ts` | stores |
| Zustand `useCrosshairStore` | `lib/stores/crosshair.svelte.ts` | stores |
| `utils/indicatorGuide.ts` | `lib/chart/overlays/`, `lib/chart/panes/` | chart |
| `components/MainChart.tsx` | `lib/components/chart/MarketChart.svelte` + `lib/chart/surface.ts` | components + chart |
| `services/tauriApi.ts` | `lib/api/endpoints/*.ts` + `lib/api/generated/` | api |
| `src-tauri/api_client/*.rs` | `app/providers/{binance,yahoo,kis}.py` | providers |
| `src-tauri/ta_engine/` | `app/services/analysis/indicators/*.py` | services |
| `src-tauri/cache/` | `app/cache/ttl.py` | cache |
| `src-tauri/commands/strategy.rs` | `app/services/strategy/*` + `api/routes/strategy.py` | services + routes |
| Tauri 이벤트(실시간) | `app/streams/binance.py` + `api/ws/candles.py` | streams + api/ws |
| `scripts/ux-*` | `apps/web/scripts/ux-*` | 품질 게이트 |

---

## 11. 열린 선택지

- **쿼리 캐시**: 자체 `query.svelte.ts` (채택 기본값) vs `@tanstack/svelte-query` 승격. 기능이 네트워크 상태/병렬 구성/낙관적 업데이트까지 필요해지면 승격.
- **UI 프리미티브**: `bits-ui + melt-ui` (기본 가정) vs `skeleton` toolkit. 시안 재현 난이도에 따라 Phase 1 중 확정.
- **데스크톱 쉘**: Phase 11에 기존 Tauri 쉘을 SvelteKit에 붙일지 재결정. 붙이면 `src-tauri/` 이식 최소화 목표.
- **상태 라이브러리**: runes 단일 (기본) vs `nanostores` 병용. 현재 복잡도 기준으로는 runes 단일이 충분.
- **로깅 스택**: structlog + 기본 uvicorn 로깅 vs Loguru. 기본은 structlog.
- **관측/메트릭**: Phase 11에 Prometheus adapter 부착 여부.

## 12. Migration Impact Notes

- 기존 `lib/stores/workspace.ts`(writable)는 Phase 1-A에서 `workspace.svelte.ts`(runes)로 rewrite. 스토리지 키를 `fastquant-workspace-v2` → `v3`로 교체해 마이그레이션 경계를 명확히 한다.
- 기존 `lib/api/types.ts`의 수기 타입은 Phase 1-A에서 `generated/schema.d.ts`로부터의 파생으로 치환. 삭제 대신 re-export 유지.
- `apps/web`에 `scripts/`와 `tests/` 디렉토리가 아직 없으므로 Phase 10에서 한 번에 생성.
- backend `services/market_data`에 섞여 있을 가능성이 있는 프로바이더 코드는 Phase 1-A에 `app/providers/`로 추출(모듈 이동 + import 재배선만).
