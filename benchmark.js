/* =========================================================
   Wagegap — benchmark model (shared by /start and /dashboard).

   PILOT NOTE: real wage_reports volume is still near zero, so these are
   SEED estimates, not yet crowd-sourced medians. The model is intentionally
   transparent: a per-specialty base (median total $/hr at a 2–4 yr, day,
   hospital baseline) scaled by experience, shift, and employer-type factors.
   As real submissions accumulate, replace SPECIALTY_BASE / the factors with
   live aggregates per slice.
   ========================================================= */
window.WG = (function () {
  // Median TOTAL $/hr at: 2–4 yr band · Days · Hospital · pilot metro (Atlanta).
  const SPECIALTY_BASE = {
    "ICU": 47.7,
    "ER / Emergency": 47.0,
    "Med-Surg": 42.5,
    "Telemetry": 44.0,
    "Step-down / PCU": 45.0,
    "OR / Perioperative": 48.5,
    "PACU": 46.5,
    "Labor & Delivery": 47.0,
    "NICU": 48.0,
    "Oncology": 45.5,
    "Other": 44.0
  };

  const SHIFT_FACTOR = { "Days": 1.00, "Rotating": 1.05, "Nights": 1.08, "Weekends": 1.10 };
  const EMPLOYER_FACTOR = { "Hospital": 1.00, "Clinic / outpatient": 0.92, "Travel / agency": 1.45, "Other": 1.00 };

  // Distribution shape, as multiples of the slice median.
  const SPREAD = [ [10, 0.84], [25, 0.92], [50, 1.00], [75, 1.08], [90, 1.18] ];
  const ANNUAL_HOURS = 1872; // 36 hrs/week × 52

  function expBand(years) {
    if (years == null || isNaN(years)) return { label: "All experience", factor: 1.00 };
    if (years < 2)  return { label: "0–1 yr",   factor: 0.90 };
    if (years < 5)  return { label: "2–4 yr",   factor: 1.00 };
    if (years < 10) return { label: "5–9 yr",   factor: 1.10 };
    if (years < 20) return { label: "10–19 yr", factor: 1.18 };
    return { label: "20+ yr", factor: 1.24 };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function sliceMedian(r) {
    const base = SPECIALTY_BASE[r.specialty] != null ? SPECIALTY_BASE[r.specialty] : SPECIALTY_BASE["Other"];
    const ef = expBand(r.experience_years).factor;
    const sf = SHIFT_FACTOR[r.shift_type] != null ? SHIFT_FACTOR[r.shift_type] : 1.00;
    const pf = EMPLOYER_FACTOR[r.employer_type] != null ? EMPLOYER_FACTOR[r.employer_type] : 1.00;
    return base * ef * sf * pf;
  }

  // Returns [{p, amt}] high→low for charting.
  function anchors(median) {
    return SPREAD.map(function (s) { return { p: s[0], amt: median * s[1] }; })
                 .sort(function (a, b) { return b.p - a.p; });
  }

  function percentile(total, median) {
    const m = total / median;
    const pts = SPREAD; // [pct, mult] ascending by mult
    if (m <= pts[0][1]) {
      const slope = (pts[1][0] - pts[0][0]) / (pts[1][1] - pts[0][1]);
      return clamp(Math.round(pts[0][0] + (m - pts[0][1]) * slope), 2, 98);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      if (m <= pts[i + 1][1]) {
        const p1 = pts[i][0], m1 = pts[i][1], p2 = pts[i + 1][0], m2 = pts[i + 1][1];
        return clamp(Math.round(p1 + (m - m1) / (m2 - m1) * (p2 - p1)), 2, 98);
      }
    }
    const n = pts.length;
    const slope = (pts[n - 1][0] - pts[n - 2][0]) / (pts[n - 1][1] - pts[n - 2][1]);
    return clamp(Math.round(pts[n - 1][0] + (m - pts[n - 1][1]) * slope), 2, 98);
  }

  function verdict(pct) {
    if (pct < 35) return { tone: "under", headline: "You appear underpaid." };
    if (pct <= 65) return { tone: "fair", headline: "You're paid competitively." };
    return { tone: "above", headline: "You're paid above market." };
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function money(n) { return "$" + Number(n).toFixed(2); }
  function annual(n) { return "$" + Math.round(n * ANNUAL_HOURS).toLocaleString(); }

  // Full read for a wage report row.
  function read(r) {
    const total = Number(r.hourly_base || 0) + Number(r.differentials || 0);
    const median = sliceMedian(r);
    const p75 = median * 1.08;
    const pct = percentile(total, median);
    const pctDiff = Math.round((total / median - 1) * 100);
    const v = verdict(pct);
    return {
      total: total,
      median: median,
      p75: p75,
      pct: pct,
      pctDiff: pctDiff,
      gapToMedian: median - total,        // positive = below median
      tone: v.tone,
      headline: v.headline,
      band: expBand(r.experience_years)
    };
  }

  return {
    SPECIALTY_BASE: SPECIALTY_BASE,
    SHIFT_FACTOR: SHIFT_FACTOR,
    EMPLOYER_FACTOR: EMPLOYER_FACTOR,
    ANNUAL_HOURS: ANNUAL_HOURS,
    expBand: expBand,
    sliceMedian: sliceMedian,
    anchors: anchors,
    percentile: percentile,
    verdict: verdict,
    ordinal: ordinal,
    money: money,
    annual: annual,
    read: read
  };
})();
