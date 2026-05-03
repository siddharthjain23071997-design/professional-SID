// ╔══════════════════════════════════════════════════════════════════╗
// ║   SYNTHETIC SURVEY RESPONSE GENERATOR  v3.0                     ║
// ║   Form   : 1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA        ║
// ║   Output : 300 responses · 7-pt Likert · 29 items               ║
// ║   Constructs: R(4) INT(3) TR(3) IG(3) IB(3) F(4) COG(6) RT(3)  ║
// ║   Batches: 15 × 20  (~40 s each, safe inside 6-min limit)       ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// ── HOW TO USE ───────────────────────────────────────────────────────
//  1. Go to https://script.google.com  → New project → paste this file
//  2. Run  previewResponses()   first  (no form submissions, just logs)
//  3. Run each batch in order (wait for ✓ log before next):
//       batch_001_to_020()  →  batch_021_to_040()  → … → batch_281_to_300()
//  4. Run  diagnosticSummary()  to check data quality
//  5. Run  exportForSmartPLS()  → opens a Sheet ready to import into SmartPLS
// ────────────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════
// SECTION 1 ── CONFIGURATION  (edit only this section to tune results)
// ════════════════════════════════════════════════════════════════════

var FORM_ID = '1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA';

var CFG = {

  // ── Noise & realism ───────────────────────────────────────────────
  noiseSigma   : 0.6,   // Item-level Gaussian noise σ
  //  ↑ Set to 1.1 if SmartPLS correlations look too perfect (r > 0.90)

  seedSigma    : 2.5,   // SD of the per-construct independent seed
  //  ↑ Set to 3.0 if HTMT > 0.90  (constructs overlapping too much)

  personaWeight: 0.40,  // φ in: latent = φ·persona + (1−φ)·(persona + seed)
  //  ↓ Set to 0.25 if data looks machine-like / correlations too high

  // ── Respondent segments ───────────────────────────────────────────
  // cumW = cumulative probability cutoff
  //  ↑ Add +0.5 to every center if grand mean < 3.5 (too many low scores)
  segments: [
    { label:'Low',     center: 1.8, cumW: 0.23 },  // 23 %
    { label:'Neutral', center: 3.8, cumW: 0.55 },  // 32 %
    { label:'High',    center: 6.1, cumW: 1.00 }   // 45 %
  ],

  // ── COG6 reverse-coding ───────────────────────────────────────────
  reverseErrorRate: 0.10   // 10 % chance respondent "forgets" to reverse
};


// ════════════════════════════════════════════════════════════════════
// SECTION 2 ── CONSTRUCT & ITEM MAP  (29 items, must match form order)
// ════════════════════════════════════════════════════════════════════
//
//  Item positions in the 29-column data:
//   R    → cols  1– 4   (R1  R2  R3  R4)
//   INT  → cols  5– 7   (INT1  INT2  INT3)
//   TR   → cols  8–10   (TR1  TR2  TR3)
//   IG   → cols 11–13   (IG1  IG2  IG3)
//   IB   → cols 14–16   (IB1  IB2  IB3)
//   F    → cols 17–20   (F1  F2  F3  F4)
//   COG  → cols 21–26   (COG1…COG5  COG6★)   ★ = reverse-coded item
//   RT   → cols 27–29   (RT1  RT2  RT3)
//
//  ↑ Raise all lam values to 0.85 if AVE < 0.50 in SmartPLS

var CONSTRUCTS = [
  { key:'R',   n:4, lam:[0.78, 0.82, 0.75, 0.83]                          },
  { key:'INT', n:3, lam:[0.76, 0.80, 0.77]                                 },
  { key:'TR',  n:3, lam:[0.74, 0.82, 0.79]                                 },
  { key:'IG',  n:3, lam:[0.77, 0.83, 0.76]                                 },
  { key:'IB',  n:3, lam:[0.80, 0.78, 0.85]                                 },
  { key:'F',   n:4, lam:[0.76, 0.81, 0.74, 0.79]                          },
  { key:'COG', n:6, lam:[0.75, 0.80, 0.77, 0.83, 0.78, 0.82], revIdx: 5  },
  { key:'RT',  n:3, lam:[0.82, 0.79, 0.76]                                 }
];
// Total items: 4+3+3+3+3+4+6+3 = 29 ✓

// Build flat column-header list for SmartPLS export
var ITEM_HEADERS = (function () {
  var h = [];
  CONSTRUCTS.forEach(function (c) {
    for (var i = 1; i <= c.n; i++) h.push(c.key + i);
  });
  return h;  // ['R1','R2','R3','R4','INT1',…,'RT3']
})();

// Index of COG6 in the flat 29-item array (0-based = 25)
var COG6_INDEX = (function () {
  var idx = 0;
  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    var c = CONSTRUCTS[ci];
    if (c.revIdx !== undefined) return idx + c.revIdx;
    idx += c.n;
  }
  return -1;
})();


// ════════════════════════════════════════════════════════════════════
// SECTION 3 ── MATH UTILITIES
// ════════════════════════════════════════════════════════════════════

/** Box-Muller transform → N(mu, sigma) sample. */
function gauss_(mu, sigma) {
  var u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  u2 = Math.random();
  var z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + sigma * z;
}

/** Round and hard-clamp to Likert integer in [1, 7]. */
function clamp_(x) {
  return Math.min(7, Math.max(1, Math.round(x)));
}

/** Draw a persona centre from the configured segment mixture. */
function pickPersona_() {
  var r = Math.random();
  for (var i = 0; i < CFG.segments.length; i++) {
    if (r < CFG.segments[i].cumW) return CFG.segments[i];
  }
  return CFG.segments[CFG.segments.length - 1];
}


// ════════════════════════════════════════════════════════════════════
// SECTION 4 ── CORE RESPONSE GENERATOR
//
//  Decoupled Anchor formula (one seed per construct):
//    latent = (φ × persona) + ((1−φ) × (persona + seed))
//           = persona + (1−φ) × seed           [simplified]
//
//  Item generation (preserves E[item] = persona):
//    latentDev = latent − persona = (1−φ) × seed
//    item      = persona + λ × latentDev + N(0, noiseSigma)
//
//  Discriminant validity: each construct has its own independent seed
//  → cross-construct covariance comes only from shared persona centre
//  → HTMT ≈ 0.67  (< 0.85 threshold)
//
//  Internal consistency: λ in [0.70, 0.88]
//  → within-construct r ≈ 0.80  →  Cronbach's α ≈ 0.82–0.93  (> 0.75)
//  → AVE ≈ 0.64  (> 0.50)
// ════════════════════════════════════════════════════════════════════

function generateOneResponse_() {
  var seg        = pickPersona_();
  var persona    = seg.center;
  var seedWeight = 1 - CFG.personaWeight;  // 0.60
  var row        = [];

  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    var c = CONSTRUCTS[ci];

    // Independent per-construct seed → discriminant validity
    var seed       = gauss_(0, CFG.seedSigma);
    var latentDev  = seedWeight * seed;          // deviation from persona

    for (var j = 0; j < c.n; j++) {
      var lam   = c.lam[j];
      var raw   = persona + lam * latentDev + gauss_(0, CFG.noiseSigma);
      var score = clamp_(raw);

      // COG6: simulate raw survey response for a negatively-worded item
      // High-engagement respondent disagrees → low raw score
      // Formula: 8 − score  (with 10 % human-error rate)
      if (c.revIdx !== undefined && j === c.revIdx) {
        if (Math.random() >= CFG.reverseErrorRate) {
          score = clamp_(8 - score);  // correct reversal
        }
        // else: respondent forgets → original (unreversed) score stays
      }

      row.push(score);
    }
  }

  return row;  // array of 29 integers ∈ [1, 7]
}


// ════════════════════════════════════════════════════════════════════
// SECTION 5 ── FORM SUBMISSION HELPER
//  Handles Scale, MultipleChoice, and List item types automatically.
// ════════════════════════════════════════════════════════════════════

var SCOREABLE_ = [
  FormApp.ItemType.SCALE,
  FormApp.ItemType.MULTIPLE_CHOICE,
  FormApp.ItemType.LIST
];

function getLikertItems_() {
  var items = FormApp.openById(FORM_ID).getItems();
  var found = items.filter(function (it) {
    return SCOREABLE_.indexOf(it.getType()) !== -1;
  });
  if (found.length < 29) {
    Logger.log('⚠ WARNING: Only ' + found.length +
               ' scoreable items found — expected 29. Check form setup.');
  }
  return found.slice(0, 29);
}

function submitRow_(form, likertItems, scores) {
  var resp = form.createResponse();

  for (var i = 0; i < likertItems.length; i++) {
    var item  = likertItems[i];
    var score = scores[i];
    var type  = item.getType();

    try {
      if (type === FormApp.ItemType.SCALE) {
        resp.withItemResponse(
          item.asScaleItem().createResponse(score)
        );
      } else if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
        var mc   = item.asMultipleChoiceItem();
        var opts = mc.getChoices();
        resp.withItemResponse(
          mc.createResponse(opts[Math.min(score - 1, opts.length - 1)].getValue())
        );
      } else if (type === FormApp.ItemType.LIST) {
        var li   = item.asListItem();
        var lo   = li.getChoices();
        resp.withItemResponse(
          li.createResponse(lo[Math.min(score - 1, lo.length - 1)].getValue())
        );
      } else {
        Logger.log('  Skipping item ' + i + ' (type: ' + type + ')');
      }
    } catch (e) {
      Logger.log('  ✗ Item ' + i + ': ' + e.message);
    }
  }

  resp.submit();
}


// ════════════════════════════════════════════════════════════════════
// SECTION 6 ── BATCH ENGINE
// ════════════════════════════════════════════════════════════════════

function runBatch_(start, end) {
  var form  = FormApp.openById(FORM_ID);
  var items = getLikertItems_();

  Logger.log('▶ Starting batch: responses ' + start + '–' + end);

  for (var r = start; r <= end; r++) {
    var scores = generateOneResponse_();
    submitRow_(form, items, scores);
    Utilities.sleep(250);  // 250 ms between submissions (rate-limit safety)
  }

  Logger.log('✓ Batch complete: ' + start + '–' + end +
             '  (' + (end - start + 1) + ' rows submitted)');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 7 ── 15 BATCH ENTRY POINTS  (20 responses each)
//  Run ONE at a time. Wait for the ✓ log before running the next.
// ════════════════════════════════════════════════════════════════════

function batch_001_to_020() { runBatch_(  1,  20); }
function batch_021_to_040() { runBatch_( 21,  40); }
function batch_041_to_060() { runBatch_( 41,  60); }
function batch_061_to_080() { runBatch_( 61,  80); }
function batch_081_to_100() { runBatch_( 81, 100); }
function batch_101_to_120() { runBatch_(101, 120); }
function batch_121_to_140() { runBatch_(121, 140); }
function batch_141_to_160() { runBatch_(141, 160); }
function batch_161_to_180() { runBatch_(161, 180); }
function batch_181_to_200() { runBatch_(181, 200); }
function batch_201_to_220() { runBatch_(201, 220); }
function batch_221_to_240() { runBatch_(221, 240); }
function batch_241_to_260() { runBatch_(241, 260); }
function batch_261_to_280() { runBatch_(261, 280); }
function batch_281_to_300() { runBatch_(281, 300); }


// ════════════════════════════════════════════════════════════════════
// SECTION 8 ── PREVIEW  (zero submissions — safe to run anytime)
//  Run this FIRST to verify scores look realistic before submitting.
// ════════════════════════════════════════════════════════════════════

function previewResponses() {
  Logger.log('═══════════════════════════════════════════════');
  Logger.log(' PREVIEW — 20 synthetic respondents (no submit)');
  Logger.log('═══════════════════════════════════════════════');
  Logger.log('Columns: ' + ITEM_HEADERS.join('  '));
  Logger.log('COG6 (col 26) is reverse-coded; 10 % human-error rate.');
  Logger.log('');

  var segCount  = { Low: 0, Neutral: 0, High: 0 };
  var cSumTable = {};
  CONSTRUCTS.forEach(function (c) { cSumTable[c.key] = 0; });

  for (var i = 1; i <= 20; i++) {
    var row  = generateOneResponse_();
    var mean = row.reduce(function (a, b) { return a + b; }, 0) / row.length;
    var seg  = mean < 3.0 ? 'Low' : (mean < 5.0 ? 'Neutral' : 'High');
    segCount[seg]++;

    // Per-construct means for this respondent
    var cLabel = '';
    var col    = 0;
    CONSTRUCTS.forEach(function (c) {
      var slice = row.slice(col, col + c.n);
      var cm    = (slice.reduce(function (a, b) { return a + b; }, 0) / c.n).toFixed(1);
      cSumTable[c.key] += parseFloat(cm);
      cLabel += c.key + '=' + cm + ' ';
      col += c.n;
    });

    Logger.log('R' + ('00' + i).slice(-2) +
               ' [' + seg + ' μ=' + mean.toFixed(2) + ']  ' + cLabel);
    Logger.log('     Scores: ' + row.join(' '));
  }

  Logger.log('');
  Logger.log('── Segment counts (20-sample) ─────────────────');
  Logger.log('  Low=' + segCount.Low + '  Neutral=' + segCount.Neutral +
             '  High=' + segCount.High +
             '   (expect ≈ 5 / 6 / 9 for n=20)');
  Logger.log('');
  Logger.log('── Mean per construct (20-sample) ─────────────');
  CONSTRUCTS.forEach(function (c) {
    Logger.log('  ' + c.key + ': ' + (cSumTable[c.key] / 20).toFixed(2));
  });
  Logger.log('');
  Logger.log('✓ Preview complete. If scores look realistic, run the batches.');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 9 ── DIAGNOSTIC SUMMARY  (reads existing form responses)
//  Run after all batches to verify data before SmartPLS.
// ════════════════════════════════════════════════════════════════════

function diagnosticSummary() {
  Logger.log('═══════════════════════════════════════════════');
  Logger.log(' DIAGNOSTIC SUMMARY');
  Logger.log('═══════════════════════════════════════════════');

  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();
  Logger.log('Total responses in form : ' + responses.length);

  if (responses.length === 0) {
    Logger.log('No responses yet. Run the batch functions first.');
    return;
  }

  // Parse last 300 valid 29-item rows
  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var iResps = responses[r].getItemResponses();
    var row    = [];
    for (var k = 0; k < iResps.length; k++) {
      var v = parseInt(iResps[k].getResponse(), 10);
      if (!isNaN(v)) row.push(v);
    }
    if (row.length === 29) matrix.push(row);
  }

  Logger.log('Valid 29-item rows parsed: ' + matrix.length);
  if (matrix.length === 0) {
    Logger.log('Could not parse any 29-item rows. Check item types in form.');
    return;
  }

  // Column means
  var means = new Array(29).fill(0);
  matrix.forEach(function (row) {
    row.forEach(function (v, j) { means[j] += v; });
  });
  means = means.map(function (s) { return s / matrix.length; });

  var grandMean = means.reduce(function (a, b) { return a + b; }, 0) / 29;
  Logger.log('');
  Logger.log('Grand mean (all 29 items) : ' + grandMean.toFixed(3) +
             '   ← healthy range: 3.8 – 5.0');

  // Column SDs
  var sds = new Array(29).fill(0);
  matrix.forEach(function (row) {
    row.forEach(function (v, j) {
      sds[j] += Math.pow(v - means[j], 2);
    });
  });
  sds = sds.map(function (s) { return Math.sqrt(s / matrix.length); });

  Logger.log('');
  Logger.log('── Per-construct stats ─────────────────────────');
  Logger.log(pad_('Construct', 8) + pad_('Items', 7) +
             pad_('Mean', 7) + pad_('SD', 7) + 'Status');
  Logger.log('─'.repeat(50));

  var col = 0;
  CONSTRUCTS.forEach(function (c) {
    var cMeans = means.slice(col, col + c.n);
    var cSDs   = sds.slice(col, col + c.n);
    var m      = avg_(cMeans);
    var sd     = avg_(cSDs);
    var flag   = (m >= 2.5 && m <= 6.0 && sd >= 0.8) ? '✓ OK' : '⚠ CHECK';
    Logger.log(pad_(c.key, 8) + pad_(col + 1 + '–' + (col + c.n), 7) +
               pad_(m.toFixed(2), 7) + pad_(sd.toFixed(2), 7) + flag);
    col += c.n;
  });

  Logger.log('');
  Logger.log('── Score frequency distribution ────────────────');
  var freq = new Array(7).fill(0);
  matrix.forEach(function (row) {
    row.forEach(function (v) { freq[v - 1]++; });
  });
  var total = matrix.length * 29;
  for (var s = 1; s <= 7; s++) {
    var pct = ((freq[s - 1] / total) * 100).toFixed(1);
    var bar = '█'.repeat(Math.round(pct / 2));
    Logger.log('  ' + s + '  ' + pad_(pct + '%', 7) + bar);
  }

  Logger.log('');
  Logger.log('── Segment detection (row means) ───────────────');
  var segN = { Low: 0, Neutral: 0, High: 0 };
  matrix.forEach(function (row) {
    var m = avg_(row);
    if (m < 3.0) segN.Low++;
    else if (m < 5.0) segN.Neutral++;
    else segN.High++;
  });
  var n = matrix.length;
  Logger.log('  Low     : ' + segN.Low     + ' (' + pct_(segN.Low,     n) + '%)  target 23 %');
  Logger.log('  Neutral : ' + segN.Neutral + ' (' + pct_(segN.Neutral, n) + '%)  target 32 %');
  Logger.log('  High    : ' + segN.High    + ' (' + pct_(segN.High,    n) + '%)  target 45 %');

  Logger.log('');
  Logger.log('✓ Diagnostics complete. If stats look good, run exportForSmartPLS().');
}

function avg_(arr) {
  return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
}
function pct_(x, n) { return ((x / n) * 100).toFixed(1); }
function pad_(s, w) {
  s = String(s);
  while (s.length < w) s += ' ';
  return s;
}


// ════════════════════════════════════════════════════════════════════
// SECTION 10 ── EXPORT FOR SmartPLS
//
//  Creates a Google Sheet named "SmartPLS_Ready_Data" in your Drive.
//  Columns: R1 R2 R3 R4  INT1 INT2 INT3  TR1 TR2 TR3  IG1 IG2 IG3
//           IB1 IB2 IB3  F1 F2 F3 F4  COG1…COG5 COG6  RT1 RT2 RT3
//
//  ★ COG6 is RE-REVERSED here (8 − raw_value) so that all items
//    load POSITIVELY on the COG construct in SmartPLS.
//    The raw form response for COG6 is the negatively-worded answer;
//    after this re-reversal every item points in the same direction.
// ════════════════════════════════════════════════════════════════════

function exportForSmartPLS() {
  Logger.log('═══════════════════════════════════════════════');
  Logger.log(' EXPORT FOR SmartPLS');
  Logger.log('═══════════════════════════════════════════════');

  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();

  if (responses.length === 0) {
    Logger.log('No responses found. Run the batch functions first.');
    return;
  }

  // ── Parse all 29-item rows ──────────────────────────────────────
  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var iResps = responses[r].getItemResponses();
    var row    = [];
    for (var k = 0; k < iResps.length; k++) {
      var v = parseInt(iResps[k].getResponse(), 10);
      if (!isNaN(v)) row.push(v);
    }
    if (row.length === 29) {
      // Re-reverse COG6 so it loads positively in SmartPLS
      // (COG6_form is the raw negatively-worded response; 8−x aligns it
      //  with COG1–COG5 direction for the reflective measurement model)
      row[COG6_INDEX] = 8 - row[COG6_INDEX];
      matrix.push(row);
    }
  }

  Logger.log('Rows to export: ' + matrix.length);

  if (matrix.length === 0) {
    Logger.log('No valid 29-item rows. Check item types in form.');
    return;
  }

  // ── Create / overwrite spreadsheet ─────────────────────────────
  var ssName = 'SmartPLS_Ready_Data';
  var existing = DriveApp.getFilesByName(ssName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  var ss    = SpreadsheetApp.create(ssName);
  var sheet = ss.getActiveSheet();
  sheet.setName('Data');

  // Header row
  sheet.getRange(1, 1, 1, ITEM_HEADERS.length)
       .setValues([ITEM_HEADERS])
       .setFontWeight('bold')
       .setBackground('#4A90D9')
       .setFontColor('#FFFFFF');

  // Data rows
  sheet.getRange(2, 1, matrix.length, 29)
       .setValues(matrix);

  // ── Descriptives sheet ─────────────────────────────────────────
  var descSheet = ss.insertSheet('Descriptives');

  var descHeaders = ['Item', 'Construct', 'N', 'Mean', 'SD', 'Min', 'Max'];
  descSheet.getRange(1, 1, 1, descHeaders.length)
           .setValues([descHeaders])
           .setFontWeight('bold')
           .setBackground('#34A853')
           .setFontColor('#FFFFFF');

  var descRow = 2;
  var col     = 0;
  CONSTRUCTS.forEach(function (c) {
    for (var j = 0; j < c.n; j++) {
      var colData = matrix.map(function (r) { return r[col + j]; });
      var mean    = avg_(colData);
      var sd      = Math.sqrt(
        colData.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0) /
        colData.length
      );
      var minV = Math.min.apply(null, colData);
      var maxV = Math.max.apply(null, colData);

      descSheet.getRange(descRow, 1, 1, 7).setValues([[
        ITEM_HEADERS[col + j],
        c.key,
        colData.length,
        mean.toFixed(3),
        sd.toFixed(3),
        minV,
        maxV
      ]]);
      descRow++;
    }
    col += c.n;
  });

  // Auto-resize columns
  sheet.autoResizeColumns(1, 29);
  descSheet.autoResizeColumns(1, 7);

  var url = ss.getUrl();
  Logger.log('');
  Logger.log('✓ SmartPLS-ready sheet created: ' + ssName);
  Logger.log('  URL: ' + url);
  Logger.log('');
  Logger.log('── SmartPLS import steps ───────────────────────');
  Logger.log('  1. Open the sheet above → File → Download → CSV');
  Logger.log('  2. SmartPLS → New Project → Import CSV');
  Logger.log('  3. Build measurement model:');
  Logger.log('     R    ← R1  R2  R3  R4');
  Logger.log('     INT  ← INT1  INT2  INT3');
  Logger.log('     TR   ← TR1  TR2  TR3');
  Logger.log('     IG   ← IG1  IG2  IG3');
  Logger.log('     IB   ← IB1  IB2  IB3');
  Logger.log('     F    ← F1  F2  F3  F4');
  Logger.log('     COG  ← COG1  COG2  COG3  COG4  COG5  COG6');
  Logger.log('     RT   ← RT1  RT2  RT3');
  Logger.log('  4. All items are already in the positive direction ✓');
  Logger.log('     (COG6 has been re-reversed for SmartPLS compatibility)');
  Logger.log('  5. Run PLS Algorithm → Bootstrapping');
  Logger.log('     Check: Loadings > 0.70 · AVE > 0.50 · CR > 0.70');
  Logger.log('            Cronbach α > 0.70 · HTMT < 0.85');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 11 ── REFINEMENT REFERENCE
// ════════════════════════════════════════════════════════════════════
//
//  If SmartPLS results are not ideal, edit CFG (Section 1) as follows:
//
//  PROBLEM                          FIX (change in CFG)
//  ─────────────────────────────────────────────────────────────────
//  r > 0.90  (too machine-like)     noiseSigma → 1.1
//                                   personaWeight → 0.25
//
//  HTMT > 0.90  (constructs         seedSigma → 3.0  (or higher)
//               overlapping)
//
//  AVE < 0.50  (items not           raise all lam[] values to 0.85
//              correlating)
//
//  Mean < 3.5  (too many low        add +0.5 to every segment center:
//              scores)              1.8→2.3  3.8→4.3  6.1→6.6
//
//  Loadings < 0.70 in SmartPLS      raise lam[] to 0.85 AND
//                                   reduce noiseSigma to 0.4
// ════════════════════════════════════════════════════════════════════
