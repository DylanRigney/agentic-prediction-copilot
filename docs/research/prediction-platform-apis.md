# Prediction-Platform APIs and Archives: Kalshi, Polymarket, Metaculus

Compiled 2026-10-27/28 for wayfinder research ticket [#17](https://github.com/DylanRigney/agentic-prediction-copilot/issues/17) (child of map [#15](https://github.com/DylanRigney/agentic-prediction-copilot/issues/15)).
Method: web research restricted to official developer documentation (docs.kalshi.com, docs.polymarket.com, Metaculus's Mintlify-hosted API docs and OpenAPI-derived pages); all API mechanics below are paraphrased from those primary sources. Extends `docs/research/llm-forecasting-landscape.md` §3.2 — that survey's API entry points are not repeated here except where needed for continuity. Claims that could not be traced to a primary source are marked **[unverified]**. Legal/ToS pages that could not be machine-fetched are flagged individually.

---

## Summary table: platform → what you get → key endpoints

| Ask | Kalshi | Polymarket | Metaculus |
|---|---|---|---|
| Open-question feed | `GET /markets?status=open` (+ close-time windows, series filter), `GET /events` | `GET gamma /events?closed=false` (tags, cursor) | `GET /api/posts/?statuses=open` (token required) |
| Resolution data | `result`, `settlement_value_dollars`, `settlement_ts` on market; `status=settled` | `umaResolutionStatus`, `resolvedBy`, `outcomePrices`; `data-api /v2/resolutions` | `resolution` (`yes`/`no`/option/`annulled`/`ambiguous`), `actual_resolve_time` |
| Resolved-question archive | live `status=settled` + `/historical/markets` beyond cutoff | Gamma `closed=true` markets + events | `GET /api/posts/?statuses=resolved` (full history via post detail) |
| Forecast/community series | n/a (market prices instead) | n/a (market prices instead) | `with_cp` / `include_cp_history`, full history on `GET /api/posts/{id}/` |
| Price time series | `GET /series/{s}/markets/{t}/candlesticks` (1m/1h/1d) | `GET data-api /v2/prices-history` (bucketed, retention tiers) | n/a |
| Auth for reads | none (public market data) | none (Gamma/CLOB reads/Data API) | API token required for **all** requests |
| Published numeric rate limits | yes (token budgets by tier) | no (qualitative only) | no (throttle etiquette only) |
| Licensing for mirroring | Developer Agreement binding; clauses **[unverified]** | docs silent; ToU unreachable → **[unverified]** | docs silent; ToS unreachable → **[unverified]** |

---

## 1. Kalshi (docs.kalshi.com)

### 1.1 Question feeds

- **Base URLs** (production REST): `https://external-api.kalshi.com/trade-api/v2` (alias `api.elections.kalshi.com` — despite the name it serves all markets). Demo: `https://external-api.demo.kalshi.co/trade-api/v2`. WebSocket: `wss://external-api.kalshi.com/trade-api/ws/v2`. Source: [API environments](https://docs.kalshi.com/getting_started/api_environments).
- **`GET /markets`** is the supply feed. Filters: `status` (`unopened`, `open`, `paused`, `closed`, `settled` — one at a time), `series_ticker`, `event_ticker`, `tickers` (comma list), multivariate include/exclude, and mutually-exclusive Unix-seconds windows: `min/max_close_ts` (usable with `closed` or no status), `min/max_settled_ts` (`settled`), `min/max_created_ts` (`unopened`/`open`). **Horizon filtering is native**: e.g. open markets closing within N days = `status=open&max_close_ts=<now+N>`. Cursor pagination, `limit` default 100 / max 1000. Source: [GET markets](https://docs.kalshi.com/api-reference/market/get-markets).
- **Market object carries everything a question record needs**: `ticker`, titles/subtitles, `rules_primary`/`rules_secondary` (the full resolution rules text), `market_type` (`binary`/`scalar`), `created_time`/`open_time`/`close_time`, `expected_expiration_time`, strike/bounds fields for scalars, current pricing (`yes_bid_dollars`, `yes_ask_dollars`, `last_price_dollars`), and activity (`volume_fp`, `volume_24h_fp`, `open_interest_fp`).
- **Hierarchy**: series (recurring template, **carries `category`**) → events (`GET /events`, `status` filter, `with_nested_markets=true`, `limit` max 200) → markets. Event-level `category` is deprecated in favor of series-level category ([GET events](https://docs.kalshi.com/api-reference/events/get-events), [GET series](https://docs.kalshi.com/api-reference/market/get-series)). The event object exposes `settlement_sources` and `strike_date`/`strike_period` — useful provenance for resolution.
- **How new questions appear**: markets move `unopened → open` on `open_time`; poll `GET /events?min_updated_ts=<t>` — the docs explicitly describe this parameter as the efficient change-polling mechanism. There is also a WebSocket market/event lifecycle channel ([websockets](https://docs.kalshi.com/websockets/market-and-event-lifecycle)) for push notification of state changes.

### 1.2 Resolution

- Settlement is deterministic per the market's rules: after close, the market is determined and `status` becomes `settled`; the market object then carries `result` (`yes`/`no`/scalar value), `settlement_value_dollars`, and `settlement_ts` (all confirmed as response fields in the GET markets schema). Binary payouts are $1 to the winning side, $0 to the loser; only net positions settle; no fees on plain yes/no determinations. Sources: [market settlement](https://docs.kalshi.com/getting_started/market_settlement), [GET markets](https://docs.kalshi.com/api-reference/market/get-markets).
- **Timing vs official resolution**: usually shortly after expiration, but variable — depends on settlement-source availability and whether manual review is needed (settlement doc). Event `settlement_sources` names the upstream authority.
- **Dispute/void mechanics**: the documented model has no user-facing dispute process — there is no equivalent of Polymarket's oracle wars. Early close is possible (`can_close_early`, `early_close_condition`), and settlement bounds allow partial early payout on floored scalar markets ([settlement bounds](https://docs.kalshi.com/getting_started/settlement_bounds)). The FIX settlement-messages page is the most detailed protocol-level description ([FIX market settlement](https://docs.kalshi.com/fix/market-settlement)).
- **Data quality note for archives**: Kalshi is a CFTC-regulated DCE; resolution values come from named settlement sources, so the resolved corpus is clean and auditable — the strongest resolution provenance of the three platforms.

### 1.3 Historical archives

- Settled markets older than a moving cutoff are served from the **historical tier**: `GET /historical/markets`, `GET /historical/markets/{ticker}`, plus historical trades/orders/fills/positions and `GET /historical/markets/{ticker}/candlesticks`. The cutoff per data type is published at `GET /historical/cutoff` and advances over time; **events and series never move** (they stay on the live endpoints). Retention period beyond the cutoff is not specified in docs. Source: [historical data](https://docs.kalshi.com/getting_started/historical_data).
- Pastcasting corpus = `status=settled` markets (live or historical) joined with their `rules_primary` text + `result` + full candlestick history. Everything needed (question text, resolution, price path) is in the same API family.

### 1.4 Price time series

- `GET /series/{series_ticker}/markets/{ticker}/candlesticks?start_ts&end_ts&period_interval` — candles of 1, 60, or 1440 minutes; each candle has OHLC of the YES bid and ask, OHLC of traded YES price (+ mean/previous/min/max close), volume and open interest. `include_latest_before_start` prepends a synthetic anchor candle so a series can start exactly at forecast time. Batch and per-event variants exist. Beyond the cutoff, use the historical candlestick endpoint. Source: [candlesticks](https://docs.kalshi.com/api-reference/market/get-market-candlesticks).
- Point-in-time depth: `GET /markets/{ticker}/orderbook` and multi-orderbook batch. So the market-at-forecast-time baseline can be mid-price, last trade, or book-derived — pick one and record it.
- Max queryable window per candlestick request is not documented — poll in bounded windows. **[gap in docs]**

### 1.5 Mechanics

- **Auth**: public market data (series/events/markets/orderbook) needs **no authentication at all** — the quick start states no auth headers are required for those reads. Trading/portfolio endpoints sign each request with an Ed25519 (recommended) or RSA-2048 keypair: base64 signature over `timestamp(ms) + METHOD + path` (path excludes query string), sent in `KALSHI-ACCESS-KEY` / `KALSHI-ACCESS-TIMESTAMP` / `KALSHI-ACCESS-SIGNATURE` headers. Sources: [API keys](https://docs.kalshi.com/getting_started/api_keys), [quick start: market data](https://docs.kalshi.com/getting_started/quick_start_market_data).
- **Rate limits — published and concrete**: token-bucket, default 10 tokens/request, separate Read and Write buckets; tier budgets in tokens/sec (Predictions Read/Write): Basic 200/100, Advanced 300/300, Expert 600/600, Premier 1200/1200, up to Prestige 12000/9600. Burst capacity 3× budget; overage returns `429` with a short JSON error and no Retry-After header; docs recommend backoff. Per-endpoint costs via `GET /account/endpoint_costs`; your effective tier via `GET /account/limits`. Source: [rate limits](https://docs.kalshi.com/getting_started/rate_limits).
- **Pagination**: cursor-based everywhere (`cursor` from prior response; empty string = done). Source: [pagination](https://docs.kalshi.com/getting_started/pagination).
- **Licensing/ToS**: docs state that using the API binds you to the **Developer Agreement** at [kalshi.com/developer-agreement](https://kalshi.com/developer-agreement) (continued use = acceptance). The agreement page itself is JS-rendered and could not be machine-read here, so its data-redistribution clauses (whether mirroring question text + results into a private research DB is permitted) are **[unverified]** — read it manually before building the archive. No separate market-data license grant is mentioned anywhere in the developer docs.

### 1.6 Kalshi recommendation

Mirror for **supply**: `GET /markets?status=open` on a schedule + `GET /events?min_updated_ts` for incremental discovery; store ticker, title, `rules_primary`, close/expected-expiration times, series (→ category), and a price snapshot. For **resolution**: poll `status` transitions; on `settled`, store `result`, `settlement_value_dollars`, `settlement_ts`, and the event's `settlement_sources`. For **pastcasting**: backfill from `status=settled` + `GET /historical/markets` (+ `GET /historical/cutoff` before each backfill), and pull full candlestick histories for the market-price-at-time baseline. No account needed for any of this — only a browserless HTTP client; 200 req/s read budget at Basic tier is far more than a poller needs.

---

## 2. Polymarket (docs.polymarket.com)

### 2.1 Question feeds

- **API surface** (all read paths public, no account): **Gamma API** `https://gamma-api.polymarket.com` (events/markets metadata); **CLOB API** `https://clob.polymarket.com` (order books, point-in-time prices; authed L1 wallet EIP-712 + L2 HMAC only for trading); **Data API** `https://data-api.polymarket.com` (analytics, price history, resolutions; v1 retired 2026-10-24, everything under `/v2`). Public WebSockets: CLOB market channel (`wss://ws-subscriptions-clob.polymarket.com/ws/market`) for book/price/lifecycle. Source: [APIs overview](https://docs.polymarket.com/getting-started/api).
- **Structure**: event (container, `title`, `description`, `markets[]`, tags) → market (one binary yes/no question with two outcome tokens). Single-market events are the common case; mutually exclusive multi-market events form negative-risk groups.
- **`GET /events` / `GET /markets`** (+ `/keyset` variants) with: `closed=true|false` (omit = both; `closed=any` requires an identifier filter and caps at 100 ids), `tag_id`/`tag_ids` (resolve slugs via `GET /tags/slug/{slug}`), `version` (`v1` CTF / `v2` protocol), `resolution_status` (`inactive`/`active`/`resolved`, v2 only), sports filters, `recurrence` for series. Cursor pagination (`limit`, `next_cursor` → `after_cursor`). There is also `GET /public-search?q=`. Sources: [discover markets](https://docs.polymarket.com/market-data/discover-markets), [Gamma OpenAPI](https://docs.polymarket.com/api-spec/gamma-openapi.yaml).
- **Market object fields** (Gamma): `question`, `description`, `conditionId`, `outcomes`/`outcomePrices` (JSON-encoded string arrays), `clobTokenIds` (v1) or `positionIds` (v2) — the keys needed for price history, `resolutionSource`, `umaResolutionStatus(es)`, `resolvedBy`, `closedTime`, `endDate`/`endDateIso`, `active`/`closed`/`archived`/`acceptingOrders` flags, `liquidity`, `volume`, `volume24hr/1wk/1mo/1yr`, `bestBid`/`bestAsk`/`spread`/`lastTradePrice`/`oneDayPriceChange`. Sources: [market details](https://docs.polymarket.com/market-data/market-details), Gamma OpenAPI.
- **Horizon filtering is not native** (no close-time window parameters documented on Gamma listing endpoints — filter client-side on `endDate`). **[gap in docs]** New questions: no documented "updated since" filter on Gamma either — poll the `closed=false` listing (or subscribe to the CLOB market channel for lifecycle events on markets you already track). **[gap in docs]**

### 2.2 Resolution

- **UMA Optimistic Oracle** for prediction markets: anyone posts a bonded outcome proposal (bond commonly on the order of hundreds of dollars in pUSD); a **2-hour challenge window** follows. Undisputed → resolved (~2h total). One dispute → second proposal round; a second dispute escalates to UMA's DVM token-holder vote (24–48h evidence/debate + ~48h voting → **4–6 days total** for disputed markets). Bond economics penalize wrong/premature proposers; a rare "unknown" outcome redeems both tokens at half value each. Polymarket can post clarifications on-chain via a bulletin-board contract, but cannot change a question's fundamental intent. **Chainlink TWAP** resolves up/down markets deterministically without UMA. Winning tokens redeem at $1, losers $0. Source: [resolution concepts](https://docs.polymarket.com/concepts/resolution).
- **In data terms**: Gamma exposes `umaResolutionStatus(es)` (the per-outcome oracle state) and `resolvedBy`; the final outcome is readable from `outcomePrices` collapsing to 0/1 on a `closed` market, and Data API v2 has a dedicated `GET /v2/resolutions` (resolution state) plus `GET /v2/status` (data freshness). Source: [Gamma OpenAPI](https://docs.polymarket.com/api-spec/gamma-openapi.yaml), [Data API v2 migration](https://docs.polymarket.com/migrate/data-api-v1-to-v2.md).
- **Data quality**: resolution is decentralized and adversarially robust but slower on disputes, and "unknown/50-50" outcomes (rare) plus clarifications mean the archive should store `umaResolutionStatus` history and any bulletin-board context, not just the terminal price. Because everything is on-chain (condition ids, tokens), outcomes are independently verifiable from the chain in principle ([blockchain data](https://docs.polymarket.com/resources/blockchain-data)).

### 2.3 Historical archives

- `GET /markets?closed=true` (or `/events?closed=true`) is the resolved-question set, with `question` text, `description`, resolution source, and terminal `outcomePrices`. Volume/liquidity fields allow quality filtering (drop thin markets). Combined with `/v2/prices-history` this yields a pastcasting corpus per market.
- The Data API v2 also provides `/v2/trades`, `/v2/holders` (optional entry-price/PnL per holder), `/v2/oi`, and cursor pagination everywhere (`pagination.next_cursor` until null). Source: [Data API v1→v2](https://docs.polymarket.com/migrate/data-api-v1-to-v2.md).

### 2.4 Price time series

- `GET https://data-api.polymarket.com/v2/prices-history?token_id=<outcome token id>` with **exactly one** of: `interval` (`1m`…`max`), absolute `start`/`end` (epoch seconds, **max 15-day span per request**), or `as_of` (point-in-time). Bucketing via `bucket_seconds` (60–86400 allowed; floors of 600s for `max`/`1m`, 300s for `1w`). **Retention is tiered**: 1-minute data kept ≥7 days, 5-minute ≥60 days, 30-minute ≥90 days; 3-hour and 12-hour buckets are permanent. Responses paginate by cursor; each point carries `timestamp`, `price`, and `resolution_seconds` (0 = exact tick). Source: [prices & order books](https://docs.polymarket.com/market-data/prices-order-books).
- **Implication for the baseline**: if you want minute-level prices at forecast time you must **capture them yourself continuously** — the archive only keeps fine-grained series for days/weeks. For retrospective work, 3h/12h buckets are permanently available.
- Point-in-time reads (CLOB): `/book`, `/books` (≤500 batch), `/price`, `/prices`, `/midpoint(s)`, `/spread(s)`, `/last-trade-price(s)`; note books order bids ascending / asks descending (best prices last).

### 2.5 Mechanics

- **Auth**: none for any read path used above. Trading needs L1 (wallet-signed EIP-712 credential derivation) + L2 (HMAC-SHA256 headers) — irrelevant for mirroring.
- **Rate limits: not published numerically.** The builder-tiers page acknowledges limits on CLOB/Gamma/etc. and describes them only as "Standard" (Unverified/Verified tiers) vs "Highest" (Partner); no requests/sec figures, and no 429 documentation for data reads. Treat as "unknown, poll gently, back off on 429s." **[ambiguous — flagged, not guessed]** Source: [builder tiers](https://docs.polymarket.com/programs/builders/tiers.md).
- **Pagination**: cursor-based on Gamma (`next_cursor`/`after_cursor`) and Data API v2 (`pagination.next_cursor`); identifier filters cap at 100 ids; batch CLOB reads cap at 500.
- **Licensing/ToS**: the developer docs say nothing about licensing of market data. The consumer Terms of Use were not reachable during this research (`polymarket.com/terms` 404 at fetch time; no ToS page is linked from the docs site); a secondary research source ([CCIR](https://ccir.io/research/compute-derivatives-cftc)) reports the ToU restricts systematic/automated extraction of site content. Whether API-mediated mirroring for private research is permitted is therefore **[unverified]** — locate and read the current ToU manually before building the archive. (Observation, not a license: peer-reviewed work has used the public API for research, e.g. [MDPI 2025](https://www.mdpi.com/2078-2489/16/11/980).)

### 2.6 Polymarket recommendation

Mirror for **supply**: Gamma `GET /events?closed=false` (+tag filters you care about), storing `question`, `description`, `resolutionSource`, `endDate`, token/condition ids, liquidity/volume, and a CLOB midpoint/last-trade snapshot; poll on a schedule and diff client-side. For **resolution**: watch `umaResolutionStatus` transitions and market `closed`; on resolution store the terminal `outcomePrices`, `resolvedBy`, `closedTime`, and (optionally) `GET /v2/resolutions` rows; budget for a 2h–6day lag on disputed markets. For **pastcasting**: `closed=true` backfill (filter by minimum volume to avoid noise) + 3h/12h `prices-history` buckets for the price path; if you want finer price-at-forecast-time anchors, start a continuous fine-grained sampler now. For **licensing**: read the current ToU before mirroring; until then treat Polymarket content as mirroring-permission-unconfirmed.

---

## 3. Metaculus (metaculus.com/api, Mintlify docs)

### 3.1 Question feeds

- **Base URL**: `https://www.metaculus.com/api/` (API version 2.x). Docs: [API overview](https://metaculus-metaculus.mintlify.app/api/overview) and siblings; OpenAPI in the [metaculus repo](https://github.com/Metaculus/metaculus/blob/main/docs/openapi.yml).
- **`GET /api/posts/` is the feed.** Filters: `statuses` (`open`, `closed`, `resolved`, `upcoming`), `tournaments`/`categories`/`topic`/`community` (by slug), `forecast_type` (`binary`, `multiple_choice`, `numeric`, `discrete`, `date`, `conditional`, `group_of_questions`, `notebook`), `forecaster_id`/`not_forecaster_id`, and timestamp windows on `open_time`, `published_at`, `scheduled_resolve_time` with `__gt/__gte/__lt/__lte` suffixes — so **horizon filtering is native** via `scheduled_resolve_time__lte`. `order_by` supports `published_at`, `scheduled_close_time`, `scheduled_resolve_time`, `hotness`, `forecasts_count`, `weekly_movement`, `divergence`, etc. (`-` prefix = descending). Pagination `limit` (default 20, max 100) + `offset`, response wrapper `next`/`previous`/`results`. Source: [posts API](https://metaculus-metaculus.mintlify.app/api/posts.md).
- **Post/question model**: a Post wraps one of single question / conditional pair / group / notebook; the question carries `title`, `description`, `resolution_criteria`, `fine_print`, `open_time`, `scheduled_close_time`, `actual_close_time`, `scheduled_resolve_time`, `actual_resolve_time`, `status`, and for continuous types `scaling` (range/zero-point) and unit. Question detail: `GET /api/questions/{id}/` (`with_cp` to include community-prediction aggregates). Sources: [questions API](https://metaculus-metaculus.mintlify.app/api/questions.md).
- **How new questions appear**: `order_by=-published_at` polling; `statuses=upcoming` catches pre-open questions. No webhooks (docs: "webhooks don't exist yet but may be added").

### 3.2 Resolution

- Resolution values on the question object: binary → `yes`/`no`; multiple choice → the option label; numeric/date/discrete → a numeric string; failed resolutions → **`annulled`** (voided) or **`ambiguous`** — these two are the platform's dispute/void escape hatches and must be handled in any scoring pipeline. `actual_resolve_time` records when resolution landed; `resolve`/`unresolve` API actions exist but are curator/admin-only, i.e. resolutions can be revised after the fact — poll, don't snapshot-and-forget. Source: [questions API](https://metaculus-metaculus.mintlify.app/api/questions.md).
- The human resolution process (moderator adjudication against `resolution_criteria`, comment-based disputes) is documented on help/FAQ pages, not the API docs — not fetched here, so details beyond the schema-level facts above are **[unverified]**. The API-relevant takeaway: resolution timing is `actual_resolve_time` ≥ `scheduled_resolve_time`, sometimes much later, and `ambiguous`/`annulled` are first-class outcomes.

### 3.3 Historical archives + community forecast series

- Resolved set: `GET /api/posts/?statuses=resolved` + `include_descriptions=true` (adds `description`, `fine_print`, `resolution_criteria` to list responses) → question text + resolution in one pass. Numeric resolution values come with `scaling` so quantiles can be reconstructed.
- **Community forecast time series** (the crowd baseline, and Metaculus's unique asset): `with_cp=true` for current aggregates, `include_cp_history=true` for the aggregated history in list responses (heavy), or `GET /api/posts/{postId}/` which returns complete prediction history for the post (docs describe it as full data incl. complete prediction history and all group subquestions). Source: [posts API](https://metaculus-metaculus.mintlify.app/api/posts.md).
- This is the platform whose archive most directly extends the pastcasting lineage in the landscape survey (Autocast was built from Metaculus questions; BTF-style corpora want exactly question text + resolution + pre-resolution signal).
- Note: individual forecast submissions are the unit for `POST /api/questions/forecast/`; retrieval of raw per-user histories beyond your own is not documented as a list endpoint — community aggregates are the public series. Source: [forecasts API](https://metaculus-metaculus.mintlify.app/api/forecasts.md).

### 3.4 Market-price time series

- None — Metaculus has no trading. The market-at-forecast-time analogue is the **community prediction timeline** (`with_cp`/`include_cp_history`); for a cross-platform "market" baseline on the same questions, join against Polymarket/Kalshi where the same event is listed.

### 3.5 Mechanics

- **Auth: required for every request, including read-only GETs** — the docs state all API requests need credentials and unauthenticated calls get 401. Token: 40-char hex from Account Settings → API Access, sent as `Authorization: Token <token>`; rotation endpoint exists. Source: [authentication](https://metaculus-metaculus.mintlify.app/api/authentication.md). (An account is free; this is friction, not a blocker.)
- **Rate limits: no published numbers.** Docs describe throttling as variable by endpoint/auth/pattern, return `429` with an expected-retry-in-seconds detail (sometimes a `Retry-After` header), and give etiquette: cache, batch with `limit=100`, backoff 2^attempt capped ~5 retries, ~1–2s between calls, poll every 5–15 min; contact api-requests@metaculus.com for legitimate volume. Source: [rate limits](https://metaculus-metaculus.mintlify.app/api/rate-limits.md). Treat numeric limits as unknown; the etiquette numbers are the effective guidance.
- **Licensing/ToS**: the API docs say nothing about content licensing; the site ToS could not be fetched (bot-gated), so permission to mirror question text + resolutions + community series into a private DB is **[unverified]** — read the ToS manually. Metaculus publishes bot guidance ([bots](https://metaculus-metaculus.mintlify.app/advanced/bots.md)) which is about bot participation, not data licensing.

### 3.6 Metaculus recommendation

Mirror for **supply**: `GET /api/posts/?statuses=open&include_descriptions=true` (+`scheduled_resolve_time` windows for horizon buckets; `order_by=-published_at` for incremental discovery), storing title, `resolution_criteria`, `fine_print`, close/resolve times, projects (tournament/category) and the current community prediction (`with_cp`). For **resolution**: poll `statuses` → `resolved`, then store `resolution`, `actual_resolve_time`, and re-poll occasionally (unresolve exists); map `annulled`/`ambiguous` to excluded/void in scoring. For **pastcasting**: this is the primary crowd-forecast corpus — backfill `statuses=resolved` with `include_descriptions=true`, and pull full CP history per post via `GET /api/posts/{id}/`. Budget API calls at ~1/sec with backoff; create a dedicated account + token.

---

## 4. Cross-platform recommendations (ticket deliverable)

1. **Question supply**: run two market feeds (Kalshi `GET /markets?status=open` — native horizon windows, series=category; Polymarket Gamma `GET /events?closed=false` with tag filters — horizon filtered client-side on `endDate`) plus Metaculus `GET /api/posts/?statuses=open` (token required; native `scheduled_resolve_time__lte` windows). Both market platforms need zero credentials for supply; Metaculus needs a free account. New-question detection: Kalshi `min_updated_ts` on events (documented for exactly this), Metaculus `-published_at` ordering; Polymarket has no documented updated-since filter — diff listings client-side.
2. **Resolution flow**: Kalshi is the cleanest (`result`/`settlement_ts` on the market, named `settlement_sources`, no disputes) — poll status transitions. Polymarket is eventually-final via UMA (`umaResolutionStatus` → terminal `outcomePrices`; 2h typical, 4–6 days disputed; rare split outcomes) — store the status transitions, not just the end state. Metaculus resolutions can be revised (`unresolve`) and include `ambiguous`/`annulled` voids — re-poll resolved questions for a grace period.
3. **Pastcasting corpora**: (a) Metaculus resolved posts + full community-prediction history — the highest-value corpus (question text, resolution criteria, resolutions, and a pre-resolution signal series all from one endpoint family); (b) Kalshi settled markets + `rules_primary` + candlesticks — the only platform where fine price history is a first-class archive; (c) Polymarket closed markets — good corpus, but start your own fine-grained price sampler today because API retention degrades to permanent 3h/12h buckets only.
4. **Market-at-forecast-time baseline**: at forecast commit time, record Kalshi (midpoint of `yes_bid/yes_ask` or `last_price`) and Polymarket (CLOB `/midpoint` or `/last-trade-price`) alongside the timestamp; retro analyses use Kalshi candlesticks (1m/1h/1d) and Polymarket `prices-history` (12h buckets permanent, finer only if self-archived). On Metaculus, the community prediction at time t is the stand-in baseline.
5. **Licensing**: all three docs are silent or unreachable on mirroring rights. Kalshi: Developer Agreement is binding on API use — read it (its text blocked automated fetch). Polymarket: ToU unreachable; secondary reporting says it restricts automated extraction — verify against the live ToU. Metaculus: ToS bot-gated — verify. For a private, non-commercial research DB the practical risk is low, but confirm before any publication/redistribution of mirrored question text. **[unverified across all three — flagged, not guessed]**

---

## Sources (primary, official developer documentation)

**Kalshi** (fetched 2026-10-27/28)
- API environments — https://docs.kalshi.com/getting_started/api_environments
- API keys / signing — https://docs.kalshi.com/getting_started/api_keys
- Quick start: public market data (no auth) — https://docs.kalshi.com/getting_started/quick_start_market_data
- Rate limits — https://docs.kalshi.com/getting_started/rate_limits ; pagination — https://docs.kalshi.com/getting_started/pagination
- GET markets — https://docs.kalshi.com/api-reference/market/get-markets ; GET events — https://docs.kalshi.com/api-reference/events/get-events ; GET series — https://docs.kalshi.com/api-reference/market/get-series
- Candlesticks — https://docs.kalshi.com/api-reference/market/get-market-candlesticks
- Historical data — https://docs.kalshi.com/getting_started/historical_data
- Settlement — https://docs.kalshi.com/getting_started/market_settlement ; settlement bounds — https://docs.kalshi.com/getting_started/settlement_bounds ; FIX settlement — https://docs.kalshi.com/fix/market-settlement
- WebSockets (lifecycle) — https://docs.kalshi.com/websockets/market-and-event-lifecycle
- Developer Agreement (binding on API use; text JS-rendered, unfetched) — https://kalshi.com/developer-agreement

**Polymarket** (fetched 2026-10-27/28)
- APIs overview — https://docs.polymarket.com/getting-started/api
- Discover markets (Gamma) — https://docs.polymarket.com/market-data/discover-markets ; market details — https://docs.polymarket.com/market-data/market-details ; Gamma OpenAPI — https://docs.polymarket.com/api-spec/gamma-openapi.yaml
- Prices & order books (incl. `/v2/prices-history` retention) — https://docs.polymarket.com/market-data/prices-order-books
- Resolution (UMA, Chainlink TWAP) — https://docs.polymarket.com/concepts/resolution
- Data API v1→v2 (endpoint inventory, `/v2/resolutions`, `/v2/status`, v1 retirement 2026-10-24) — https://docs.polymarket.com/migrate/data-api-v1-to-v2.md
- Builder tiers / rate-limit qualitative statement — https://docs.polymarket.com/programs/builders/tiers.md
- Markets & events concepts — https://docs.polymarket.com/concepts/markets-events ; blockchain data — https://docs.polymarket.com/resources/blockchain-data

**Metaculus** (fetched 2026-10-27/28)
- API overview — https://metaculus-metaculus.mintlify.app/api/overview ; authentication — https://metaculus-metaculus.mintlify.app/api/authentication ; rate limits — https://metaculus-metaculus.mintlify.app/api/rate-limits
- Posts (list filters, CP history) — https://metaculus-metaculus.mintlify.app/api/posts ; questions (resolution fields) — https://metaculus-metaculus.mintlify.app/api/questions ; forecasts — https://metaculus-metaculus.mintlify.app/api/forecasts
- OpenAPI spec — https://github.com/Metaculus/metaculus/blob/main/docs/openapi.yml
- Bots guide — https://metaculus-metaculus.mintlify.app/advanced/bots

**Secondary / context (non-primary, flagged)**
- CCIR note that Polymarket ToU restricts automated extraction — https://ccir.io/research/compute-derivatives-cftc
- Peer-reviewed use of the public Polymarket API — https://www.mdpi.com/2078-2489/16/11/980
- Prior survey this extends: `docs/research/llm-forecasting-landscape.md` (§3.2)

**Unverified / not found** (flagged in text): Kalshi Developer Agreement data-redistribution clauses (page is a JS app); Polymarket current ToU (URL 404 at fetch time) and its application to API mirroring; Metaculus ToS content licensing; Polymarket and Metaculus numeric rate limits (not published); Kalshi max candlestick query window (not documented); Polymarket "updated-since" listing filter (not documented); Metaculus human resolution/dispute process beyond the API schema (help pages not fetched).
