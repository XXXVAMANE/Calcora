- 👋 Hi, I’m @XXXVAMANE
- 👀 I’m interested in programming games and ai for pc.
- 🌱 I’m currently learning program in visual studio.
- 💞️ I’m looking to learn about AI and also AI modeling.

# Calcora

A bilingual AI calculator product website. English is the default; the EN/RU switch at the top right navigates to fully translated Russian pages. Built with Astro, TypeScript, and locally hosted fonts.

## Run locally

Requires Node.js 22.16 or newer (Node 24 recommended).

```sh
npm ci
npm run dev
```

The development server uses port 4321. Scientific math, finance, percentages, and unit conversions work locally without an account or an API key. The optional AI endpoint is available with the production server:

```sh
npm run build
npm start
```

## Optional AI explanations

Copy `.env.example` to `.env`, then set `OPENAI_API_KEY` securely on the server. The key stays server-side. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. `npm start` serves the built pages and the `/api/explain` endpoint; development/static hosting only supports local calculations.

The endpoint sends the selected calculation to OpenAI only when the visitor requests an explanation. Missing configuration returns HTTP 503 with a clear message in the UI. Numeric calculations use explicit local formulas; they are never presented as AI-generated output. The server has a demo limit of 60 explanations per day and two concurrent requests. Live provider responses have not been validated without credentials.

## SEO and publication

Set `PUBLIC_SITE_URL` in `.env` to the real HTTPS origin and rebuild. Until a domain is configured, the demo deliberately uses `noindex` and `robots.txt` disallows indexing. With a domain, the build produces:

- Static HTML with localized titles, descriptions, and a single H1.
- Canonical URLs and reciprocal English/Russian `hreflang`, with English as `x-default`.
- `sitemap.xml`, `robots.txt`, Open Graph and Twitter metadata, and a 1200 × 630 sharing image.
- WebSite and WebApplication structured data without invented reviews or ratings.

Deploy `dist/` to static hosting for local calculators, or run `npm start` on a Node.js host for AI explanations. Host the application behind HTTPS. Static hosting must support directory index pages and the custom 404 page. The Node server supports these directly.

Subscription prices and paid features are design examples. Payments, accounts, billing, history, and PDF export are not implemented. Before selling subscriptions, connect a payment provider and account system, replace the proposed plans with real offers, and publish seller details and actual legal terms. Financial results are illustrative estimates with end-of-month deposits and monthly compounding; they do not predict returns.

## Validation

```sh
npm run check
npm test
npm run build
npm run test:ui
```

The UI suite uses system Chromium when available. Otherwise run `npx playwright install chromium` once, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Tests cover English/Russian routes, filtering, all calculators, invalid expressions, AI-unavailable feedback, pricing toggles, mobile navigation, metadata, and 404 responses. The UI suite starts a separate server on port 4322.

Translations and tool descriptions: `src/data/i18n.ts`. Main page: `src/components/Landing.astro`. Shared styles: `src/styles/global.css`. Expression parser: `src/scripts/math.ts`. Optional AI server: `server.mjs`.

## По-русски

Основной язык — английский. Русская версия находится в `/ru/`, переключатель EN/RU расположен справа вверху и сохраняет текущую страницу. Четыре калькулятора работают локально; ИИ-объяснения требуют серверного ключа `OPENAI_API_KEY`. Для индексации укажите настоящий домен в `PUBLIC_SITE_URL` и пересоберите сайт. Тарифы пока демонстрационные, оплата не подключена.
