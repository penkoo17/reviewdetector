/**
 * @file server/routes/apiRoutes.js
 * @description Definisi routing endpoint API Review Detector.
 */

const express = require('express');
const {
  getHealthStatus,
  handleAnalyzeProduct,
  handleGetReportsHistory,
  handleGetReportDetail,
  handleExportReportCsv,
  handleDeleteReport,
} = require('../controllers/analysisController');

const router = express.Router();

router.get('/health', getHealthStatus);
router.post('/analyze', handleAnalyzeProduct);

router.get('/reports', handleGetReportsHistory);
router.get('/reports/:id', handleGetReportDetail);
router.get('/reports/:id/export-csv', handleExportReportCsv);
router.delete('/reports/:id', handleDeleteReport);

module.exports = router;
