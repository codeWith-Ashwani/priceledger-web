# PriceLedger Web

Private React + TypeScript frontend for actual India product lookup and sourced price history. Vite frontend and a separate FastAPI backend.

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Start [priceledger-api](https://github.com/codeWith-Ashwani/priceledger-api) on port 8000 after applying its migrations. Optional `.env` settings are shown in `.env.example`; `VITE_API_BASE_URL` is public browser configuration and must never contain credentials.

## Product flow

Paste a public ecommerce product link, or enter brand, model and variant. Amazon India, Flipkart, Meesho, Croma and Reliance Digital adapters and a generic structured-product reader accept readable source pages. Name searches return retailer candidates; choose the exact listing to check its current price. URL lookups load real readable retailer data through the API and record timestamped observations. The initial screen contains no products, invented prices or default comparison. No lookup runs until the user submits an input.

Comparisons show real product imagery when supplied, retailer/source, online/offline channel, India timestamps, item price, delivery, stock and freshness. Item-price history supports 30/90/365-day and all-recorded views, retailer toggles and exact date inspection. A single observation is shown as a point; missing history stays missing. The delivered-total assessment requires enough actual observations. Targets are stored on the current browser only; account sync and external notifications are not implemented.

Retailers may block access or return unreadable data. The UI reports those failures rather than creating a product or guessed price. The frontend automatically searches other connected retailers after resolving one listing. Verified exact variants join the price table and graph; uncertain or different variants show their own real prices and reasons separately. Full launch-to-today history requires a real historical source; otherwise the timeline starts with the first observation. Offline quotes/ranges remain unavailable until dated shop evidence is added. Amazon/Flipkart current-page lookup has been exercised during development; universal retailer coverage is not guaranteed, and Meesho access was limited in live testing.

## Verify

```sh
npm run typecheck
npm test
npm run build
```

For desktop/mobile browser checks, run the local API and Vite with Google Chrome installed. First look up the product URL used in `tests/browser/comparison.spec.ts` so its real record is available for deep-link checks, then:

```sh
npm run test:e2e
```

The suite tests a real submitted link, initial empty state, source/timestamp display, date inspection, image sizing, saved targets and error recovery. Search/error contracts use explicit request interception where stated. Live checks depend on retailer availability and are not part of the deterministic unit CI. Browser artifacts are ignored by Git.

Only README documentation is published. Research, sprints and QA screenshots remain local; dependencies, build output and credentials are excluded. Both repositories remain private until the owner explicitly changes visibility.

## Store comparison and historical provenance

iQOO products additionally search the manufacturer's official store, keeping the exact selected colour/memory SKU. Single-store results expand their store diagnostics automatically. Blocked access, retry cooldowns and unreadable candidates have distinct labels; absence of a card does not establish absence of stock. Similar retailer model names that lack a shared verified identifier are shown for review and excluded from the winner.

The genuine iQOO browser check requires the local API to have looked up `https://www.amazon.in/dp/B0H1WY1D37` with the updated backend first. It verifies Amazon and the exact official Solar Flame 4GB/128GB SKU, plus the separate Flipkart model-name review. Live retailer availability can change; these browser checks supplement deterministic unit CI.

The offer-card component shows each verified store's own listing name, product image, item price, available product rating and feedback count, delivery, stock, seller and check time. Comparison happens inside PriceLedger; store links are optional purchase links. Item-price ranking excludes unavailable or stale quotes. The **With delivery** switch ranks only confirmed totals and excludes unknown shipping. All tied lowest offers receive a badge; a one-store result explicitly says it cannot establish a cross-store winner.

Discovery now includes configurable Amazon India, Flipkart, Meesho, Croma and Reliance Digital adapters, with electronics stores omitted for known unrelated categories. Already tracked exact matches from other readable public domains can join too. Three or four cards appear only when that many genuine exact matches are available. Missing ratings, unreadable stores and uncertain variants stay explicit; the UI never supplies fake cards to reach a fixed count. The backend still needs adapters or feeds to discover previously unknown retailers automatically.

One submitted URL starts a comparison scan without requiring another retailer link. The API discovers candidate listings at connected stores, checks their actual metadata and records genuine observations. The UI reports verified matches, variant differences, access failures and missing matches. Phone matching includes RAM, storage, colour, model and condition; a different RAM variant never becomes the cheapest-price winner for the submitted phone. Valid matching GTINs support other product categories.

The history ledger lists the precise India date/time, retailer, online/offline channel, item price, delivered total and source for each returned observation, with 20-row pagination. Verified store offers share the product graph. Other variants have separate history links. Acceptance of a public source URL does not imply universal retailer discovery or that its past prices are available. Earlier history remains unavailable until genuine evidence is obtained/imported.

The coverage panel shows aggregate observed days, evidence counts, first/latest prices and collection status for each verified offer. It distinguishes a failed latest check from the last valid price and shows when a queued check becomes eligible; the backend worker must run for future collection. Charts break at failed checks, and the ledger labels page checks versus historical imports. Expand price evidence to inspect the variant and seller context retained at that observation. Legacy records do not acquire invented snapshots. Coverage does not assert complete launch history; no historical provider is connected yet.

## Historical file imports

Open `/?admin=imports` to access the owner workspace. The API must have `PRICELEDGER_ADMIN_TOKEN` configured; all import/source/listing endpoints require `X-Admin-Token` and remain disabled without it. Enter the token in the workspace. It is held only in component memory, never URL/local/session storage, and is cleared on disconnect or reload. Never put an admin token in Vite environment variables or source code. Use HTTPS when operating beyond localhost.

Select an approved historical source or register one using your verified permission/ownership reference. This records an operator's approval; it does not obtain data access or independently establish licensing. Public-page sources cannot impersonate an archive. Choose a tracked exact listing and download its JSON template. The template supplies identity fields and leaves price/date/evidence fields empty. Fill them from genuine source records; the selected listing is a template helper and does not override identities inside the uploaded file.

Uploads accept UTF-8 CSV or a JSON array, at most 1 MB and 1,000 records. Each row requires an existing offer ID, retailer/listing ID, exact variant attributes, seller/condition/region, a unique source event ID, a timezone-aware past timestamp, stock state and evidence reference. Monetary amounts use integer INR paise. Unknown shipping stays empty/null. Coupon, account-dependent and other price types are rejected by this initial listing-price importer.

Preview reports each row's readiness, duplicates or errors, with 50-row pagination. Any error blocks the entire file. A valid preview expires after 24 hours. Commit rechecks permissions, identity and event data; it saves all accepted observations atomically and reports skipped duplicates. Imported prices supplement history and never overwrite current live quotes or create another retailer ranking. Source-separated graph toggles and the observation ledger retain archive provenance and original evidence references. Recent imports retain file hashes and committed results for audit.

Browser import checks in `tests/browser/history-import.spec.ts` require an isolated API at `PRICELEDGER_QA_API_BASE`, its temporary token in `PRICELEDGER_QA_ADMIN_TOKEN`, and a genuine observation JSON file at `PRICELEDGER_QA_HISTORY_FILE`. They copy no prices into the main catalog. Without those settings, the genuine-import integration checks are skipped; the locked-workspace check still runs. Test screenshots go to ignored Playwright output directories. No fictional history is bundled with the application.
