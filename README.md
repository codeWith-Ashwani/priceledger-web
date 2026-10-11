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

Paste a public ecommerce product link, or enter brand and model. Amazon India, Flipkart, Meesho, Croma, Reliance Digital and brand-gated iQOO, Sony Center and boAt adapters support discovery. A generic structured-product reader accepts other readable public source pages. Name searches return retailer candidates; choose a listing to check its current price. URL lookups load genuine retailer data and record timestamped observations. A product with readable identity but no offer can still start discovery; its price remains unconfirmed. The initial screen contains no products, invented prices or default comparison. No lookup runs until the user submits an input.

Comparisons show real product imagery when supplied, retailer/source, online/offline channel, India timestamps, item price, delivery, stock and freshness. Item-price history supports 30/90/365-day and all-recorded views, retailer toggles and exact date inspection. A single observation is shown as a point; missing history stays missing. The delivered-total assessment requires enough actual observations. Targets are stored on the current browser only; account sync and external notifications are not implemented.

Retailers may block access or return unreadable data. The UI reports those failures without guessing prices. After resolving one listing, it automatically checks connected retailers. **Same model** is the default card view: matching brand/model offers may differ in colour, capacity or size, with known differences labelled and a separate variant-history link. **Exact variant** restricts cards to verified exact matches. The table, graph, coverage and discount assessment always retain exact-variant history. Generations, Pro/Lite models, accessories and used/refurbished conditions are kept distinct. Full launch-to-today history requires a real historical source; otherwise the timeline starts with the first observation. Offline quotes/ranges remain unavailable until dated shop evidence is added.

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

iQOO, Sony and boAt products additionally search their supported official/brand stores, retaining selected SKU identity. Single-store results expand their store diagnostics automatically. Blocked access, retry cooldowns and unreadable candidates have distinct labels; absence of a card does not establish absence of stock. Model comparisons allow optional charging-wattage wording to differ; exact variant verification retains stricter identifier checks.

The genuine iQOO browser check requires the local API to have looked up `https://www.amazon.in/dp/B0H1WY1D37` with the updated backend first. It verifies Amazon, the official Solar Flame 4GB/128GB SKU and exact-mode isolation. Live retailer availability can change; these browser checks supplement deterministic unit CI. A controlled browser contract verifies model ranking and variant labels without inserting synthetic prices into storage.

The offer-card component shows each verified store's own listing name, product image, item price, available product rating and feedback count, delivery, stock, seller and check time. Comparison happens inside PriceLedger; store links are optional purchase links. Item-price ranking excludes unavailable or stale quotes. The **With delivery** switch ranks only confirmed totals and excludes unknown shipping. All tied lowest offers receive a badge; a one-store result explicitly says it cannot establish a cross-store winner.

Discovery uses eight configurable adapters, with brand and category gating. Previously tracked same-model offers from other readable public domains can participate too. Multiple colours may produce multiple cards from one store; the matched-store count uses distinct retailers. Three or four stores appear only when genuine matching offers can be read. Missing ratings, unknown conditions and unreadable stores stay explicit. Further discovery requires additional adapters or feeds.

One submitted URL starts a comparison scan without requiring another retailer link. The API checks candidate metadata and records genuine observations. A different RAM variant may win in **Same model** mode, with its capacity labelled. It cannot enter the submitted phone's exact-variant winner, graph or discount assessment. Valid matching GTINs support exact matching in other categories.

A 12-domain exploratory audit in October 2026 found readable prices on four input pages and identity without prices on two more. Sony WH-CH520 returned four stores; original boAt Airdopes 141 returned two after excluding Gen 2. Other links exposed retailer blocks, cooldowns and a missing listing. Search-index prices sometimes differed from fresh selected-variant pages, so snippets are never treated as verified prices. Universal coverage and complete launch history are not available. Audit records and screenshots remain local.

Item prices exclude conditional bank/coupon discounts. **With delivery** compares item plus known shipping; additional checkout/protection fees and pincode-specific charges still need confirmation at the store. Missing delivery is never treated as free.

The history ledger lists the precise India date/time, retailer, online/offline channel, item price, delivered total and source for each returned observation, with 20-row pagination. Verified store offers share the product graph. Other variants have separate history links. Acceptance of a public source URL does not imply universal retailer discovery or that its past prices are available. Earlier history remains unavailable until genuine evidence is obtained/imported.

The coverage panel shows aggregate observed days, evidence counts, first/latest prices and collection status for each verified offer. It distinguishes a failed latest check from the last valid price and shows when a queued check becomes eligible; the backend worker must run for future collection. Charts break at failed checks, and the ledger labels page checks versus historical imports. Expand price evidence to inspect the variant and seller context retained at that observation. Legacy records do not acquire invented snapshots. Coverage does not assert complete launch history; no historical provider is connected yet.

## Historical file imports

Open `/?admin=imports` to access the owner workspace. The API must have `PRICELEDGER_ADMIN_TOKEN` configured; all import/source/listing endpoints require `X-Admin-Token` and remain disabled without it. Enter the token in the workspace. It is held only in component memory, never URL/local/session storage, and is cleared on disconnect or reload. Never put an admin token in Vite environment variables or source code. Use HTTPS when operating beyond localhost.

Select an approved historical source or register one using your verified permission/ownership reference. This records an operator's approval; it does not obtain data access or independently establish licensing. Public-page sources cannot impersonate an archive. Choose a tracked exact listing and download its JSON template. The template supplies identity fields and leaves price/date/evidence fields empty. Fill them from genuine source records; the selected listing is a template helper and does not override identities inside the uploaded file.

Uploads accept UTF-8 CSV or a JSON array, at most 1 MB and 1,000 records. Each row requires an existing offer ID, retailer/listing ID, exact variant attributes, seller/condition/region, a unique source event ID, a timezone-aware past timestamp, stock state and evidence reference. Monetary amounts use integer INR paise. Unknown shipping stays empty/null. Coupon, account-dependent and other price types are rejected by this initial listing-price importer.

Preview reports each row's readiness, duplicates or errors, with 50-row pagination. Any error blocks the entire file. A valid preview expires after 24 hours. Commit rechecks permissions, identity and event data; it saves all accepted observations atomically and reports skipped duplicates. Imported prices supplement history and never overwrite current live quotes or create another retailer ranking. Source-separated graph toggles and the observation ledger retain archive provenance and original evidence references. Recent imports retain file hashes and committed results for audit.

Browser import checks in `tests/browser/history-import.spec.ts` require an isolated API at `PRICELEDGER_QA_API_BASE`, its temporary token in `PRICELEDGER_QA_ADMIN_TOKEN`, and a genuine observation JSON file at `PRICELEDGER_QA_HISTORY_FILE`. They copy no prices into the main catalog. Without those settings, the genuine-import integration checks are skipped; the locked-workspace check still runs. Test screenshots go to ignored Playwright output directories. No fictional history is bundled with the application.
