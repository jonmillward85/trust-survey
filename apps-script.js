// ===== Google Apps Script — "The Great British Trust Test" survey =====
// Deployment steps:
//   1. Open your Google Sheet → Extensions → Apps Script
//   2. Replace Code.gs contents with this file
//   3. Deploy → New deployment → Type: Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy the resulting /exec URL and paste it into index.html (SHEETS_URL constant)
//
// Behaviour:
//   - doPost() receives a JSON payload from the survey and upserts a row keyed on sessionId.
//   - First post creates a "Responses" sheet with a frozen, bold header row.
//   - Each subsequent post for the same sessionId overwrites the previous row,
//     so the final row always reflects the latest state (including partial drop-offs).
//   - doGet() returns a simple status message for sanity checks.

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Responses';

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = getHeaders();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.setColumnWidths(1, headers.length, 140);
    }

    var row = flattenData(data);

    // Find existing row by sessionId (column A, starting row 2)
    var sessionId = data.sessionId || '';
    var lastRow = sheet.getLastRow();
    var existingRow = -1;

    if (lastRow >= 2 && sessionId) {
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === sessionId) {
          existingRow = i + 2;
          break;
        }
      }
    }

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('Great British Trust Test data collector is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Column order = storage order in the sheet. Keep this in sync with buildPayload() in index.html.
function getHeaders() {
  return [
    'sessionId',
    'startTime',
    'endTime',
    'totalSeconds',
    'currentScreen',
    'prolific_id',

    // Q1: Credulity test (10 real, 3 fake — randomised order per respondent)
    'q1_gas_safe',
    'q1_bsi',
    'q1_truereview',        // FAKE
    'q1_trustmark',
    'q1_ce_ukca',
    'q1_fensa',
    'q1_resa',              // FAKE
    'q1_trustpilot',
    'q1_google_reviews',
    'q1_which',
    'q1_ukpas',             // FAKE
    'q1_fhrs',
    'q1_red_tractor',

    // Q2: Ranking scenarios — pipe-delimited ranked list + the display order shown to respondent
    'q2a_ranking', 'q2a_display_order',
    'q2b_ranking', 'q2b_display_order',
    'q2c_ranking', 'q2c_display_order',
    'q2d_ranking', 'q2d_display_order',
    'q2e_ranking', 'q2e_display_order',
    // Pipe-delimited list of scenario ids in the order this respondent saw them,
    // e.g. "q2c|q2a|q2e|q2b|q2d". Lets analysis check for position effects.
    'q2_scenario_order',

    // Q3: Fake-review prevalence estimate (band)
    'q3_google_reviews',
    'q3_amazon',
    'q3_trustpilot',

    // Q4: Platform verification model
    'q4_trustpilot',
    'q4_google_reviews',
    'q4_amazon',
    'q4_booking',
    'q4_checkatrade',

    // Q5: Trust trajectory + branched reasons
    'q5a_trajectory',
    'q5bc_reasons',

    // Q6: Confidence in spotting fakes
    'q6_fake_confidence',

    // Q7: DMCCA awareness + follow-up
    'q7a_dmcca_aware',
    'q7b_knowing_changes',

    // Q8: Star rating psychology — 4 pairs x 2 scenarios (low / high stakes).
    // Human-readable capture:
    //   *_chose        = the option the respondent picked, e.g. "4.8★ / 31 reviews"
    //   *_alternative  = the option they didn't pick
    //   *_side         = which side they tapped ("left" or "right")
    // So you can eyeball a row and verify what was chosen without decoding anything.
    'q8_low_p1_chose',  'q8_low_p1_alternative',  'q8_low_p1_side',
    'q8_low_p2_chose',  'q8_low_p2_alternative',  'q8_low_p2_side',
    'q8_low_p3_chose',  'q8_low_p3_alternative',  'q8_low_p3_side',
    'q8_low_p4_chose',  'q8_low_p4_alternative',  'q8_low_p4_side',
    'q8_high_p1_chose', 'q8_high_p1_alternative', 'q8_high_p1_side',
    'q8_high_p2_chose', 'q8_high_p2_alternative', 'q8_high_p2_side',
    'q8_high_p3_chose', 'q8_high_p3_alternative', 'q8_high_p3_side',
    'q8_high_p4_chose', 'q8_high_p4_alternative', 'q8_high_p4_side',
    // Order the two scenario blocks were shown in: "low|high" or "high|low".
    'q8_scenario_order',

    // Q9: Betrayal + gaming suspicion
    'q9a_betrayed',
    'q9b_suspected_fake',

    // Q10: AI chatbot usage + reasons
    'q10a_ai_used',
    'q10b_ai_reasons',

    // Q11: AI makes it harder to tell real from fake
    'q11_ai_harder',

    // Q12: Verification behaviour gap
    'q12a_verified',
    'q12b_frequency',
    'q12c_last_mark',

    // Q13: Financial cost of misleading reviews
    'q13a_spend',
    'q13b_feeling',
    'q13c_refund',

    // Q14: Misinformation capstone + main reason
    'q14_capstone',
    'q14b_main_reason',

    // Demographics
    'd1_household_income',
    'd2_online_shopping_freq',
    'd3_digital_confidence',

    // Server-side timestamp
    'timestamp'
  ];
}

function flattenData(data) {
  var headers = getHeaders();
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];

    if (key === 'timestamp') {
      row.push(new Date().toISOString());
    } else if (key === 'startTime' && data.startTime) {
      row.push(new Date(data.startTime).toISOString());
    } else if (key === 'endTime' && data.endTime) {
      row.push(new Date(data.endTime).toISOString());
    } else {
      row.push(data[key] != null ? data[key] : '');
    }
  }

  return row;
}
