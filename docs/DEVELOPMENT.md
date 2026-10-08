# Development and deployment

[Back to the portfolio overview](../README.md)

The storefront now offers one supplier-made AI camera calculator for a **$280 preorder**, with planned delivery and pickup in Orlando. Numvori is the reseller, not the manufacturer. The device has built-in AI, a rear camera and a built-in display; resolution, provider support, power/network requirements and arrival date await verification.

Checkout remains Stripe sandbox only. It does not submit actual preorders, charge real money or reserve inventory. The server catalog contains only `ai-camera-calculator` at 28000 USD cents; legacy conventional models are reference-only and cannot be purchased. Existing guide links keep their reference pages, which are noindex and excluded from the sitemap. The old AI concept URL redirects to the new product URL. Website illustrations are not supplier photographs.

## Windows development (PowerShell)

Use Node.js 24. The existing npm scripts and Playwright server command use Unix-style environment assignments. Use these commands for local development without changing PowerShell's execution policy:

```powershell
npm.cmd ci
$env:ASTRO_TELEMETRY_DISABLED = "1"
npx.cmd astro dev
```

For a production-style local server with the optional API endpoints, stop the development server first, then run:

```powershell
npx.cmd astro build
$env:NODE_USE_ENV_PROXY = "1"
node --env-file-if-exists=.env server.mjs
```

For type checks and unit/API tests:

```powershell
npx.cmd astro check
npm.cmd test
```

Run the UI suite from Git Bash using the Unix commands below until its server command is made portable. The repository's `.npmrc` uses a cloud-workspace cache path; if it causes a local permissions issue, override it with `npm.cmd ci --cache "$env:LOCALAPPDATA\npm-cache"`.

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

The endpoint sends the selected calculation to OpenAI only when the visitor requests an explanation. Missing configuration returns HTTP 503 with a clear message in the UI. Numeric calculations use explicit local formulas; they are never presented as AI-generated output. The demo limits are 60 explanations per day and two concurrent requests per running instance. Netlify can start multiple instances and reset counters; these limits are not an account-wide spending cap. Automated tests use mocked provider responses; check the configured service separately.

### Enable AI on Netlify

After merging this change into `main`, Netlify deploys `netlify/functions/explain.mjs` automatically. In **Project configuration → Environment variables**, add `OPENAI_API_KEY` as a secret, available to **Functions** in **Production**. Do not use a `PUBLIC_` prefix or commit the value. `OPENAI_MODEL` is optional (default `gpt-4.1-mini`). Redeploy after changing variables. Deploy previews deliberately return `AI_NOT_CONFIGURED`.

Create the key in an OpenAI API project with billing enabled; a ChatGPT subscription does not include API usage. Set a project budget alert and provider rate limits before sharing the public AI button. Budget alerts do not guarantee a hard spending cap. Test the button in English and Russian after deployment. Live provider calls require your configured API project.

## Email accounts with Supabase

Pages `/account/` and `/ru/account/` support sign-up, email confirmation, password sign-in, sign-out and password recovery. Account pages are excluded from indexing and the sitemap. AI usage is still public. Store accounts do not yet have per-user AI limits, orders, saved calculations or payments.

In Supabase, enable the Email provider and email confirmation. Set Site URL to `https://numvori.com` and add the exact redirect URL `https://numvori.com/account/` (both languages use this callback). For real users, configure your own SMTP under Authentication → Emails: the default Supabase email service restricts recipient addresses to your project team and has low sending limits. Keep confirmation enabled.

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

For automatic Netlify deploys, connect this repository to the existing Netlify project and select the `main` branch. `netlify.toml` sets the build command, output folder, and Node.js version. Production SEO uses `https://numvori.com` from the shared `lib/site.mjs` configuration; local builds use `PUBLIC_SITE_URL` and preview builds remain noindex. Deploy previews and branch deploys are excluded from indexing.

Keep the Google Search Console verification HTML file in `public/` before switching from manual uploads to repository builds. The verification file uploaded by the site owner is tracked there and preserved by builds. Downloaded verification files can be copied into `public/` unchanged, then committed.

Set `PUBLIC_SITE_URL` in `.env` to the real HTTPS origin and rebuild. Until a domain is configured, the demo deliberately uses `noindex` and `robots.txt` disallows indexing. With a domain, the build produces:

- Static HTML with localized titles, descriptions, and a single H1.
- Canonical URLs and reciprocal English/Russian `hreflang`, with English as `x-default`.
- `sitemap.xml`, `robots.txt`, Open Graph and Twitter metadata, and a 1200 × 630 sharing image.
- WebSite, Product and WebApplication structured data without invented reviews or ratings.

Deploy `dist/` to static hosting for local calculators, or run `npm start` on a Node.js host for AI explanations. Host the application behind HTTPS. Static hosting must support directory index pages and the custom 404 page. The Node server supports these directly.

The preorder device price is $280. Accounts are connected through Supabase, but real purchasing, inventory, taxes, shipping and account order history are not implemented. Before selling devices, connect payments and fulfillment and publish seller details, returns and actual legal terms. Financial results are illustrative estimates with end-of-month deposits and monthly compounding; they do not predict returns.

## Validation

```sh
npm run check
npm test
npm run build
npm run test:ui
```

The UI suite uses system Chromium when available. Otherwise run `npx playwright install chromium` once, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Tests cover English/Russian routes, single-product preorder, cart persistence and totals, archived-product exclusions, online calculators, AI-unavailable feedback, mocked account flows, mobile navigation, metadata and 404 responses. The UI suite starts a separate server on port 4322.

Store copy and products: `src/data/shop.ts`. Storefront: `src/components/Landing.astro`. Illustrations: `src/components/Device.astro`. Dark theme: `src/styles/shop.css`. Cart: `src/scripts/shop.ts`. Existing online tool copy: `src/data/i18n.ts`. Expression parser: `src/scripts/math.ts`. Optional AI server: `server.mjs`.

## По-русски

Основной язык — английский. Русская версия находится в `/ru/`, переключатель EN/RU расположен справа вверху и сохраняет текущую страницу. Четыре калькулятора работают локально; ИИ-объяснения требуют серверного ключа `OPENAI_API_KEY`. Для индексации укажите настоящий домен в `PUBLIC_SITE_URL` и пересоберите сайт. Цена предзаказа — $280; оплата доступна только в Stripe sandbox, реальная доставка не подключена. Обычные Casio и TI остаются справочными моделями. Предзаказ одного ИИ-калькулятора с камерой — $280; Numvori перепродаёт устройство, доставка и самовывоз в Орландо планируются.

## USD checkout for the United States (Stripe sandbox)

Create a Stripe account and open a **Sandbox** / **Test mode**. In Netlify environment variables add `STRIPE_SECRET_KEY` as a secret available to production Functions, using the sandbox secret key beginning `sk_test_`. Keep existing OpenAI and Supabase variables. Redeploy. This implementation deliberately rejects live keys while preorder fulfillment and live purchasing are not configured. Do not enter a key in chat, frontend code or Git.

`/api/checkout` creates a hosted Stripe Checkout session using the shared server catalog in `lib/catalog.json`, USD, card payments and US-only shipping addresses. Client prices and return URLs are ignored; unknown/archived products, duplicates, noninteger quantities and quantities outside 1–20 are rejected. Requests have size bounds and a provider timeout. A stable UUID per unchanged cart provides Stripe idempotency for retries. Preview deployments do not contact Stripe.

Success and cancellation pages exist in both languages and are noindex/excluded from the sitemap. Success verifies the Checkout session with Stripe; a success URL alone never confirms payment. Only a verified paid/complete test purchase clears its matching browser cart snapshot, once. Failed or cancelled payment preserves the cart. Stripe stores the test payment, items, email and shipping information even if the browser does not return. No separate Supabase order table, webhook, automated fulfillment, account order history or real payment processing is implemented. The seller reviews test payments in the Stripe sandbox Dashboard.

For a sandbox purchase use Stripe’s test card **4242 4242 4242 4242**, a future expiry, any three-digit CVC, and fictitious US customer details. The zero-dollar shipping option is explicitly simulated; it is not a promise of free real shipping. Taxes are not calculated in this sandbox. Live sales require actual prices/stock, shipping/tax configuration, seller/return terms and a verified merchant account; durable webhook-based fulfillment must be implemented before automatically processing real orders.

Local test checkout needs `STRIPE_SECRET_KEY=sk_test_…` in ignored `.env`, plus `PUBLIC_SITE_URL=http://localhost:4321`; rebuild and restart `npm start`. Never publish the fake browser-test Supabase values. API and browser tests mock Stripe and do not make real provider requests. Check a real sandbox round trip whenever changing payment configuration.

## Interactive product presentation

The homepage progressively loads a local Three.js scene when the hero is near the viewport. It uses a procedural calculator body, raised keys, a texture atlas, studio lighting and pointer/keyboard rotation. This is a stylized product illustration, not a manufacturer CAD model. No remote 3D/CDN assets are requested. Cards use perspective and a moving highlight; section reveals and the concept illustration add scroll motion.

Touch interaction preserves vertical scrolling. Arrow keys rotate the focused scene and Escape resets it. Browsers without WebGL, lost contexts and failed imports retain the original SVG. With reduced motion enabled at load, the 3D bundle is not fetched and content remains visible. Animation stops outside the viewport or in a hidden tab, and pauses behind dialogs. Geometry instancing, a shared key atlas, a small environment map, capped resolution and adaptive frame rates reduce rendering cost. Cart, accounts and Stripe sandbox checkout are unchanged.

`tests/motion.spec.ts` exercises reduced motion, WebGL-unavailable behavior, a rendered scene, keyboard controls and context-loss fallback alongside the existing checkout/account suite.


### Buying guides and concept demonstration

The English and Russian store now links to `/scientific-calculators/` and `/guides/`. Three original editorial guides cover calculator selection, the fx-300ES PLUS vs fx-991CW comparison and AI vs conventional calculators. Articles expose their text in static HTML, use Article/BreadcrumbList JSON-LD and reciprocal language alternates. Product pages link back to relevant guides. The production sitemap contains 24 eligible URLs; account, checkout receipts and archived conventional models remain excluded and noindex. Google verification is preserved. A successful sitemap fetch does not guarantee indexing or rankings.

The showcase and five-step LCD walkthrough explain the device using prepared screens. They do not take photos, connect to hardware or invoke model APIs. Unverified model choices have been removed. The separate online explanation service continues using OpenAI. Camera resolution, supported providers, network/power requirements, pickup location, fees and preorder arrival date remain unconfirmed. Product schema does not fabricate manufacturer identity, reviews, stock or a live Offer. Real preorder payments require seller/contact details, cancellation/refund terms and confirmed fulfillment conditions before launch.

Validation: `npm run check`, `npm test`, production-domain `npm run build`, and Playwright store/checkout/guide tests. After merging, Netlify builds the updated sitemap automatically; inspect Pages/Performance in Search Console as Google processes it rather than repeatedly submitting indexing requests.


### Numvori domain migration

The production site origin is `https://numvori.com`, shared by the static build and Stripe checkout through `lib/site.mjs`. It is also documented as `PUBLIC_SITE_URL` in the production context of `netlify.toml`; Functions do not rely on TOML variables being available at runtime. A stale Netlify `URL` cannot send production checkout returns to the old domain. The legacy Netlify HTTPS and HTTP host redirects permanently to the matching path at the new origin; these forced redirects are host-specific and do not redirect deploy previews. Product/article paths, Supabase configuration and browser storage identifiers are retained. Legacy `calcora-demo` Stripe metadata and idempotency prefixes intentionally remain compatible with existing test sessions.

After the single merged production deployment, check the root, a nested Russian page, old-host redirects, canonical/hreflang URLs, robots and the 24-entry sitemap on the real domain. Supabase Site URL must be `https://numvori.com` with `https://numvori.com/account/` allowed; keep the old callback temporarily for old emails. Sessions and browser carts do not transfer automatically between domains. The registrar's DNS remains unchanged: apex A `75.2.60.5`, www CNAME `calcora-ai.netlify.app` (do not rename the Netlify project). Add the new property in Search Console and submit the new sitemap. Keep the old property; indexing/rankings take time to migrate. The Netlify edge redirect itself must be validated after deployment.
