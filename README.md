# The Stitch Bloom storefront

The existing Vite/React storefront now includes customer accounts, saved delivery details, a PostgreSQL-backed catalogue and order history, Paystack checkout, and a protected owner dashboard. The visual work uses the original Stitch Bloom tokens and components in `src/styles`.

## What is included

- Customer sign-up, email OTP confirmation, sign-in, forgot/reset-password,
  secure HTTP-only sessions, and delivery profiles. bcrypt applies a fresh salt
  at cost 12 to every password hash, and a reset invalidates older sessions.
- Server-complete Google and Apple authorization-code flows with PKCE/state,
  nonce and verified ID-token checks. Their controls remain absent until the
  provider credentials are complete and `AUTH_OAUTH_UI_ENABLED=true`.
- FCT delivery at ₦5,500 and delivery to every other Nigerian state at ₦14,000.
- Server-priced Paystack checkout. Product prices, quantities, availability, and delivery are recalculated from PostgreSQL; the browser cannot set the amount.
- Paystack callback verification plus HMAC-SHA512 webhook verification.
- Separate gateway and local payment-attempt states, daily stale-attempt
  reconciliation, and owner review for payments completed after cancellation.
- Order and line-item snapshots, payment references, transaction IDs, channels, gateway responses, and fulfilment statuses.
- Owner catalogue tools for adding, editing, hiding, or removing products and collections.
- Static catalogue fallback while the database/API is unavailable, so local design work can still run with plain `npm run dev`.

## Local setup

Requirements: Node.js 22+ and a PostgreSQL database reachable over TLS.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace every placeholder. Keep `.env.local` out of Git.

3. Create the schema and seed the current catalogue:

   ```sh
   npm run db:migrate
   ```

4. Start the storefront:

   ```sh
   npm run dev
   ```

Vite does not execute the `/api` functions during plain local development. Use a Vercel preview deployment for full checkout testing, or install the Vercel CLI and run `vercel dev`.

## Vercel deployment

GitHub Pages can still render the old static build, but it cannot safely hold `PAYSTACK_SECRET_KEY`, authenticate users, receive Paystack webhooks, or connect to the order database. Deploy this version as a Vite project on Vercel.

1. Import the repository in Vercel. `vercel.json` supplies the Vite build and `dist` output configuration.
2. Add a managed PostgreSQL database from the Vercel Marketplace, or use another PostgreSQL provider. Add its pooled connection string as `DATABASE_URL`.
3. Add all variables from `.env.example` in Project Settings → Environment Variables. Scope them per environment: the Paystack **test** keys on Preview and Development, the **live** keys on Production, and `APP_URL` on Production only. `APP_URL` must be the exact production origin without a trailing slash.
   Set `CRON_SECRET` in Production as well; Vercel sends it automatically when
   invoking the reconciliation endpoint.

   Account codes and password recovery use Resend. Add `RESEND_API_KEY` and a
   verified `AUTH_EMAIL_FROM` sender to activate them. Until both are present,
   sign-up keeps its current password flow and the recovery link stays absent,
   so an email-provider setup issue cannot lock customers out.
4. Pull the production environment locally and run the migration before opening the shop:

   ```sh
   vercel env pull .env.local
   npm run db:migrate
   ```

5. Deploy. In Paystack, set the webhook URL to:

   ```text
   https://YOUR-DOMAIN/api/payments/webhook
   ```

   Checkout supplies `https://YOUR-DOMAIN/api/payments/verify?callback=1` per transaction, so the dashboard callback URL is optional.

6. Create a normal account from **Menu → Account → Create account** using the exact address configured as `ADMIN_EMAIL`. There is deliberately no owner control or setup code on the public website. Pull the production environment and assign the role from the trusted server-side script:

   ```sh
   vercel env pull .env.local --environment=production
   npm run admin:promote
   ```

   Sign out and back in after promotion. The account link in the menu will then open the owner dashboard. The promotion command also removes owner access from any previous admin account, making an email transfer explicit and safe.

The checkout uses Paystack's hosted authorization URL, so only `PAYSTACK_SECRET_KEY` is needed at runtime. `VITE_PAYSTACK_PUBLIC_KEY` is safe to expose and the redirect flow does not spend it; the storefront reads its `pk_test_`/`pk_live_` prefix to decide whether to show the test-mode notice.

## Account email and social sign-in

Email verification and password recovery reuse the existing account card. Codes
are six digits, expire after ten minutes, are single-use, are stored only as an
HMAC digest, allow five attempts, and are resend-rate-limited by email and a
hashed network address. Password-reset requests always return the same public
message whether or not an account exists.

For Google, register this production redirect URI:

```text
https://thestitchbloom.com/api/auth/google-callback
```

For Sign in with Apple, create a Services ID and register:

```text
https://thestitchbloom.com/api/auth/apple-callback
```

Set the corresponding `GOOGLE_*` or `APPLE_*` server variables. Keep
`AUTH_OAUTH_UI_ENABLED=false` while provider review, domains, keys, and callback
registration are incomplete. Setting it to `true` reveals only providers whose
full server configuration is present; no rebuild is required.

## Test and live payments

The deployment decides its payment mode from the Paystack key it holds, so promoting a preview to production needs no code change:

| | Preview / Development | Production |
| --- | --- | --- |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` | `sk_live_…` |
| `VITE_PAYSTACK_PUBLIC_KEY` | `pk_test_…` | `pk_live_…` |
| `APP_URL` | unset | `https://thestitchbloom.com` |
| Paystack callback | the preview's own URL | `APP_URL` |
| Storefront | test-mode notice with the test card | no notice |

Three guards keep a preview from touching the live shop, which matters because every environment shares one database:

- A `sk_live_` key is refused outright on Preview and Development.
- Orders and payment attempts record `payment_mode`. Test orders are listed in the owner dashboard with a **test** flag but excluded from its revenue, paid, and open-fulfilment figures.
- A test payment never moves `stock_quantity`, in either direction, so testing cannot sell out a real product.

Each mode has its own callback and webhook fields in the Paystack dashboard, under **Settings → API Keys & Webhooks** with the test/live toggle switched accordingly.

Test-key deployments also expose a **Test delivery** rate of ₦50, Paystack's
minimum NGN transaction amount. The server rejects that rate when using a live
key, so it cannot discount a production order.

The **callback URL** field can be left blank in both modes. Checkout sends `callback_url` on every `/transaction/initialize` call, and a per-transaction value overrides the dashboard, which is exactly what lets a preview receive its own redirects.

The **webhook URL** does have to be set per mode, because Paystack calls it server to server with no request to derive an origin from:

| Mode | Webhook URL |
| --- | --- |
| Test | `https://stitch-bloom-preview.vercel.app/api/payments/webhook?x-vercel-protection-bypass=SECRET` |
| Live | `https://thestitchbloom.com/api/payments/webhook` |

`stitch-bloom-preview.vercel.app` is a stable alias, so the webhook URL survives redeploys. Repoint it after each preview build:

```sh
vercel deploy
vercel alias set <new-deployment-url> stitch-bloom-preview.vercel.app
```

Deployment Protection covers every `.vercel.app` URL on this project, so an unauthenticated Paystack webhook is redirected to the Vercel login page and never reaches the function. `SECRET` above is the project's **Protection Bypass for Automation** secret from Settings → Deployment Protection; passing it as a query parameter lets the webhook through while previews stay private in the browser. The redirect back from Paystack needs nothing extra, since it travels in a browser that already holds the Vercel session cookie.

## Catalogue images

Images are uploaded from the owner dashboard and stored in Vercel Blob. Nothing needs to be committed to the repository to add a product photo.

**Uploading.** In **Products & collections**, open a product and drop files onto the Images panel, or use **Site images** for the four design slots (landing hero video, brand strip, About hero, About craft). Uploads go straight from the browser to Blob storage, so a full-size camera photo is not limited by the 4.5MB function request cap. `BLOB_READ_WRITE_TOKEN` is provisioned automatically by the Blob store integration.

**Framing.** The site renders the same image at four different shapes, listed in `src/utils/imageContexts.js`:

| Context | Ratio | Where it appears |
| --- | --- | --- |
| Product card | 4 / 5 | Shop grid, gallery, bag, order summaries, About |
| Home carousel | 100 / 164 | The diagonal carousel on the landing page |
| Thumbnail | 1 / 1 | Product detail thumbnail strip |
| Wide banner | 16 / 9 | Brand strip and full-bleed sections |

The crop button on any image opens a framing dialog that draws all four frames over the picture at once, sharing a fixed centre, so the trade-off between shapes is visible in one view. Drag to reposition the selected frame, zoom up to 3×, and the live previews below show the true result at each ratio. Crops are stored as `{ x, y, zoom }` per context on the `image_assets` row and applied at render with `object-position` — one upload, no duplicate files, and no server-side image pipeline.

Framing precedence is: a saved crop, then the product's legacy `imageFocalPoints` entry, then a plain centred cover.

**Existing images.** `npm run images:migrate` uploads any product image still pointing at `public/images/...`, rewrites the catalogue and order-item rows to the Blob URLs, and is safe to re-run — it skips anything already on `https://`. The files under `public/images/products/` are deliberately kept: `src/data/products.js` is the offline fallback catalogue used when the API is unreachable, and it still references those paths.

**Site asset slots.** Every image on the site that is not a product photograph is replaceable from **Site images**, listed in `src/utils/siteAssets.js`: the landing hero video, brand strip and three category tiles, the About hero and craft images, the sign-in image, the navbar logo, and the social share image.

A slot marked **Default** is showing the image built into the theme and can simply be swapped. A slot marked **Empty** has no default and renders nothing at all until filled, so the page degrades to its background instead of a missing-file icon.

**Products whose photos live in a colourway.** Some products carry no base images and keep every photograph inside a colourway. `primaryImageOf` in `src/utils/productImage.js` resolves the tile image for those — base images first, then the first colourway that has one — and every single-image surface (shop card, carousel, navbar search, dashboard row) goes through it. Reading `images[0]` directly will render a broken image for those products.

## Verification commands

```sh
npm run lint
npm run build
```

Never fulfil an order from a browser redirect alone. The implementation only marks an order paid after Paystack verification reports `success` and the returned amount and currency match the server-side order total.

Customer cancellation closes the attempt only in the site's local lifecycle;
it does not rewrite Paystack's gateway result. The owner dashboard therefore
shows order, aggregate payment, gateway-attempt, and local-attempt states
separately. A verified payment that arrives after local cancellation or expiry
enters `paid_after_cancel_review` and must be accepted for fulfilment or refunded
by the owner. Pending attempts are rechecked when order history is loaded and by
the daily `/api/cron/reconcile-payments` job; active attempts older than
`PAYMENT_ATTEMPT_TTL_HOURS` (24 by default) become locally expired.
