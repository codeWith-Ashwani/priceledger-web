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

Paste an Amazon India, Flipkart or Meesho product link, or enter brand, model and variant. Name searches return retailer candidates; choose the exact listing to check its current price. URL lookups load real readable retailer data through the API and record timestamped observations. The initial screen contains no products, invented prices or default comparison. No lookup runs until the user submits an input.

Comparisons show real product imagery when supplied, retailer/source, online/offline channel, India timestamps, item price, delivery, stock and freshness. Item-price history supports 30/90/365-day and all-recorded views, retailer toggles and exact date inspection. A single observation is shown as a point; missing history stays missing. The delivered-total assessment requires enough actual observations. Targets are stored on the current browser only; account sync and external notifications are not implemented.

Retailers may block access or return unreadable data. The UI reports those failures rather than creating a product or guessed price. Similar model names are not automatically matched across shops. Full launch-to-today history requires a real historical source; otherwise the timeline starts with the first observation. Offline quotes/ranges remain unavailable until dated shop evidence is added. Amazon/Flipkart current-page lookup has been exercised during development; universal retailer coverage is not guaranteed, and Meesho access was limited in live testing.

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
