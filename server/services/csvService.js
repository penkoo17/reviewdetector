/**
 * Konverter laporan analisis ke format CSV siap unduh.
 */

function exportReportToCsv(report) {
  const escapeCell = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'No',
    'Reviewer',
    'Date',
    'Original_Rating',
    'Trust_Score',
    'Risk_Level',
    'Sentiment',
    'Needs_Check',
    'Signals',
    'Explanation',
    'Review_Text',
  ];

  const rows = [headers.join(',')];

  (report.reviews || []).forEach((rev, idx) => {
    const flags = (rev.redFlags || []).map((f) => f.label).join(' | ');
    const reasons = (rev.redFlags || []).map((f) => f.reason).join(' ; ');
    const row = [
      idx + 1,
      rev.reviewer,
      rev.date,
      rev.rating,
      rev.trustScore,
      rev.riskLevel,
      rev.sentiment || 'neutral',
      rev.isSuspicious ? 'YES' : 'NO',
      flags || 'Normal',
      reasons || 'Ulasan terlihat wajar dan konsisten.',
      rev.text,
    ].map(escapeCell);

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

module.exports = {
  exportReportToCsv,
};
