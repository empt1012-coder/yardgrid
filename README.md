# Bloom & Bed Garden

A static garden planner. You can lay out beds on a 1-foot grid, and you can arrange flowers and plants on a photo of your space. Plant counts, days, and frost dates come from the extension pages in `SOURCES.md`.

The public site stays at https://yardgrid.netlify.app until a domain is connected. The address lives in `js/config.js` as `SITE_URL`. The GitHub repo and the Netlify project are still named yardgrid. Saved gardens use the same browser keys as before so older files still open.

## Open it

Double-click `index.html`.

Photos and saved gardens are more reliable through a local page than a `file://` tab. In this folder, run:

```
powershell -ExecutionPolicy Bypass -File .\Serve.ps1
```

Then open http://127.0.0.1:8787/

`plan.html?demo=1` loads a sample bed on a drawn yard, not a real photo. The brown line in that drawing is 6 feet if you want to try Set scale.

## What is placeholder

- “Buy seeds” goes to `#affiliate-placeholder`. A code comment in the planner marks where a real affiliate link would go. Nothing is joined yet.
- Contact is `hello@example.com`.
- Footer social links are `#`.
- Ad spots are HTML comments only. There is no ad code.
- The planned domain is not connected. Do not treat `RESEARCH.md` name ideas as the live site name. The visitor-facing name is Bloom & Bed Garden.

## Plus (test mode)

Cloud save is optional. The tools stay free. Sign-in is Netlify Identity. Gardens and pictures are stored with Netlify Blobs through a function. Stripe Checkout and the customer portal run only with test keys in the Netlify environment (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`). Those keys are not in this repo. The function refuses a key that does not start with `sk_test_`.

## What is next

Emilio decides on a domain, affiliate sign-ups, and analytics. The live copy is the Netlify site above. The original Scene Board folder was only read.

The source is at https://github.com/empt1012-coder/yardgrid.
