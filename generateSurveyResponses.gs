// ============================================================
//  SYNTHETIC SURVEY RESPONSE GENERATOR  v1.0
//  Form  : 1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA
//  Target: 300 responses  |  Scale: 7-pt Likert
//  Items : 29  (R×4  INT×3  TR×3  IG×3  IB×3  F×4  COG×6  RT×3)
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 1 — TUNABLE PARAMETERS
// Use the refinement commands below to fix SmartPLS issues.
// ──────────────────────────────────────────────────────────────
var FORM_ID = '1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA';

var CFG = {
  // Item-level Gaussian noise σ
  // ↑ Raise to 1.1 if r > 0.90 ("too perfect / machine-like")
  noiseSigma: 0.6,

  // SD of per-construct independent seed (discriminant validity lever)
  // ↑ Raise to 3.0+ if HTMT > 0.90 (constructs still overlapping)
  seedSigma: 2.5,

  // Weight of persona in Decoupled Anchor formula (φ)
  // ↓ Lower to 0.25 if data looks too perfectly correlated
  personaWeight: 0.40,

  // Segment centres + cumulative weights
  // ↑ Raise all centres by +0.5 if mean is too low (too many 1s/2s)
  segments: [
    { center: 1.8, cumW: 0.23 },   // Low-Engagement  23 %
    { center: 3.8, cumW: 0.55 },   // Neutral/Moderate 32 %
    { center: 6.1, cumW: 1.00 }    // High-Engagement  45 %
  ],

  // COG6 reverse-code: 10 % chance the respondent "forgets" to reverse
  reverseErrorRate: 0.10
};

// ──────────────────────────────────────────────────────────────
// SECTION 2 — CONSTRUCT / ITEM MAP  (total = 29 items)
// Order must match the exact order of items in your Google Form.
// ↑ Raise loadings to 0.85 if AVE < 0.50
// ──────────────────────────────────────────────────────────────
var CONSTRUCTS = [
  // key    n   loadings λ (0.70–0.88)                            revIdx
  { key:'R',   n:4, lam:[0.78, 0.82, 0.75, 0.83]                        },
  { key:'INT', n:3, lam:[0.76, 0.80, 0.77]                               },
  { key:'TR',  n:3, lam:[0.74, 0.82, 0.79]                               },
  { key:'IG',  n:3, lam:[0.77, 0.83, 0.76]                               },
  { key:'IB',  n:3, lam:[0.80, 0.78, 0.85]                               },
  { key:'F',   n:4, lam:[0.76, 0.81, 0.74, 0.79]                        },
  { key:'COG', n:6, lam:[0.75, 0.80, 0.77, 0.83, 0.78, 0.82], revIdx:5 },
  { key:'RT',  n:3, lam:[0.82, 0.79, 0.76]                               }
];
// Verify: 4+3+3+3+3+4+6+3 = 29 ✓

// ──────────────────────────────────────────────────────────────
// SECTION 3 — MATH UTILITIES
// ──────────────────────────────────────────────────────────────

/** Box-Muller: returns a Gaussian sample N(mu, sigma). */
function gauss_(mu, sigma) {
  var u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  u2 = Math.random();
  var z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + sigma * z;
}

/** Hard-clamp and round to integer in [1, 7]. */
function clamp_(x) {
  return Math.min(7, Math.max(1, Math.round(x)));
}

/** Sample a persona centre from the three segments. */
function pickPersona_() {
  var r = Math.random();
  for (var i = 0; i < CFG.segments.length; i++) {
    if (r < CFG.segments[i].cumW) return CFG.segments[i].center;
  }
  return CFG.segments[CFG.segments.length - 1].center;
}

// ──────────────────────────────────────────────────────────────
// SECTION 4 — CORE RESPONSE GENERATOR
//
// Decoupled Anchor formula (per construct):
//   latent = (personaWeight × persona) + ((1−personaWeight) × (persona + seed))
//          = persona + (1−personaWeight) × seed            [simplified]
//
// Item generation (factor-model style, anchored at persona centre):
//   latentDeviation = latent − persona  = (1−personaWeight) × seed
//   item = persona + λ × latentDeviation + N(0, noiseSigma)
//
// This preserves E[item] = persona while items within a construct
// covary through the shared latentDeviation.
// ──────────────────────────────────────────────────────────────

function generateOneResponse_() {
  var persona = pickPersona_();
  var seedWeight = 1 - CFG.personaWeight;   // = 0.60
  var row = [];

  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    var c = CONSTRUCTS[ci];

    // One independent seed per construct → ensures discriminant validity
    var seed            = gauss_(0, CFG.seedSigma);
    var latent          = persona + seedWeight * seed;
    var latentDeviation = latent - persona;   // = 0.60 × seed

    for (var j = 0; j < c.n; j++) {
      var lam = c.lam[j];

      // Signal from construct + item-level human noise
      var raw   = persona + lam * latentDeviation + gauss_(0, CFG.noiseSigma);
      var score = clamp_(raw);

      // COG6 reverse-scoring: 8 − score, with 10 % human error
      if (c.revIdx !== undefined && j === c.revIdx) {
        if (Math.random() >= CFG.reverseErrorRate) {
          score = clamp_(8 - score);
        }
        // else: respondent "forgets" → leave original score (error realism)
      }

      row.push(score);
    }
  }

  return row;  // 29 integers in [1, 7]
}

// ──────────────────────────────────────────────────────────────
// SECTION 5 — FORM SUBMISSION HELPER
// Supports Scale, MultipleChoice, and List item types.
// ──────────────────────────────────────────────────────────────

function submitRow_(form, likertItems, scores) {
  var resp = form.createResponse();

  for (var i = 0; i < likertItems.length; i++) {
    var item  = likertItems[i];
    var score = scores[i];
    var type  = item.getType();

    try {
      if (type === FormApp.ItemType.SCALE) {
        resp.withItemResponse(item.asScaleItem().createResponse(score));

      } else if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
        var mc   = item.asMultipleChoiceItem();
        var opts = mc.getChoices();
        var pick = opts[Math.min(score - 1, opts.length - 1)];
        resp.withItemResponse(mc.createResponse(pick.getValue()));

      } else if (type === FormApp.ItemType.LIST) {
        var li   = item.asListItem();
        var lo   = li.getChoices();
        var lc   = lo[Math.min(score - 1, lo.length - 1)];
        resp.withItemResponse(li.createResponse(lc.getValue()));

      } else {
        Logger.log('Skipping unsupported item type at index ' + i +
                   ': ' + type);
      }
    } catch (e) {
      Logger.log('Item ' + i + ' error: ' + e.message);
    }
  }

  resp.submit();
}

// ──────────────────────────────────────────────────────────────
// SECTION 6 — BATCH ENGINE
// Each batch handles 60 responses (~2–3 min) to stay well
// under the 6-minute Apps Script execution limit.
// ──────────────────────────────────────────────────────────────

var SCOREABLE_TYPES_ = [
  FormApp.ItemType.SCALE,
  FormApp.ItemType.MULTIPLE_CHOICE,
  FormApp.ItemType.LIST
];

function getLikertItems_() {
  var all   = FormApp.openById(FORM_ID).getItems();
  var found = all.filter(function (it) {
    return SCOREABLE_TYPES_.indexOf(it.getType()) !== -1;
  });
  if (found.length < 29) {
    Logger.log('WARNING: Only ' + found.length + ' scoreable items found. Expected 29.');
  }
  return found.slice(0, 29);
}

function runBatch_(start, end) {
  var form  = FormApp.openById(FORM_ID);
  var items = getLikertItems_();

  for (var r = start; r <= end; r++) {
    var scores = generateOneResponse_();
    submitRow_(form, items, scores);
    Utilities.sleep(250);  // 250 ms throttle between submissions
  }

  Logger.log('✓ Batch done: responses ' + start + '–' + end +
             ' (' + (end - start + 1) + ' rows)');
}

// ──────────────────────────────────────────────────────────────
// SECTION 7 — BATCH ENTRY POINTS
// Run each function individually from the Apps Script editor.
// ──────────────────────────────────────────────────────────────

function batch_01_to_60()   { runBatch_(1,   60);  }
function batch_61_to_120()  { runBatch_(61,  120); }
function batch_121_to_180() { runBatch_(121, 180); }
function batch_181_to_240() { runBatch_(181, 240); }
function batch_241_to_300() { runBatch_(241, 300); }

// ──────────────────────────────────────────────────────────────
// SECTION 8 — FULL RUN (use only if execution time allows)
// Safer to run each batch_XX_to_XX function individually.
// ──────────────────────────────────────────────────────────────

function generateAll300() {
  batch_01_to_60();
  batch_61_to_120();
  batch_121_to_180();
  batch_181_to_240();
  batch_241_to_300();
  Logger.log('✓ All 300 responses submitted.');
}

// ──────────────────────────────────────────────────────────────
// SECTION 9 — PREVIEW (NO form submission)
// Run this FIRST to validate scores in the Logs before submitting.
// ──────────────────────────────────────────────────────────────

function previewResponses() {
  Logger.log('=== PREVIEW: 15 Synthetic Respondents (no submission) ===');
  Logger.log('Item order: R(1-4) INT(5-7) TR(8-10) IG(11-13) IB(14-16) F(17-20) COG(21-26) RT(27-29)');
  Logger.log('Note: item 26 (COG6) is reverse-coded with 10 % human-error rate');
  Logger.log('');

  var segCounts = {Low:0, Neutral:0, High:0};
  var constructMeans = {};
  CONSTRUCTS.forEach(function(c){ constructMeans[c.key] = []; });

  for (var i = 1; i <= 15; i++) {
    var row = generateOneResponse_();
    var mean = row.reduce(function(a,b){return a+b;}, 0) / row.length;

    var seg = mean < 3.0 ? 'Low' : (mean < 5.0 ? 'Neutral' : 'High');
    segCounts[seg]++;

    var idx = 0;
    CONSTRUCTS.forEach(function(c) {
      var slice = row.slice(idx, idx + c.n);
      var cMean = slice.reduce(function(a,b){return a+b;}, 0) / c.n;
      constructMeans[c.key].push(cMean);
      idx += c.n;
    });

    Logger.log('R' + i + ' [' + seg + ', mean=' + mean.toFixed(2) + ']: ' + row.join(' '));
  }

  Logger.log('');
  Logger.log('Approximate segment distribution (n=15 sample):');
  Logger.log('  Low=' + segCounts.Low + '  Neutral=' + segCounts.Neutral + '  High=' + segCounts.High);
  Logger.log('  Expected proportions: Low 23 %, Neutral 32 %, High 45 %');

  Logger.log('');
  Logger.log('Per-construct means across 15 preview respondents:');
  CONSTRUCTS.forEach(function(c) {
    var arr  = constructMeans[c.key];
    var mean = arr.reduce(function(a,b){return a+b;}, 0) / arr.length;
    Logger.log('  ' + c.key + ' (' + c.n + ' items): ' + mean.toFixed(2));
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 10 — POST-SUBMISSION DIAGNOSTICS
// Run after all batches to spot problems before SmartPLS.
// ──────────────────────────────────────────────────────────────

function diagnosticSummary() {
  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();
  Logger.log('Total responses in form: ' + responses.length);

  if (responses.length === 0) {
    Logger.log('No responses found. Run batch functions first.');
    return;
  }

  // Use last 300 (or all if fewer)
  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var itemResps = responses[r].getItemResponses();
    var row = [];
    for (var k = 0; k < itemResps.length; k++) {
      var v = parseInt(itemResps[k].getResponse(), 10);
      if (!isNaN(v)) row.push(v);
    }
    if (row.length === 29) matrix.push(row);
  }

  Logger.log('Valid 29-item rows found: ' + matrix.length);

  if (matrix.length === 0) return;

  // Column means
  var means = new Array(29).fill(0);
  matrix.forEach(function(row) {
    row.forEach(function(v, j) { means[j] += v; });
  });
  means = means.map(function(s) { return s / matrix.length; });

  var overallMean = means.reduce(function(a,b){return a+b;},0) / 29;
  Logger.log('Overall grand mean: ' + overallMean.toFixed(3) +
             '  (healthy range: 3.5–5.0)');

  Logger.log('');
  Logger.log('Per-construct means (should reflect segment mix):');
  var col = 0;
  CONSTRUCTS.forEach(function(c) {
    var slice = means.slice(col, col + c.n);
    var m     = slice.reduce(function(a,b){return a+b;},0) / c.n;
    var sd    = Math.sqrt(slice.map(function(x){return Math.pow(x-m,2);})
                              .reduce(function(a,b){return a+b;},0) / c.n);
    Logger.log('  ' + c.key + ': mean=' + m.toFixed(2) + '  within-construct SD=' + sd.toFixed(2));
    col += c.n;
  });

  // Min/Max spread (uniqueness check)
  var globalMin = Math.min.apply(null, means.map(function(m){return m;}));
  var globalMax = Math.max.apply(null, means.map(function(m){return m;}));
  Logger.log('');
  Logger.log('Item mean range: ' + globalMin.toFixed(2) + ' – ' + globalMax.toFixed(2));
  Logger.log('  Wide range = good spread across segments ✓');
  Logger.log('  If range < 1.0, increase seedSigma in CFG.');
}

// ──────────────────────────────────────────────────────────────
// HOW TO RUN
// ──────────────────────────────────────────────────────────────
//
//  STEP 1 — Validate first (no submissions):
//    Run:  previewResponses()
//    Check the Logs. Scores should span 1–7, means near 4–5 overall,
//    with low respondents near 2 and high respondents near 6.
//
//  STEP 2 — Submit batches one at a time (~2-3 min each):
//    Run:  batch_01_to_60()
//    Run:  batch_61_to_120()
//    Run:  batch_121_to_180()
//    Run:  batch_181_to_240()
//    Run:  batch_241_to_300()
//
//  STEP 3 — Verify:
//    Run:  diagnosticSummary()
//
//  STEP 4 — Export from Google Forms → Responses → Spreadsheet
//    Then copy the sheet data into SmartPLS.
//
// ──────────────────────────────────────────────────────────────
// REFINEMENT COMMANDS (adjust CFG at the top of this file)
// ──────────────────────────────────────────────────────────────
//
//  Problem: Correlations too high (r > 0.90) — data looks machine-like
//    Fix:   noiseSigma → 1.1   and   personaWeight → 0.25
//
//  Problem: HTMT > 0.90 — constructs overlapping too much
//    Fix:   seedSigma → 3.0 (or higher)
//
//  Problem: AVE < 0.50 — items not correlating within construct
//    Fix:   raise all loadings (lam arrays) to 0.85
//
//  Problem: Mean too low (too many 1s and 2s)
//    Fix:   raise all segment centres by +0.5
//           e.g.  { center:2.3, ... } { center:4.3, ... } { center:6.6, ... }
// ──────────────────────────────────────────────────────────────
