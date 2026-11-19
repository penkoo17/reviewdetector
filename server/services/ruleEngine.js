/**
 * Mesin evaluasi kredibilitas ulasan berbasis 3 lapis (Isi Teks, Perilaku, Koordinasi).
 */

const {
  RISK_THRESHOLDS,
  ANALYSIS_LAYERS,
  RED_FLAG_TYPES,
  GENERIC_PHRASES,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  EXAGGERATED_PATTERNS,
  THEME_CATEGORIES,
} = require('../config/constants');

const {
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
} = require('../utils/textMetrics');

function classifyRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.LOW_MIN) {
    return { level: 'low', label: 'Low Risk' };
  }
  if (score >= RISK_THRESHOLDS.MODERATE_MIN) {
    return { level: 'moderate', label: 'Moderate Risk' };
  }
  return { level: 'high', label: 'High Risk' };
}

function detectLexiconSentiment(text = '') {
  const lower = String(text).toLowerCase();
  const posHits = POSITIVE_WORDS.filter((w) => {
    const idx = lower.indexOf(w);
    if (idx === -1) return false;
    const prefix = lower.slice(Math.max(0, idx - 12), idx);
    return !/(tidak|gak|ga|bukan|kurang)\s+$/.test(prefix);
  });
  const negHits = NEGATIVE_WORDS.filter((w) => lower.includes(w));
  const coercion = detectCoercionAndAdversative(text);

  let sentiment = 'neutral';
  if (
    coercion.hasCoercion ||
    negHits.length > posHits.length ||
    (negHits.length >= 1 && coercion.hasAdversative)
  ) {
    sentiment = 'negative';
  } else if (posHits.length > negHits.length) {
    sentiment = 'positive';
  }

  return { sentiment, posHits, negHits, coercion };
}

function extractThemesRuleBased(reviews = []) {
  const complaintMap = new Map();
  const praiseMap = new Map();

  THEME_CATEGORIES.complaints.forEach((cat) => {
    complaintMap.set(cat.label, { theme: cat.label, count: 0, examples: [] });
  });
  THEME_CATEGORIES.praises.forEach((cat) => {
    praiseMap.set(cat.label, { theme: cat.label, count: 0, examples: [] });
  });

  const seenNormalized = new Set();

  reviews.forEach((rev) => {
    const norm = normalizeText(rev.text);
    if (seenNormalized.has(norm)) return;
    seenNormalized.add(norm);

    const lower = String(rev.text || '').toLowerCase();

    THEME_CATEGORIES.complaints.forEach((cat) => {
      if (cat.keywords.some((kw) => lower.includes(kw))) {
        const entry = complaintMap.get(cat.label);
        entry.count += 1;
        if (entry.examples.length < 2) {
          entry.examples.push(rev.text.slice(0, 120));
        }
      }
    });

    THEME_CATEGORIES.praises.forEach((cat) => {
      const hasMatch = cat.keywords.some((kw) => {
        const idx = lower.indexOf(kw);
        if (idx === -1) return false;
        const prefix = lower.slice(Math.max(0, idx - 12), idx);
        if (/(tidak|gak|ga|bukan|kurang)\s+$/.test(prefix)) return false;
        return true;
      });

      if (hasMatch) {
        const entry = praiseMap.get(cat.label);
        entry.count += 1;
        if (entry.examples.length < 2) {
          entry.examples.push(rev.text.slice(0, 120));
        }
      }
    });
  });

  const complaints = [...complaintMap.values()]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const praises = [...praiseMap.values()]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { complaints, praises };
}

function buildFlag(def, reason, customPenalty) {
  return {
    code: def.code,
    layer: def.layer,
    layerLabel: def.layerLabel,
    label: def.label,
    riskWeight: def.riskWeight,
    badgeTone: def.badgeTone,
    penalty: typeof customPenalty === 'number' ? customPenalty : def.penalty,
    reason,
  };
}

function runRuleBasedAnalysis({ productName, marketplace, productUrl = '', reviews = [] }) {
  const productCategory = detectProductCategory(productName, productUrl);

  const normalizedReviews = reviews.map((raw, idx) => {
    const text = String(raw.text || '').trim();
    const ratingNum = Number(raw.rating);
    const rating = !Number.isNaN(ratingNum) ? Math.min(5, Math.max(1, Math.round(ratingNum))) : 5;
    const reviewer = String(raw.reviewer || `Pembeli #${idx + 1}`).trim();
    const dateInfo = parseReviewDate(raw.date, idx);
    const tokens = tokenize(text);
    const richness = calculateLinguisticRichness(text);

    return {
      id: `rev_${idx + 1}`,
      index: idx + 1,
      reviewer,
      rating,
      date: dateInfo.isoDate,
      hourBucket: dateInfo.hourBucket,
      timeLabel: dateInfo.timeLabel,
      timestamp: dateInfo.timestamp,
      text,
      normText: normalizeText(text),
      charLength: text.length,
      wordCount: tokens.length,
      ttr: richness.ttr,
      experientialHits: richness.experientialHits,
      specificityScore: richness.specificityScore,
      accountAgeDays: typeof raw.accountAgeDays === 'number' ? raw.accountAgeDays : null,
      reviewerTotalReviews: typeof raw.reviewerTotalReviews === 'number' ? raw.reviewerTotalReviews : null,
      reviewerUniqueStores: typeof raw.reviewerUniqueStores === 'number' ? raw.reviewerUniqueStores : null,
      groupClusterId: raw.groupClusterId || null,
    };
  });

  const totalReviews = normalizedReviews.length;
  const reviewsByDate = {};
  const reviewsByHour = {};

  normalizedReviews.forEach((r) => {
    reviewsByDate[r.date] = (reviewsByDate[r.date] || 0) + 1;
    if (r.hourBucket) {
      reviewsByHour[r.hourBucket] = (reviewsByHour[r.hourBucket] || 0) + 1;
    }
  });

  const dailyStats = calculateDailyZScores(reviewsByDate);
  const peakBurstZScore = Math.max(0, ...Object.values(dailyStats.zScores));

  const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
  let maxReviewsInWindow = 0;
  const burstDates = new Set();
  const burstThreshold = Math.max(4, Math.ceil(totalReviews * 0.4));

  normalizedReviews.forEach((rev) => {
    const inWindow72h = normalizedReviews.filter(
      (other) => Math.abs(other.timestamp - rev.timestamp) <= SEVENTY_TWO_HOURS_MS
    );
    rev.reviewsIn48hWindow = inWindow72h.length;
    rev.dateZScore = dailyStats.zScores[rev.date] || 0;

    if (inWindow72h.length > maxReviewsInWindow) {
      maxReviewsInWindow = inWindow72h.length;
    }

    const fiveStarInWindow = inWindow72h.filter((x) => x.rating === 5).length;
    const fiveStarRatio = inWindow72h.length > 0 ? fiveStarInWindow / inWindow72h.length : 0;

    if (totalReviews >= 5 && (inWindow72h.length >= burstThreshold || rev.dateZScore >= 1.35)) {
      rev.isInBurstWindow = true;
      burstDates.add(rev.date);
    }

    if (
      totalReviews >= 5 &&
      rev.rating === 5 &&
      inWindow72h.length >= Math.max(4, Math.ceil(totalReviews * 0.35)) &&
      fiveStarRatio >= 0.8
    ) {
      rev.isUniformFiveStarCluster = true;
    }

    const sameHourCount = rev.hourBucket ? reviewsByHour[rev.hourBucket] || 0 : 0;
    const within20MinCount = normalizedReviews.filter(
      (other) => Math.abs(other.timestamp - rev.timestamp) <= 20 * 60 * 1000
    ).length;

    if (sameHourCount >= 3 || (rev.hourBucket && within20MinCount >= 3)) {
      rev.isSimultaneousTime = true;
      rev.sameHourCount = Math.max(sameHourCount, within20MinCount);
    }
  });

  const duplicateClusters = new Map();
  for (let i = 0; i < totalReviews; i++) {
    for (let j = i + 1; j < totalReviews; j++) {
      const sim = calculateSimilarity(normalizedReviews[i].text, normalizedReviews[j].text);
      if (sim >= 0.72 && normalizedReviews[i].normText.length >= 6) {
        if (!duplicateClusters.has(i)) duplicateClusters.set(i, []);
        if (!duplicateClusters.has(j)) duplicateClusters.set(j, []);
        duplicateClusters.get(i).push({ targetIndex: j + 1, similarity: Math.round(sim * 100) });
        duplicateClusters.get(j).push({ targetIndex: i + 1, similarity: Math.round(sim * 100) });
      }
    }
  }

  const reviewerCounts = {};
  const groupClusterCounts = {};
  normalizedReviews.forEach((r) => {
    const key = r.reviewer.toLowerCase();
    reviewerCounts[key] = (reviewerCounts[key] || 0) + 1;
    if (r.groupClusterId) {
      groupClusterCounts[r.groupClusterId] = (groupClusterCounts[r.groupClusterId] || 0) + 1;
    }
  });

  const maskedBurstReviewers = normalizedReviews.filter(
    (r) =>
      (/^[a-z]\*{3,}[a-z0-9]$/i.test(r.reviewer) || /^(user|buyer)[_\-]?\d{4,}$/i.test(r.reviewer)) &&
      (r.isInBurstWindow || r.isSimultaneousTime)
  );

  const redFlagSummaryCounter = {};
  Object.values(RED_FLAG_TYPES).forEach((rf) => {
    redFlagSummaryCounter[rf.code] = { ...rf, count: 0 };
  });

  const evaluatedReviews = normalizedReviews.map((rev, idx) => {
    let score = 100;
    const redFlags = [];
    const lex = detectLexiconSentiment(rev.text);
    const lowerText = rev.text.toLowerCase();

    const matchedGeneric = GENERIC_PHRASES.filter((phrase) => lowerText.includes(phrase));
    const isShortGeneric =
      (rev.wordCount <= 5 && rev.rating >= 4) ||
      (matchedGeneric.length >= 1 && rev.wordCount <= 9 && lex.negHits.length === 0);

    if (isShortGeneric) {
      const f = buildFlag(
        RED_FLAG_TYPES.TERLALU_GENERIK,
        `Kalimat sangat umum dan singkat (${rev.wordCount} kata${
          matchedGeneric.length > 0 ? `, memuat frasa "${matchedGeneric.slice(0, 2).join(', ')}"` : ''
        }).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const nonsense = detectNonsensicalFeature(rev.text, productCategory);
    if (nonsense) {
      const f = buildFlag(
        RED_FLAG_TYPES.DETAIL_TIDAK_MASUK_AKAL,
        `Membahas fitur (${nonsense.matchedFeatures.join(', ')}) yang tidak sesuai dengan kategori ${nonsense.categoryLabel}.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const upperRatio = calculateUppercaseRatio(rev.text);
    const surface = analyzeSurfacePatterns(rev.text);
    const matchedHyperbole = EXAGGERATED_PATTERNS.filter((p) => lowerText.includes(p));

    if (
      upperRatio > 0.5 ||
      surface.excessivePunctuation ||
      surface.repeatedChars ||
      matchedHyperbole.length > 0
    ) {
      const details = [];
      if (matchedHyperbole.length > 0) details.push(`kata berlebihan "${matchedHyperbole.slice(0, 2).join(', ')}"`);
      if (upperRatio > 0.5) details.push(`huruf kapital ${Math.round(upperRatio * 100)}%`);
      if (surface.excessivePunctuation) details.push('tanda seru beruntun');
      if (surface.repeatedChars) details.push('pengulangan huruf');

      const f = buildFlag(
        RED_FLAG_TYPES.EMOSI_BERLEBIHAN,
        `Nada kalimat terlalu melebih-lebihkan (${details.join(', ')}).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.experientialHits === 0 && rev.wordCount < 14) {
      const f = buildFlag(
        RED_FLAG_TYPES.TIDAK_MENYEBUT_PENGALAMAN,
        `Belum menyebutkan lama pemakaian, kondisi saat digunakan, atau detail bagian produk.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const highRatingWithCoercion = rev.rating >= 4 && lex.coercion.hasCoercion;
    const highRatingWithComplaint =
      rev.rating >= 4 &&
      lex.negHits.length >= 1 &&
      (lex.sentiment === 'negative' ||
        lex.coercion.hasAdversative ||
        lowerText.includes('kecewa') ||
        lowerText.includes('rusak') ||
        lowerText.includes('palsu') ||
        lowerText.includes('bocor'));
    const lowRatingWithPraise =
      rev.rating <= 2 && lex.posHits.length >= 2 && lex.negHits.length === 0;

    if (highRatingWithCoercion || highRatingWithComplaint || lowRatingWithPraise) {
      const reason = highRatingWithCoercion
        ? `Memberikan ${rev.rating} bintang karena ada keterangan "${lex.coercion.coercionMatch}", padahal isinya mengeluhkan masalah (${lex.negHits
            .slice(0, 3)
            .join(', ')}).`
        : highRatingWithComplaint
        ? `Memberikan ${rev.rating} bintang, tetapi teksnya berisi keluhan (${lex.negHits
            .slice(0, 3)
            .join(', ')}).`
        : `Memberikan rating rendah (${rev.rating} bintang), namun kalimatnya bernada memuji.`;

      const f = buildFlag(
        RED_FLAG_TYPES.RATING_TIDAK_COCOK_ISI,
        reason,
        highRatingWithCoercion ? 32 : 28
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.isInBurstWindow) {
      const f = buildFlag(
        RED_FLAG_TYPES.REVIEW_BURST,
        `Masuk saat jumlah ulasan melonjak (${rev.reviewsIn48hWindow} dari ${totalReviews} ulasan muncul dalam rentang 1–3 hari).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.isUniformFiveStarCluster) {
      const f = buildFlag(
        RED_FLAG_TYPES.RATING_SERAGAM,
        `Muncul bersamaan dengan banyak ulasan bintang 5 lainnya dalam waktu singkat.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const isBotUsername = /^(user|buyer|shopper)[_\-]?\d{4,}$/i.test(rev.reviewer);
    const isNewBurstAccount =
      (rev.accountAgeDays !== null && rev.accountAgeDays <= 14 && (rev.reviewerTotalReviews || 0) >= 8) ||
      isBotUsername;

    if (isNewBurstAccount) {
      const reason =
        rev.accountAgeDays !== null
          ? `Akun masih baru (${rev.accountAgeDays} hari) tetapi sudah langsung memberikan ${rev.reviewerTotalReviews} ulasan.`
          : `Akun "${rev.reviewer}" aktif mengirim ulasan promosi di periode lonjakan.`;
      const f = buildFlag(RED_FLAG_TYPES.REVIEWER_BARU_AKTIF, reason);
      score -= f.penalty;
      redFlags.push(f);
    }

    const reviewerKey = rev.reviewer.toLowerCase();
    const isSingleStoreReviewer =
      (rev.reviewerUniqueStores !== null && rev.reviewerUniqueStores <= 1) ||
      (!reviewerKey.startsWith('pembeli #') && reviewerCounts[reviewerKey] > 1);

    if (isSingleStoreReviewer) {
      const reason =
        rev.reviewerUniqueStores !== null && rev.reviewerUniqueStores <= 1
          ? `Akun "${rev.reviewer}" hanya terlihat mengulas di satu toko/produk tanpa riwayat belanja lain.`
          : `Akun "${rev.reviewer}" tercatat mengirim ${reviewerCounts[reviewerKey]} ulasan di produk yang sama.`;
      const f = buildFlag(RED_FLAG_TYPES.REVIEWER_SATU_TOKO, reason);
      score -= f.penalty;
      redFlags.push(f);
    }

    const dupMatches = duplicateClusters.get(idx) || [];
    if (dupMatches.length > 0) {
      const topMatch = dupMatches.sort((a, b) => b.similarity - a.similarity)[0];
      const f = buildFlag(
        RED_FLAG_TYPES.REVIEW_SANGAT_MIRIP,
        `Isi kalimat ${topMatch.similarity}% mirip dengan Ulasan #${topMatch.targetIndex}.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const inExplicitGroup =
      rev.groupClusterId && (groupClusterCounts[rev.groupClusterId] || 0) >= 3;
    const inCoordinatedMaskedGroup =
      maskedBurstReviewers.length >= 3 &&
      maskedBurstReviewers.some((m) => m.id === rev.id) &&
      (dupMatches.length > 0 || rev.isSimultaneousTime);

    if (inExplicitGroup || inCoordinatedMaskedGroup) {
      const clusterSize = inExplicitGroup
        ? groupClusterCounts[rev.groupClusterId]
        : maskedBurstReviewers.length;
      const f = buildFlag(
        RED_FLAG_TYPES.KELOMPOK_REVIEWER_SAMA,
        `Masuk dalam kelompok ${clusterSize} akun dengan pola ulasan serupa pada produk ini.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.isSimultaneousTime) {
      const f = buildFlag(
        RED_FLAG_TYPES.POLA_WAKTU_SERENTAK,
        `${rev.sameHourCount} ulasan masuk berdekatan di jam yang sama (${rev.date}${
          rev.timeLabel ? ` sekitar ${rev.timeLabel}` : ''
        }).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (redFlags.length === 0 && rev.specificityScore >= 0.45) {
      score = Math.min(100, score + 4);
    }

    const finalScore = Math.max(5, Math.min(100, Math.round(score)));
    const riskInfo = classifyRiskLevel(finalScore);
    const isSuspicious = finalScore < RISK_THRESHOLDS.LOW_MIN || redFlags.length > 0;

    redFlags.forEach((rf) => {
      if (redFlagSummaryCounter[rf.code]) {
        redFlagSummaryCounter[rf.code].count += 1;
      }
    });

    return {
      id: rev.id,
      index: rev.index,
      reviewer: rev.reviewer,
      rating: rev.rating,
      date: rev.date,
      timeLabel: rev.timeLabel,
      text: rev.text,
      charLength: rev.charLength,
      wordCount: rev.wordCount,
      ttr: rev.ttr,
      specificityScore: Math.round(rev.specificityScore * 100),
      dateZScore: rev.dateZScore,
      reviewsIn48hWindow: rev.reviewsIn48hWindow,
      sentiment: lex.sentiment,
      trustScore: finalScore,
      riskLevel: riskInfo.level,
      riskLabel: riskInfo.label,
      isSuspicious,
      redFlags,
      whySummary:
        redFlags.length > 0
          ? redFlags.map((f) => `[${f.layerLabel}] ${f.reason}`).join(' ')
          : `Ulasan menceritakan pengalaman nyata dengan bahasa yang wajar dan konsisten terhadap rating.`,
    };
  });

  const sumOriginalRating = evaluatedReviews.reduce((acc, r) => acc + r.rating, 0);
  const originalRating =
    totalReviews > 0 ? Number((sumOriginalRating / totalReviews).toFixed(2)) : 0;

  const sumTrustScore = evaluatedReviews.reduce((acc, r) => acc + r.trustScore, 0);
  const productTrustScore =
    totalReviews > 0 ? Math.round(sumTrustScore / totalReviews) : 0;
  const productRisk = classifyRiskLevel(productTrustScore);

  let weightedRatingSum = 0;
  let totalWeight = 0;

  evaluatedReviews.forEach((rev) => {
    const hasMismatch = rev.redFlags.some(
      (f) => f.code === RED_FLAG_TYPES.RATING_TIDAK_COCOK_ISI.code
    );
    const hasCoordination = rev.redFlags.some((f) => f.layer === 'koordinasi');
    const hasBehaviorBurst = rev.redFlags.some(
      (f) => f.code === RED_FLAG_TYPES.REVIEW_BURST.code || f.code === RED_FLAG_TYPES.RATING_SERAGAM.code
    );

    let weight = Math.pow(rev.trustScore / 100, 2.5);
    if (hasCoordination) weight *= 0.15;
    if (hasBehaviorBurst && rev.rating === 5) weight *= 0.45;
    if (rev.isSuspicious && rev.rating === 5) weight *= 0.45;

    const effectiveRating =
      hasMismatch && rev.rating >= 4 ? Math.max(1.8, rev.rating - 2.6) : rev.rating;

    weightedRatingSum += effectiveRating * weight;
    totalWeight += weight;
  });

  const adjustedRating =
    totalWeight > 0
      ? Number(Math.max(1.0, Math.min(5.0, weightedRatingSum / totalWeight)).toFixed(2))
      : originalRating;

  const suspiciousReviewsCount = evaluatedReviews.filter((r) => r.isSuspicious).length;
  const cleanReviewsCount = totalReviews - suspiciousReviewsCount;
  const suspiciousRatio =
    totalReviews > 0 ? Math.round((suspiciousReviewsCount / totalReviews) * 100) : 0;

  const avgWordCount =
    totalReviews > 0
      ? Math.round(evaluatedReviews.reduce((acc, r) => acc + r.wordCount, 0) / totalReviews)
      : 0;
  const avgCharLength =
    totalReviews > 0
      ? Math.round(evaluatedReviews.reduce((acc, r) => acc + r.charLength, 0) / totalReviews)
      : 0;
  const avgSpecificityScore =
    totalReviews > 0
      ? Math.round(
          evaluatedReviews.reduce((acc, r) => acc + r.specificityScore, 0) / totalReviews
        )
      : 0;
  const avgLexicalDiversity =
    totalReviews > 0
      ? Number(
          (evaluatedReviews.reduce((acc, r) => acc + r.ttr, 0) / totalReviews).toFixed(2)
        )
      : 0;

  const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };

  evaluatedReviews.forEach((r) => {
    starDistribution[r.rating] = (starDistribution[r.rating] || 0) + 1;
    sentimentDistribution[r.sentiment] = (sentimentDistribution[r.sentiment] || 0) + 1;
  });

  const fiveStarConcentration =
    totalReviews > 0 ? Math.round(((starDistribution[5] || 0) / totalReviews) * 100) : 0;

  const dailyTimeline = Object.entries(reviewsByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({
      date,
      count,
      zScore: dailyStats.zScores[date] || 0,
      isBurstDate: burstDates.has(date),
    }));

  const extractedThemes = extractThemesRuleBased(evaluatedReviews);
  const allFlagsList = Object.values(redFlagSummaryCounter);

  const layerBreakdown = ['teks', 'perilaku', 'koordinasi'].map((layerId) => {
    const signals = allFlagsList.filter((f) => f.layer === layerId);
    const triggeredSignals = signals.filter((s) => s.count > 0).length;
    const totalHits = signals.reduce((acc, s) => acc + s.count, 0);
    return {
      ...ANALYSIS_LAYERS[layerId],
      triggeredSignals,
      totalSignals: signals.length,
      totalHits,
      signals,
    };
  });

  const topRedFlags = allFlagsList
    .filter((rf) => rf.count > 0)
    .sort((a, b) => b.count - a.count);

  const ratingGap = Number((originalRating - adjustedRating).toFixed(2));
  const sampleConfidence =
    totalReviews >= 20 ? 'Cukup Banyak' : totalReviews >= 8 ? 'Standar' : 'Terbatas';

  const baselineDecisionSummary = buildBaselineDecisionGuide({
    productName,
    marketplace,
    productTrustScore,
    originalRating,
    adjustedRating,
    ratingGap,
    totalReviews,
    suspiciousReviewsCount,
    suspiciousRatio,
    topRedFlags,
    extractedThemes,
    layerBreakdown,
  });

  return {
    productName: productName || 'Produk Tanpa Nama',
    marketplace: marketplace || 'E-Commerce',
    productUrl: productUrl || '',
    productCategory: productCategory ? productCategory.label : 'Umum',
    metrics: {
      totalReviews,
      suspiciousReviewsCount,
      cleanReviewsCount,
      suspiciousRatio,
      productTrustScore,
      riskLevel: productRisk.level,
      riskLabel: productRisk.label,
      originalRating,
      adjustedRating,
      ratingDelta: Number((adjustedRating - originalRating).toFixed(2)),
      avgWordCount,
      avgCharLength,
      avgSpecificityScore,
      avgLexicalDiversity,
      peakBurstZScore,
      fiveStarConcentration,
      sampleConfidence,
      maxReviewsIn48h: maxReviewsInWindow,
      duplicateCount: duplicateClusters.size,
      starDistribution,
      sentimentDistribution,
      dailyTimeline,
    },
    layerBreakdown,
    redFlagBreakdown: allFlagsList,
    themes: extractedThemes,
    aiInsights: baselineDecisionSummary,
    reviews: evaluatedReviews,
  };
}

function buildBaselineDecisionGuide({
  productName,
  marketplace,
  productTrustScore,
  originalRating,
  adjustedRating,
  ratingGap,
  totalReviews,
  suspiciousReviewsCount,
  suspiciousRatio,
  topRedFlags,
  extractedThemes,
  layerBreakdown,
}) {
  const koordinasiHits = layerBreakdown.find((l) => l.id === 'koordinasi')?.totalHits || 0;

  let patternAssessment = '';
  if (productTrustScore >= 80) {
    patternAssessment = `Sebagian besar ulasan untuk "${productName}" di ${marketplace} terlihat wajar dan konsisten (Skor Kepercayaan ${productTrustScore}/100). Hanya ${suspiciousReviewsCount} dari ${totalReviews} ulasan (${suspiciousRatio}%) yang mendapat catatan ringan, sehingga rating toko (${originalRating}) masih sejalan dengan rating terkoreksi (${adjustedRating}).`;
  } else if (productTrustScore >= 60) {
    patternAssessment = `Pola ulasan "${productName}" di ${marketplace} menunjukkan beberapa kejanggalan (Skor Kepercayaan ${productTrustScore}/100). Sebanyak ${suspiciousReviewsCount} dari ${totalReviews} ulasan (${suspiciousRatio}%) terlihat terlalu umum atau kurang selaras, sehingga rating perkiraan turun dari ${originalRating} menjadi ${adjustedRating} (selisih -${Math.max(
      0,
      ratingGap
    )}).`;
  } else {
    patternAssessment = `Pola ulasan "${productName}" di ${marketplace} perlu diwaspadai (Skor Kepercayaan ${productTrustScore}/100). Sebanyak ${suspiciousReviewsCount} dari ${totalReviews} ulasan (${suspiciousRatio}%) memicu tanda ketidakwajaran atau kemiripan pola, sehingga rating perkiraan terkoreksi dari ${originalRating} menjadi ${adjustedRating}.`;
  }

  const topFlagsText =
    topRedFlags.length > 0
      ? topRedFlags
          .slice(0, 3)
          .map((f) => `${f.label} (${f.count} ulasan)`)
          .join(', ')
      : 'Tidak ada tanda kejanggalan yang menonjol';

  const buyingChecklist = [];
  if (extractedThemes.complaints.length > 0) {
    buyingChecklist.push(
      `Perhatikan keluhan yang sering disebut pembeli: ${extractedThemes.complaints
        .slice(0, 3)
        .map((c) => c.theme.toLowerCase())
        .join(', ')}.`
    );
  }
  if (topRedFlags.some((f) => f.code === 'rating_tidak_cocok_isi')) {
    buyingChecklist.push(
      'Ada ulasan bintang 5 yang isinya justru mengeluh. Sebaiknya baca komentar ulasan, jangan hanya melihat angka bintang.'
    );
  }
  if (koordinasiHits > 0) {
    buyingChecklist.push(
      'Beberapa ulasan terlihat mirip atau masuk bersamaan. Utamakan membaca ulasan yang berlabel Wajar di daftar bawah.'
    );
  }
  if (buyingChecklist.length === 0) {
    buyingChecklist.push(
      'Sebaran ulasan tampak seimbang. Tetap cek ketentuan garansi penjual dan rekam video saat membuka paket.'
    );
  }

  return {
    poweredBy: 'Analisis Otomatis',
    aiModelUsed: null,
    verdictHeadline:
      productTrustScore >= 80
        ? 'Pola ulasan terlihat wajar dan alami'
        : productTrustScore >= 60
        ? 'Ada beberapa pola ulasan yang perlu dicek lagi'
        : 'Banyak pola ulasan kurang wajar, perlu cek lebih teliti',
    patternExplanation: patternAssessment,
    redFlagExplanation: `Hal yang paling banyak memengaruhi skor: ${topFlagsText}.`,
    whatToWatchBeforeBuying: buyingChecklist,
    executiveSummary: patternAssessment,
  };
}

module.exports = {
  runRuleBasedAnalysis,
  classifyRiskLevel,
};
