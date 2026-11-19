/**
 * Bundle generator untuk runtime browser.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function stripModuleSyntax(code) {
  return code
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^\s*export\s+function\s+/gm, 'function ')
    .replace(/^\s*export\s+const\s+/gm, 'const ')
    .replace(/^\s*export\s+let\s+/gm, 'let ');
}

const iconsCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/components/icons.js'), 'utf8')
);
const stateCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/state.js'), 'utf8')
);
const chartsCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/components/charts.js'), 'utf8')
);
const modalCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/components/modal.js'), 'utf8')
);
const landingCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/views/landingView.js'), 'utf8')
);
const analyzerCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/views/analyzerView.js'), 'utf8')
);
const reportCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/views/reportView.js'), 'utf8')
);
const historyCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/views/historyView.js'), 'utf8')
);
const appCode = stripModuleSyntax(
  fs.readFileSync(path.join(ROOT, 'public/js/app.js'), 'utf8')
);

const constantsCode = fs
  .readFileSync(path.join(ROOT, 'server/config/constants.js'), 'utf8')
  .replace(/module\.exports\s*=\s*\{[\s\S]*?\};/, '');
const textMetricsCode = fs
  .readFileSync(path.join(ROOT, 'server/utils/textMetrics.js'), 'utf8')
  .replace(/const\s+\{[\s\S]*?\}\s*=\s*require\(['"][^'"]+['"]\);/g, '')
  .replace(/module\.exports\s*=\s*\{[\s\S]*?\};/, '');
const csvServiceCode = fs
  .readFileSync(path.join(ROOT, 'server/services/csvService.js'), 'utf8')
  .replace(/module\.exports\s*=\s*\{[\s\S]*?\};/, '');
const ruleEngineCode = fs
  .readFileSync(path.join(ROOT, 'server/services/ruleEngine.js'), 'utf8')
  .replace(/const\s+\{[\s\S]*?\}\s*=\s*require\(['"][^'"]+['"]\);/g, '')
  .replace(/module\.exports\s*=\s*\{[\s\S]*?\};/, '');

const hybridApiClientCode = `
const EXPRESS_BASE =
  window.location.protocol === 'file:' || window.location.port === '5500'
    ? 'http://localhost:3000'
    : '';
const LOCAL_REPORTS_KEY = 'review_detector_reports_v4';

function getLocalReports() {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalReport(reportData) {
  const reports = getLocalReports();
  const id = reportData.id || 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...reportData,
  };
  const updated = [record, ...reports.filter((r) => r.id !== id)].slice(0, 50);
  try {
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));
  } catch {}
  return record;
}

function browserScanUrlFallback(rawUrl) {
  const normalizedUrl = /^https?:\\/\\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
  let parsed;
  try {
    parsed = new URL(normalizedUrl);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      throw new Error('Invalid domain');
    }
  } catch {
    throw new Error('Link produk tidak valid. Pastikan diawali https://');
  }

  const lower = normalizedUrl.toLowerCase();
  let marketplace = 'Marketplace';
  if (lower.includes('shopee.') || lower.includes('shp.ee')) marketplace = 'Shopee';
  else if (lower.includes('tokopedia.')) marketplace = 'Tokopedia';
  else if (lower.includes('amazon.') || lower.includes('amzn.')) marketplace = 'Amazon';
  else if (lower.includes('lazada.')) marketplace = 'Lazada';
  else if (lower.includes('tiktok.')) marketplace = 'TikTok Shop';
  else if (lower.includes('blibli.')) marketplace = 'Blibli';

  const segments = parsed.pathname.split('/').map((s) => s.trim()).filter(Boolean);
  let bestSegment = segments[segments.length - 1] || parsed.hostname;
  for (const seg of segments) {
    if (seg.length > 6 && !['product', 'products', 'item', 'dp', 'gp', 'p', 'shop'].includes(seg.toLowerCase()) && !/^[0-9.]+$/.test(seg)) {
      bestSegment = seg;
    }
  }
  const productName = decodeURIComponent(bestSegment)
    .replace(/-i\\.\\d+\\.\\d+$/i, '')
    .replace(/\\.html?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 12)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || ('Produk ' + marketplace);

  const today = new Date();
  const fmtDateTime = (daysAgo, hour, min) => {
    const ymd = new Date(today.getTime() - daysAgo * 86400000).toISOString().split('T')[0];
    return ymd + 'T' + String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':00Z';
  };

  const reviews = [
    { reviewer: 'a***1', rating: 5, date: fmtDateTime(1, 14, 2), text: 'Bagus banget, recommended!', accountAgeDays: 5, reviewerTotalReviews: 14, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'r***8', rating: 5, date: fmtDateTime(1, 14, 5), text: 'Bagus banget, recommended!', accountAgeDays: 4, reviewerTotalReviews: 11, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'k***3', rating: 5, date: fmtDateTime(1, 14, 9), text: 'Bagus banget, recommended!', accountAgeDays: 6, reviewerTotalReviews: 16, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'user_774129', rating: 5, date: fmtDateTime(1, 14, 12), text: 'SEMPURNA, NO MINUS, WAJIB BELI SEKARANG JANGAN RAGU LAGI!!!', accountAgeDays: 3, reviewerTotalReviews: 19, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'd***9', rating: 5, date: fmtDateTime(1, 14, 15), text: 'Keren banget ' + productName + ' ini, koneksi bluetooth stabil dan baterai tahan lama seharian!', accountAgeDays: 7, reviewerTotalReviews: 9, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'Dimas Pratama', rating: 5, date: fmtDateTime(2, 11, 20), text: 'Kasih bintang 5 dulu karena syarat klaim garansi dari admin toko harus bintang 5. Padahal ' + productName + ' baru dipakai sebentar sudah bermasalah dan kemasan rusak.', accountAgeDays: 240, reviewerTotalReviews: 18, reviewerUniqueStores: 12 },
    { reviewer: 'Hendra Wijaya', rating: 4, date: fmtDateTime(4, 10, 22), text: 'Beli ' + productName + ' di ' + marketplace + ', sudah dipakai seminggu kualitas bagus dan berfungsi baik. Cuma pengiriman agak lambat sekitar 5 hari.', accountAgeDays: 420, reviewerTotalReviews: 26, reviewerUniqueStores: 19 },
    { reviewer: 'Nadia Putri', rating: 5, date: fmtDateTime(5, 19, 35), text: 'Sudah dipakai 2 minggu, ' + productName + ' kualitas bagus sesuai ekspektasi, harga terjangkau dan packing bubble wrap tebal rapi.', accountAgeDays: 510, reviewerTotalReviews: 34, reviewerUniqueStores: 24 },
    { reviewer: 'Kevin Saputra', rating: 2, date: fmtDateTime(7, 21, 15), text: 'Kecewa berat, barang tidak sesuai deskripsi foto dan kemasan penyok saat sampai.', accountAgeDays: 600, reviewerTotalReviews: 41, reviewerUniqueStores: 30 },
    { reviewer: 'Lestari W.', rating: 5, date: fmtDateTime(9, 8, 50), text: 'Produk original bersegel resmi dan penjual ramah responsif. Pengiriman cepat sehari sampai dengan aman.', accountAgeDays: 310, reviewerTotalReviews: 17, reviewerUniqueStores: 14 },
  ];

  return {
    productName,
    marketplace,
    productUrl: normalizedUrl,
    reviews,
  };
}

async function tryFetchBackend(pathUrl, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(EXPRESS_BASE + pathUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Terjadi kesalahan (HTTP ' + response.status + ')');
    }
    return { ok: true, data, isHttpError: false };
  } catch (err) {
    clearTimeout(timer);
    const isValidationErr = err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('aborted');
    return { ok: false, error: err, isValidationErr };
  }
}

const apiClient = {
  async analyzeProduct(payload) {
    const res = await tryFetchBackend('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      saveLocalReport(res.data);
      return res.data;
    }
    if (res.isValidationErr) {
      throw res.error;
    }

    const scanned = browserScanUrlFallback(payload.productUrl);
    const baseReport = runRuleBasedAnalysis(scanned);
    return saveLocalReport({
      inputMethod: 'link_scanner',
      analysisMode: 'unified_hybrid_rule_ai',
      ...baseReport,
    });
  },

  async getReportsHistory() {
    const res = await tryFetchBackend('/api/reports');
    if (res.ok) return res.data;

    const list = getLocalReports().map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      productName: r.productName,
      marketplace: r.marketplace,
      productUrl: r.productUrl,
      totalReviews: r.metrics?.totalReviews || 0,
      suspiciousReviewsCount: r.metrics?.suspiciousReviewsCount || 0,
      productTrustScore: r.metrics?.productTrustScore || 0,
      riskLevel: r.metrics?.riskLevel || 'low',
      riskLabel: r.metrics?.riskLabel || 'Low Risk',
      originalRating: r.metrics?.originalRating || 0,
      adjustedRating: r.metrics?.adjustedRating || 0,
      verdictHeadline: r.aiInsights?.verdictHeadline || '',
    }));
    return { reports: list };
  },

  async getReportById(id) {
    const res = await tryFetchBackend('/api/reports/' + encodeURIComponent(id));
    if (res.ok) return res.data;
    const found = getLocalReports().find((r) => r.id === id);
    if (!found) throw new Error('Laporan tidak ditemukan.');
    return found;
  },

  async deleteReportById(id) {
    const res = await tryFetchBackend('/api/reports/' + encodeURIComponent(id), {
      method: 'DELETE',
    });
    const filtered = getLocalReports().filter((r) => r.id !== id);
    try {
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(filtered));
    } catch {}
    if (res.ok) return res.data;
    return { success: true, id };
  },

  getExportCsvUrl(id) {
    const found = getLocalReports().find((r) => r.id === id) || appState.activeReport;
    if (found && (window.location.protocol === 'file:' || window.location.port === '5500')) {
      const csvStr = exportReportToCsv(found);
      return 'data:text/csv;charset=utf-8,' + encodeURIComponent('\\uFEFF' + csvStr);
    }
    return EXPRESS_BASE + '/api/reports/' + encodeURIComponent(id) + '/export-csv';
  },
};
`;

const bundle = `(function () {
  'use strict';

${constantsCode}
${textMetricsCode}
${csvServiceCode}
${ruleEngineCode}
${iconsCode}
${stateCode}
${hybridApiClientCode}
${chartsCode}
${modalCode}
${landingCode}
${analyzerCode}
${reportCode}
${historyCode}
${appCode}

})();
`;

fs.writeFileSync(path.join(ROOT, 'public/js/runtime.js'), bundle, 'utf8');
console.log('Built public/js/runtime.js (' + bundle.length + ' bytes)');
