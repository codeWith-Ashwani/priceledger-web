# PriceLedger Web

React interface for comparing real product prices in India and exploring their recorded history. Paste a public ecommerce product URL or search by brand/model; PriceLedger shows verified connected-store offers, variant differences, dates and source evidence.

**Stack:** React, TypeScript, Vite and TanStack Query. Price collection, matching and persistence live in the separate [PriceLedger API](https://github.com/codeWith-Ashwani/priceledger-api) repository. Both repositories remain private.

**Release 1.0.0:** the existing feature scope is frozen. This release adds engineering safeguards and reproducible release packaging. Retailer coverage, historical depth and offline evidence retain the limitations below.

## At a glance

- Paste a public product link or search by brand/model, then inspect verified store cards with prices, images, stock, ratings when supplied and check times.
- Compare every returned verified offer, filter exact/model variants, and see the lowest eligible price for the selected price basis.
- Explore source-attributed charts, history rows, observed price statistics and coverage without filling missing dates.
- Compare 2–4 selected products side by side and save price targets in this browser.
- Inspect reviewed local-shop evidence by city and condition when genuine quotes exist.
- Report offer issues and use the authenticated owner workspace for reviews, imports, source controls and collection health.

**Navigate:** [Quick start](#quick-start) · [Product flow](#product-flow) · [Understanding prices](#understanding-prices) · [Owner workspace](#owner-workspace) · [Build and verification](#verify-and-build) · [Troubleshooting](#troubleshooting) · [Source layout](#source-layout)

## Quick start

Requires Node.js **22.12+** and the migrated API running on port 8000.

Run both repositories in separate terminals. First, from `priceledger-api`:

```sh
uv sync --locked
uv run alembic upgrade head
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

This requires Python 3.12+ and `uv`; see the [API setup](https://github.com/codeWith-Ashwani/priceledger-api#quick-start). Keep the API terminal open. In a second terminal, from `priceledger-web`:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The default API base is `http://127.0.0.1:8000/api/v1`. To change it, set `VITE_API_BASE_URL` in an optional `.env`, using `.env.example` as reference, and restart Vite.

The frontend does not start the API or collector. If the API is stopped, the page can load while product lookup fails. Run the backend collector separately for future scheduled observations; see the [collection instructions](https://github.com/codeWith-Ashwani/priceledger-api#collection-and-maintenance).

Vite variables are public browser configuration. Never put admin tokens, database URLs or provider credentials in them. Configure the backend's CORS origins to match the frontend origin.

## Product flow

1. Submit a product URL or brand/model. No products or lookup requests appear before user input.
2. Name searches return candidates; select a retailer listing to verify it. URL searches resolve the listing directly when readable.
3. The API automatically scans connected sources. Cards show each store's product title, image, price, rating when supplied, stock, shipping, fees, seller and check time.
4. Compare all verified returned offers, or filter by store, known storage capacity and fresh available stock. Sort by price, normalized product rating or recent check. Active filters recalculate the lowest eligible price and can be reset.
5. Inspect the exact variant's chart, source toggles, observation ledger, coverage and historical assessment. Save a browser-local price target if useful.
6. Use **Report an issue** on an offer card to flag an incorrect price/model, outdated quote, stock issue or broken store link. The form captures the displayed quote and comparison context for private owner review.
7. Use **Add to product comparison** in the price overview, find another product, then open **Compare selected products** to inspect them side by side.
8. Inspect **Your local market** for reviewed shop quotes for the selected exact variant. Choose city, condition and history period; ranges appear only when supported by current documented shop evidence.

Same-model cards may differ in colour, RAM, storage or size; known differences and separate variant-history links remain visible. Exact-variant mode shows verified exact matches. Model alternatives do not enter the selected variant's graph or discount assessment. There is no three/four-store card cap. A store may supply multiple variant cards.

Blocked pages, cooldowns, unknown prices/ratings and uncertain identities stay explicit. Missing cards do not prove a retailer lacks stock. Additional stores depend on backend adapters, readable evidence and source permissions; this is not universal internet discovery.

The backend also connects Fire-Boltt's official `.com` catalog. Paste an official product link or search its brand/model to compare verified returned offers with other connected stores. Sold-out official listings remain labelled and cannot win against available offers. Watch generations such as Pro, Plus and Max remain distinct; colour alternatives retain separate histories. Missing shipping, condition or retailer ratings remain unconfirmed.

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

History starts with genuine observations or reviewed historical imports. Complete launch history and future price predictions remain unavailable without the required evidence. Local shop ranges require actual reviewed quotes; no sample product, fake price or fabricated timeline is bundled with the application.

## Local shop evidence

The local-market panel reads dated owner-reviewed shop evidence for one exact variant and condition. Choose a recorded city and 30-day, 90-day, one-year or ten-year history. Paginated prices retain shop/area, source, observed time, validity and review time in IST. Chart dots show the current page's observations without interpolation; green dots are current and grey dots are historical. Changing city, condition, product or period cancels obsolete reads. Failed or mismatched responses show a retry control. The panel rechecks every minute while active and offers a manual refresh; the displayed check time describes when the range was calculated.

A sampled range requires at least two documented shops with in-stock, unexpired evidence no older than the API's freshness setting (seven days by default). A single quote stays visible without a range; expired quotes remain historical. Newer stock reports and published-quote withdrawals prevent older available quotes appearing current. Ranges cover the documented sample and exclude delivery/travel costs. Online price rankings, targets and graphs stay separate. An empty panel means no suitable documented evidence exists; offline prices are never approximated from online prices.

In `/?admin=imports`, connect using a server-configured admin token and open **Record and review local shop quotes**. Register the shop's public location and private permission reference, then find an existing tracked exact product. Supply its unconditional, tax-inclusive INR price, condition, reported availability, quote time, validity and private evidence reference; explicitly verify the exact variant before recording the private draft. Review the captured shop/product/evidence and enter a private note before publishing. Publication/withdrawal requires a confirmed server receipt, retains safe retry identities and appends a private audit. Reload a conflicting record while keeping the pending note. Withdrawal is final; corrected evidence needs a new draft.

The owner panel loads on expansion, aborts pending requests on close/disconnect, and keeps credentials, drafts and notes out of browser storage. No anonymous submission or receipt-image upload is provided. Operator attestations are not independently verified; use genuine shop evidence and keep personal/payment details out of references. Source permission expiry can also be supplied through the API. A fresh installation contains no offline quotes.

## Saved targets

Targets are saved in this browser's local storage. Opening **My targets** reads the latest recorded exact online offers and displays target reached, the amount above target or an unconfirmed status. This does not trigger a new retailer fetch or send an outbound message. Prices may have changed since their displayed check time.

Email/push delivery, accounts and cross-device synchronization are not implemented. Existing target data keeps its browser format. Storage failures are shown explicitly.

## Side-by-side products

Add 2–4 user-selected products to the comparison list. It stays in memory for this visit and clears on reload; no sample product or automatic selection is added. Remove individual items or clear the list. The four-product limit applies to columns, while every permitted recorded store offer remains accessible within each column.

The table shows each product's image, recorded model/colour/RAM/storage/size/pack/part number, and separate lowest fresh available online item-price and known-subtotal quotes. Winners retain store, source, seller, condition and check time. Known subtotals require known shipping and include listed extras; conditional promotions stay excluded. Expand **Store evidence** for every recorded offer, including stale/unavailable quotes, fees and retailer-provided product ratings. Products have independent histories; **View offers and history** opens the selected variant's existing detail.

Unknown facts display **Not recorded**. **Hide identical known details** hides a row only when all products have the same known value, preserving uncertain rows. Fields are recorded retailer metadata/title-derived identity details; technical specification feeds are not connected. There is no overall best-product recommendation across different models.

**Reload recorded prices** reads permitted database evidence without fetching retailers; the read time is separate from quote check times. Use each product's existing **Check stores again** for a new scan. Errors withdraw previous table results and require manual reload. Changed selections, hiding or clearing the workspace cancel pending reads. If two selections represent the same exact variant, remove one. The table scrolls within its keyboard-focusable container on mobile.

## Reporting an issue

Choose a reason and describe the problem in 5–1,000 characters. Leave out personal/payment information. Successful submission returns a reference; network failures/timeouts allow a manual retry with the same submission identifier while the dialog stays open. Editing the details creates a new identifier. Closing/reopening the dialog starts a new submission. Reports are not saved in browser storage.

If the quote changed on the server, refresh prices before reporting again. Validation errors, rate limits and unconfirmed responses stay visible; they never show a false success. The owner receives a snapshot of the recorded offer and comparison variant. Reporting does not immediately change a price or match, and there is no public report-status lookup or outbound delivery.

## Owner workspace

Open `/?admin=imports`. The API must have a server-only `PRICELEDGER_ADMIN_TOKEN`; enter it in the workspace. The token stays in component memory and is cleared by disconnect/reload. It is never saved in local/session storage or URLs. Use HTTPS beyond local development.

The workspace includes issue reports, collection health, permitted historical sources, tracked offers, import previews/audits and learned Shopify stores. Collection health shows stale/missing prices, failed offer checks, approved-price history gaps, scheduling and source cooldowns/budgets. Offer filters and independent source/offer pagination cover every recorded source without loading its full history. Refresh reads recorded state; it does not contact retailers, start jobs or confirm a worker is alive. Requests cancel on disconnect, failed reads show an error without substitute statistics, and all times use India time.

The private issue queue supports status filters, pagination, captured variant/source evidence, review notes and paginated revision history. Resolve or dismiss with an explanation. Concurrent edits require reloading the report; unsaved notes survive audit pagination/reload. Review records the investigation without rewriting price or matching evidence. Disconnect cancels pending queue, detail and review requests.

Identity templates contain blank price/date/evidence fields. Imports require genuine exact-variant records and explicit source approval. Invalid rows block staging, and commit revalidates permissions, context and events atomically. Independent archives supplement history without replacing current live offers.

Pause/resume controls affect future learned-store discovery while preserving existing permitted evidence. Resuming cannot restore revoked source permissions. See the API README and interactive API reference for schemas and operational limits.

## Verify and build

```sh
npm test
npm run typecheck
npm run build
```

The production build writes ignored output to `dist/`. `npm run preview` serves that build locally; configure its origin in backend CORS when testing API access. Deploy frontend assets and the backend separately, with the correct public API base configured at build time.

To preview the compiled build with the default backend's permitted frontend origin, stop the Vite development server and use:

```sh
npm run preview -- --port 5173 --strictPort
```

Keep the API on port 8000 running in its separate terminal. Preview is for local verification; use the packaged Nginx runtime for the container setup.

The Docker build compiles with `VITE_API_BASE_URL=/api/v1`. Its non-root, read-only Nginx runtime serves hashed assets with immutable caching, keeps HTML/API responses uncached, adds browser security headers and proxies API calls on the same origin. Containers listen on 8080. See the API README's **Reproducible release setup** for the matching PostgreSQL/API/worker/web Compose stack, credentials, backups and rollback. Both repositories must be sibling directories at matching `v1.0.0` tags. This setup binds to localhost; public hosting requires its own TLS, trusted edge, rate-limit and monitoring configuration.

API requests reject redirects, omit browser cookies and have deadlines covering headers and body decoding. Ordinary reads allow 20 seconds, owner imports 45 seconds, lookup 120 seconds and cross-store scans 180 seconds; owner dashboards and evidence panels retain their shorter managed deadlines. Leaving a lookup cancels it. A timed-out write may already have reached the server: refresh its state or use the existing receipt-based retry flow. Unexpected rendering failures show a reload control; saved browser targets remain intact.

CI runs locked dependency installation, dependency audit, unit tests, TypeScript and production compilation, six desktop/mobile compiled-build smoke checks and a restricted-container smoke. The private Actions build artifact contains only compiled assets and expires after 14 days; it includes no database, credentials or QA evidence. To run only the self-contained smoke locally against a running frontend:

```sh
npm run test:e2e -- tests/browser/release-smoke.spec.ts
```

For browser checks, run the API and Vite with Google Chrome installed:

```sh
npm run test:e2e
```

Live regressions require the genuine listings referenced in the browser tests to have been looked up in the test API first. They depend on retailer readability/stock and are separate from deterministic unit CI. Explicit intercepted contracts cover sorting, filters, ranking, targets and failures without inserting synthetic offers into storage.

The optional Fire-Boltt browser regression uses a comma-separated `PRICELEDGER_TEST_FIREBOLTT_IDS` list of genuine product IDs returned by URL lookup and the matching `PRICELEDGER_TEST_API_URL`. It checks actual official/marketplace cards, stock-aware ranking, unknown delivery, product images and responsive layout. Without IDs it skips; it never seeds products or assumes fixed prices or store counts.

Run the genuine same-product desktop/mobile regression serially with `npm run test:e2e -- tests/browser/apple-discovery.spec.ts --workers=1` for deterministic source checks. Concurrent scans can receive the API's intentional 409 lease-conflict response; separate controlled browser tests verify bounded automatic recovery.

Use a separate database and temporary quota overrides for a large suite. `PRICELEDGER_TEST_API_URL` configures the direct test API base for competitor-feature contracts; it defaults to localhost port 8000 plus `/api/v1`. Keep that value consistent with Vite's API base. Genuine import checks additionally require `PRICELEDGER_QA_API_BASE`, a temporary `PRICELEDGER_QA_ADMIN_TOKEN` and an evidence file at `PRICELEDGER_QA_HISTORY_FILE`; without them, source-dependent import checks are skipped.

## Troubleshooting

| Symptom | Check or action |
| --- | --- |
| The page opens but no product loads / `Failed to fetch` | Confirm the backend is still running and open `http://127.0.0.1:8000/api/v1/ready`. A stopped API is independent of whether a retailer supports the product. |
| The API is ready but the browser cannot reach it | Check `VITE_API_BASE_URL`, the API port and backend CORS origins. Restart Vite after changing its environment; rebuild compiled assets after changing build-time configuration. |
| Only one store is displayed | Inspect the store diagnostics. Blocked pages, cooldowns, accessories and uncertain matches cannot supply verified alternatives. |
| No old prices or only a single chart point | History begins with genuine recorded evidence. A first lookup cannot reveal a retailer's entire past timeline. |
| No offline range appears | Genuine reviewed city/variant quotes are required. At least two eligible documented shops are needed for a sampled range. |
| A displayed price differs at checkout | Check the observation time, stock, shipping and listed fees. Conditional bank, exchange and coupon offers are excluded from the unconditional ranking. |
| The owner workspace rejects a token | Configure the token on the API server, then reconnect with that token. Never add it to a `VITE_` variable. |
| Port 5173 is occupied | Stop the existing development/preview process, or use another port and add that origin to backend CORS. |

For backend readiness, collection and database recovery, see [API troubleshooting](https://github.com/codeWith-Ashwani/priceledger-api#troubleshooting). Normal public operation does not require an owner token.

## Source layout

| Files | Responsibility |
| --- | --- |
| `src/api.ts`, `src/adminApi.ts`, `src/request.ts`, `src/comparisonRetry.ts` | Typed API clients, bounded transport and busy-response recovery |
| `LookupPanel`, `Comparison`, `OfferCards` | User-driven lookup and cross-store comparison |
| `HistoryChart`, `HistoryLedger`, `HistoryCoverage`, `PriceInsights` | Dated evidence, coverage and recorded statistics |
| `TargetCard`, `WatchDialog`, `src/watchlist.ts` | Local targets and progress |
| `HistoryImportAdmin`, `DiscoveryStores`, `CollectionDashboard` | Authenticated owner controls and read-only collection health |
| `ReportDialog`, `ReportQueue`, `src/reports.ts` | Public issue intake, safe retries and private owner review |
| `ProductCompare`, `src/productComparison.ts` | Visit-only product selection, independent prices and recorded variant comparison |
| `LocalShopQuotes`, `OfflineQuoteAdmin`, `src/offline.ts` | City/condition history and sampled ranges, private drafts and reviewed shop publication |
| `src/offers.ts`, `src/chart.ts` | Ranking/filtering and chart transformations |
| `src/*.test.ts`, `tests/browser/` | Unit and desktop/mobile regressions |

README is the only repository documentation. Research, sprint plans and QA artifacts remain local. Credentials, browser output, dependencies and build output are ignored by Git.
