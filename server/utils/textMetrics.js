/**
 * Utilitas perhitungan kemiripan teks, deteksi kategori, dan distribusi waktu ulasan.
 */

const {
  PRODUCT_CATEGORY_RULES,
  EXPERIENCE_CONTEXT_KEYWORDS,
  COERCION_PATTERNS,
  ADVERSATIVE_MARKERS,
} = require('../config/constants');

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

function buildWordShingles(tokens, n = 2) {
  const shingles = new Set();
  if (tokens.length < n) {
    if (tokens.length > 0) shingles.add(tokens.join(' '));
    return shingles;
  }
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join(' '));
  }
  return shingles;
}

function setJaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function calculateSimilarity(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);

  const unigramSim = setJaccard(new Set(tokensA), new Set(tokensB));
  const bigramSim = setJaccard(buildWordShingles(tokensA, 2), buildWordShingles(tokensB, 2));

  return Number((bigramSim * 0.55 + unigramSim * 0.45).toFixed(4));
}

function detectProductCategory(productName = '', productUrl = '') {
  const combined = `${productName} ${productUrl}`.toLowerCase();
  for (const [key, rule] of Object.entries(PRODUCT_CATEGORY_RULES)) {
    if (rule.productKeywords.some((kw) => combined.includes(kw))) {
      return { key, ...rule };
    }
  }
  return null;
}

function detectNonsensicalFeature(reviewText = '', productCategory = null) {
  if (!productCategory || !Array.isArray(productCategory.impossibleFeatures)) {
    return null;
  }
  const lower = String(reviewText).toLowerCase();
  const matched = productCategory.impossibleFeatures.filter((feat) => lower.includes(feat));
  if (matched.length > 0) {
    return {
      categoryLabel: productCategory.label,
      matchedFeatures: matched.slice(0, 3),
    };
  }
  return null;
}

function calculateLinguisticRichness(text = '') {
  const tokens = tokenize(text);
  const lower = String(text).toLowerCase();
  if (tokens.length === 0) {
    return { ttr: 0, experientialHits: 0, specificityScore: 0 };
  }

  const uniqueTokens = new Set(tokens);
  const ttr = Number((uniqueTokens.size / tokens.length).toFixed(2));
  const experientialHits = EXPERIENCE_CONTEXT_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  const lengthFactor = Math.min(1, tokens.length / 18);
  const attributeFactor = Math.min(1, experientialHits / 3);
  const specificityScore = Number(
    (lengthFactor * 0.45 + attributeFactor * 0.4 + Math.min(1, ttr) * 0.15).toFixed(2)
  );

  return { ttr, experientialHits, specificityScore };
}

function detectCoercionAndAdversative(text = '') {
  const lower = String(text).toLowerCase();
  const coercionMatch = COERCION_PATTERNS.find((p) => lower.includes(p)) || null;
  const hasAdversative = ADVERSATIVE_MARKERS.some((m) => lower.includes(m));
  return {
    hasCoercion: Boolean(coercionMatch),
    coercionMatch,
    hasAdversative,
  };
}

function calculateUppercaseRatio(text = '') {
  const letters = String(text).replace(/[^a-zA-Z]/g, '');
  if (letters.length < 6) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

function analyzeSurfacePatterns(text = '') {
  const raw = String(text);
  const excessivePunctuation = /[!?]{3,}/.test(raw);
  const repeatedChars = /(.)\1{3,}/i.test(raw);
  const symbolMatches = raw.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  return {
    excessivePunctuation,
    repeatedChars,
    symbolSpamCount: symbolMatches ? symbolMatches.length : 0,
  };
}

function calculateDailyZScores(dailyCounts = {}) {
  const entries = Object.entries(dailyCounts);
  if (entries.length === 0) {
    return { mean: 0, stdDev: 0, zScores: {} };
  }

  const values = entries.map(([, c]) => c);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const zScores = {};
  entries.forEach(([date, count]) => {
    zScores[date] = stdDev > 0 ? Number(((count - mean) / stdDev).toFixed(2)) : 0;
  });

  return {
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    zScores,
  };
}

function parseReviewDate(rawDate, fallbackIndex = 0) {
  if (rawDate) {
    const str = String(rawDate).trim();
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      const isoFull = parsed.toISOString();
      const isoDate = isoFull.split('T')[0];
      const hasTime = /T\d{2}:\d{2}|\s\d{2}:\d{2}/.test(str);
      const hourBucket = hasTime ? isoFull.slice(0, 13) : null;
      return {
        isoDate,
        hourBucket,
        timeLabel: hasTime ? isoFull.slice(11, 16) : null,
        timestamp: parsed.getTime(),
        valid: true,
      };
    }

    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T08:00:00Z`);
      if (!Number.isNaN(dt.getTime())) {
        return {
          isoDate: dt.toISOString().split('T')[0],
          hourBucket: null,
          timeLabel: null,
          timestamp: dt.getTime(),
          valid: true,
        };
      }
    }
  }

  const now = new Date();
  const fallback = new Date(now.getTime() - (fallbackIndex % 7) * 86400000);
  return {
    isoDate: fallback.toISOString().split('T')[0],
    hourBucket: null,
    timeLabel: null,
    timestamp: fallback.getTime(),
    valid: false,
  };
}

module.exports = {
  normalizeText,
  tokenize,
  calculateSimilarity,
  detectProductCategory,
  detectNonsensicalFeature,
  calculateLinguisticRichness,
  detectCoercionAndAdversative,
  calculateUppercaseRatio,
  analyzeSurfacePatterns,
  calculateDailyZScores,
  parseReviewDate,
};
