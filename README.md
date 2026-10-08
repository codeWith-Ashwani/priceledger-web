# PriceLedger Web

Private React + TypeScript frontend for transparent India product price comparison. Built with Vite and a separate FastAPI backend.

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Start [priceledger-api](https://github.com/codeWith-Ashwani/priceledger-api) on port 8000. Optional `.env` configuration is shown in `.env.example`; use a reachable `VITE_API_BASE_URL` for another API host. Vite environment values are public browser configuration and must never contain credentials.

## Verify

```sh
npm run typecheck
npm test
npm run build
```

Only README documentation is published. Planning and research remain local; dependencies, build outputs and secrets are excluded. Both repositories remain private until the owner explicitly changes visibility.

## Current features

Search and category filtering, paginated exact-variant catalog, shareable selected-product URLs, responsive offer comparison, delivered price components, 30/90/365-day step charts, retailer toggles, date inspection, gap handling and transparent deal analysis. Price targets are saved on the current browser only; email/push delivery and account synchronization are not yet implemented.

Start the backend, run its migration and optionally its explicitly acknowledged demo seed. The sample catalog has six fictional variants and synthetic prices; no retailer collection occurs. Offline prices are withheld until local evidence is available. The API base defaults to `http://127.0.0.1:8000/api/v1` and requests support cancellation and short-lived query caching.

With the seeded API running on port 8000, Vite running on 5173, and Google Chrome installed, run `npm run test:e2e` for desktop/mobile catalog, navigation, chart, target persistence and error-recovery checks. Browser outputs are ignored by Git.
