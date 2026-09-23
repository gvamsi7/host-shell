# Host Shell — One Port, Route-Based Offers

This repository is the only HTTP application in local development.

The three offers stay in independent Git repositories and compile to one JavaScript file each. The Shell serves those compiled files through its own port and mounts them according to the current browser route.

## Repository layout

Clone the four repositories next to each other:

```text
workspace/
├── host-shell/
├── offer-payments/
├── offer-trading/
└── offer-analytics/
```

There are no source imports between these repositories.

## Browser routes

```text
http://localhost:3000/                   Shell
http://localhost:3000/offers/payments    Payments
http://localhost:3000/offers/trading     Trading
http://localhost:3000/offers/analytics   Analytics
```

All pages stay on port `3000`.

## Remote bundle routes

The Shell exposes the compiled Offer bundles through the same origin:

```text
http://localhost:3000/offers/payments/offer.js
http://localhost:3000/offers/trading/offer.js
http://localhost:3000/offers/analytics/offer.js
```

The runtime manifest is:

```text
/offers.manifest.json
```

Each Offer registers:

```js
window.__REMOTE_OFFERS__[config.id] = {
  contractVersion: 1,
  config,
  mount({ element, host }) {
    // render the independent offer here
  }
}
```

## Install

From each repository run `npm install`, or open the Host Dev Container. The Host Dev Container mounts the parent workspace and installs dependencies in all four repositories.

## Run the complete workspace

From `host-shell`:

```bash
npm run dev:workspace
```

That command:

1. Starts the Shell HTTP server on port 3000.
2. Runs Webpack watch for Payments.
3. Runs Webpack watch for Trading.
4. Runs Webpack watch for Analytics.

The Offer watchers do not start HTTP servers.

## Production workspace build

From `host-shell`:

```bash
npm run build:workspace
```

The Offers build independently first. Then the Shell builds and copies only these compiled artifacts:

```text
host-shell/dist/
├── index.html
├── shell.js
├── offers.manifest.json
└── offers/
    ├── payments/
    │   └── offer.js
    ├── trading/
    │   └── offer.js
    └── analytics/
        └── offer.js
```

The Shell never copies or imports Offer source code.
