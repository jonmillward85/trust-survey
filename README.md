# trust-survey.co.uk

Hosts the public landing page for the **Britain's £5 Billion Trust Problem** research, plus an archived copy of the survey instrument used to gather the data.

## Layout

- `index.html` — public landing page (the report, "Britain's £5 Billion Trust Problem"). Built locally from the per-section split files in the working repo (`Amtivo/Landing page build/`); see `Amtivo/Landing page build/build_landing_page.py`.
- `trust-test-survey/logos/` — trust-mark logos referenced by both the landing page and the archived survey instrument.
- `survey/index.html` — archived self-contained survey (27 screens, all logic inline). Recruitment is closed; this is kept here for transparency. Reachable at trust-survey.co.uk/survey/.
- `survey/apps-script.js` — reference copy of the Google Apps Script that backs the original endpoint.
- `survey/test-completion-code-deferred.js` — reference of the Q14 completion-code logic.
- `CNAME` — binds the GitHub Pages site to trust-survey.co.uk.

## Endpoint

The survey posts to:

```
https://script.google.com/macros/s/AKfycbxO9-ysAJU0SFFl6OrOkqoCCEqJ9jmSnnjxQUma51I91E0P_voWarx1uhmnXWGhq0Aiag/exec
```

This is baked into `survey/index.html` at the `SHEETS_URL` constant near the top of the script block.
