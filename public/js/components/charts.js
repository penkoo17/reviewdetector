import { ICONS } from './icons.js';

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderStars(rating = 5) {
  const rounded = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return ICONS.starFilled.repeat(rounded) + ICONS.starEmpty.repeat(5 - rounded);
}

export function renderTrustScoreGauge(score = 0, riskLevel = 'low') {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  let strokeColor = '#10b981';
  let textColor = '#047857';
  if (riskLevel === 'moderate') {
    strokeColor = '#f59e0b';
    textColor = '#b45309';
  }
  if (riskLevel === 'high') {
    strokeColor = '#e11d48';
    textColor = '#be123c';
  }

  return `
    <svg class="trust-gauge-svg" viewBox="0 0 116 116">
      <circle class="trust-gauge-bg" cx="58" cy="58" r="${radius}" />
      <circle
        class="trust-gauge-bar"
        cx="58"
        cy="58"
        r="${radius}"
        stroke="${strokeColor}"
        stroke-dasharray="${circumference.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
      />
      <text
        x="58"
        y="55"
        text-anchor="middle"
        fill="${textColor}"
        font-family="JetBrains Mono, monospace"
        font-size="25"
        font-weight="800"
      >${clamped}</text>
      <text
        x="58"
        y="71"
        text-anchor="middle"
        fill="#64748b"
        font-size="10"
        font-weight="600"
      >/ 100</text>
    </svg>
  `;
}

export function renderDailyTimelineChart(dailyTimeline = []) {
  if (!dailyTimeline || dailyTimeline.length === 0) {
    return `<div style="color:var(--text-muted);font-size:0.84rem;padding:1rem 0;">Belum ada data tanggal ulasan.</div>`;
  }

  const maxCount = Math.max(...dailyTimeline.map((d) => d.count), 1);

  const colsHtml = dailyTimeline
    .map((item) => {
      const heightPct = Math.max(12, Math.round((item.count / maxCount) * 100));
      const shortDate = item.date.slice(5);
      return `
        <div class="timeline-col" title="${escapeHtml(item.date)}: ${item.count} ulasan${
        item.isBurstDate ? ' (Lonjakan tidak biasa)' : ''
      }">
          <span style="font-size:0.71rem;font-weight:700;font-family:var(--font-mono);color:${
            item.isBurstDate ? '#be123c' : '#475569'
          };">${item.count}</span>
          <div class="timeline-bar ${item.isBurstDate ? 'burst' : ''}" style="height:${heightPct}%;"></div>
          <span class="timeline-date">${escapeHtml(shortDate)}</span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="timeline-bars">
      ${colsHtml}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-top:0.7rem;font-size:0.75rem;color:var(--text-muted);">
      <span style="display:inline-flex;align-items:center;gap:0.4rem;">
        <span style="width:9px;height:9px;border-radius:2px;background:#64748b;display:inline-block;"></span>
        Hari Normal
      </span>
      <span style="display:inline-flex;align-items:center;gap:0.4rem;">
        <span style="width:9px;height:9px;border-radius:2px;background:#e11d48;display:inline-block;"></span>
        Hari Lonjakan Ulasan
      </span>
    </div>
  `;
}

export function renderStarDistributionBars(starDist = {}, totalReviews = 1) {
  const safeTotal = Math.max(1, totalReviews);
  const rows = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = starDist[star] || 0;
      const pct = Math.round((count / safeTotal) * 100);
      const barColor =
        star >= 4 ? '#f59e0b' : star === 3 ? '#94a3b8' : '#e11d48';
      return `
        <div style="display:grid;grid-template-columns:46px 1fr 66px;align-items:center;gap:0.65rem;margin-bottom:0.5rem;font-size:0.8rem;">
          <span style="font-weight:600;color:var(--text-primary);font-family:var(--font-mono);">${star}.0</span>
          <div style="height:7px;background:#f1f5f9;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:999px;"></div>
          </div>
          <span style="text-align:right;font-family:var(--font-mono);color:var(--text-secondary);font-size:0.76rem;">${count} (${pct}%)</span>
        </div>
      `;
    })
    .join('');

  return `<div>${rows}</div>`;
}
