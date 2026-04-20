# The Great British Trust Test — Survey Instrument

Self-contained HTML survey for Amtivo's consumer trust signals campaign. Hosted on GitHub Pages; submits responses to a Google Sheet via a Google Apps Script Web App.

## Files

- `index.html` — the survey (single file, 27 screens, all logic inline).
- `logos/` — 13 Q1 trust-mark logos (10 real, 3 fake).
- `apps-script.js` — reference copy of the Google Apps Script that backs the endpoint. Paste this into the linked Sheet via Extensions → Apps Script if you ever need to redeploy.

## Endpoint

The survey posts to:

```
https://script.google.com/macros/s/AKfycbxO9-ysAJU0SFFl6OrOkqoCCEqJ9jmSnnjxQUma51I91E0P_voWarx1uhmnXWGhq0Aiag/exec
```

This is baked into `index.html` at the `SHEETS_URL` constant near the top of the script block.

## Prolific integration

The survey auto-fills the Prolific participant ID from the URL when Prolific appends `?PROLIFIC_PID=...` (or `?prolific_id=...` / `?pid=...`). Direct visitors are prompted to enter one manually on screen 1.

## Deploy to GitHub Pages

1. After push, in the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save**.
2. Pages will publish at `https://<owner>.github.io/trust-survey/`.
3. If you attach a custom domain, add a `CNAME` file to the repo root containing the domain only.

## Response storage

Rows are upserted into the `Responses` tab of the linked Google Sheet, keyed on `sessionId`. Partial drop-offs overwrite with each screen advance, so the last row reflects the farthest point the respondent reached.
