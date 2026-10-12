# PriceLedger Web

React interface for comparing real product prices in India and exploring their recorded history. Paste a public ecommerce product URL or search by brand/model; PriceLedger shows verified connected-store offers, variant differences, dates and source evidence.

**Stack:** React, TypeScript, Vite and TanStack Query. Price collection, matching and persistence live in the separate [PriceLedger API](https://github.com/codeWith-Ashwani/priceledger-api) repository. Both repositories remain private.

## Quick start

Requires Node.js **22.12+** and the migrated API running on port 8000.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The default API base is `http://127.0.0.1:8000/api/v1`. To change it, set `VITE_API_BASE_URL` in an optional `.env`, using `.env.example` as reference, and restart Vite.

Vite variables are public browser configuration. Never put admin tokens, database URLs or provider credentials in them. Configure the backend's CORS origins to match the frontend origin.

## Product flow

1. Submit a product URL or brand/model. No products or lookup requests appear before user input.
2. Name searches return candidates; select a retailer listing to verify it. URL searches resolve the listing directly when readable.
3. The API automatically scans connected sources. Cards show each store's product title, image, price, rating when supplied, stock, shipping, fees, seller and check time.
4. Compare all verified returned offers, or filter by store, known storage capacity and fresh available stock. Sort by price, normalized product rating or recent check. Active filters recalculate the lowest eligible price and can be reset.
5. Inspect the exact variant's chart, source toggles, observation ledger, coverage and historical assessment. Save a browser-local price target if useful.

Same-model cards may differ in colour, RAM, storage or size; known differences and separate variant-history links remain visible. Exact-variant mode shows verified exact matches. Model alternatives do not enter the selected variant's graph or discount assessment. There is no three/four-store card cap. A store may supply multiple variant cards.

Blocked pages, cooldowns, unknown prices/ratings and uncertain identities stay explicit. Missing cards do not prove a retailer lacks stock. Additional stores depend on backend adapters, readable evidence and source permissions; this is not universal internet discovery.

When another request is scanning the same product, comparison automatically retries at most three times using the API's numeric `Retry-After` delay (up to 15 seconds each). Recorded offers remain visible while waiting. Persistent conflicts show a retry control; other failures and source quotas are not automatically retried. Leaving the product cancels pending comparison recovery.

## Understanding prices

| Display | Price basis |
| --- | --- |
| Item-price ranking and chart | Recorded item price; shipping/extras excluded |
| Known-subtotal ranking and exact-variant headline | Item + known shipping + observed listed fees |
| Offer table totals and historical assessment | Item + shipping; extras excluded |
| Recorded low/high and daily-best average | Exact online item prices within the selected period |
| Saved price targets | Fresh available exact online item + shipping; extras excluded |

Missing shipping is never treated as free. Known subtotals can omit unconfirmed checkout charges. Conditional bank/coupon/exchange offers are excluded from unconditional prices. Store-provided product ratings are not seller-quality scores. Stale, unavailable and incomplete quotes cannot win the relevant comparison.

History supports 30/90/365-day and all-recorded views. A single observation is a point; failed checks break chart continuity and missing days remain missing. Recorded statistics show store/date and observed-day count. The daily-best average weights observed India days equally. The separate assessment uses a historical daily-median reference and withholds a verdict when coverage is insufficient.

History starts with genuine observations or reviewed historical imports. Complete launch history, future price predictions and offline estimates remain unavailable without the required evidence. No sample product, fake price or fabricated timeline is bundled with the application.

## Saved targets

Targets are saved in this browser's local storage. Opening **My targets** reads the latest recorded exact online offers and displays target reached, the amount above target or an unconfirmed status. This does not trigger a new retailer fetch or send an outbound message. Prices may have changed since their displayed check time.

Email/push delivery, accounts and cross-device synchronization are not implemented. Existing target data keeps its browser format. Storage failures are shown explicitly.

## Owner workspace

Open `/?admin=imports`. The API must have a server-only `PRICELEDGER_ADMIN_TOKEN`; enter it in the workspace. The token stays in component memory and is cleared by disconnect/reload. It is never saved in local/session storage or URLs. Use HTTPS beyond local development.

The workspace includes collection health, permitted historical sources, tracked offers, import previews/audits and learned Shopify stores. Collection health shows stale/missing prices, failed offer checks, approved-price history gaps, scheduling and source cooldowns/budgets. Offer filters and independent source/offer pagination cover every recorded source without loading its full history. Refresh reads recorded state; it does not contact retailers, start jobs or confirm a worker is alive. Requests cancel on disconnect, failed reads show an error without substitute statistics, and all times use India time.

Identity templates contain blank price/date/evidence fields. Imports require genuine exact-variant records and explicit source approval. Invalid rows block staging, and commit revalidates permissions, context and events atomically. Independent archives supplement history without replacing current live offers.

Pause/resume controls affect future learned-store discovery while preserving existing permitted evidence. Resuming cannot restore revoked source permissions. See the API README and interactive API reference for schemas and operational limits.

## Verify and build

```sh
npm test
npm run typecheck
npm run build
```

The production build writes ignored output to `dist/`. `npm run preview` serves that build locally; configure its origin in backend CORS when testing API access. Deploy frontend assets and the backend separately, with the correct public API base configured at build time.

For browser checks, run the API and Vite with Google Chrome installed:

```sh
npm run test:e2e
```

Live regressions require the genuine listings referenced in the browser tests to have been looked up in the test API first. They depend on retailer readability/stock and are separate from deterministic unit CI. Explicit intercepted contracts cover sorting, filters, ranking, targets and failures without inserting synthetic offers into storage.

Run the genuine same-product desktop/mobile regression serially with `npm run test:e2e -- tests/browser/apple-discovery.spec.ts --workers=1` for deterministic source checks. Concurrent scans can receive the API's intentional 409 lease-conflict response; separate controlled browser tests verify bounded automatic recovery.

Use a separate database and temporary quota overrides for a large suite. `PRICELEDGER_TEST_API_URL` configures the direct test API base for competitor-feature contracts; it defaults to localhost port 8000 plus `/api/v1`. Keep that value consistent with Vite's API base. Genuine import checks additionally require `PRICELEDGER_QA_API_BASE`, a temporary `PRICELEDGER_QA_ADMIN_TOKEN` and an evidence file at `PRICELEDGER_QA_HISTORY_FILE`; without them, source-dependent import checks are skipped.

## Source layout

| Files | Responsibility |
| --- | --- |
| `src/api.ts`, `src/adminApi.ts`, `src/comparisonRetry.ts` | Typed API clients and bounded busy-response recovery |
| `LookupPanel`, `Comparison`, `OfferCards` | User-driven lookup and cross-store comparison |
| `HistoryChart`, `HistoryLedger`, `HistoryCoverage`, `PriceInsights` | Dated evidence, coverage and recorded statistics |
| `TargetCard`, `WatchDialog`, `src/watchlist.ts` | Local targets and progress |
| `HistoryImportAdmin`, `DiscoveryStores`, `CollectionDashboard` | Authenticated owner controls and read-only collection health |
| `src/offers.ts`, `src/chart.ts` | Ranking/filtering and chart transformations |
| `src/*.test.ts`, `tests/browser/` | Unit and desktop/mobile regressions |

README is the only repository documentation. Research, sprint plans and QA artifacts remain local. Credentials, browser output, dependencies and build output are ignored by Git.
