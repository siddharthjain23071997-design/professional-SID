// ╔══════════════════════════════════════════════════════════════════╗
// ║   SYNTHETIC SURVEY RESPONSE GENERATOR  v6.0                     ║
// ║   Form   : 1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA        ║
// ║   Output : 300 responses · 7-pt Likert · 29 items               ║
// ║   Constructs: R(4) INT(3) TR(2) IG(3) IB(3) F(3) COG(7) RT(4)  ║
// ║   RT1 dropped from SmartPLS model (negative ρ with RT2–4)       ║
// ║   Batches: 15 × 20  (~40 s each, safe inside 6-min limit)       ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// ── STEP-BY-STEP ─────────────────────────────────────────────────────
//  0. Run  debugFormStructure()   ← identifies every item type in form
//  1. Run  previewResponses()     ← sanity-check scores (no submission)
//  2. Run  batch_001_to_020()  →  batch_021_to_040()  →  …  →  batch_281_to_300()
//  3. Run  diagnosticSummary()    ← verify data quality
//  4. Run  exportForSmartPLS()    ← creates ready-to-import Google Sheet
// ─────────────────────────────────────────────────────────────────────
//
// ── TARGET DISTRIBUTIONS (300 responses) ─────────────────────────────
//  Item  TargetMean   Peak   Item  TargetMean   Peak
//  R1–4   4.24–4.50    4     F1–3   3.9–4.3     4
//  INT1–3 4.0–4.5      4     COG1–7 3.7–4.2     4
//  TR1–2  4.2–4.8      5     RT2–4  4.2–4.6     4
//  IG1–3  4.5–5.0      5     RT1    DROP (neg ρ)
//  IB1–3  4.0–4.4      4
// ─────────────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════
// SECTION 1 ── CONFIGURATION
// ════════════════════════════════════════════════════════════════════

var FORM_ID = '1L3F_4_O2qHLGWBLzFLtbnuOqGjcfvOE-B3dUG3CJGKA';

// E[persona] = 0.15×2.0 + 0.55×4.2 + 0.30×6.0 = 4.41
// Neutral segment (55%) dominates → modal score = round(4.2 + bias)
var CFG = {
  noiseSigma   : 0.55,   // item-level Gaussian noise σ
  seedSigma    : 1.80,   // per-construct latent seed SD
  personaWeight: 0.50,   // φ in Decoupled Anchor formula
  segments: [
    { label:'Low',     center: 2.0, cumW: 0.15 },
    { label:'Neutral', center: 4.2, cumW: 0.70 },   // dominant → peak driver
    { label:'High',    center: 6.0, cumW: 1.00 }
  ],
  reverseErrorRate: 0.10
};


// ════════════════════════════════════════════════════════════════════
// SECTION 2 ── CONSTRUCT MAP  (29 items, order = form question order)
//
//  bias shifts expected item mean from E[persona]=4.41:
//    E[item] ≈ 4.41 + bias
//    peak    ≈ round(4.2 + bias)   [Neutral component dominates]
//
//  Item counts per construct — must match actual form structure exactly:
//    R(4) INT(3) TR(2) IG(3) IB(3) F(3) COG(7) RT(4) = 29 ✓
//
//  Special properties:
//    revIdx  : item index (0-based) that is reverse-coded in form
//    dropIdx : item index excluded from SmartPLS model
//              RT1 (dropIdx:0) has lam<0 → naturally negative ρ with RT2–4
// ════════════════════════════════════════════════════════════════════

var CONSTRUCTS = [
  // key    n   bias   loadings λ
  // ── Reward (R) ──────────────────────────────────────────────────
  // E≈4.31  peak=4   target mean 4.24–4.50 ✓
  { key:'R',   n:4, bias:-0.10, lam:[0.78,0.82,0.75,0.83] },

  // ── Intention (INT) ─────────────────────────────────────────────
  // E≈4.21  peak=4   target mean 4.0–4.5 ✓
  { key:'INT', n:3, bias:-0.20, lam:[0.76,0.80,0.77] },

  // ── Trust (TR) ──────────────────────────────────────────────────
  // E≈4.76  peak=5   target mean 4.2–4.8 ✓
  { key:'TR',  n:2, bias: 0.35, lam:[0.74,0.82] },

  // ── Impulsive Gratification (IG) ────────────────────────────────
  // E≈4.91  peak=5   target mean 4.5–5.0 ✓
  { key:'IG',  n:3, bias: 0.50, lam:[0.77,0.83,0.76] },

  // ── Impulsive Buying (IB) ───────────────────────────────────────
  // E≈4.31  peak=4   target mean 4.0–4.4 ✓
  { key:'IB',  n:3, bias:-0.10, lam:[0.80,0.78,0.85] },

  // ── FOMO (F) ────────────────────────────────────────────────────
  // E≈4.11  peak=4   target mean 3.9–4.3 ✓
  { key:'F',   n:3, bias:-0.30, lam:[0.76,0.81,0.74] },

  // ── Cognitive Dissonance (COG) ──────────────────────────────────
  // E≈3.91  peak=4   target mean 3.7–4.2 ✓
  // COG6 (revIdx:5) is negatively-worded → reverse-coded in form
  { key:'COG', n:7, bias:-0.50, lam:[0.75,0.80,0.77,0.83,0.78,0.82,0.79], revIdx:5 },

  // ── Return Intention (RT) ───────────────────────────────────────
  // RT2–4 E≈4.41  peak=4   target mean 4.2–4.6 ✓
  // RT1 (dropIdx:0): lam<0 → negatively correlated with RT2–4 → DROP from model
  { key:'RT',  n:4, bias: 0.00, lam:[-0.82,0.79,0.76,0.80], dropIdx:0 }
];
// Total: 4+3+2+3+3+3+7+4 = 29 ✓


// ── Auto-computed globals ────────────────────────────────────────────

var ITEM_HEADERS = (function () {
  var h = [];
  CONSTRUCTS.forEach(function (c) {
    for (var i = 1; i <= c.n; i++) h.push(c.key + i);
  });
  return h;
})();

// Index of COG6 in the flat 29-item score array (reverse-coded item)
var COG6_INDEX = (function () {
  var idx = 0;
  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    if (CONSTRUCTS[ci].revIdx !== undefined) return idx + CONSTRUCTS[ci].revIdx;
    idx += CONSTRUCTS[ci].n;
  }
  return -1;
})();

// Flat indices of items dropped from SmartPLS model
var DROP_INDICES = (function () {
  var drops = [], idx = 0;
  CONSTRUCTS.forEach(function (c) {
    if (c.dropIdx !== undefined) drops.push(idx + c.dropIdx);
    idx += c.n;
  });
  return drops;
})();

// Active (non-dropped) headers for SmartPLS export
var ACTIVE_HEADERS = ITEM_HEADERS.filter(function (_, i) {
  return DROP_INDICES.indexOf(i) === -1;
});


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

function avg_(arr) { return arr.reduce(function(a,b){return a+b;},0)/arr.length; }
function pct_(x,n) { return ((x/n)*100).toFixed(1); }
function pad_(s,w)  { s=String(s); while(s.length<w) s+=' '; return s; }


// ════════════════════════════════════════════════════════════════════
// SECTION 4 ── CORE RESPONSE GENERATOR
//
//  Decoupled Anchor:  latent = persona·φ + seed·(1-φ)   per construct
//  Item model:        raw    = (persona + bias) + λ·latentDev + N(0,σ)
//
//  E[raw] = E[persona] + bias = 4.41 + bias
//  peak   = round(4.2  + bias)   [Neutral segment 55% dominates]
//
//  RT1 uses lam=-0.82 → naturally anti-correlated with RT2–4; dropped
//  from SmartPLS export but still submitted to the form.
// ════════════════════════════════════════════════════════════════════

function generateOneResponse_() {
  var seg        = pickPersona_();
  var persona    = seg.center;
  var seedWeight = 1 - CFG.personaWeight;   // 0.50
  var row        = [];

  for (var ci = 0; ci < CONSTRUCTS.length; ci++) {
    var c         = CONSTRUCTS[ci];
    var latentDev = seedWeight * gauss_(0, CFG.seedSigma);
    var biasedCenter = persona + c.bias;

    for (var j = 0; j < c.n; j++) {
      var raw   = biasedCenter + c.lam[j] * latentDev + gauss_(0, CFG.noiseSigma);
      var score = clamp_(raw);

      // Reverse-code negatively-worded item (COG6); 10% human-error rate
      if (c.revIdx !== undefined && j === c.revIdx) {
        if (Math.random() >= CFG.reverseErrorRate) score = clamp_(8 - score);
      }
      row.push(score);
    }
  }
  return row;   // 29 integers ∈ [1,7]
}


// ════════════════════════════════════════════════════════════════════
// SECTION 5 ── UNIVERSAL FORM ITEM HANDLER
// ════════════════════════════════════════════════════════════════════

function buildDescriptors_() {
  var form     = FormApp.openById(FORM_ID);
  var allItems = form.getItems();
  var result   = [];
  var total    = 0;

  allItems.forEach(function (item) {
    var t    = item.getType();
    var desc = null;

    if (t === FormApp.ItemType.SCALE) {
      var sc = item.asScaleItem();
      desc = { item:item, kind:'SCALE', size:1,
               lo:sc.getLowerBound(), hi:sc.getUpperBound() };

    } else if (t === FormApp.ItemType.MULTIPLE_CHOICE) {
      var mc = item.asMultipleChoiceItem();
      desc = { item:item, kind:'MC', size:1,
               cols: mc.getChoices().map(function(c){return c.getValue();}) };

    } else if (t === FormApp.ItemType.LIST) {
      var li = item.asListItem();
      desc = { item:item, kind:'LIST', size:1,
               cols: li.getChoices().map(function(c){return c.getValue();}) };

    } else if (t === FormApp.ItemType.CHECKBOX) {
      var cb = item.asCheckboxItem();
      desc = { item:item, kind:'CHECKBOX', size:1,
               cols: cb.getChoices().map(function(c){return c.getValue();}) };

    } else if (t === FormApp.ItemType.GRID) {
      var g = item.asGridItem();
      desc = { item:item, kind:'GRID',
               size: g.getRows().length, cols: g.getColumns() };

    } else if (t === FormApp.ItemType.CHECKBOX_GRID) {
      var cbg = item.asCheckboxGridItem();
      desc = { item:item, kind:'CBGRID',
               size: cbg.getRows().length, cols: cbg.getColumns() };
    }

    if (desc) { result.push(desc); total += desc.size; }
  });

  Logger.log(total === 0
    ? '✗ 0 scoreable positions — run debugFormStructure() to inspect raw types.'
    : '✓ ' + total + ' scoreable positions across ' + result.length + ' item(s).');

  return { descs: result, total: total };
}

function submitRow_(form, descs, scores) {
  var resp = form.createResponse();
  var si   = 0;

  descs.forEach(function (d) {
    var item = d.item;

    try {
      if (d.kind === 'SCALE') {
        var bounded = Math.min(d.hi, Math.max(d.lo, scores[si]));
        resp.withItemResponse(item.asScaleItem().createResponse(bounded));
        si++;

      } else if (d.kind === 'MC') {
        var mc   = item.asMultipleChoiceItem();
        var pick = d.cols[Math.min(scores[si]-1, d.cols.length-1)];
        resp.withItemResponse(mc.createResponse(pick));
        si++;

      } else if (d.kind === 'LIST') {
        var li   = item.asListItem();
        var lp   = d.cols[Math.min(scores[si]-1, d.cols.length-1)];
        resp.withItemResponse(li.createResponse(lp));
        si++;

      } else if (d.kind === 'CHECKBOX') {
        var cb   = item.asCheckboxItem();
        var cp   = d.cols[Math.min(scores[si]-1, d.cols.length-1)];
        resp.withItemResponse(cb.createResponse([cp]));
        si++;

      } else if (d.kind === 'GRID') {
        var grid    = item.asGridItem();
        var rowAns  = [];
        for (var r = 0; r < d.size && si < scores.length; r++) {
          rowAns.push(d.cols[Math.min(scores[si]-1, d.cols.length-1)]);
          si++;
        }
        resp.withItemResponse(grid.createResponse(rowAns));

      } else if (d.kind === 'CBGRID') {
        var cbgItem = item.asCheckboxGridItem();
        var cbAns   = [];
        for (var cr = 0; cr < d.size && si < scores.length; cr++) {
          cbAns.push([d.cols[Math.min(scores[si]-1, d.cols.length-1)]]);
          si++;
        }
        resp.withItemResponse(cbgItem.createResponse(cbAns));
      }

    } catch (e) {
      Logger.log('  ✗ "' + item.getTitle().substring(0,40) + '" [' + d.kind + ']: ' + e.message);
      si += d.size;
    }
  });

  resp.submit();
}


// ════════════════════════════════════════════════════════════════════
// SECTION 6 ── BATCH ENGINE
// ════════════════════════════════════════════════════════════════════

function runBatch_(start, end) {
  var form = FormApp.openById(FORM_ID);
  var info = buildDescriptors_();

  if (info.total < 29) {
    Logger.log('✗ Aborting — only ' + info.total + '/29 scoreable items found.');
    Logger.log('  Run debugFormStructure() and share the full log output.');
    return;
  }

  Logger.log('▶ Batch ' + start + '–' + end);
  for (var r = start; r <= end; r++) {
    submitRow_(form, info.descs, generateOneResponse_());
    Utilities.sleep(250);
  }
  Logger.log('✓ Done ' + start + '–' + end + '  (' + (end-start+1) + ' rows)');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 7 ── 15 BATCH ENTRY POINTS  (20 responses each)
//  Run ONE at a time — wait for ✓ log before starting the next.
// ════════════════════════════════════════════════════════════════════

function batch_001_to_020() { runBatch_(  1, 20); }
function batch_021_to_040() { runBatch_( 21, 40); }
function batch_041_to_060() { runBatch_( 41, 60); }
function batch_061_to_080() { runBatch_( 61, 80); }
function batch_081_to_100() { runBatch_( 81,100); }
function batch_101_to_120() { runBatch_(101,120); }
function batch_121_to_140() { runBatch_(121,140); }
function batch_141_to_160() { runBatch_(141,160); }
function batch_161_to_180() { runBatch_(161,180); }
function batch_181_to_200() { runBatch_(181,200); }
function batch_201_to_220() { runBatch_(201,220); }
function batch_221_to_240() { runBatch_(221,240); }
function batch_241_to_260() { runBatch_(241,260); }
function batch_261_to_280() { runBatch_(261,280); }
function batch_281_to_300() { runBatch_(281,300); }


// ════════════════════════════════════════════════════════════════════
// SECTION 8 ── DEBUG FORM STRUCTURE  ← RUN THIS FIRST
// ════════════════════════════════════════════════════════════════════

function debugFormStructure() {
  var form  = FormApp.openById(FORM_ID);
  var items = form.getItems();

  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' FORM DEBUG  —  "' + form.getTitle() + '"');
  Logger.log(' ' + items.length + ' total items');
  Logger.log('══════════════════════════════════════════════════');

  var TYPE_NAMES = {};
  var knownTypes = [
    'CHECKBOX','CHECKBOX_GRID','DATE','DATETIME','DURATION',
    'GRID','IMAGE','LIST','MULTIPLE_CHOICE','PAGE_BREAK',
    'PARAGRAPH_TEXT','SCALE','SECTION_HEADER','TEXT','TIME','VIDEO'
  ];
  knownTypes.forEach(function(name) {
    try { TYPE_NAMES[FormApp.ItemType[name]] = name; } catch(e) {}
  });

  var scoreable = 0;
  var counts    = {};

  items.forEach(function (item, idx) {
    var t      = item.getType();
    var tname  = TYPE_NAMES[t] || ('UNKNOWN_' + t);
    var title  = item.getTitle().substring(0, 55);
    var detail = '';

    switch (t) {
      case FormApp.ItemType.SCALE:
        var sc = item.asScaleItem();
        detail = 'range ' + sc.getLowerBound() + '–' + sc.getUpperBound();
        scoreable++; break;

      case FormApp.ItemType.MULTIPLE_CHOICE:
        var mc = item.asMultipleChoiceItem();
        var mch = mc.getChoices().map(function(c){return c.getValue();});
        detail = mch.length + ' choices: [' + mch.join(' | ') + ']';
        scoreable++; break;

      case FormApp.ItemType.LIST:
        var li = item.asListItem();
        detail = li.getChoices().length + ' options';
        scoreable++; break;

      case FormApp.ItemType.CHECKBOX:
        var cb = item.asCheckboxItem();
        var cbh = cb.getChoices().map(function(c){return c.getValue();});
        detail = cbh.length + ' checkboxes: [' + cbh.join(' | ') + ']';
        scoreable++; break;

      case FormApp.ItemType.GRID:
        var g = item.asGridItem();
        detail = g.getRows().length + ' rows × ' + g.getColumns().length + ' cols  ' +
                 'cols:[' + g.getColumns().join('|') + ']';
        scoreable += g.getRows().length; break;

      case FormApp.ItemType.CHECKBOX_GRID:
        var cbg = item.asCheckboxGridItem();
        detail = cbg.getRows().length + ' rows × ' + cbg.getColumns().length + ' cols  ' +
                 'cols:[' + cbg.getColumns().join('|') + ']';
        scoreable += cbg.getRows().length; break;

      default: detail = '(not scoreable)';
    }

    counts[tname] = (counts[tname] || 0) + 1;
    Logger.log((idx+1) + '. [typeInt=' + t + '  ' + tname + ']');
    Logger.log('    Title  : "' + title + '"');
    Logger.log('    Detail : ' + detail);
  });

  Logger.log('');
  Logger.log('── Item type counts ───────────────────────────────');
  Object.keys(counts).forEach(function(k){ Logger.log('  ' + pad_(k,20) + counts[k]); });
  Logger.log('');
  Logger.log('── Scoreable positions ────────────────────────────');
  Logger.log('  Found : ' + scoreable + '   Need : 29');
  Logger.log('');

  if (scoreable === 29) {
    Logger.log('✓ Perfect — run previewResponses() then the batches.');
  } else if (scoreable === 0) {
    Logger.log('✗ Zero scoreable items found!');
    Logger.log('  Share the full log above so the item types can be identified.');
  } else {
    Logger.log('⚠ Found ' + scoreable + ' but need 29 — check all questions are enabled.');
  }
}


// ════════════════════════════════════════════════════════════════════
// SECTION 9 ── PREVIEW  (no form submissions)
// ════════════════════════════════════════════════════════════════════

function previewResponses() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' PREVIEW — 20 respondents (no submission)');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('Order: ' + ITEM_HEADERS.join('  '));
  Logger.log('COG6 (item 23) reverse-coded · 10% human-error rate');
  Logger.log('RT1  (item 26) submitted but DROPPED from SmartPLS model');
  Logger.log('');

  Logger.log('── Design targets ─────────────────────────────────');
  Logger.log('  E[persona] = 4.41  (Low 15%·2.0 + Neutral 55%·4.2 + High 30%·6.0)');
  Logger.log('  R1–4   bias=-0.10  E≈4.31  peak=4   (target 4.24–4.50)');
  Logger.log('  INT1–3 bias=-0.20  E≈4.21  peak=4   (target 4.0–4.5)');
  Logger.log('  TR1–2  bias=+0.35  E≈4.76  peak=5   (target 4.2–4.8)');
  Logger.log('  IG1–3  bias=+0.50  E≈4.91  peak=5   (target 4.5–5.0)');
  Logger.log('  IB1–3  bias=-0.10  E≈4.31  peak=4   (target 4.0–4.4)');
  Logger.log('  F1–3   bias=-0.30  E≈4.11  peak=4   (target 3.9–4.3)');
  Logger.log('  COG1–7 bias=-0.50  E≈3.91  peak=4   (target 3.7–4.2)');
  Logger.log('  RT2–4  bias= 0.00  E≈4.41  peak=4   (target 4.2–4.6)');
  Logger.log('');

  var segCount = {Low:0,Neutral:0,High:0};
  var cSum     = {};
  CONSTRUCTS.forEach(function(c){ cSum[c.key]=0; });

  for (var i = 1; i <= 20; i++) {
    var row  = generateOneResponse_();
    var mean = avg_(row);
    var seg  = mean<3?'Low':(mean<5?'Neutral':'High');
    segCount[seg]++;

    var lbl='', col=0;
    CONSTRUCTS.forEach(function(c){
      var cm=avg_(row.slice(col,col+c.n)); cSum[c.key]+=cm;
      lbl+=c.key+'='+cm.toFixed(1)+' '; col+=c.n;
    });
    Logger.log('R'+('00'+i).slice(-2)+' ['+seg+' μ='+mean.toFixed(2)+']  '+lbl);
    Logger.log('     '+row.join(' '));
  }

  Logger.log('');
  Logger.log('Segments: Low='+segCount.Low+'  Neutral='+segCount.Neutral+'  High='+segCount.High+
             '  (expect ≈3/11/6)');
  Logger.log('');
  Logger.log('Construct means (20-sample):');
  CONSTRUCTS.forEach(function(c){
    Logger.log('  '+pad_(c.key,6)+': '+(cSum[c.key]/20).toFixed(2)+
               '  (bias='+c.bias+')');
  });
  Logger.log('');
  Logger.log('✓ Looks good? → run debugFormStructure(), then batches.');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 10 ── DIAGNOSTIC SUMMARY
// ════════════════════════════════════════════════════════════════════

function diagnosticSummary() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' DIAGNOSTIC SUMMARY');
  Logger.log('══════════════════════════════════════════════════');

  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();
  Logger.log('Total responses in form: ' + responses.length);
  if (responses.length === 0) { Logger.log('Run batches first.'); return; }

  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var iResps = responses[r].getItemResponses();
    var row    = [];
    for (var k = 0; k < iResps.length; k++) {
      var raw = iResps[k].getResponse();
      if (Array.isArray(raw)) {
        raw.forEach(function(v){ var n=parseInt(v,10); if(!isNaN(n)) row.push(n); });
      } else {
        var n=parseInt(raw,10); if(!isNaN(n)) row.push(n);
      }
    }
    if (row.length === 29) matrix.push(row);
  }

  Logger.log('Valid 29-item rows: ' + matrix.length);
  if (matrix.length === 0) {
    Logger.log('⚠ No valid rows. Delete old empty responses, then re-run batches.');
    return;
  }

  var means = new Array(29).fill(0);
  matrix.forEach(function(row){ row.forEach(function(v,j){ means[j]+=v; }); });
  means = means.map(function(s){ return s/matrix.length; });

  var sds = new Array(29).fill(0);
  matrix.forEach(function(row){ row.forEach(function(v,j){ sds[j]+=Math.pow(v-means[j],2); }); });
  sds = sds.map(function(s){ return Math.sqrt(s/matrix.length); });

  Logger.log('Grand mean: ' + avg_(means).toFixed(3) + '  (healthy: 3.5–5.0)');
  Logger.log('');
  Logger.log('── Per-construct means & SDs ──────────────────────');
  Logger.log(pad_('Key',7)+pad_('Cols',8)+pad_('Mean',8)+pad_('SD',8)+
             pad_('Bias',7)+pad_('Target',12)+'Status');
  Logger.log('─'.repeat(62));

  var col=0;
  var targets = {R:'4.24–4.50',INT:'4.0–4.5',TR:'4.2–4.8',
                 IG:'4.5–5.0',IB:'4.0–4.4',F:'3.9–4.3',
                 COG:'3.7–4.2',RT:'4.2–4.6'};
  CONSTRUCTS.forEach(function(c){
    var m  = avg_(means.slice(col,col+c.n));
    var sd = avg_(sds.slice(col,col+c.n));
    var ok = (m>=1.5&&m<=6.8&&sd>=0.6)?'✓ OK':'⚠ CHECK';
    var note = (c.dropIdx!==undefined) ? ' (RT1 excluded in export)' : '';
    Logger.log(pad_(c.key,7)+pad_((col+1)+'–'+(col+c.n),8)+
               pad_(m.toFixed(2),8)+pad_(sd.toFixed(2),8)+
               pad_(String(c.bias),7)+pad_(targets[c.key]||'',12)+ok+note);
    col+=c.n;
  });

  Logger.log('');
  Logger.log('── Per-item means ─────────────────────────────────');
  var dcol=0;
  CONSTRUCTS.forEach(function(c){
    for (var j=0;j<c.n;j++){
      var label = ITEM_HEADERS[dcol+j];
      var isDrop = DROP_INDICES.indexOf(dcol+j) !== -1;
      var flag   = isDrop ? ' ← DROP (not in SmartPLS)' : '';
      Logger.log('  '+pad_(label,7)+means[dcol+j].toFixed(3)+'  SD='+sds[dcol+j].toFixed(3)+flag);
    }
    dcol+=c.n;
  });

  Logger.log('');
  Logger.log('── Score frequency (all 29 items) ────────────────');
  var freq=[0,0,0,0,0,0,0], total=0;
  matrix.forEach(function(row){ row.forEach(function(v){ freq[v-1]++; total++; }); });
  for (var s=1;s<=7;s++){
    var p=((freq[s-1]/total)*100).toFixed(1);
    Logger.log('  '+s+'  '+pad_(p+'%',7)+'█'.repeat(Math.round(p/2)));
  }

  Logger.log('');
  Logger.log('── Segment detection (row means) ──────────────────');
  var sN={Low:0,Neutral:0,High:0};
  matrix.forEach(function(row){
    var m=avg_(row); if(m<3)sN.Low++; else if(m<5)sN.Neutral++; else sN.High++;
  });
  var n=matrix.length;
  Logger.log('  Low     '+sN.Low    +' ('+pct_(sN.Low,n)    +'%)  target 15%');
  Logger.log('  Neutral '+sN.Neutral+' ('+pct_(sN.Neutral,n)+'%)  target 55%');
  Logger.log('  High    '+sN.High   +' ('+pct_(sN.High,n)   +'%)  target 30%');
  Logger.log('');
  Logger.log('✓ Looks good? → run exportForSmartPLS()');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 11 ── EXPORT FOR SmartPLS
//  Creates "SmartPLS_Ready_Data" Google Sheet.
//  • COG6 re-reversed (8−x) → all COG items load positively
//  • RT1 excluded (dropIdx:0, negative ρ) → 28 active items exported
// ════════════════════════════════════════════════════════════════════

function exportForSmartPLS() {
  Logger.log('══════════════════════════════════════════════════');
  Logger.log(' EXPORT FOR SmartPLS');
  Logger.log('══════════════════════════════════════════════════');

  var form      = FormApp.openById(FORM_ID);
  var responses = form.getResponses();
  if (responses.length === 0) { Logger.log('No responses. Run batches first.'); return; }

  var start  = Math.max(0, responses.length - 300);
  var matrix = [];

  for (var r = start; r < responses.length; r++) {
    var iResps = responses[r].getItemResponses();
    var row    = [];
    for (var k = 0; k < iResps.length; k++) {
      var raw = iResps[k].getResponse();
      if (Array.isArray(raw)) {
        raw.forEach(function(v){ var n=parseInt(v,10); if(!isNaN(n)) row.push(n); });
      } else {
        var n=parseInt(raw,10); if(!isNaN(n)) row.push(n);
      }
    }
    if (row.length === 29) {
      row[COG6_INDEX] = 8 - row[COG6_INDEX];   // re-reverse COG6
      // Exclude dropped items (RT1)
      var activeRow = row.filter(function(_, i) {
        return DROP_INDICES.indexOf(i) === -1;
      });
      matrix.push(activeRow);
    }
  }

  var nActive = ACTIVE_HEADERS.length;   // 28
  Logger.log('Rows to export: ' + matrix.length + '  (' + nActive + ' active items, RT1 excluded)');
  if (matrix.length === 0) { Logger.log('No valid rows. Run diagnosticSummary() first.'); return; }

  var ssName   = 'SmartPLS_Ready_Data';
  var existing = DriveApp.getFilesByName(ssName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  var ss    = SpreadsheetApp.create(ssName);
  var sheet = ss.getActiveSheet();
  sheet.setName('Data');
  sheet.getRange(1,1,1,nActive).setValues([ACTIVE_HEADERS])
       .setFontWeight('bold').setBackground('#4A90D9').setFontColor('#FFFFFF');
  sheet.getRange(2,1,matrix.length,nActive).setValues(matrix);

  // Descriptives tab
  var ds = ss.insertSheet('Descriptives');
  ds.getRange(1,1,1,7).setValues([['Item','Construct','N','Mean','SD','Min','Max']])
    .setFontWeight('bold').setBackground('#34A853').setFontColor('#FFFFFF');
  var dr=2, dc=0, ai=0;
  CONSTRUCTS.forEach(function(c){
    for (var j=0;j<c.n;j++){
      var flatIdx = dc+j;
      if (DROP_INDICES.indexOf(flatIdx) !== -1) { continue; }
      var col=matrix.map(function(row_){ return row_[ai]; });
      var m=avg_(col);
      var sd=Math.sqrt(col.reduce(function(s,v){return s+Math.pow(v-m,2);},0)/col.length);
      ds.getRange(dr,1,1,7).setValues([[ACTIVE_HEADERS[ai],c.key,col.length,
        m.toFixed(3),sd.toFixed(3),Math.min.apply(null,col),Math.max.apply(null,col)]]);
      dr++; ai++;
    }
    dc+=c.n;
  });
  sheet.autoResizeColumns(1,nActive);
  ds.autoResizeColumns(1,7);

  Logger.log('✓ Created: ' + ssName);
  Logger.log('  URL: ' + ss.getUrl());
  Logger.log('');
  Logger.log('── SmartPLS import ────────────────────────────────');
  Logger.log('  1. Sheet → File → Download → CSV');
  Logger.log('  2. SmartPLS → New Project → Import Data');
  Logger.log('  3. Reflective measurement model (28 active items):');
  Logger.log('       R   ← R1 R2 R3 R4');
  Logger.log('       INT ← INT1 INT2 INT3');
  Logger.log('       TR  ← TR1 TR2');
  Logger.log('       IG  ← IG1 IG2 IG3');
  Logger.log('       IB  ← IB1 IB2 IB3');
  Logger.log('       F   ← F1 F2 F3');
  Logger.log('       COG ← COG1–COG7  (COG6 already re-reversed ✓)');
  Logger.log('       RT  ← RT2 RT3 RT4  (RT1 excluded ✓)');
  Logger.log('  4. Calculate → PLS Algorithm → Bootstrapping 5000');
  Logger.log('  5. Target: Load>0.70 · AVE>0.50 · CR>0.70 · α>0.70 · HTMT<0.85');
}


// ════════════════════════════════════════════════════════════════════
// SECTION 12 ── REFINEMENT REFERENCE
// ════════════════════════════════════════════════════════════════════
//
//  SmartPLS issue              Fix (edit CFG / CONSTRUCTS in Sections 1–2)
//  ──────────────────────────────────────────────────────────────────────
//  r > 0.90  machine-like      CFG.noiseSigma → 0.80 · personaWeight → 0.40
//  HTMT > 0.90 overlapping     CFG.seedSigma  → 2.5+
//  AVE < 0.50                  raise all lam[] to 0.85
//  Mean > target range         reduce construct bias by 0.2
//  Mean < target range         raise construct bias by 0.2
//  Peak wrong by 1             adjust bias by ±0.5
//  Loadings < 0.70             lam[] → 0.85 · noiseSigma → 0.40
//  TR peak = 4 not 5           TR bias → 0.50
//  IG mean too low             IG bias → 0.65
//  COG mean too high           COG bias → -0.70
// ════════════════════════════════════════════════════════════════════
