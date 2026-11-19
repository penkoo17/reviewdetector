/**
 * Controller endpoint REST API Review Detector.
 */

const { runRuleBasedAnalysis } = require('../services/ruleEngine');
const { enrichReportWithGemini } = require('../services/geminiService');
const { exportReportToCsv } = require('../services/csvService');
const { extractReviewsFromUrl } = require('../services/scraperService');
const {
  getAllReports,
  getReportById,
  saveReport,
  deleteReportById,
} = require('../storage/reportRepository');

function getHealthStatus(req, res) {
  res.json({
    status: 'ok',
    appName: 'Review Detector',
    tagline: 'See through the stars before you buy',
  });
}

async function handleAnalyzeProduct(req, res) {
  try {
    const { productUrl = '' } = req.body || {};

    const cleanedUrl = String(productUrl || '').trim();
    if (!cleanedUrl) {
      return res.status(400).json({
        error: 'Masukkan link produk terlebih dahulu.',
      });
    }

    const normalizedUrl = /^https?:\/\//i.test(cleanedUrl)
      ? cleanedUrl
      : `https://${cleanedUrl}`;

    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        throw new Error('Invalid domain');
      }
    } catch {
      return res.status(400).json({
        error: 'Link produk tidak valid. Pastikan diawali https://',
      });
    }

    const scanResult = await extractReviewsFromUrl(normalizedUrl);

    const baseReport = runRuleBasedAnalysis({
      productName: scanResult.productName,
      marketplace: scanResult.marketplace,
      productUrl: scanResult.productUrl,
      reviews: scanResult.reviews,
    });

    const unifiedReportData = await enrichReportWithGemini({ baseReport });

    const savedRecord = saveReport({
      inputMethod: 'link_scanner',
      analysisMode: 'unified_hybrid_rule_ai',
      scanNotice: scanResult.notice,
      scrapedLive: scanResult.scrapedLive,
      ...unifiedReportData,
    });

    return res.status(201).json(savedRecord);
  } catch (err) {
    return res.status(500).json({
      error: `Gagal memproses link produk: ${err.message}`,
    });
  }
}

function handleGetReportsHistory(req, res) {
  const reports = getAllReports();
  const summaries = reports.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    productName: r.productName,
    marketplace: r.marketplace,
    productUrl: r.productUrl,
    analysisMode: r.analysisMode,
    totalReviews: r.metrics?.totalReviews || 0,
    suspiciousReviewsCount: r.metrics?.suspiciousReviewsCount || 0,
    productTrustScore: r.metrics?.productTrustScore || 0,
    riskLevel: r.metrics?.riskLevel || 'low',
    riskLabel: r.metrics?.riskLabel || 'Low Risk',
    originalRating: r.metrics?.originalRating || 0,
    adjustedRating: r.metrics?.adjustedRating || 0,
    verdictHeadline: r.aiInsights?.verdictHeadline || '',
  }));

  res.json({ reports: summaries });
}

function handleGetReportDetail(req, res) {
  const report = getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }
  return res.json(report);
}

function handleExportReportCsv(req, res) {
  const report = getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  const csvData = exportReportToCsv(report);
  const safeName = String(report.productName || 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="review-detector-${safeName}-${report.id}.csv"`
  );
  return res.send('\uFEFF' + csvData);
}

function handleDeleteReport(req, res) {
  const deleted = deleteReportById(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }
  return res.json({ success: true, id: req.params.id });
}

module.exports = {
  getHealthStatus,
  handleAnalyzeProduct,
  handleGetReportsHistory,
  handleGetReportDetail,
  handleExportReportCsv,
  handleDeleteReport,
};
