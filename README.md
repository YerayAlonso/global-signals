# Global Signals

A modern, responsive demo of [Statcounter Global Stats](https://gs.statcounter.com/), with an English-language interface and **TeeChart JS** charts. It runs without a database, paid services, or API keys.

- **Live demo:** [global-signals.vercel.app](https://global-signals.vercel.app)
- **Repository:** [YerayAlonso/global-signals](https://github.com/YerayAlonso/global-signals)

## Run locally

Requires **Node.js 22.12+** (Node 24 recommended) and **pnpm 12.3.4**. The pnpm version is pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:4321`.

```sh
pnpm build          # TypeScript checks and Astro/Vercel build
pnpm test           # CSV, filters, caching, and fallback tests
pnpm exec playwright install chromium
pnpm test:e2e       # Browser tests: charts, filters, mobile, exports, and errors
pnpm data:check     # Check live StatCounter data; requires network access
```

## Why Astro + Preact?

This is a single-page dashboard. It doesn’t need the routing, authentication, or dynamic rendering features of Next.js.

- **Astro** generates static HTML with real data visible before hydration.
- **A Preact island** handles filters, tables, the chart legend, shareable URLs, and downloads.
- **TeeChart.js 4.0.5** renders line and bar charts on Canvas. It is self-hosted from the npm package under Steema’s non-commercial license; commercial use requires separate authorization.
- **A Vercel function** fetches and validates StatCounter’s CSV export, avoiding browser CORS restrictions from the provider.
- Fonts are served locally too; the browser doesn’t need to contact Google Fonts.

## Data and freshness

Source: [Statcounter Global Stats](https://gs.statcounter.com/). The dashboard covers browsers, operating systems, search engines, and devices; worldwide, continents, and a selection of countries; and desktop, mobile, or tablet segments.

StatCounter’s public export at `https://gs.statcounter.com/chart.php?...&csv=1` provides monthly series without an account or API key. **It is not a versioned API with availability guarantees.** The integration is isolated in `src/lib/statcounter.ts` to make it straightforward to adapt if the export changes.

- The app fetches **24 complete months**, through the month before the server’s current date. The period selector shows the most recent 6, 12, or 24 months without making another upstream request.
- StatCounter publishes data daily, at around 13:00 GMT, and may revise it during the first 45 days. This demo displays it at monthly granularity.
- The function sets `s-maxage=21600` (6 hours) and `stale-while-revalidate=86400` for Vercel’s CDN. It also uses an in-process cache and deduplicates concurrent requests. Cache persistence and reuse depend on the function’s lifecycle; it is not a database.
- The browser reuses responses for 15 minutes. **Refresh data** clears this local cache, but the response may still come from the CDN or server cache.
- `src/data/snapshot.json` contains a real snapshot for October 2024–September 2026. It is included in the initial HTML so the page isn’t empty while loading, then automatically revalidated.
- If the source is unavailable, the API can return the last valid response for the same scope from memory, or the bundled snapshot for worldwide browser data. Fallbacks are clearly labelled and are not cached by the CDN. For scopes without a saved copy, the app shows an error and keeps the previous, clearly identified results.
- The source measures **usage share based on page views**, not unique users. Search engines are measured by the traffic they refer. The bar chart shows the latest month; **it is not an average of the percentages over the selected period**.

To refresh the initial snapshot before a new deployment:

```sh
pnpm data:refresh
pnpm build
```

Live queries continue to update without redeploying. Refreshing the snapshot is optional; it only improves the initial page content and fallback.

## Interactions

- Navigate between the four statistics.
- Filter by region, device, and period.
- View monthly trends or compare the latest month with TeeChart JS.
- Explore tooltips with a mouse, touch, or keyboard arrow keys.
- Show or hide chart series from the legend, keeping at least one visible.
- Browse the latest-month table or monthly history, with category search.
- Download a CSV of all series for the selected period, including attribution and retrieval date.
- Export the visible chart as a PNG with its source, license, and legend.
- Share a URL that preserves the selected statistic, region, device, period, and chart type.
- Use a light or dark theme that follows the system preference and remembers manual choices in the browser.
- Use the mobile menu, methodology dialog, and explicit loading and error states.

## Project structure

```text
src/pages/index.astro         Static page and island hydration
src/pages/api/stats.ts        Serverless function and cache
src/components/Dashboard.tsx  Interface and interactive state
src/components/TeeChart.tsx   Responsive/HiDPI canvas and tooltips
src/lib/teechart.ts           Async loader and types for the API used
src/lib/statcounter.ts        CSV parsing, source URL, and data validation
src/lib/model.ts              Supported filters, formatting, and exports
src/data/snapshot.json        Real snapshot embedded in the initial HTML
public/vendor/                TeeChart.js 4.0.5 bundle, source map, and license
```

TeeChart.js is pinned to version `4.0.5` in `package.json` and `pnpm-lock.yaml`. `pnpm vendor:sync` copies its browser bundle, source map, and license from the installed npm package into `public/vendor/`; it is not required to install or build the project.

## Attribution and licenses

The data comes from **Statcounter Global Stats**, licensed under [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/). Attribution and a source link appear on the page and in exports. Redistributed or adapted data must retain this license. See [StatCounter’s FAQ](https://gs.statcounter.com/faq#credit-license).

The npm registry metadata labels TeeChart.js 4.0.5 as ISC, but its included license and Steema’s [licensing page](https://www.steema.com/licensing/js) identify this build as subject to the non-commercial license in `public/vendor/TeeChart-LICENSE.md`. Commercial or profit-making use requires separate authorization from Steema. The page and chart exports attribute Steema Software and TeeChart.js. DM Sans and Manrope are licensed under the SIL Open Font License; their licenses are in `public/vendor/dm-sans-LICENSE.txt` and `public/vendor/manrope-LICENSE.txt`. Lucide icons are ISC-licensed. Global Signals is an independent project and is not affiliated with StatCounter or Steema Software.
