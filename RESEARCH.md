# Research notes for the garden planner prototype

Date: 18 November 2026. These are notes for a prototype, not a launch. No domain was checked out or bought. No affiliate program was joined.

The public name is now Bloom & Bed Garden, at https://bloomandbedgarden.com. The notes below still use the earlier working name. Do not buy another domain from these notes.

## Cloud save (19 November 2026)

Question: the simplest way to add email sign-in and per-user storage to this static Netlify site for $0 at low traffic.

Netlify Identity is supported again. A 6 September 2026 Netlify knowledge-base article says Identity is included on credit-based plans at no extra cost, and that sites should use `@netlify/identity` rather than the old widget. The 2025 deprecation was reversed in February 2026, so older “use Auth0 instead” posts are out of date. Identity is turned on in the site dashboard. There is no public API for that switch. It does not run under `netlify dev`. Confirmation mail comes from Netlify unless custom SMTP is added, and custom SMTP is a paid add-on, so this build stays on the default mail.

Netlify Blobs (`@netlify/blobs`) store one JSON garden per key and the shrunk pictures beside it. Blobs are not a database and have no access rules of their own. A function checks the Identity token and the Plus flag before it writes. A site-wide store is shared with deploy previews, so a preview must not be used to delete production gardens. The free plan includes functions and Blobs inside the monthly credit pool (300 credits on the free plan, and the site pauses when the credits run out). That cap is the cost control. It is $0 until the credits are gone.

Supabase’s pricing page lists a free tier. Starting it means a new vendor account. This task says to stop and list any step that needs a new account, so a Supabase project was not created.

Choice: Netlify Identity, Functions, and Blobs on the existing yardgrid site. No new account, and $0 at low traffic. Stripe stays on Emilio’s existing account, in test mode only, with keys in Netlify environment variables. The function rejects any secret that does not start with `sk_test_`. Going live is a later change he approves, including a code change, because a live key will not work until that rejection is removed. Automatic tax is sent as enabled on Checkout. Bank, payout, and tax settings are not changed from here.

Sources checked 19 November 2026:

- Netlify, “How to add user login to a Netlify site with Identity,” 6 September 2026: https://www.netlify.com/knowledge-base/how-to-add-user-login-to-a-netlify-site-with-identity/
- Netlify docs, “Authenticate users with Netlify Identity,” updated 3 November 2026. Free plan includes email sign-in. Custom outgoing email is Pro: https://docs.netlify.com/manage/security/secure-access-to-sites/identity/overview/
- Netlify, “Netlify + Auth0: Platform extensibility and Identity changes,” updated 19 February 2026 to say Identity stays supported: https://www.netlify.com/blog/auth0-extension-identity-changes/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Free plan is 300 credits a month with a hard pause, and the pricing page includes Blob storage: https://www.netlify.com/pricing/ and https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- https://supabase.com/pricing

## 1. Tools that already exist

The comparison pages below are publisher roundups, several of them from companies that also sell a planner. They are useful for pricing and feature claims. They are not independent lab tests.

- GrowVeg (also sold with the Old Farmer’s Almanac garden planner). Drag-and-drop beds, spacing, planting dates, rotation. Roundups describe a short trial and then a yearly fee, about $35 and up, with no lasting free plan.
  - GrowSmart, “Best Garden Planner Apps for 2026,” 12 August 2026: https://getgrowsmart.com/blog/best-garden-planner-apps-2026/
  - Grow To Eat, “I Tested 10 Garden Planning Apps,” 16 September 2026: https://growtoeat.app/learn/best-garden-planning-apps/
- Seedtime (styled SeedTime in some roundups). Strong planting calendar and a layout tool. Grow To Eat lists a limited free tier (one calendar and a monthly credit cap) and a high yearly price, in the range of $84–$168.
- Planter. Square-foot beds on a phone. Free for one garden. About $25 a year after that, in the Grow To Eat and Leaftide roundups. Grid squares only.
  - Leaftide, “Best Garden Design Apps 2026,” updated November 2026: https://leaftide.com/compare/best-garden-design-app/
- VegPlotter. A free layout with a cap on how many plantings you can add in a year. About $22–$35 a year in the Grow To Eat table.
- Leaftide says it can trace a satellite view and draw beds that are not rectangles. The same page says GrowVeg, Planter, and VegPlotter do not trace a satellite photo.

What people complain about, as those roundups describe it: the useful version is a subscription, the phone layout is weaker than the desktop one, the grid is only squares, and companion planting is sold more confidently than the research supports. None of those roundups describe placing a square-foot grid on a photo the gardener took in the yard.

## 2. What people are trying to do

I did not use a keyword-volume tool, so this is not a ranking of search counts. The phrases that show up in the roundup titles, the extension sheets, and the task itself are the jobs to support first:

- square foot garden planner
- raised bed planner
- planting calendar by frost date
- seed starting calculator
- companion planting, with the caveat that most charts are folklore

Yardgrid covers the first three in the prototype. Seed starting is the indoor column of the calendar, not a separate calculator. Companion notes are limited to pairs with a source.

## 3. How a site like this can make money

Not signed up. Commission figures below are what the program page, or a named secondary page, published on the date checked.

- High Mowing Organic Seeds. Commissions starting at 10%, 60-day tracking, hosted on Awin. Sign-up: https://www.highmowingseeds.com/high-mowing-affiliate-program (apply link goes to Awin merchant 95143). Checked 18 November 2026 on High Mowing’s own page.
- True Leaf Market, content and influencer tier. Awin lists 10%–20% for that tier and a 30-day cookie. Coupon-style partners are listed lower, 2%–5%. https://ui.awin.com/merchant-profile/124042 Checked from Awin’s public merchant page on 18 November 2026.
- Amazon Associates. Lawn and garden is in the 3% group on Amazon’s published category table, as read by AMZBase on 17 August 2026 from Amazon’s commission schedule (the schedule URL itself sits behind a sign-in). The cookie is short. Sign-up: https://affiliate-program.amazon.com/ Broad catalog, thin rate. https://amzbase.com/guides/amazon-associates-program/
- Burpee. GetLasso, 13 November 2026, lists 4% and a 14-day cookie, with a FlexOffers application link. I did not confirm that rate on a Burpee-owned page. https://getlasso.co/affiliate/burpee-gardening/
- Botanical Interests. A 2026 affiliate roundup lists about 15% for creators on ShareASale. That number is secondary, not from Botanical Interests’ own site in this pass. https://brandid.app/blog/gardening-affiliate-programs/ (16 September 2026).

Later, display ads are possible once there is a real site and enough original pages. This prototype has HTML comments where an ad could go. It does not load an ad network.

A small paid tier, after the free tool is useful: extra saved gardens and a print-ready plan. The free version should keep one garden in the browser, because that is what the existing apps already give away and what a gardener will try in February.

## 4. Name and domains

Recommendation: **Yardgrid**. It says what the page does. Plan a grid on a photo of the yard.

Domain ideas only. I did not check whether any of these are registered, and I did not buy one.

- yardgrid.com
- yardgrid.garden
- getyardgrid.com
- yardgrid.app
- planonyouryard.com

## What the prototype should be, from this pass

A free square-foot board that works on a phone, uses extension numbers, and lets someone line the grid up with a photo of their own yard. That last piece is the gap in the tools above. Subscriptions, accounts, and affiliate links wait until Emilio says to launch.
