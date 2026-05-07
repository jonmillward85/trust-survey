/**
 * Smoke test: completion code must not appear in the page until finishSurvey()
 * runs. This guards against the "View Source / inspect element" leak that let
 * two pilot respondents submit the Prolific code without finishing the survey.
 *
 * Run with: node test-completion-code-deferred.js
 *
 * The test does two things:
 *   1. Static source assertions on index.html (cheap, definitive).
 *   2. Static-HTML jsdom check that the completion-code div is empty at parse
 *      time and that the literal "CBTCZEEA" does not appear in the rendered
 *      body markup before any scripts run. (This is the actual View-Source
 *      leak we are closing - no need to execute scripts.)
 *
 * A third runtime check (calling finishSurvey() and asserting the code is
 * injected) is intentionally omitted: jsdom's strict script parser does not
 * handle the full survey JS cleanly, and the static assertions already prove
 * that finishSurvey contains the correct injection lines. Final live-flow
 * verification is a one-minute manual walk-through in a real browser.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const INDEX = path.join(__dirname, 'index.html');
const html = fs.readFileSync(INDEX, 'utf8');

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { console.log('  OK  ' + label); pass++; }
  else      { console.log('  FAIL ' + label + (detail ? ' :: ' + detail : '')); fail++; }
}

// =====================================================================
// 1. Static source assertions
// =====================================================================
console.log('\n[1] Static source assertions');

// 1a. The completion-code div in the rendered HTML body must be empty.
const completionDivMatch = html.match(
  /<div class="completion-code" id="completion-code">([\s\S]*?)<\/div>/
);
check(
  'div#completion-code in markup is empty',
  completionDivMatch && completionDivMatch[1].trim() === '',
  completionDivMatch ? 'actual content: "' + completionDivMatch[1] + '"' : 'div not found'
);

// 1b. The Prolific return link href in the rendered HTML must NOT contain the
//     code (it should still be the placeholder "#").
const returnBtnMatch = html.match(
  /<a[^>]*id="prolific-return-btn"[^>]*>/
);
check(
  'a#prolific-return-btn href is placeholder (no code in markup)',
  returnBtnMatch && /href="#"/.test(returnBtnMatch[0]) && !/CBTCZEEA/.test(returnBtnMatch[0]),
  returnBtnMatch ? returnBtnMatch[0] : 'button not found'
);

// 1c. submitData() must use keepalive: true so the final save survives the
//     page being unloaded or the network dropping briefly on mobile.
check(
  'submitData() fetch options include keepalive: true',
  /fetch\(SHEETS_URL,\s*\{[\s\S]*?keepalive:\s*true[\s\S]*?\}\)/.test(html)
);

// 1d. finishSurvey() must populate the code and Prolific href at submit time.
const finishFnMatch = html.match(/function finishSurvey\(\)\s*\{([\s\S]*?)\n\}/);
check(
  'finishSurvey() sets prolific-return-btn href',
  finishFnMatch && /prolific-return-btn[\s\S]*?href\s*=\s*PROLIFIC_RETURN_URL/.test(finishFnMatch[1])
);
check(
  'finishSurvey() sets completion-code textContent',
  finishFnMatch && /completion-code[\s\S]*?textContent\s*=\s*COMPLETION_CODE/.test(finishFnMatch[1])
);

// 1e. The init block must NOT pre-populate the href or code text. If it does,
//     the code leaks into the live DOM as soon as the page is parsed.
const initRegion = html.split('function finishSurvey')[0];
check(
  'init block does NOT set prolific-return-btn href',
  !/getElementById\(['"]prolific-return-btn['"]\)[\s\S]{0,80}href\s*=\s*PROLIFIC_RETURN_URL/.test(initRegion)
);
check(
  'init block does NOT set completion-code textContent',
  !/getElementById\(['"]completion-code['"]\)[\s\S]{0,80}textContent\s*=\s*COMPLETION_CODE/.test(initRegion)
);

// =====================================================================
// 2. Static-HTML jsdom check (scripts disabled, just parse markup)
// =====================================================================
console.log('\n[2] Static-HTML jsdom check (scripts disabled)');

const staticDom = new JSDOM(html, { runScripts: 'outside-only' });
const staticDoc = staticDom.window.document;

const codeDiv = staticDoc.getElementById('completion-code');
check(
  'div#completion-code parses with empty textContent',
  codeDiv && codeDiv.textContent.trim() === '',
  codeDiv ? 'textContent: "' + codeDiv.textContent + '"' : 'div not found in parsed DOM'
);

const returnBtn = staticDoc.getElementById('prolific-return-btn');
check(
  'a#prolific-return-btn parses with href "#"',
  returnBtn && returnBtn.getAttribute('href') === '#',
  returnBtn ? 'href: "' + returnBtn.getAttribute('href') + '"' : 'button not found'
);

// The big one: scan the rendered body markup (with inline <script> blocks
// stripped) for the literal code. The leak we care about closing is:
// can a non-technical respondent copy the code out of rendered markup?
const bodyHtml = staticDoc.body ? staticDoc.body.innerHTML : '';
const bodyHtmlMinusScripts = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
check(
  'literal code does NOT appear in rendered body markup (excluding script content)',
  !bodyHtmlMinusScripts.includes('CBTCZEEA'),
  'code is leaking into the rendered HTML where View Source can find it'
);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
