const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'review-detector-data')
  : path.join(__dirname, 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

function ensureStorageInitialized() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(REPORTS_FILE)) {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function getAllReports() {
  ensureStorageInitialized();
  try {
    const raw = fs.readFileSync(REPORTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getReportById(id) {
  const reports = getAllReports();
  return reports.find((r) => r.id === id) || null;
}

function saveReport(reportData) {
  const reports = getAllReports();
  const id =
    reportData.id ||
    `rep_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...reportData,
  };

  const updated = [record, ...reports.filter((r) => r.id !== id)].slice(0, 100);
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return record;
}

function deleteReportById(id) {
  const reports = getAllReports();
  const filtered = reports.filter((r) => r.id !== id);
  if (filtered.length === reports.length) return false;
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return true;
}

module.exports = {
  getAllReports,
  getReportById,
  saveReport,
  deleteReportById,
};
