# Yardgrid

A static garden-bed planner. Beds are a grid of 1-foot squares. Plant counts, days, and frost dates come from the extension pages in `SOURCES.md`.

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
- The name Yardgrid and the domain ideas in `RESEARCH.md` are not registered by this project.

## What is next

Emilio decides on a domain, hosting, affiliate sign-ups, and analytics. This folder is not deployed. The original Scene Board folder was only read.

The source is at https://github.com/empt1012-coder/yardgrid.
