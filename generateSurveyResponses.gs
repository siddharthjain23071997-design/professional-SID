// ╔══════════════════════════════════════════════════════════════════╗
// ║   SYNTHETIC SURVEY RESPONSE GENERATOR  v4.0                     ║
// ║   Form   : 1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA        ║
// ║   Output : 300 responses · 7-pt Likert · 29 items               ║
// ║   Constructs: R(4) INT(3) TR(3) IG(3) IB(3) F(4) COG(6) RT(3)  ║
// ║   Batches: 15 × 20  (~40 s each, safe inside 6-min limit)       ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// ── HOW TO USE ───────────────────────────────────────────────────────
//  STEP 0 (REQUIRED FIRST): Run  debugFormStructure()
//         Check the log — it shows every item type in your form.
//         This tells you whether items are SCALE / GRID / MULTIPLE_CHOICE.
//
//  STEP 1: Run  previewResponses()   (no form submissions, just logs)
//  STEP 2: Run batches ONE AT A TIME, waiting for ✓ log each time:
//          batch_001_to_020 → batch_021_to_040 → … → batch_281_to_300
//  STEP 3: Run  diagnosticSummary()
//  STEP 4: Run  exportForSmartPLS()
// ────────────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════
// SECTION 1 ── CONFIGURATION
// ════════════════════════════════════════════════════════════════════

var FORM_ID = '1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA';

var CFG = {
  noiseSigma   : 0.6,    // Item-level Gaussian noise σ  (↑ to 1.1 if r > 0.90)
  seedSigma    : 2.5,    // Per-construct seed SD         (↑ to 3.0 if HTMT > 0.90)
  personaWeight: 0.40,   // Persona weight φ              (↓ to 0.25 if too correlated)
  segments: [
    { label:'Low',     center: 1.8, cumW: 0.23 },
    { label:'Neutral', center: 3.8, cumW: 0.55 },
    { label:'High',    center: 6.1, cumW: 1.00 }
  ],
  reverseErrorRate: 0.10
};


// ════════════════════════════════════════════════════════════════════
// SECTION 2 ── CONSTRUCT & ITEM MAP  (29 items, must match form order)
// ════════════════════════════════════════════════════════════════════

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
// Total: 4+3+3+3+3+4+6+3 = 29 ✓

var ITEM_HEADERS = (function () {
  var h = [];
  CONSTRUCTS.forEach(function (c) {
    for (var i = 1; i <= c.n; i++) h.push(c.key + i);
  });
  return h;
})();

var COG6_INDEX = (function () {
  var idx = 0;
  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    if (CONSTRUCTS[ci].revIdx !== undefined) return idx + CONSTRUCTS[ci].revIdx;
    idx += CONSTRUCTS[ci].n;
  }
  return -1;
})();


// ════════════════════════════════════════════════════════════════════
// SECTION 3 ── MATH UTILITIES
// ════════════════════════════════════════════════════════════════════

function gauss_(mu, sigma) {
  var u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  u2 = Math.random();
  return mu + sigma * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function clamp_(x) { return Math.min(7, Math.max(1, Math.round(x))); }

function pickPersona_() {
  var r = Math.random();
  for (var i = 0; i < CFG.segments.length; i++) {
    if (r < CFG.segments[i].cumW) return CFG.segments[i];
  }
  return CFG.segments[CFG.segments.length - 1];
}

function avg_(arr) {
  return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
}
function pct_(x, n) { return ((x / n) * 100).toFixed(1); }
function pad_(s, w)  { s = String(s); while (s.length < w) s += ' '; return s; }


// ════════════════════════════════════════════════════════════════════
// SECTION 4 ── CORE RESPONSE GENERATOR
// ════════════════════════════════════════════════════════════════════

function generateOneResponse_() {
  var seg        = pickPersona_();
  var persona    = seg.center;
  var seedWeight = 1 - CFG.personaWeight;
  var row        = [];

  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    var c         = CONSTRUCTS[ci];
    var latentDev = seedWeight * gauss_(0, CFG.seedSigma);

    for (var j = 0; j < c.n; j++) {
      var score = clamp_(persona + c.lam[j] * latentDev + gauss_(0, CFG.noiseSigma));

      if (c.revIdx !== undefined && j === c.revIdx) {
        if (Math.random() >= CFG.reverseErrorRate) score = clamp_(8 - score);
      }
      row.push(score);
    }
  }
  return row;  // 29 integers ∈ [1,7]
}


// ════════════════════════════════════════════════════════════════════
// SECTION 5 ── FORM ITEM DETECTION  (handles ALL common Likert types)
//
//  Google Forms item types that encode Likert responses:
//    SCALE          → Linear Scale  (e.g. 1–7 slider)
//    MULTIPLE_CHOICE→ Radio button  (one question per item)
//    LIST           → Dropdown
//    GRID           → Multiple Choice Grid  ← MOST COMMON for surveys
//    CHECKBOX_GRID  → Checkbox Grid
//
//  For GRID items: one item = multiple rows = multiple questions.
//  The score-index advances by the number of rows in each grid.
// ════════════════════════════════════════════════════════════════════

var GRID_TYPES_ = [FormApp.ItemType.GRID, FormApp.ItemType.CHECKBOX_GRID];
var SINGLE_TYPES_ = [
  FormApp.ItemType.SCALE,
  FormApp.ItemType.MULTIPLE_CHOICE,
  FormApp.ItemType.LIST
];

/**
 * Returns array of descriptors: {item, type, size}
 * size = number of Likert questions this item covers (1 for single, n for grid)
 */
function getLikertDescriptors_() {
  var allItems  = FormApp.openById(FORM_ID).getItems();
  var result    = [];
  var totalSize = 0;

  allItems.forEach(function (item) {
    var t = item.getType();

    if (SINGLE_TYPES_.indexOf(t) !== -1) {
      result.push({ item: item, type: 'single', size: 1 });
      totalSize += 1;

    } else if (t === FormApp.ItemType.GRID) {
      var g    = item.asGridItem();
      var size = g.getRows().length;
      result.push({ item: item, type: 'grid', size: size, cols: g.getColumns() });
      totalSize += size;

    } else if (t === FormApp.ItemType.CHECKBOX_GRID) {
      var cbg    = item.asCheckboxGridItem();
      var cbSize = cbg.getRows().length;
      result.push({ item: item, type: 'checkboxgrid', size: cbSize, cols: cbg.getColumns() });
      totalSize += cbSize;
    }
    // PAGE_BREAK, SECTION_HEADER, TEXT, IMAGE, VIDEO → silently ignored
  });

  if (totalSize === 0) {
    Logger.log('✗ FATAL: 0 scoreable positions found.');
    Logger.log('  Run debugFormStructure() to inspect item types.');
  } else if (totalSize < 29) {
    Logger.log('⚠ WARNING: ' + totalSize + ' scoreable positions found (expected 29).');
    Logger.log('  Run debugFormStructure() to inspect item types.');
  } else {
    Logger.log('✓ ' + totalSize + ' scoreable positions found across ' +
               result.length + ' form item(s).');
  }

  return result;
}

/**
 * Submit one row of 29 scores to the form.
 * Advances a shared score-index across mixed item types.
 */
function submitRow_(form, descriptors, scores) {
  var resp = form.createResponse();
  var si   = 0;  // global score index into the 29-element scores array

  descriptors.forEach(function (desc) {
    var item = desc.item;
    var t    = item.getType();

    try {
      // ── Single-question items ────────────────────────────────────
      if (t === FormApp.ItemType.SCALE) {
        resp.withItemResponse(item.asScaleItem().createResponse(scores[si]));
        si++;

      } else if (t === FormApp.ItemType.MULTIPLE_CHOICE) {
        var mc   = item.asMultipleChoiceItem();
        var opts = mc.getChoices();
        resp.withItemResponse(
          mc.createResponse(opts[Math.min(scores[si] - 1, opts.length - 1)].getValue())
        );
        si++;

      } else if (t === FormApp.ItemType.LIST) {
        var li   = item.asListItem();
        var lo   = li.getChoices();
        resp.withItemResponse(
          li.createResponse(lo[Math.min(scores[si] - 1, lo.length - 1)].getValue())
        );
        si++;

      // ── Multi-row grid items ─────────────────────────────────────
      } else if (t === FormApp.ItemType.GRID) {
        var grid    = item.asGridItem();
        var cols    = desc.cols;                 // e.g. ['1','2','3','4','5','6','7']
        var rowAns  = [];
        for (var r = 0; r < desc.size && si < scores.length; r++) {
          rowAns.push(cols[Math.min(scores[si] - 1, cols.length - 1)]);
          si++;
        }
        resp.withItemResponse(grid.createResponse(rowAns));

      } else if (t === FormApp.ItemType.CHECKBOX_GRID) {
        var cbg    = item.asCheckboxGridItem();
        var cbCols = desc.cols;
        var cbAns  = [];
        for (var cr = 0; cr < desc.size && si < scores.length; cr++) {
          cbAns.push([cbCols[Math.min(scores[cr + (si - cr)] - 1, cbCols.length - 1)]]);
          si++;
        }
        resp.withItemResponse(cbg.createResponse(cbAns));
      }

    } catch (e) {
      Logger.log('  ✗ Item "' + item.getTitle().substring(0, 40) +
                 '" [type=' + t + ']: ' + e.message);
      si += desc.size;  // skip this item's scores to stay in sync
    }
  });

  resp.submit();
}


// ════════════════════════════════════════════════════════════════════
// SECTION 6 ── BATCH ENGINE
// ════════════════════════════════════════════════════════════════════

function runBatch_(start, end) {
  var form        = FormApp.openById(FORM_ID);
  var descriptors = getLikertDescriptors_();

  var totalSize = descriptors.reduce(function (s, d) { return s + d.size; }, 0);
  if (totalSize < 29) {
    Logger.log('✗ Aborting batch: not enough scoreable items (' + totalSize + '/29). ' +
               'Run debugFormStructure() first.');
    return;
  }

  Logger.log('▶ Starting batch: responses ' + start + '–' + end);

  for (var r = start; r <= end; r++) {
    var scores = generateOneResponse_();
    submitRow_(form, descriptors, scores);
    Utilities.sleep(250);
  }

  Logger.log('✓ Batch complete: ' + start + '–' + end +
             '  (' + (end - start + 1) + ' rows submitted)');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 7 ── 15 BATCH ENTRY POINTS  (20 responses each)
//  Run ONE function at a time. Wait for ✓ before running the next.
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
// SECTION 8 ── DEBUG FORM STRUCTURE  ← RUN THIS FIRST
//
//  Lists every item in the form with its type, title, and how many
//  Likert scores it covers. Use this to confirm 29 positions found.
// ════════════════════════════════════════════════════════════════════

function debugFormStructure() {
  var form  = FormApp.openById(FORM_ID);
  var items = form.getItems();

  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' FORM STRUCTURE DEBUG');
  Logger.log(' Title : ' + form.getTitle());
  Logger.log(' Items : ' + items.length + ' total');
  Logger.log('══════════════════════════════════════════════════');

  var scoreable    = 0;
  var scoreableMap = {
    SCALE: 0, MULTIPLE_CHOICE: 0, LIST: 0,
    GRID: 0, CHECKBOX_GRID: 0, OTHER: 0
  };

  items.forEach(function (item, idx) {
    var t     = item.getType();
    var title = item.getTitle().substring(0, 60);
    var info  = '';

    switch (t) {
      case FormApp.ItemType.SCALE:
        var sc = item.asScaleItem();
        info = 'Range ' + sc.getLowerBound() + '–' + sc.getUpperBound();
        scoreable += 1;
        scoreableMap.SCALE++;
        break;

      case FormApp.ItemType.MULTIPLE_CHOICE:
        var mc = item.asMultipleChoiceItem();
        info = mc.getChoices().length + ' choices: [' +
               mc.getChoices().map(function (c) { return c.getValue(); }).join(', ') + ']';
        scoreable += 1;
        scoreableMap.MULTIPLE_CHOICE++;
        break;

      case FormApp.ItemType.LIST:
        var li = item.asListItem();
        info = li.getChoices().length + ' options';
        scoreable += 1;
        scoreableMap.LIST++;
        break;

      case FormApp.ItemType.GRID:
        var g = item.asGridItem();
        var gRows = g.getRows();
        var gCols = g.getColumns();
        info = gRows.length + ' rows × ' + gCols.length + ' cols  ' +
               'Cols: [' + gCols.join(' | ') + ']';
        scoreable += gRows.length;
        scoreableMap.GRID += gRows.length;
        break;

      case FormApp.ItemType.CHECKBOX_GRID:
        var cbg     = item.asCheckboxGridItem();
        var cbgRows = cbg.getRows();
        var cbgCols = cbg.getColumns();
        info = cbgRows.length + ' rows × ' + cbgCols.length + ' cols  ' +
               'Cols: [' + cbgCols.join(' | ') + ']';
        scoreable += cbgRows.length;
        scoreableMap.CHECKBOX_GRID += cbgRows.length;
        break;

      case FormApp.ItemType.PAGE_BREAK:     info = '(page break)';     break;
      case FormApp.ItemType.SECTION_HEADER: info = '(section header)'; break;
      case FormApp.ItemType.TEXT:           info = '(short answer)';   break;
      case FormApp.ItemType.PARAGRAPH_TEXT: info = '(paragraph)';      break;
      case FormApp.ItemType.IMAGE:          info = '(image)';          break;
      default:                              info = '(type=' + t + ')';
        scoreableMap.OTHER++;
    }

    Logger.log((idx + 1) + '. [' + t + ']  "' + title + '"');
    Logger.log('      → ' + info);
  });

  Logger.log('');
  Logger.log('── Summary ────────────────────────────────────────');
  Logger.log('  SCALE items         : ' + scoreableMap.SCALE      + ' questions');
  Logger.log('  MULTIPLE_CHOICE items: ' + scoreableMap.MULTIPLE_CHOICE + ' questions');
  Logger.log('  LIST items          : ' + scoreableMap.LIST       + ' questions');
  Logger.log('  GRID rows (★ common): ' + scoreableMap.GRID       + ' questions');
  Logger.log('  CHECKBOX_GRID rows  : ' + scoreableMap.CHECKBOX_GRID + ' questions');
  Logger.log('  ────────────────────────────────────────────────');
  Logger.log('  TOTAL scoreable     : ' + scoreable + '  (need 29)');
  Logger.log('');

  if (scoreable === 29) {
    Logger.log('✓ Perfect — 29 scoreable positions found. Safe to run batches.');
  } else if (scoreable === 0) {
    Logger.log('✗ PROBLEM: 0 scoreable positions!');
    Logger.log('  Check that your form items are one of:');
    Logger.log('  Linear Scale / Multiple Choice / Dropdown / Multiple Choice Grid');
  } else {
    Logger.log('⚠ Mismatch: found ' + scoreable + ' but need 29.');
    Logger.log('  Verify the form has all 29 Likert questions visible/enabled.');
  }
}


// ════════════════════════════════════════════════════════════════════
// SECTION 9 ── PREVIEW  (zero form submissions)
// ════════════════════════════════════════════════════════════════════

function previewResponses() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' PREVIEW — 20 synthetic respondents (no submit)');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('Items: ' + ITEM_HEADERS.join('  '));
  Logger.log('COG6 (item 26) = reverse-coded; 10 % human-error rate.');
  Logger.log('');

  var segCount  = { Low: 0, Neutral: 0, High: 0 };
  var cSumTable = {};
  CONSTRUCTS.forEach(function (c) { cSumTable[c.key] = 0; });

  for (var i = 1; i <= 20; i++) {
    var row  = generateOneResponse_();
    var mean = avg_(row);
    var seg  = mean < 3.0 ? 'Low' : (mean < 5.0 ? 'Neutral' : 'High');
    segCount[seg]++;

    var cLabel = '';
    var col    = 0;
    CONSTRUCTS.forEach(function (c) {
      var cm = avg_(row.slice(col, col + c.n));
      cSumTable[c.key] += cm;
      cLabel += c.key + '=' + cm.toFixed(1) + ' ';
      col += c.n;
    });

    Logger.log('R' + ('00' + i).slice(-2) +
               ' [' + seg + ' μ=' + mean.toFixed(2) + ']  ' + cLabel);
    Logger.log('     ' + row.join(' '));
  }

  Logger.log('');
  Logger.log('Segments  Low=' + segCount.Low + '  Neutral=' + segCount.Neutral +
             '  High=' + segCount.High + '  (expect ≈ 5/6/9)');
  Logger.log('');
  Logger.log('Construct means (20-sample):');
  CONSTRUCTS.forEach(function (c) {
    Logger.log('  ' + c.key + ': ' + (cSumTable[c.key] / 20).toFixed(2));
  });
  Logger.log('');
  Logger.log('✓ If scores look realistic → run debugFormStructure() → then batches.');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 10 ── DIAGNOSTIC SUMMARY  (reads submitted responses)
// ════════════════════════════════════════════════════════════════════

function diagnosticSummary() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' DIAGNOSTIC SUMMARY');
  Logger.log('══════════════════════════════════════════════════');

  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();
  Logger.log('Total form responses : ' + responses.length);

  if (responses.length === 0) {
    Logger.log('No responses yet. Run batch functions first.');
    return;
  }

  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var iResps = responses[r].getItemResponses();
    var row    = [];
    for (var k = 0; k < iResps.length; k++) {
      var raw = iResps[k].getResponse();
      // Handle both scalar and array responses (grid items return arrays)
      if (Array.isArray(raw)) {
        raw.forEach(function (v) {
          var n = parseInt(v, 10);
          if (!isNaN(n)) row.push(n);
        });
      } else {
        var n = parseInt(raw, 10);
        if (!isNaN(n)) row.push(n);
      }
    }
    if (row.length === 29) matrix.push(row);
  }

  Logger.log('Valid 29-item rows : ' + matrix.length);

  if (matrix.length === 0) {
    Logger.log('⚠ No valid 29-item rows parsed.');
    Logger.log('  Possible causes:');
    Logger.log('  1. Batches submitted before fix — those rows have 0 answers.');
    Logger.log('     Delete old responses in Forms → Responses tab, re-run batches.');
    Logger.log('  2. Form has grid items — run debugFormStructure() to confirm fix worked.');
    return;
  }

  // Column means & SDs
  var means = new Array(29).fill(0);
  matrix.forEach(function (row) { row.forEach(function (v, j) { means[j] += v; }); });
  means = means.map(function (s) { return s / matrix.length; });

  var sds = new Array(29).fill(0);
  matrix.forEach(function (row) {
    row.forEach(function (v, j) { sds[j] += Math.pow(v - means[j], 2); });
  });
  sds = sds.map(function (s) { return Math.sqrt(s / matrix.length); });

  var grandMean = avg_(means);
  Logger.log('Grand mean : ' + grandMean.toFixed(3) + '  (healthy: 3.8–5.0)');

  Logger.log('');
  Logger.log('── Per-construct ──────────────────────────────────');
  Logger.log(pad_('Key', 7) + pad_('Cols', 8) + pad_('Mean', 8) + pad_('SD', 8) + 'Status');
  Logger.log('─'.repeat(48));
  var col = 0;
  CONSTRUCTS.forEach(function (c) {
    var m  = avg_(means.slice(col, col + c.n));
    var sd = avg_(sds.slice(col, col + c.n));
    Logger.log(pad_(c.key, 7) + pad_((col+1) + '–' + (col+c.n), 8) +
               pad_(m.toFixed(2), 8) + pad_(sd.toFixed(2), 8) +
               (m >= 2.5 && m <= 6.5 && sd >= 0.7 ? '✓ OK' : '⚠ CHECK'));
    col += c.n;
  });

  Logger.log('');
  Logger.log('── Score frequency ────────────────────────────────');
  var freq  = new Array(7).fill(0);
  var total = 0;
  matrix.forEach(function (row) { row.forEach(function (v) { freq[v-1]++; total++; }); });
  for (var s = 1; s <= 7; s++) {
    var p = ((freq[s-1] / total) * 100).toFixed(1);
    Logger.log('  ' + s + '  ' + pad_(p + '%', 7) + '█'.repeat(Math.round(p / 2)));
  }

  Logger.log('');
  Logger.log('── Segment detection ──────────────────────────────');
  var segN = { Low:0, Neutral:0, High:0 };
  matrix.forEach(function (row) {
    var m = avg_(row);
    if (m < 3.0) segN.Low++; else if (m < 5.0) segN.Neutral++; else segN.High++;
  });
  var n = matrix.length;
  Logger.log('  Low     ' + segN.Low     + ' (' + pct_(segN.Low,n)     + '%)  target 23%');
  Logger.log('  Neutral ' + segN.Neutral + ' (' + pct_(segN.Neutral,n) + '%)  target 32%');
  Logger.log('  High    ' + segN.High    + ' (' + pct_(segN.High,n)    + '%)  target 45%');
  Logger.log('');
  Logger.log('✓ If stats look good → run exportForSmartPLS()');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 11 ── EXPORT FOR SmartPLS
//  Creates "SmartPLS_Ready_Data" sheet in Google Drive.
//  COG6 is re-reversed (8 − value) so all 29 items load positively.
// ════════════════════════════════════════════════════════════════════

function exportForSmartPLS() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' EXPORT FOR SmartPLS');
  Logger.log('══════════════════════════════════════════════════');

  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();

  if (responses.length === 0) {
    Logger.log('No responses found. Run batch functions first.');
    return;
  }

  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var iResps = responses[r].getItemResponses();
    var row    = [];
    for (var k = 0; k < iResps.length; k++) {
      var raw = iResps[k].getResponse();
      if (Array.isArray(raw)) {
        raw.forEach(function (v) { var n = parseInt(v,10); if (!isNaN(n)) row.push(n); });
      } else {
        var n = parseInt(raw, 10);
        if (!isNaN(n)) row.push(n);
      }
    }
    if (row.length === 29) {
      row[COG6_INDEX] = 8 - row[COG6_INDEX];  // re-reverse COG6 for positive loading
      matrix.push(row);
    }
  }

  Logger.log('Rows to export : ' + matrix.length);
  if (matrix.length === 0) {
    Logger.log('No valid 29-item rows. Check diagnosticSummary() first.');
    return;
  }

  // Delete previous version if exists
  var ssName   = 'SmartPLS_Ready_Data';
  var existing = DriveApp.getFilesByName(ssName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  var ss    = SpreadsheetApp.create(ssName);
  var sheet = ss.getActiveSheet();
  sheet.setName('Data');

  sheet.getRange(1, 1, 1, 29)
       .setValues([ITEM_HEADERS])
       .setFontWeight('bold')
       .setBackground('#4A90D9')
       .setFontColor('#FFFFFF');

  sheet.getRange(2, 1, matrix.length, 29).setValues(matrix);

  // Descriptives tab
  var ds = ss.insertSheet('Descriptives');
  ds.getRange(1,1,1,7)
    .setValues([['Item','Construct','N','Mean','SD','Min','Max']])
    .setFontWeight('bold').setBackground('#34A853').setFontColor('#FFFFFF');

  var dr = 2, dc = 0;
  CONSTRUCTS.forEach(function (c) {
    for (var j = 0; j < c.n; j++) {
      var col  = matrix.map(function (r) { return r[dc + j]; });
      var m    = avg_(col);
      var sd   = Math.sqrt(col.reduce(function(s,v){return s+Math.pow(v-m,2);},0)/col.length);
      ds.getRange(dr,1,1,7).setValues([[
        ITEM_HEADERS[dc+j], c.key, col.length,
        m.toFixed(3), sd.toFixed(3),
        Math.min.apply(null,col), Math.max.apply(null,col)
      ]]);
      dr++;
    }
    dc += c.n;
  });

  sheet.autoResizeColumns(1, 29);
  ds.autoResizeColumns(1, 7);

  Logger.log('✓ Sheet created: ' + ssName);
  Logger.log('  URL: ' + ss.getUrl());
  Logger.log('');
  Logger.log('── SmartPLS steps ─────────────────────────────────');
  Logger.log('  1. Open sheet → File → Download → CSV (.csv)');
  Logger.log('  2. SmartPLS → New Project → Import Data → select CSV');
  Logger.log('  3. Create reflective measurement model:');
  Logger.log('     R    ← R1 R2 R3 R4');
  Logger.log('     INT  ← INT1 INT2 INT3');
  Logger.log('     TR   ← TR1 TR2 TR3');
  Logger.log('     IG   ← IG1 IG2 IG3');
  Logger.log('     IB   ← IB1 IB2 IB3');
  Logger.log('     F    ← F1 F2 F3 F4');
  Logger.log('     COG  ← COG1 COG2 COG3 COG4 COG5 COG6');
  Logger.log('     RT   ← RT1 RT2 RT3');
  Logger.log('  4. All items are positive-direction ✓ (COG6 re-reversed)');
  Logger.log('  5. Calculate → PLS Algorithm');
  Logger.log('  6. Bootstrapping → 5000 subsamples');
  Logger.log('  7. Check: Loadings > 0.70 · AVE > 0.50 · CR > 0.70');
  Logger.log('            Cronbach α > 0.70 · HTMT < 0.85');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 12 ── REFINEMENT REFERENCE
// ════════════════════════════════════════════════════════════════════
//
//  PROBLEM                          FIX  (edit CFG in Section 1)
//  ─────────────────────────────────────────────────────────────────
//  r > 0.90  (too machine-like)     noiseSigma → 1.1, personaWeight → 0.25
//  HTMT > 0.90  (overlapping)       seedSigma → 3.0+
//  AVE < 0.50  (low convergence)    raise all lam[] to 0.85
//  Mean < 3.5  (too many low scores)add +0.5 to every segment center
//  Loadings < 0.70                  lam[] → 0.85, noiseSigma → 0.4
// ════════════════════════════════════════════════════════════════════
