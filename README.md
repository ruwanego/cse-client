# cse-api

Typed Node.js client and TypeSpec contract for the unofficial Colombo Stock Exchange web API.

`cse-api` gives application code a small, predictable API instead of exposing the raw CSE web endpoints directly. The wrapper keeps upstream quirks internal: read-only `POST` requests, misspelled endpoint names, inconsistent JSON shapes, and the `symbol -> securityId` lookup required for company chart data.

This package is unofficial and is not affiliated with the Colombo Stock Exchange.

## Install

```bash
npm install github:ruwanego/cse-api
```

Requirements:

- Node.js 20 or newer
- ESM import support

## Quick Start

```ts
import { CseClient } from "cse-api";

const cse = new CseClient();

const status = await cse.getMarketStatus();
const company = await cse.getCompany("LOLC.N0000");
const chart = await cse.getCompanyChart("LOLC.N0000", 1);

console.log(status.status);
console.log(company.name, company.securityId);
console.log(chart.points.at(-1));
```

## Stable Demo

Run the live demo to exercise every stable public method against the current CSE backend:

```bash
npm run demo:stable
```

The demo builds the package, calls the normalized client methods, and prints compact counts or key values for each response. It exits with a nonzero status if any stable call fails.

## Client API

Market data:

```ts
await cse.getMarketStatus();
await cse.getMarketSummary();
await cse.getAspi();
await cse.getSnpSriLanka20();
await cse.getSectors();
await cse.getMarketChart("ASPI", 1);
await cse.getMarketChart("SNP_SL_20", 1);
```

Company and price data:

```ts
await cse.getCompany("LOLC.N0000");
await cse.getCompanyChart("LOLC.N0000", 1);
await cse.getSecurityCodes();
await cse.getSecurities();
await cse.getTodayPrices();
await cse.getTopGainers();
await cse.getTopLosers();
await cse.getMostActiveTrades();
```

Trades:

```ts
await cse.getTradeSummary();
await cse.getDetailedTrades();
await cse.getDetailedTrades("LOLC.N0000");
await cse.getDailyMarketSummary();
```

Announcements:

```ts
await cse.getNewListingsAnnouncements();
await cse.getBuyInBoardAnnouncements();
await cse.getApprovedAnnouncements();
await cse.getCovidAnnouncements();
await cse.getFinancialAnnouncements();
await cse.getCircularAnnouncements();
await cse.getDirectiveAnnouncements();
await cse.getNonComplianceAnnouncements();
await cse.getCompanyAnnouncements("LOLC.N0000");
await cse.getAnnouncement(37911);
await cse.getCorporateAnnouncementCategories();
await cse.getSmdCategories();
```

Chart periods are intentionally limited to the values observed working against the current CSE backend:

```ts
type ChartPeriod = 1 | 7 | 30 | 90 | 365;
```

Public CSE website content:

```ts
await cse.getNews({ type: "CN", top: false });
await cse.getTopNews({ type: "CN", numberOfRecord: 3 });
await cse.getEvents({ eventType: "OT", year: 2026 });
await cse.getTopEvents({ eventType: "OT", year: 2026, numberOfRecord: 3 });
await cse.getEducationalVideos();
await cse.getNotifications();
```

Useful discovered parameter values:

- `getMarketChart(index, period)`: `index` is `"ASPI"` or `"SNP_SL_20"`.
- `getNews(...)`: observed `type` values are `"CN"` for CSE notices, `"BN"` for business news, and `"MR"` for market reports.
- `getEvents(...)`: observed `eventType` value is `"OT"`.
- `getCompanyAnnouncements(symbol)`: use full security symbols such as `"LOLC.N0000"`.

## Raw to Client Mapping

This table is for orientation when comparing CSE's upstream web endpoints to this package's normalized API. Application code should prefer the client methods.

| Upstream CSE endpoint | Client method | Useful params | Normalized shape |
| --- | --- | --- | --- |
| `marketStatus` | `getMarketStatus()` | none | `MarketStatus` |
| `marketSummery` | `getMarketSummary()` | none | `MarketSummary` |
| `aspiData` | `getAspi()` | none | `IndexData` |
| `snpData` | `getSnpSriLanka20()` | none | `IndexData` |
| `allSectors` | `getSectors()` | none | `Sector[]` |
| `chartData` | `getMarketChart(index, period)` | `index: "ASPI" \| "SNP_SL_20"`, `period` | `MarketChart` |
| `companyInfoSummery` | `getCompany(symbol)` | full symbol, e.g. `LOLC.N0000` | `Company` |
| `companyChartDataByStock` | `getCompanyChart(symbol, period)` | full symbol, `period` | `CompanyChart` |
| `allSecurityCode` | `getSecurityCodes()` | none | `SecurityCode[]` |
| `cntSecurity` | `getSecurities()` | none | `Security[]` |
| `todaySharePrice` | `getTodayPrices()` | none | `PriceRow[]` |
| `topGainers` | `getTopGainers()` | none | `PriceRow[]` |
| `topLooses` | `getTopLosers()` | none | `PriceRow[]` |
| `mostActiveTrades` | `getMostActiveTrades()` | none | `PriceRow[]` |
| `tradeSummary` | `getTradeSummary()` | none | `TradeSummaryRow[]` |
| `detailedTrades` | `getDetailedTrades(symbol?)` | optional full symbol | `DetailedTradeRow[]` |
| `dailyMarketSummery` | `getDailyMarketSummary()` | none | object rows |
| `approvedAnnouncement` | `getApprovedAnnouncements()` | none | `Announcement[]` |
| `getFinancialAnnouncement` | `getFinancialAnnouncements()` | none | `Announcement[]` |
| `getNewListingsRelatedNoticesAnnouncements` | `getNewListingsAnnouncements()` | none | `Announcement[]` |
| `getBuyInBoardAnnouncements` | `getBuyInBoardAnnouncements()` | none | `Announcement[]` |
| `getCOVIDAnnouncements` | `getCovidAnnouncements()` | none | `Announcement[]` |
| `circularAnnouncement` | `getCircularAnnouncements()` | none | `Announcement[]` |
| `directiveAnnouncement` | `getDirectiveAnnouncements()` | none | `Announcement[]` |
| `getNonComplianceAnnouncements` | `getNonComplianceAnnouncements()` | none | `Announcement[]` |
| `getAnnouncementByCompany` | `getCompanyAnnouncements(symbol)` | full symbol | `Announcement[]` |
| `getAnnouncementById` | `getAnnouncement(announcementId)` | announcement ID | `AnnouncementDetail` |
| `corporateAnnouncementCategory` | `getCorporateAnnouncementCategories()` | none | `CorporateAnnouncementCategory[]` |
| `smd/categories` | `getSmdCategories()` | none | `string[]` |
| `news/web` | `getNews(options)` / `getTopNews(options)` | `type`, `top`, `year`, `security`, `numberOfRecord` | `NewsItem[]` |
| `events` / `events/top` | `getEvents(options)` / `getTopEvents(options)` | `eventType`, `year`, `numberOfRecord` | `EventItem[]` |
| `educationalVideos` | `getEducationalVideos()` | none | `EducationalVideo[]` |
| `notifications` | `getNotifications()` | none | `WebsiteNotification[]` |

## Raw Escape Hatch

Use `raw()` only when debugging upstream behavior or testing an endpoint that is not normalized yet.

```ts
const raw = await cse.raw("companyInfoSummery", {
  symbol: "LOLC.N0000",
});
```

The raw endpoint names are not part of the clean public API. Prefer the typed methods above for application code.

## Errors

The client raises typed errors:

- `CseApiError`: network failure, non-2xx response, or invalid JSON
- `CseEmptyDataError`: upstream returned a shape that cannot satisfy the normalized method
- `CseValidationError`: invalid client-side input, such as an unsupported chart period

```ts
import { CseApiError, CseClient } from "cse-api";

const cse = new CseClient({ timeoutMs: 60_000 });

try {
  await cse.getCompanyChart("LOLC.N0000", 1);
} catch (error) {
  if (error instanceof CseApiError) {
    console.error(error.endpoint, error.status, error.body);
  }
  throw error;
}
```

## TypeSpec

The normalized API contract lives in `tsp/main.tsp`.

```bash
npm run typespec:compile
```

The generated OpenAPI output is a description of this package's clean API surface. It is not a direct description of the raw CSE backend.

TypeSpec is not required to use the client library. It is a development tool for maintaining the contract and generated OpenAPI description. For day-to-day client changes, the TypeScript source and tests are the primary workflow; run TypeSpec when you change the public API surface or want to validate the contract.

## Development

```bash
npm install
npm run check
npm run build
```

Scripts:

- `npm run typecheck`: TypeScript type check
- `npm test`: mocked unit tests
- `npm run typespec:compile`: compile the TypeSpec contract
- `npm run check`: run all validation
- `npm run build`: emit `dist/`
- `npm run demo:stable`: run the live stable API demo

## Repository Layout

```text
src/              TypeScript client implementation
test/             Mocked unit tests
examples/         Runnable live API demos
tsp/              TypeSpec contract for the clean API
dist/             Generated package output, ignored by git
tsp-output/       Generated OpenAPI output, ignored by git
```

## Attribution

Early raw endpoint discovery was based on work from [`GH0STH4CKER/Colombo-Stock-Exchange-CSE-API-Documentation`](https://github.com/GH0STH4CKER/Colombo-Stock-Exchange-CSE-API-Documentation). Credit to that project for mapping the first usable set of CSE web endpoints.

This repository is not maintained as a fork. Its purpose is a separate Node.js/TypeScript package with a TypeSpec-described, normalized API surface.

## Disclaimer

The CSE web API is unofficial, undocumented, and can change without notice. Use this package responsibly and verify market data against official CSE sources before relying on it.
