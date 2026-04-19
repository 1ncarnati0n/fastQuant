# UI/UX 이전 로드맵

**원본**: `/Users/1ncarnati0n/Desktop/xDev/quanting` (React 19 + Tauri 2 + Zustand + lightweight-charts v5)
**타겟**: `fastQuant` (SvelteKit 5 + Svelte 5 runes + Tailwind 4 + FastAPI)
**범위**: UI/UX 전반 + UI를 지탱하는 프론트/백엔드 기초 배선
**기반 아키텍처**: `docs/architecture.md` *(레이어 · 디렉토리 · 타입 계약의 단일 소스)*
**참조 계획**: `docs/plans/SVELTEKIT_FASTAPI_MIGRATION.md` (백엔드 포함 전체 로드맵)

> 이 문서는 `architecture.md`에서 정의한 레이어 규약 위에서 이전 작업을 TODO로 쪼갠다.
> 각 Phase는 **목표 → 생성/수정 경로 → 체크리스트 → Gate**의 네 블록을 가진다.
> 착수 시 `[~]`(진행 중), 완료 시 `[x]`.

---

## 0. 현재 이식 상태 스냅샷 (2026-04-18)

### 이미 옮겨온 것 (`apps/web/src/lib`)

- [x] HTTP 클라이언트 골격 (`api/client.ts`, `api/types.ts`, `api/defaults.ts`) — **수기 타입, 재시도/취소 미구현**
- [x] Workspace store (`stores/workspace.ts`) — **writable 기반, runes 미적용**
- [x] 차트 + 볼륨 렌더링 (`components/MarketChart.svelte`) — **오버레이 2종만**
- [x] Watchlist + 심볼 검색 1차 (`components/WatchlistPanel.svelte`)
- [x] 인디케이터 컨트롤 → `/api/analysis` 배선 (`components/IndicatorDock.svelte`)
- [x] Signal tape 1차 (`components/SignalTape.svelte`)
- [x] Equity curve 1차 (`components/EquityCurveChart.svelte`)
- [x] Analysis summary 카드 (`components/AnalysisSummary.svelte`)
- [x] 라우트: `/`, `/dashboard`, `/strategy`

### 아직 이식되지 않은 것

- [ ] 디렉토리 구조(`architecture.md §3.1`)의 `features/`, `ui/`, `chart/`, `ws/`, `types/`, `scripts/`, `tests/`
- [ ] runes 기반 스토어 5종 (`chart/crosshair/drawing/replay/strategy.svelte.ts`) 및 서버 쿼리 캐시(`query.svelte.ts`)
- [ ] OpenAPI → TS 자동 생성 파이프라인
- [ ] WebSocket 클라이언트(프론트) / WebSocket 엔드포인트(백엔드 `api/ws/candles.py`, `streams/binance.py`)
- [ ] 에러 정규화(백엔드 `core/errors.py`, 프론트 `lib/api/errors.ts`)
- [ ] 프로바이더 레이어 분리 (`app/providers/*`)
- [ ] 28개 원본 Dashboard 컴포넌트 중 20+개 (MarketHeader, ChartContainer, CrosshairLegend, DrawingToolbar, ReplayControls, CommandCenter, ShortcutsModal, SettingsPanel, FundamentalsOverlay, SignalZonesOverlay, VolumeProfileOverlay, TimeRangeBar, StatusBar 등)
- [ ] UI 프리미티브 세트 (dialog / dropdown / select / sheet / slider / tabs / toggle-group / command 등 17종)
- [ ] 드로잉 캔버스 전체
- [ ] Strategy A/B/ORB 세부 UI (트레이드 테이블, 페어 z-score, 프리마켓 스캐너 등)
- [ ] UX 품질 스크립트군 (ux-gate / a11y / perf)
- [ ] `docs/UI/ui.html` 시안 대비 디자인 토큰 정합

---

## 1. 원본 → 타겟 매핑 (아키텍처 경로 기준)

| 원본 (quanting) | 타겟 (`architecture.md` 경로) | 상태 |
| --- | --- | --- |
| `src/App.tsx` | `apps/web/src/routes/+layout.svelte` + `+page.svelte` | 1차 |
| `stores/useChartStore` | `lib/stores/chart.svelte.ts` | 미시작 |
| `stores/useCrosshairStore` | `lib/stores/crosshair.svelte.ts` | 미시작 |
| `stores/useDrawingStore` | `lib/stores/drawing.svelte.ts` | 미시작 |
| `stores/useReplayStore` | `lib/stores/replay.svelte.ts` | 미시작 |
| `stores/useSettingsStore` | `lib/stores/workspace.svelte.ts` + `settings.svelte.ts` | **writable → runes 이관 필요** |
| `stores/useStrategyStore` | `lib/stores/strategy.svelte.ts` | 미시작 |
| `services/tauriApi.ts` | `lib/api/endpoints/*` + `lib/api/generated/schema.d.ts` | 수기 타입 상태 |
| `components/dashboard/DashboardTopBar.tsx` | `lib/components/dashboard/TopBar.svelte` | 미시작 |
| `components/dashboard/DashboardChartHeader.tsx` | `lib/components/dashboard/ChartHeader.svelte` | 미시작 |
| `components/dashboard/DashboardRightDock.tsx` | `lib/components/dashboard/RightDock.svelte` | 미시작 |
| `components/MainChart.tsx` + `ChartContainer.tsx` | `lib/components/chart/MarketChart.svelte` + `lib/chart/surface.ts` | 1차 |
| `components/CrosshairLegend.tsx` | `lib/components/dashboard/CrosshairLegend.svelte` | 미시작 |
| `components/ChartToolbar.tsx` | `lib/components/chart/ChartToolbar.svelte` | 미시작 |
| `components/IndicatorSection.tsx` | `lib/components/dashboard/IndicatorDock.svelte` | 1차 |
| `components/SettingsPanel.tsx` | `lib/components/dashboard/SettingsPanel.svelte` | 미시작 |
| `components/CommandCenter.tsx` | `lib/components/command/CommandPalette.svelte` | 미시작 |
| `components/ShortcutsModal.tsx` | `lib/components/command/ShortcutsModal.svelte` | 미시작 |
| `components/WatchlistSidebar.tsx` + `SymbolSearch.tsx` | `lib/components/watchlist/*` | 1차 |
| `components/FundamentalsOverlay.tsx` | `lib/components/chart/FundamentalsOverlay.svelte` | 미시작 |
| `components/SignalZonesOverlay.tsx` | `lib/components/chart/SignalZonesOverlay.svelte` | 미시작 |
| `components/VolumeProfileOverlay.tsx` | `lib/components/chart/VolumeProfileOverlay.svelte` | 미시작 |
| `components/ReplayControls.tsx` | `lib/components/chart/ReplayControls.svelte` + `lib/stores/replay.svelte.ts` | 미시작 |
| `components/DrawingCanvas.tsx` + `DrawingToolbar.tsx` | `lib/chart/drawing/*` + `lib/components/chart/DrawingToolbar.svelte` | 미시작 |
| `components/StatusBar.tsx`, `TimeRangeBar.tsx` | `lib/components/dashboard/{StatusBar,TimeRangeBar}.svelte` | 미시작 |
| `components/strategy/strategyA/*` | `lib/components/strategy/a/*` + `lib/features/strategy-a/*` | 엔드포인트·Equity만 |
| `components/strategy/strategyB/*` | `lib/components/strategy/b/*` + `lib/features/strategy-b/*` | 엔드포인트 연결 |
| `components/strategy/strategyORB/*` | `lib/components/strategy/orb/*` + `lib/features/strategy-orb/*` | 엔드포인트 연결 |
| `components/ui/*` (shadcn 17종) | `lib/ui/*` (bits-ui + melt-ui 래핑) | 미시작 |
| `utils/shortcuts.ts`, `formatters.ts`, `typography.ts` | `lib/utils/*` | 미시작 |
| `utils/indicatorGuide.ts`, `lowerIndicatorPanes.ts`, `chartShared.ts` | `lib/chart/overlays/*`, `lib/chart/panes/*`, `lib/chart/coords.ts` | 미시작 |
| Tauri 이벤트(실시간) | `backend/app/api/ws/candles.py` + `backend/app/streams/binance.py` + `apps/web/src/lib/ws/*` | 미시작 |
| `src-tauri/api_client/{binance,yahoo,kis}.rs` | `backend/app/providers/{binance,yahoo,kis}.py` | **market_data 내부에 섞여 있음 — 추출 필요** |
| `src-tauri/ta_engine/` | `backend/app/services/analysis/indicators/*.py` | 상당 부분 완료 |
| `src-tauri/cache/` | `backend/app/cache/ttl.py` | 구조 분리 필요 |
| `scripts/ux-*` | `apps/web/scripts/ux-*` | 미시작 |
| `docs/UI/ui.html` 시안 | `apps/web/src/app.css` `@theme` 토큰 | 미시작 |

---

## 2. Phase 0 — 착수 전 결정

> **Ground Truth (2026-04-18 확정)**: `/Users/1ncarnati0n/Desktop/xDev/quanting` React 앱이 단일 시각/상호작용 기준.
> `docs/UI/ui.html`은 초기 시안으로, 실제 앱과 레이아웃이 다르므로(왼쪽 사이드바 vs 오른쪽 도크) 참조 자료로만 사용한다.
> 색상·스페이싱 토큰의 ground truth는 `quanting/src/globals.css`의 `:root` / `.dark` 블록.

아래 여섯 가지 기본값을 확정한다 (2026-04-18). 변경 시 아래 체크박스를 풀고 결정 이력을 여기에 남긴다.

- [x] **0-A. UI 프리미티브**: **bits-ui + melt-ui** — 원본 shadcn 17종을 Svelte 5 환경에서 커버
- [x] **0-B. 상태**: **Svelte 5 runes 단일** — 남은 writable은 마주칠 때마다 runes로 이관
- [x] **0-C. 배포 형태**: **웹 + adapter-node**, Phase 12에서 데스크톱 병행 재검토
- [x] **0-D. 드로잉 MVP 범위**: **P1 + 측정·사각형·텍스트**; 피치포크/갠/엘리엇/하모닉은 Phase 12 이후 옵션
- [x] **0-E. UX 스크립트 이식 시점**: **Phase 11 일괄**, a11y만 Phase 4 말 스모크로 선행
- [x] **0-F. 쿼리 캐시**: **자체 `query.svelte.ts`** — 병렬 요청·낙관 업데이트 수요 생기면 Phase 8에서 TanStack 승격 재검토

---

## 3. Phase 1 — 기초 아키텍처 배선 *(먼저 해야 할 일)*

**목표**: 아키텍처 §3.1 / §4.1의 디렉토리 뼈대, 타입 계약, 런타임 패턴을 실제 코드로 정착시킨다.
**왜 먼저인가**: Phase 2 이후 작업이 전부 이 뼈대에 의존한다. 토큰 · 오버레이 · 드로잉 · 실시간 어느 것부터 시작해도, 이 단계가 빠지면 뒷작업이 재작업된다.

**생성/수정 경로**

```
apps/web/src/
  app.d.ts, hooks.client.ts
  lib/api/{client.ts, errors.ts, defaults.ts, endpoints/*, generated/schema.d.ts}
  lib/ws/{client.ts, backoff.ts}
  lib/stores/{workspace.svelte.ts, query.svelte.ts}
  lib/chart/{surface.ts, coords.ts, series/candle.ts, series/volume.ts, series/line.ts}
  lib/types/{domain.ts, brand.ts}
  lib/utils/{formatters.ts, throttle.ts}
  routes/+layout.ts    # ssr=false, prerender=false
apps/web/svelte.config.js   # adapter-auto → adapter-node
apps/web/package.json       # openapi-typescript, @sveltejs/adapter-node 등 devDep 추가
apps/web/package.json scripts: "codegen:api"
backend/app/
  core/{errors.py, logging.py}
  providers/{base.py, binance.py, yahoo.py, kis.py, fallback.py}
  cache/{ttl.py, keys.py}
  api/deps.py
  main.py (ApiError handler 등록)
```

**체크리스트**

- [x] adapter 전환: `adapter-auto` → `adapter-node`
- [x] `routes/+layout.ts`에 `ssr = false; prerender = false;` 지정
- [x] `lib/api/client.ts` 재작성: `ApiError` 파싱, 5xx 단일 재시도, JSON 파싱 실패 처리
- [x] `lib/api/errors.ts`에 `ApiError` 클래스 + `toApiError(unknown)` 구현
- [x] backend `core/errors.py`에 `ApiError` / `ProviderError` / `InvalidSymbolError` 정의 + `main.py`에 핸들러 등록
- [x] backend `providers/` 추출: `providers/{binance,yahoo,kis}.py` + `providers/fallback.py` 분리, `services/market_data/*`는 re-export로 하위 호환 유지
- [x] `cache/ttl.py`: asyncio.Lock + OrderedDict LRU + TTL, `cache/keys.py` 네임스페이스 규약
- [x] `api/deps.py`에 `get_cache` Depends 공장
- [ ] OpenAPI → TS codegen 파이프라인: `pnpm codegen:api` 스크립트 추가 완료. 실행은 backend dev 서버 기동 후 `pnpm codegen:api` → `lib/api/generated/schema.d.ts` 생성 필요
- [x] `lib/stores/workspace.svelte.ts` 신규 작성 (runes + `$effect.root`, 스토리지 키 `v3`)
- [x] 기존 `lib/stores/workspace.ts` 소비처를 `workspace.svelte.ts`로 교체 후 구파일 삭제
- [x] `lib/stores/query.svelte.ts` 서버 쿼리 캐시 (취소, stale window, keep-previous)
- [x] `lib/chart/surface.ts` lightweight-charts 생성/파괴/리사이즈/fitContent 래퍼
- [x] `lib/ws/client.ts` + `lib/ws/backoff.ts` 재접속·지수백오프·하트비트 골격

**Gate**

```bash
uv run --directory backend ruff check app tests
uv run --directory backend pytest
pnpm -C apps/web check
pnpm -C apps/web build
pnpm -C apps/web codegen:api      # 생성 결과 diff 비어 있어야 PR mergeable
```

---

## 4. Phase 2 — 디자인 토큰 · 3단 레이아웃 쉘

**목표**: `docs/UI/ui.html` 시안과 `quanting/src/globals.css`의 디자인 토큰을 Tailwind 4 `@theme`로 옮기고, 3단 워크스페이스 쉘을 구성한다.

**생성/수정 경로**

```
apps/web/src/app.css       # @import "tailwindcss"; @theme { ... }
apps/web/src/routes/+layout.svelte
apps/web/src/lib/components/dashboard/{TopBar.svelte, RightDock.svelte}
apps/web/src/lib/ui/{button,dropdown,tabs,separator,scroll-area,switch,badge}.svelte  # 이 Phase 에서 필요한 최소 세트
```

**체크리스트**

- [x] `ui.html` 시안 기반 다크 토큰 추출 → `app.css @theme` + `:root` CSS vars (bg/surface/text/muted/line/accent/success/danger/warning/shadow)
- [x] `WatchlistPanel.svelte` + `dashboard/+page.svelte` 하드코딩 색 → CSS vars로 교체
- [ ] 다크 테마 기본값 검증 (시안과 시각 비교)
- [x] `dashboard/+page.svelte`에서 TopBar · RightDock 컴포넌트로 분리, 접힘/펼침 dockOpen 로컬 상태
- [x] `RightDock.svelte`: Watchlist / 분석 탭 구조, header, close button, props-only 설계
- [x] `TopBar.svelte`: 로고(아이콘 + fastQuant), nav, 패널 토글 icon-group, ApiStatus, props-only
- [x] 반응형 브레이크포인트: 1024px 2→1단 전환
- [ ] 이 Phase에서 필요한 최소 UI 프리미티브 7종 (bits-ui 래핑) 작성
- [x] `lib/components/dashboard/*`는 **스토어 직접 import 금지** 규약 준수 (props로 주입)

**Gate**: `pnpm check && pnpm build`, 수동 시각 비교 (`docs/UI/ui.html` ↔ `/dashboard`)

---

## 5. Phase 3 — 차트 오버레이 완성

**목표**: 상단 오버레이 인디케이터를 `lib/chart/overlays/*`로 추가. 렌더링은 FastAPI가 보낸 값을 시계열로 그릴 뿐, 재계산 금지.

**생성/수정 경로**

```
apps/web/src/lib/chart/overlays/
  bollinger.ts, sma.ts, ema.ts, hma.ts,
  donchian.ts, keltner.ts, sar.ts, supertrend.ts,
  ichimoku.ts, autofib.ts, anchoredVwap.ts
apps/web/src/lib/components/chart/MarketChart.svelte  # overlay 플러그-인 포인트
apps/web/src/lib/components/chart/ChartToolbar.svelte
```

**체크리스트**

- [x] Bollinger Bands (`overlays/bollinger.ts`)
- [x] SMA / EMA / HMA (`overlays/moving.ts`)
- [x] Donchian Channel (`overlays/donchian.ts`)
- [x] Keltner Channel (`overlays/keltner.ts`)
- [x] Parabolic SAR (`overlays/sar.ts`, point-markers 패턴)
- [x] Supertrend (`overlays/supertrend.ts`, bull/bear 분리 2 line series)
- [x] Ichimoku Cloud (`overlays/ichimoku.ts`, 5 line series)
- [x] Auto Fibonacci (`overlays/autofib.ts`, createPriceLine 활용)
- [x] VWAP / Anchored VWAP (`overlays/vwap.ts`)
- [x] `MarketChart.svelte` Svelte 5 이관: `$props()`, `$effect`, dark palette, 오버레이 플러그인 포인트
- [ ] Compare 심볼 오버레이 (최대 2개)
- [ ] 가격 스케일(기본/로그) 토글
- [ ] 전체화면 토글
- [ ] `overlays/*` Vitest 단위 테스트 추가

**Gate**: 원본 대비 마지막 200 캔들 수치 편차 < 1% (수동 스팟 체크) + `pnpm check && pnpm build`

---

## 6. Phase 4 — 하단 인디케이터 페인 + 크로스헤어

**목표**: 서브 페인 프레임워크 + 주요 오실레이터 + 크로스헤어 리드아웃.

**생성/수정 경로**

```
apps/web/src/lib/chart/panes/
  frame.ts, rsi.ts, macd.ts, stochastic.ts, mfi.ts, cmf.ts,
  adx.ts, stc.ts, cvd.ts, obv.ts, atr.ts
apps/web/src/lib/stores/crosshair.svelte.ts
apps/web/src/lib/components/dashboard/CrosshairLegend.svelte
apps/web/src/lib/components/dashboard/ChartHeader.svelte  # OHLC 리드아웃
```

**체크리스트**

- [x] `panes/frame.ts`: `PaneFrame` 클래스 — paneIndex 동적 할당 (동시 N개, analysis 데이터 기반 auto-enable)
- [x] RSI / MACD(히스토그램 포함) / Stochastic (`panes/rsi.ts`, `macd.ts`, `stochastic.ts`)
- [x] MFI / CMF / ADX / STC / CVD / OBV / ATR (`panes/*.ts`)
- [x] `crosshair.svelte.ts`: OHLCV + 인디케이터 값 runes store, `chart.subscribeCrosshairMove` 연결
- [x] `CrosshairLegend.svelte`: OHLCV + 활성 인디케이터 값, `aria-live` 영역
- [ ] `ChartHeader` OHLC 리드아웃 (우상단) — CrosshairLegend 위치 조정으로 대체 가능
- [ ] 드래그 리오더 (Phase 5 이후 검토)
- [ ] a11y `scripts/a11y-audit.mjs` 스모크 스크립트

**Gate**: `pnpm check && pnpm build` + `scripts/a11y-audit.mjs` 최소 버전 스모크 통과

---

## 7. Phase 5 — 드로잉 도구 (Phase 0-D 결정 후 착수)

**목표**: 캔버스 기반 드로잉 레이어 + 스토어 + 영속화.

**생성/수정 경로**

```
apps/web/src/lib/chart/drawing/
  layer.ts, hit.ts,
  primitives/{horizontal,trendline,fib,measure,rect,text,channel?,pitchfork?,gann?,elliott?,harmonic?}.ts
apps/web/src/lib/stores/drawing.svelte.ts
apps/web/src/lib/components/chart/DrawingToolbar.svelte
```

**체크리스트 (MVP = P1 + 측정/사각형/텍스트)**

- [ ] `drawing/layer.ts`: 별도 HTML canvas 오버레이, coord 변환은 `chart/coords.ts` 사용
- [ ] `drawing.svelte.ts`: 툴 상태, 도형 리스트, 선택/이동/삭제
- [ ] 수평선 / 추세선 / 피보나치
- [ ] 측정 도구
- [ ] 직사각형 / 텍스트
- [ ] 채널 *(0-D 옵션)*
- [ ] 피치포크 / 갠 팬 / 엘리엇 / 하모닉 *(0-D 옵션)*
- [ ] 영속화: 심볼/인터벌 단위로 workspace store에 저장
- [ ] Undo/Redo 20단계
- [ ] 키: `Esc` 취소, `Del` 삭제

**Gate**: `pnpm check && pnpm build`, 수동 스모크 (그리기/선택/지우기/새로고침 생존)

---

## 8. Phase 6 — 오버레이 기능군 (Fundamentals · Signal Zones · Volume Profile · Replay · Alerts)

**목표**: 차트 위에 얹히는 오버레이 기능 5종.

**생성/수정 경로**

```
apps/web/src/lib/components/chart/
  FundamentalsOverlay.svelte, SignalZonesOverlay.svelte,
  VolumeProfileOverlay.svelte, ReplayControls.svelte
apps/web/src/lib/stores/replay.svelte.ts
apps/web/src/lib/features/dashboard/useAlerts.svelte.ts
```

**체크리스트**

- [ ] FundamentalsOverlay: `/api/fundamentals` 결과 카드 (Crypto 숨김)
- [ ] SignalZonesOverlay: 최근 시그널을 밴드로 표시
- [ ] VolumeProfileOverlay: 가로 프로파일 + `period` 선택
- [ ] ReplayControls: 재생/정지, 속도(0.5/1/2/5x) + `R` 단축키
- [ ] Bar Replay: 인디케이터/시그널 재계산 트리거
- [ ] PriceAlert: 워크스페이스에 룰 저장, 토스트 알림 발사
- [ ] 오버레이 on/off 토글은 SettingsPanel에 집약

**Gate**: 오버레이 상태가 새로고침 후에도 보존됨

---

## 9. Phase 7 — Watchlist & Screener 고도화

**목표**: Watchlist 1차를 원본 수준의 관리/스크리너로 확장.

**생성/수정 경로**

```
apps/web/src/lib/components/watchlist/
  WatchlistPanel.svelte, SymbolSearch.svelte, ScreenerBuilder.svelte,
  SymbolCard.svelte, Sparkline.svelte
apps/web/src/lib/features/dashboard/useWatchlist.svelte.ts
backend/app/api/routes/watchlist.py   # 스크리너 확장 (필요 시)
```

**체크리스트**

- [ ] 즐겨찾기 / 최근 / 커스텀 섹션 분리
- [ ] 심볼 카드: 현재가, 등락, 고가/저가, 스파크라인
- [ ] 프리셋 카테고리 기반 마켓 브라우징
- [ ] 스크리너 조건 빌더 (`ANY(OR)` / `ALL(AND)`)
- [ ] 스크리너 프리셋 저장/불러오기
- [ ] 정렬: 종목명 / 변동률 / 거래량 / 커스텀 지표
- [ ] 가상 스크롤 (500+ 심볼)
- [ ] 검색 API 디바운스 (250ms)

**Gate**: 500 심볼 스크롤 FPS ≥ 55 (Phase 11 perf 스크립트로 측정)

---

## 10. Phase 8 — Strategy Lab UI 완성

**목표**: 3개 전략 각각 end-to-end 실행과 결과 시각화.

**생성/수정 경로**

```
apps/web/src/lib/features/
  strategy-a/{useBacktest.svelte.ts, form.ts}
  strategy-b/{useSignals.svelte.ts, usePair.svelte.ts}
  strategy-orb/{usePremarket.svelte.ts, useSignals.svelte.ts}
apps/web/src/lib/components/strategy/
  a/{EquityCurveChart.svelte, Allocation.svelte, TradesTable.svelte, Performance.svelte, Form.svelte}
  b/{SignalTable.svelte, PairPicker.svelte, ZScoreChart.svelte, CorrHeatmap.svelte}
  orb/{StocksInPlay.svelte, OrbSignals.svelte, RangeBreakChart.svelte}
apps/web/src/routes/strategy/{a,b,orb}/+page.svelte
```

**체크리스트**

- [x] Strategy A equity curve *(기존)*
- [ ] Strategy A: 월별 알로케이션 / 트레이드 히스토리 / 성과 지표(CAGR, Sharpe, MDD, Calmar) / 파라미터 폼·프리셋
- [ ] Strategy B: MACD/BB 시그널 테이블(조건 칩·컨피던스) / 페어 선택 / Z-Score 차트 / 상관 히트맵
- [ ] Strategy ORB: 프리마켓 Stocks-in-Play / 시그널 리스트 / 범위 브레이크 차트
- [ ] 공통: 폼 검증(백엔드 스키마 기반) / 로딩·빈·에러 상태 표준화 / 프리셋 localStorage

**Gate**: 3개 전략 UI end-to-end 실행 무에러 + `pnpm check && pnpm build` + backend 전략 테스트 green

---

## 11. Phase 9 — Command Center · 단축키 · 스냅샷

**목표**: 생산성 기능 이식.

**생성/수정 경로**

```
apps/web/src/lib/components/command/{CommandPalette.svelte, ShortcutsModal.svelte}
apps/web/src/lib/features/dashboard/useShortcuts.svelte.ts
apps/web/src/lib/utils/shortcuts.ts
apps/web/src/lib/features/dashboard/useSnapshot.svelte.ts
```

**체크리스트**

- [ ] CommandPalette (`Ctrl/Cmd + J`): 심볼/마켓/인터벌/탭 전환, 스냅샷 저장·import·export
- [ ] ShortcutsModal (`?`)
- [ ] 전역 단축키: `Cmd+B`(Watchlist), `Cmd+,`(설정), `Cmd+K`/`/`(검색), `Home`(차트맞춤), `R`(Replay), `F`(전체화면)
- [ ] 워크스페이스 스냅샷 저장/복원 (localStorage + 다운로드 JSON)
- [ ] JSON import/export (브라우저 파일 I/O; 데스크톱 병행 시 Phase 12에서 확장)

**Gate**: 단축키 수동 전수 검증

---

## 12. Phase 10 — 실시간 WebSocket + Replay 정합성

**목표**: 백엔드 스트림 아키텍처 구축과 프론트 병합.
**참조**: `architecture.md §4.6` (스트림 fan-in/out), `§3.6` (프론트 WS).

**생성/수정 경로**

```
backend/app/
  api/ws/candles.py
  streams/binance.py
apps/web/src/lib/
  ws/candles.svelte.ts   # Phase 1에서 만든 ws/client.ts 위에 구독 store
  features/dashboard/useLiveCandles.svelte.ts
```

**체크리스트**

- [ ] backend `api/ws/candles.py`: subscribe/unsubscribe 메시지 스키마 정의 + Pydantic 모델
- [ ] `streams/binance.py`: 동일 (market,symbol,interval) 채널 업스트림 1개 공유, fan-out queue
- [ ] crypto 외 마켓은 폴링 기반 동일 인터페이스
- [ ] 프론트 `ws/candles.svelte.ts`: 구독 훅, 마지막 봉 병합
- [ ] Live 모드 ↔ Replay 모드 상호배제 (`chart.svelte.ts`에서 제어)
- [ ] 재접속 테스트 / 중복 봉 방지 테스트 (Vitest + mock WS, backend는 `websockets` 테스트 클라이언트)

**Gate**: 1분봉 기준 300 업데이트/분에서 FPS ≥ 55 + 재접속/중복 테스트 green

---

## 13. Phase 11 — 접근성 / 성능 / UX QA 게이트 이식

**목표**: quanting `scripts/`의 UX 품질 스크립트를 `apps/web/scripts/`로 옮기고 `pnpm` 스크립트로 등록.

**생성/수정 경로**

```
apps/web/scripts/
  ux-gate.mjs, a11y-audit.mjs, a11y-scenario-audit.mjs,
  perf-realtime-sim.mjs, perf-watchlist-sim.mjs,
  ux-qa-gate.mjs, ux-kpi-remeasure.mjs
apps/web/tests/{unit,e2e}/...
apps/web/package.json   # ux:verify, ux:gate, a11y:*, perf:*, test, e2e
```

**체크리스트**

- [ ] UX gate / a11y / perf 스크립트 7종 포팅
- [ ] Vitest 환경 세팅 (`lib/chart/overlays/*`, `lib/utils/*`, `lib/stores/*` 단위 테스트)
- [ ] Playwright 환경 세팅 (대시보드/전략 기본 흐름 e2e)
- [ ] CI 후보 정의: backend ruff/pytest + frontend check/build/test/e2e/ux:verify
- [ ] React 기준으로 튜닝된 KPI 기준값을 Svelte 측정치로 재베이스

**Gate**: `pnpm ux:verify` 로컬 5분 이내 통과

---

## 14. Phase 12 — 배포 / 패키징 (Phase 0-C 재검토)

**목표**: 배포 형태 확정과 운영 준비.

**체크리스트**

- [ ] adapter 재확인 (adapter-node 유지 / 변경)
- [ ] 브라우저 단독: `node build` 컨테이너화, reverse proxy로 backend 병합
- [ ] 데스크톱 병행 판단: 기존 `quanting/src-tauri` 재사용 가능성 검토 (SvelteKit build 산출물 로드), 아니면 Tauri 2 새 쉘
- [ ] 단일 `make dev` / `make verify` / `make build` 정의
- [ ] React/Tauri → fastQuant 컷오버 체크리스트 작성
- [ ] 로컬 개발자 smoke 스크립트 (`scripts/smoke.sh`)
- [ ] 관측(Prometheus 어댑터) 채택 여부 결정

**Gate**: 한 명령으로 backend test + frontend build + UX gate + e2e 통과

---

## 15. 이번 스프린트 작업 큐

> 위에서 아래로 진행. 완료 시 상위 Phase 체크박스 갱신.

1. [ ] Phase 0 결정 6건 확정
2. [ ] Phase 1 — adapter-node 전환 + OpenAPI codegen + `workspace.svelte.ts` 이관
3. [ ] Phase 1 — backend `providers/` 추출 + `core/errors.py` 통일
4. [ ] Phase 1 — `lib/api/errors.ts` + client 재시도/취소
5. [ ] Phase 2 — 디자인 토큰 추출 + 3단 쉘
6. [ ] Phase 4 — CrosshairLegend + OHLC 리드아웃 (가시적 가치 큼)
7. [ ] Phase 3 — Donchian/Keltner/SAR/Supertrend 4종 오버레이

---

## 16. Open Risks

- 현재 `workspace.ts`(writable)에서 `workspace.svelte.ts`(runes)로 갈아탈 때 UI 재렌더 경로 변화로 스펙 차이 발생 가능. 이관 직후 수동 회귀 체크 필요.
- OpenAPI codegen 결과가 수기 타입과 완전히 일치하지 않을 수 있음 — Pydantic alias/예외 케이스 점검 필요.
- `globals.css`(116KB) 토큰 추출은 기준이 없으면 blow up. `docs/UI/ui.html` 시안을 ground truth로 고정하고, 거기서 쓰이지 않는 토큰은 버린다.
- lightweight-charts 5에서 드로잉 coord 변환 API가 React 버전의 가정과 다를 수 있음 — Phase 5 초기에 스파이크.
- `@tanstack/svelte-query` 승격 시점을 놓치면 `query.svelte.ts`가 병렬 요청/낙관 업데이트 요구에 눌릴 수 있음 — Phase 8 진입 시 재평가.
- Svelte 5 runes + lightweight-charts 재렌더 비용은 Phase 3 종료 시 실측이 필요. 필요 시 `$state.raw` / `untrack` 적용.
- 데스크톱 쉘 결정이 Phase 12까지 미뤄지면 파일 시스템 의존 기능(JSON import/export 등)을 두 번 구현할 위험 — 단일 브라우저 파일 API로 수렴시킨다.
