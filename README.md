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
npm run build
```

Only README documentation is published. Planning and research remain local; dependencies, build outputs and secrets are excluded. Both repositories remain private until the owner explicitly changes visibility.
