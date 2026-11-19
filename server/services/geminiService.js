/**
 * Pengayaan analisis semantik melalui layanan AI berbasis server.
 */

const { RED_FLAG_TYPES, RISK_THRESHOLDS, ANALYSIS_LAYERS } = require('../config/constants');
const { classifyRiskLevel } = require('./ruleEngine');

function recalculateUnifiedMetrics(reviews, previousMetrics) {
  const totalReviews = reviews.length;
  const sumOriginalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
  const originalRating =
    totalReviews > 0 ? Number((sumOriginalRating / totalReviews).toFixed(2)) : 0;

  const sumTrustScore = reviews.reduce((acc, r) => acc + r.trustScore, 0);
  const productTrustScore =
    totalReviews > 0 ? Math.round(sumTrustScore / totalReviews) : 0;
  const productRisk = classifyRiskLevel(productTrustScore);

  let weightedRatingSum = 0;
  let totalWeight = 0;

  reviews.forEach((rev) => {
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

  const suspiciousReviewsCount = reviews.filter((r) => r.isSuspicious).length;
  const cleanReviewsCount = totalReviews - suspiciousReviewsCount;
  const suspiciousRatio =
    totalReviews > 0 ? Math.round((suspiciousReviewsCount / totalReviews) * 100) : 0;

  const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
  reviews.forEach((r) => {
    sentimentDistribution[r.sentiment] = (sentimentDistribution[r.sentiment] || 0) + 1;
  });

  return {
    ...previousMetrics,
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
    sentimentDistribution,
  };
}

async function enrichReportWithGemini({ baseReport }) {
  const effectiveKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  if (!effectiveKey) {
    return {
      ...baseReport,
      aiInsights: {
        ...baseReport.aiInsights,
        poweredBy: 'Analisis Otomatis',
      },
      aiStatus: {
        enabled: true,
        usedFallback: true,
      },
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    effectiveKey
  )}`;

  const sampleReviews = baseReport.reviews.slice(0, 45).map((r) => ({
    index: r.index,
    rating: r.rating,
    date: r.date,
    text: r.text,
    ruleFlags: r.redFlags.map((f) => f.code),
  }));

  const prompt = `
Analisis ulasan produk "${baseReport.productName}" (${baseReport.marketplace}) secara objektif dengan bahasa Indonesia yang jelas, ramah, tidak kaku, dan tidak berlebihan.
Hindari menuduh ulasan palsu secara mutlak; jelaskan seberapa wajar polanya dan apa yang perlu diperhatikan pembeli sebelum membeli.

Data ringkas:
- Rating asli: ${baseReport.metrics.originalRating} | Rating terkoreksi awal: ${baseReport.metrics.adjustedRating}
- Skor kepercayaan awal: ${baseReport.metrics.productTrustScore}/100

Daftar ulasan:
${JSON.stringify(sampleReviews, null, 2)}

Balas hanya dengan JSON valid:
{
  "verdictHeadline": "Satu kalimat kesimpulan yang jelas dan tidak kaku",
  "patternExplanation": "Penjelasan singkat 2 kalimat yang mudah dipahami pembeli tentang pola ulasan dan selisih rating",
  "redFlagExplanation": "Ringkasan 1 kalimat tentang tanda yang paling sering muncul",
  "whatToWatchBeforeBuying": ["Saran praktis 1", "Saran praktis 2", "Saran praktis 3"],
  "executiveSummary": "Ringkasan singkat produk",
  "complaints": [{ "theme": "Keluhan yang sering muncul", "count": 2, "examples": ["kutipan singkat"] }],
  "praises": [{ "theme": "Hal yang sering dipuji", "count": 3, "examples": ["kutipan singkat"] }],
  "reviewLevelAnalysis": [
    {
      "index": 1,
      "sentiment": "positive" | "neutral" | "negative",
      "ratingMismatch": false,
      "nonsensicalFeature": false,
      "nonsensicalReason": "",
      "mismatchReason": "",
      "aiCredibilityAdjustment": 0,
      "aiWhyExplanation": "Alasan singkat dalam bahasa yang mudah dipahami"
    }
  ]
}
`.trim();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsedAi = JSON.parse(cleanedJson);

    const aiReviewMap = new Map();
    if (Array.isArray(parsedAi.reviewLevelAnalysis)) {
      parsedAi.reviewLevelAnalysis.forEach((item) => {
        if (item && typeof item.index === 'number') {
          aiReviewMap.set(item.index, item);
        }
      });
    }

    const updatedReviews = baseReport.reviews.map((rev) => {
      const aiItem = aiReviewMap.get(rev.index);
      let updatedSentiment = rev.sentiment;
      const updatedFlags = [...rev.redFlags];
      let updatedScore = rev.trustScore;

      if (aiItem) {
        if (['positive', 'neutral', 'negative'].includes(aiItem.sentiment)) {
          updatedSentiment = aiItem.sentiment;
        }

        if (
          aiItem.ratingMismatch &&
          !updatedFlags.some((f) => f.code === RED_FLAG_TYPES.RATING_TIDAK_COCOK_ISI.code)
        ) {
          const def = RED_FLAG_TYPES.RATING_TIDAK_COCOK_ISI;
          updatedScore = Math.max(5, updatedScore - def.penalty);
          updatedFlags.push({
            code: def.code,
            layer: def.layer,
            layerLabel: def.layerLabel,
            label: def.label,
            riskWeight: def.riskWeight,
            badgeTone: def.badgeTone,
            penalty: def.penalty,
            reason: aiItem.mismatchReason || 'Bintang rating tidak selaras dengan keluhan di dalam teks.',
          });
        }

        if (
          aiItem.nonsensicalFeature &&
          !updatedFlags.some((f) => f.code === RED_FLAG_TYPES.DETAIL_TIDAK_MASUK_AKAL.code)
        ) {
          const def = RED_FLAG_TYPES.DETAIL_TIDAK_MASUK_AKAL;
          updatedScore = Math.max(5, updatedScore - def.penalty);
          updatedFlags.push({
            code: def.code,
            layer: def.layer,
            layerLabel: def.layerLabel,
            label: def.label,
            riskWeight: def.riskWeight,
            badgeTone: def.badgeTone,
            penalty: def.penalty,
            reason: aiItem.nonsensicalReason || 'Membahas fitur yang tidak terdapat pada produk ini.',
          });
        }

        if (typeof aiItem.aiCredibilityAdjustment === 'number') {
          const clampedAdj = Math.max(-15, Math.min(10, Math.round(aiItem.aiCredibilityAdjustment)));
          updatedScore = Math.max(5, Math.min(100, updatedScore + clampedAdj));
        }
      }

      const riskInfo = classifyRiskLevel(updatedScore);
      const isSuspicious = updatedScore < RISK_THRESHOLDS.LOW_MIN || updatedFlags.length > 0;

      return {
        ...rev,
        sentiment: updatedSentiment,
        trustScore: updatedScore,
        riskLevel: riskInfo.level,
        riskLabel: riskInfo.label,
        isSuspicious,
        redFlags: updatedFlags,
        whySummary:
          aiItem?.aiWhyExplanation ||
          (updatedFlags.length > 0
            ? updatedFlags.map((f) => `[${f.layerLabel}] ${f.reason}`).join(' ')
            : rev.whySummary),
      };
    });

    const flagMap = {};
    Object.values(RED_FLAG_TYPES).forEach((f) => {
      flagMap[f.code] = { ...f, count: 0 };
    });
    updatedReviews.forEach((r) => {
      r.redFlags.forEach((rf) => {
        if (flagMap[rf.code]) flagMap[rf.code].count += 1;
      });
    });

    const allFlagsList = Object.values(flagMap);
    const layerBreakdown = ['teks', 'perilaku', 'koordinasi'].map((layerId) => {
      const signals = allFlagsList.filter((f) => f.layer === layerId);
      return {
        ...ANALYSIS_LAYERS[layerId],
        triggeredSignals: signals.filter((s) => s.count > 0).length,
        totalSignals: signals.length,
        totalHits: signals.reduce((acc, s) => acc + s.count, 0),
        signals,
      };
    });

    const unifiedMetrics = recalculateUnifiedMetrics(updatedReviews, baseReport.metrics);

    return {
      ...baseReport,
      metrics: unifiedMetrics,
      layerBreakdown,
      redFlagBreakdown: allFlagsList,
      themes: {
        complaints:
          Array.isArray(parsedAi.complaints) && parsedAi.complaints.length > 0
            ? parsedAi.complaints
            : baseReport.themes.complaints,
        praises:
          Array.isArray(parsedAi.praises) && parsedAi.praises.length > 0
            ? parsedAi.praises
            : baseReport.themes.praises,
      },
      aiInsights: {
        poweredBy: 'Analisis Gabungan + AI',
        aiModelUsed: model,
        verdictHeadline:
          parsedAi.verdictHeadline || baseReport.aiInsights.verdictHeadline,
        patternExplanation:
          parsedAi.patternExplanation || baseReport.aiInsights.patternExplanation,
        redFlagExplanation:
          parsedAi.redFlagExplanation || baseReport.aiInsights.redFlagExplanation,
        whatToWatchBeforeBuying:
          Array.isArray(parsedAi.whatToWatchBeforeBuying) &&
          parsedAi.whatToWatchBeforeBuying.length > 0
            ? parsedAi.whatToWatchBeforeBuying
            : baseReport.aiInsights.whatToWatchBeforeBuying,
        executiveSummary:
          parsedAi.executiveSummary || baseReport.aiInsights.executiveSummary,
      },
      reviews: updatedReviews,
      aiStatus: {
        enabled: true,
        usedFallback: false,
      },
    };
  } catch {
    return {
      ...baseReport,
      aiInsights: {
        ...baseReport.aiInsights,
        poweredBy: 'Analisis Otomatis',
      },
      aiStatus: {
        enabled: true,
        usedFallback: true,
      },
    };
  }
}

module.exports = {
  enrichReportWithGemini,
};
