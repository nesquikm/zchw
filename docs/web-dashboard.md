# Web Dashboard

## Start

```bash
npm run dev:web
```

Opens at [http://localhost:5173](http://localhost:5173).

## Stop

```bash
npm run stop:web
```

## What to test

1. **Impact Summary** (`/dashboard`) — 6 KPI cards with sparklines and measurement badges (Observed/Estimated)
2. **Spend & Forecasting** (`/dashboard/spend`) — spend over time chart, budget utilization bars, cost drivers, model comparison donut
3. **Filters** — date range picker (7d/30d/90d/custom), team filter, model filter. Changing filters updates the URL and all charts
4. **Navigation** — sidebar links switch between pages without full reload
