# Bloom & Bed Garden

A static garden planner. You can lay out beds on a 1-foot grid, and you can arrange flowers and plants on a photo of your space. Plant counts, days, and frost dates come from the extension pages in `SOURCES.md`.

The public site is https://bloomandbedgarden.com. The address lives in `js/config.js` as `SITE_URL`. The GitHub repo and the Netlify project are still named yardgrid. https://yardgrid.netlify.app redirects there. Saved gardens use the same browser keys as before so older files still open.

## Open it

Double-click `index.html`.

Photos and saved gardens are more reliable through a local page than a `file://` tab. In this folder, run:

```
powershell -ExecutionPolicy Bypass -File .\Serve.ps1
```

Then open http://127.0.0.1:8787/

`plan.html?demo=1` loads a sample bed on a drawn yard, not a real photo. The brown line in that drawing is 6 feet if you want to try Set scale.

## What is placeholder

- There is no “Buy seeds” link. The planner's shopping list has a code comment where one could go once an affiliate program is approved. Nothing is joined yet.
- Contact is hello@bloomandbedgarden.com (forwarded mail).
- There are no social accounts yet, so the footer has no social links.
- Ad spots are HTML comments only. There is no ad code.
- The visitor-facing name is Bloom & Bed Garden. The live address is https://bloomandbedgarden.com.

## Plus

Cloud save is optional. The tools stay free. Sign-in is Netlify Identity. Gardens and pictures are stored with Netlify Blobs through a function. Stripe Checkout and the customer portal use keys in the Netlify environment (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PORTAL_CONFIGURATION`). Those keys are not in this repo. The function accepts test or live secret and restricted keys (`sk_test_`, `rk_test_`, `sk_live_`, `rk_live_`).

## Tests

`npm test` runs every file in `tests/`. The API test (`tests/api.test.mjs`) uses in-memory stand-ins for Blobs, Identity, and Stripe, so it needs no installs and touches nothing live.

## What is next

Emilio decides on affiliate sign-ups and analytics. The live copy is https://bloomandbedgarden.com. The original Scene Board folder was only read.

The source is at https://github.com/empt1012-coder/yardgrid.

## Fonts

Inter (text) and Fraunces (headings) are self-hosted in `fonts/` as variable WOFF2 files, Latin subset, from the Fontsource builds. Both are under the SIL Open Font License 1.1; the license texts are `fonts/OFL-Inter.txt` and `fonts/OFL-Fraunces.txt`. Nothing loads from a font CDN, so the `font-src 'self'` CSP holds.
