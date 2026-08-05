// Profile evaluator: scoring runs entirely client-side. Submissions are optionally logged
// anonymously (no name/email/phone) to a Google Sheet for statistics, see saveEvaluationAnonymously below.
// Paste your Apps Script Web App URL here once deployed (see setup notes given alongside this change).
const GOOGLE_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyQdoCqp8T_Fpx903kdRxnA8QsYVyfqNPLDfFLydJpYqIKpN7pZ97YtUvx-GjmBgqjdmA/exec';

function saveEvaluationAnonymously(data, result) {
  if (!GOOGLE_SHEET_ENDPOINT || GOOGLE_SHEET_ENDPOINT.indexOf('PASTE_') === 0) return;
  try {
    fetch(GOOGLE_SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        country: data.country,
        degreeLevel: data.degreeLevel,
        fieldOfStudy: data.fieldOfStudy || '',
        cgpaScale: data.cgpaScale,
        cgpaValue: data.cgpaValue,
        testType: data.testType,
        testScore: data.testScore || '',
        experience: data.experience,
        verdict: result.verdict
      })
    });
  } catch (err) {
    // Never let a failed/blocked save affect the user's results.
  }
}

const COUNTRY_REQUIREMENTS = {
  germany: { label: 'Germany', minPercent: 65, idealPercent: 75, minIELTS: 6.0, idealIELTS: 6.5 },
  portugal: { label: 'Portugal', minPercent: 60, idealPercent: 70, minIELTS: 6.0, idealIELTS: 6.5 },
  uk: { label: 'the UK', minPercent: 60, idealPercent: 70, minIELTS: 6.0, idealIELTS: 6.5 }
};

const EXPERIENCE_POINTS = { none: 0, under1: 0.5, '1to2': 1, '2plus': 1 };
const EXPERIENCE_LABELS = {
  none: 'No experience yet in your field',
  under1: 'Less than 1 year of experience',
  '1to2': '1–2 years of experience',
  '2plus': '2+ years of experience'
};

// Field config per test type, and approximate conversion tables to an IELTS-equivalent band.
// Conversions are widely-published approximations, not official, exact scores vary by source.
const TEST_CONFIG = {
  ielts: {
    label: 'IELTS Overall Band Score',
    hint: "Enter your overall IELTS band score. We'll compare it directly against typical requirements.",
    min: 0, max: 9, step: 0.5, placeholder: 'e.g. 6.5'
  },
  toefl: {
    label: 'TOEFL iBT Total Score',
    hint: "Enter your total TOEFL iBT score (out of 120). We'll convert it to an approximate IELTS-equivalent band for you.",
    min: 0, max: 120, step: 1, placeholder: 'e.g. 92',
    table: [[118, 9.0], [115, 8.5], [110, 8.0], [102, 7.5], [94, 7.0], [79, 6.5], [60, 6.0], [46, 5.5], [35, 5.0], [32, 4.5]]
  },
  cambridge: {
    label: 'Cambridge English Scale Score',
    hint: "Enter your Cambridge English Scale score (found on your results, roughly 140–230). We'll convert it to an approximate IELTS-equivalent band.",
    min: 100, max: 230, step: 1, placeholder: 'e.g. 176',
    table: [[200, 9.0], [191, 8.5], [185, 8.0], [176, 7.5], [172, 7.0], [162, 6.5], [160, 6.0], [154, 5.5], [147, 5.0], [140, 4.5]]
  }
};

function convertToIELTSBand(testType, rawValue) {
  const num = parseFloat(rawValue);
  if (Number.isNaN(num)) return null;
  if (testType === 'ielts') return num;
  const config = TEST_CONFIG[testType];
  if (!config || !config.table) return null;
  for (const [threshold, band] of config.table) {
    if (num >= threshold) return band;
  }
  return 4.0; // below the lowest listed threshold
}

function normalizeCgpa(scale, value) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return 0;
  if (scale === '4') return (num / 4) * 100;
  if (scale === '10') return (num / 10) * 100;
  return num;
}

function scoreCgpa(percent, req) {
  if (percent >= req.idealPercent) return { points: 2, tier: 'exceeds' };
  if (percent >= req.minPercent) return { points: 1, tier: 'meets' };
  return { points: 0, tier: 'below' };
}

function scoreEnglish(testType, band, req) {
  if (testType === 'none' || band === null || band === undefined) return { points: 0, tier: 'missing' };
  if (band >= req.idealIELTS) return { points: 2, tier: 'exceeds' };
  if (band >= req.minIELTS) return { points: 1, tier: 'meets' };
  return { points: 0, tier: 'below' };
}

function buildCriterion(label, tier, text) {
  const tierMeta = {
    exceeds: { badge: 'Exceeds', class: 'eval-tier-good' },
    meets: { badge: 'Meets', class: 'eval-tier-good' },
    below: { badge: 'Below Typical', class: 'eval-tier-warn' },
    missing: { badge: 'Not Provided', class: 'eval-tier-warn' },
    info: { badge: 'Noted', class: 'eval-tier-neutral' }
  }[tier];
  return `
    <div class="eval-criterion">
      <div class="eval-criterion-head">
        <span class="eval-criterion-label">${label}</span>
        <span class="eval-tier-badge ${tierMeta.class}">${tierMeta.badge}</span>
      </div>
      <p class="eval-criterion-text">${text}</p>
    </div>`;
}

function evaluateProfile(data) {
  const req = COUNTRY_REQUIREMENTS[data.country];
  const percent = normalizeCgpa(data.cgpaScale, data.cgpaValue);
  const cgpaResult = scoreCgpa(percent, req);
  const ieltsBand = data.testType === 'none' || !data.testScore ? null : convertToIELTSBand(data.testType, data.testScore);
  const englishResult = scoreEnglish(data.testType, ieltsBand, req);
  const expPoints = EXPERIENCE_POINTS[data.experience] || 0;

  const totalPoints = cgpaResult.points + englishResult.points + expPoints;
  const maxPoints = 5;

  let verdict, verdictClass, summary, packageName, packageText;
  if (totalPoints >= 4) {
    verdict = 'Strong Candidate';
    verdictClass = 'eval-tier-good';
    summary = `Your profile compares well against typical requirements for ${req.label}. You're in a good position to apply.`;
    packageName = 'Advantage Package';
    packageText = 'Wider university reach, plus your financial documentation and visa application handled.';
  } else if (totalPoints >= 2) {
    verdict = 'Good Candidate';
    verdictClass = 'eval-tier-neutral';
    summary = `Your profile is broadly in line with typical requirements for ${req.label}, with a couple of areas worth strengthening.`;
    packageName = 'Advantage Package';
    packageText = 'Wider university reach, plus your financial documentation and visa application handled.';
  } else {
    verdict = 'Additional Preparation Recommended';
    verdictClass = 'eval-tier-warn';
    summary = `A few gaps stand out against typical requirements for ${req.label}, we can help you close them before you apply.`;
    packageName = 'Complete Package';
    packageText = 'Full support from application to post-arrival assistance, including extra guidance where you need it most.';
  }

  const breakdown = [];
  breakdown.push(buildCriterion(
    'Academic Record (CGPA)',
    cgpaResult.tier,
    `Your CGPA converts to roughly ${percent.toFixed(0)}%, typical ${data.degreeLevel === 'masters' ? "Master's" : "Bachelor's"} applicants to ${req.label} are usually competitive from around ${req.minPercent}%+.`
  ));

  if (englishResult.tier === 'missing') {
    breakdown.push(buildCriterion(
      'English Proficiency',
      'missing',
      `No score provided yet. Universities in ${req.label} commonly ask for an IELTS-equivalent band of ${req.minIELTS.toFixed(1)}+ (often ${req.idealIELTS.toFixed(1)}+ for stronger programs). We can help you plan your test prep.`
    ));
  } else {
    const testLabel = { ielts: 'IELTS', toefl: 'TOEFL iBT', cambridge: 'Cambridge' }[data.testType];
    const rawText = data.testType === 'ielts' ? '' : ` (your ${testLabel} score of ${data.testScore} converts to approximately this)`;
    breakdown.push(buildCriterion(
      'English Proficiency',
      englishResult.tier,
      `An IELTS-equivalent band of ${ieltsBand.toFixed(1)}${rawText} is ${englishResult.tier === 'below' ? 'below' : 'at or above'} the typical ${req.minIELTS.toFixed(1)}+ requirement for ${req.label}.`
    ));
  }

  breakdown.push(buildCriterion(
    'Relevant Experience',
    expPoints > 0 ? 'meets' : 'info',
    `${EXPERIENCE_LABELS[data.experience]}. ${data.degreeLevel === 'masters' ? "Relevant experience can strengthen a Master's application, though it's rarely a strict requirement." : "Experience isn't usually required at Bachelor's level, this is just a bonus signal."}`
  ));

  return { verdict, verdictClass, summary, packageName, packageText, breakdownHtml: breakdown.join(''), countryKey: data.country };
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('evaluator-form');
  if (!form) return;

  const resultsPanel = document.getElementById('evaluator-results');
  const tierBadge = document.getElementById('result-tier-badge');
  const summaryEl = document.getElementById('result-summary');
  const breakdownEl = document.getElementById('result-breakdown');
  const packageNameEl = document.getElementById('result-package');
  const packageTextEl = document.getElementById('result-package-text');
  const ctaEl = document.getElementById('result-cta');

  // A CGPA typed under one scale is meaningless under another, clear it rather than silently misreading it.
  const cgpaScaleEl = document.getElementById('eval-cgpa-scale');
  const cgpaValueEl = document.getElementById('eval-cgpa-value');
  cgpaScaleEl.addEventListener('change', () => { cgpaValueEl.value = ''; });

  // Score field adapts to the selected test: its own scale, its own label/hint, and it always clears
  // on switch since a raw score under one test is meaningless read as another.
  const testTypeEl = document.getElementById('eval-test-type');
  const testScoreEl = document.getElementById('eval-test-score');
  const testScoreLabelEl = document.getElementById('eval-test-score-label');
  const testScoreHintEl = document.getElementById('eval-test-score-hint');
  testTypeEl.addEventListener('change', () => {
    const notTaken = testTypeEl.value === 'none';
    testScoreEl.value = '';
    testScoreEl.disabled = notTaken;
    if (!notTaken) {
      const config = TEST_CONFIG[testTypeEl.value];
      testScoreLabelEl.textContent = config.label;
      testScoreHintEl.textContent = config.hint;
      testScoreEl.min = config.min;
      testScoreEl.max = config.max;
      testScoreEl.step = config.step;
      testScoreEl.placeholder = config.placeholder;
    }
  });

  const COUNTRY_PAGES = { germany: 'index.html', portugal: 'portugal.html', uk: 'uk.html' };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      country: document.getElementById('eval-country').value,
      degreeLevel: document.getElementById('eval-degree').value,
      fieldOfStudy: document.getElementById('eval-field').value,
      cgpaScale: document.getElementById('eval-cgpa-scale').value,
      cgpaValue: document.getElementById('eval-cgpa-value').value,
      testType: document.getElementById('eval-test-type').value,
      testScore: document.getElementById('eval-test-score').value,
      experience: document.getElementById('eval-experience').value
    };

    const result = evaluateProfile(data);
    // If the honeypot field got filled, a bot did it, real visitors never see or touch it.
    // Skip the save but still show results normally, no reason to break the UI over it.
    const isBot = document.getElementById('eval-website').value.trim() !== '';
    if (!isBot) saveEvaluationAnonymously(data, result);

    tierBadge.textContent = result.verdict;
    tierBadge.className = `inline-block text-sm font-bold px-4 py-1.5 rounded-full ${result.verdictClass}`;
    summaryEl.textContent = result.summary;
    breakdownEl.innerHTML = result.breakdownHtml;
    packageNameEl.textContent = result.packageName;
    packageTextEl.textContent = result.packageText;
    ctaEl.href = `${COUNTRY_PAGES[result.countryKey]}#register`;

    resultsPanel.classList.remove('hidden');
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
