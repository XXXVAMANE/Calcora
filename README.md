- 👋 Hi, I’m @XXXVAMANE
- 👀 I’m interested in programming games and ai for pc.
- 🌱 I’m currently learning program in visual studio.
- 💞️ I’m looking to learn about AI and also AI modeling.

# Calcora

A bilingual demonstration store for physical scientific calculators. The storefront uses a dark charcoal/lavender design, a four-model collection, dedicated product pages, filters and a browser-persisted shopping bag. English is the default; the top-right EN/RU switch preserves the page. Astro, TypeScript, and locally hosted fonts.

The three conventional models are Casio fx-300ES PLUS, Casio fx-991CW and TI-30X IIS. Their prices are examples and their visuals are original stylized illustrations, not product photographs. Confirm exact regional editions, manufacturer specifications, photography rights, stock and final prices before selling. These Casio/TI devices do not contain AI. Calcora AI One is an unavailable future hardware concept; it cannot be added to the bag.

The bag supports quantities (1–20 per model), removal, totals and persistence across both languages. Preview checkout explicitly reports that no order/payment is submitted. No payment details or delivery addresses are collected. Product markup omits demo offers, reviews and inventory claims; the AI concept and account pages are excluded from indexing. Existing online calculator pages and the AI explanation endpoint remain available as an optional website companion, distinct from embedded hardware AI.

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

Copy `.env.example` to `.env`, then set `OPENAI_API_KEY` securely on the server. The key stays server-side. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. `npm start` serves the built pages and the `/api/explain` endpoint; the Astro development server and manual static uploads only support local calculations. Netlify repository deploys include the serverless function at the same endpoint.

The endpoint sends the selected calculation to OpenAI only when the visitor requests an explanation. Missing configuration returns HTTP 503 with a clear message in the UI. Numeric calculations use explicit local formulas; they are never presented as AI-generated output. The demo limits are 60 explanations per day and two concurrent requests per running instance. Netlify can start multiple instances and reset counters; these limits are not an account-wide spending cap. Live provider responses have not been validated without credentials.

### Enable AI on Netlify

After merging this change into `main`, Netlify deploys `netlify/functions/explain.mjs` automatically. In **Project configuration → Environment variables**, add `OPENAI_API_KEY` as a secret, available to **Functions** in **Production**. Do not use a `PUBLIC_` prefix or commit the value. `OPENAI_MODEL` is optional (default `gpt-4.1-mini`). Redeploy after changing variables. Deploy previews deliberately return `AI_NOT_CONFIGURED`.

Create the key in an OpenAI API project with billing enabled; a ChatGPT subscription does not include API usage. Set a project budget alert and provider rate limits before sharing the public AI button. Budget alerts do not guarantee a hard spending cap. Test the button in English and Russian after deployment. Live provider calls require your key and have not been tested in this workspace.

## Email accounts with Supabase

Pages `/account/` and `/ru/account/` support sign-up, email confirmation, password sign-in, sign-out and password recovery. Account pages are excluded from indexing and the sitemap. AI usage is still public. Store accounts do not yet have per-user AI limits, orders, saved calculations or payments.

In Supabase, enable the Email provider and email confirmation. Set Site URL to `https://calcora-ai.netlify.app` and add the exact redirect URL `https://calcora-ai.netlify.app/account/` (both languages use this callback). For real users, configure your own SMTP under Authentication → Emails: the default Supabase email service restricts recipient addresses to your project team and has low sending limits. Keep confirmation enabled.

In Netlify, add these **public, browser-safe** variables available during production builds:

- `PUBLIC_SUPABASE_URL`: the Supabase project HTTPS URL.
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key (`sb_publishable_…`) from Supabase API Keys. Never use a secret key (`sb_secret_…`) or `service_role` key.

Redeploy after changing either variable. These public values are intentionally included in browser code; row-level security is required for any future user tables. No database tables, privileged database credentials or migrations are needed for this auth-only change. Missing variables show an honest unavailable message and leave calculators working. For local development, add the values to `.env`, add your local account callback to Supabase Redirect URLs, then rebuild/restart. Browser sessions are managed by the official Supabase client, including refresh and email callback handling. Sign out on shared devices.

Validation uses a fake Supabase project and intercepted requests; it does not create real users or send emails. Live email delivery, confirmation, password recovery and sign-in must be checked after configuration. A password-recovery link opens the English account page; the language switch preserves the signed-in session.

To run the account browser flows with the fake project (use the same variables for both build and tests):

```sh
PUBLIC_SUPABASE_URL=https://calcora-test.supabase.co PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npm run build
PUBLIC_SUPABASE_URL=https://calcora-test.supabase.co PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npm run test:ui
```

Rebuild with your own production variables before publishing; the fixture values are for tests only.

## SEO and publication

For automatic Netlify deploys, connect this repository to the existing Netlify project and select the `main` branch. `netlify.toml` sets the build command, output folder, and Node.js version. On Netlify, SEO URLs use the primary production domain supplied by Netlify (`URL`), so a project rename or primary-domain change is reflected after the next production build. Deploy previews and branch deploys are excluded from indexing.

Keep the Google Search Console verification HTML file in `public/` before switching from manual uploads to repository builds. The verification file uploaded by the site owner is tracked there and preserved by builds. Downloaded verification files can be copied into `public/` unchanged, then committed.

Set `PUBLIC_SITE_URL` in `.env` to the real HTTPS origin and rebuild. Until a domain is configured, the demo deliberately uses `noindex` and `robots.txt` disallows indexing. With a domain, the build produces:

- Static HTML with localized titles, descriptions, and a single H1.
- Canonical URLs and reciprocal English/Russian `hreflang`, with English as `x-default`.
- `sitemap.xml`, `robots.txt`, Open Graph and Twitter metadata, and a 1200 × 630 sharing image.
- WebSite, Product and WebApplication structured data without invented reviews or ratings.

Deploy `dist/` to static hosting for local calculators, or run `npm start` on a Node.js host for AI explanations. Host the application behind HTTPS. Static hosting must support directory index pages and the custom 404 page. The Node server supports these directly.

Device prices are design examples. Accounts are connected through Supabase, but purchasing, inventory, taxes, shipping and order history are not implemented. Before selling devices, connect payments and fulfillment and publish seller details, returns and actual legal terms. Financial results are illustrative estimates with end-of-month deposits and monthly compounding; they do not predict returns.

## Validation

```sh
npm run check
npm test
npm run build
npm run test:ui
```

The UI suite uses system Chromium when available. Otherwise run `npx playwright install chromium` once, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Tests cover English/Russian routes, product filtering, cart persistence and totals, concept exclusions, online calculators, AI-unavailable feedback, mocked account flows, mobile navigation, metadata and 404 responses. The UI suite starts a separate server on port 4322.

Store copy and products: `src/data/shop.ts`. Storefront: `src/components/Landing.astro`. Illustrations: `src/components/Device.astro`. Dark theme: `src/styles/shop.css`. Cart: `src/scripts/shop.ts`. Existing online tool copy: `src/data/i18n.ts`. Expression parser: `src/scripts/math.ts`. Optional AI server: `server.mjs`.

## По-русски

Основной язык — английский. Русская версия находится в `/ru/`, переключатель EN/RU расположен справа вверху и сохраняет текущую страницу. Четыре калькулятора работают локально; ИИ-объяснения требуют серверного ключа `OPENAI_API_KEY`. Для индексации укажите настоящий домен в `PUBLIC_SITE_URL` и пересоберите сайт. Каталог физических устройств и цены демонстрационные, оплата и доставка не подключены. Обычные Casio и TI не имеют встроенного ИИ; Calcora AI One — будущий аппаратный концепт.
