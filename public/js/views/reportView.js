import {
  escapeHtml,
  renderStars,
  renderTrustScoreGauge,
  renderDailyTimelineChart,
  renderStarDistributionBars,
} from '../components/charts.js';
import { ICONS, renderMarketplaceBadge } from '../components/icons.js';
import { openWhyReviewModal, openShareReportModal } from '../components/modal.js';
import { apiClient } from '../api.js';

export function renderReportView({ report, onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  if (!report) {
    root.innerHTML = `
      <div class="card anim-card" style="text-align:center;padding:3.25rem 1.5rem;max-width:540px;margin:1.5rem auto;">
        <div style="margin-bottom:0.75rem;color:var(--text-muted);">${ICONS.fileText}</div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.4rem;">Belum Ada Laporan Dibuka</h3>
        <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:1.5rem;">
          Masukkan link produk untuk mulai memeriksa ulasannya, atau buka laporan dari daftar riwayat.
        </p>
        <div style="display:flex;justify-content:center;gap:0.65rem;">
          <button type="button" class="btn btn-primary" id="emptyGoAnalyzeBtn">Periksa Produk</button>
          <button type="button" class="btn btn-secondary" id="emptyGoHistoryBtn">Lihat Riwayat</button>
        </div>
      </div>
    `;
    document.getElementById('emptyGoAnalyzeBtn')?.addEventListener('click', () => onNavigate('analyzer'));
    document.getElementById('emptyGoHistoryBtn')?.addEventListener('click', () => onNavigate('history'));
    return;
  }

  const m = report.metrics || {};
  const ai = report.aiInsights || {};
  const themes = report.themes || { complaints: [], praises: [] };
  const allFlags = report.redFlagBreakdown || [];
  const layers = report.layerBreakdown || [];

  const riskBadgeClass =
    m.riskLevel === 'low'
      ? 'badge-low'
      : m.riskLevel === 'moderate'
      ? 'badge-moderate'
      : 'badge-high';

  const riskDotClass =
    m.riskLevel === 'low'
      ? 'risk-dot-low'
      : m.riskLevel === 'moderate'
      ? 'risk-dot-moderate'
      : 'risk-dot-high';

  const adjustedColor =
    m.ratingDelta <= -0.8
      ? 'var(--risk-high-ink)'
      : m.ratingDelta <= -0.25
      ? 'var(--risk-moderate-ink)'
      : 'var(--risk-low-ink)';

  const verdictBorderColor =
    m.riskLevel === 'low'
      ? 'var(--risk-low-accent)'
      : m.riskLevel === 'moderate'
      ? 'var(--risk-moderate-accent)'
      : 'var(--risk-high-accent)';

  const zScorePct = Math.min(100, Math.round(((m.peakBurstZScore || 0) / 3) * 100));
  const zScoreColor =
    (m.peakBurstZScore || 0) >= 1.5
      ? 'var(--risk-high-accent)'
      : (m.peakBurstZScore || 0) >= 1.0
      ? 'var(--risk-moderate-accent)'
      : 'var(--risk-low-accent)';

  const ttrPct = Math.min(100, Math.round((m.avgLexicalDiversity || 0) * 100));
  const exportCsvUrl = apiClient.getExportCsvUrl(report.id);

  const teksHits = layers.find((l) => l.id === 'teks')?.totalHits || 0;
  const perilakuHits = layers.find((l) => l.id === 'perilaku')?.totalHits || 0;
  const koordinasiHits = layers.find((l) => l.id === 'koordinasi')?.totalHits || 0;

  root.innerHTML = `
    <div class="card anim-card" style="margin-bottom:1.25rem;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1.15rem;">
        <div style="max-width:680px;">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.55rem;">
            ${renderMarketplaceBadge(report.marketplace)}
            <span class="badge ${riskBadgeClass}">
              <span class="risk-dot ${riskDotClass}"></span>
              ${escapeHtml(m.riskLabel)} (${m.productTrustScore}/100)
            </span>
            <span class="badge badge-info">${escapeHtml(ai.poweredBy || 'Analisis Otomatis')}</span>
          </div>
          <h2 style="font-size:1.45rem;font-weight:800;letter-spacing:-0.025em;line-height:1.3;">
            ${escapeHtml(report.productName)}
          </h2>
        </div>

        <div class="report-actions-bar">
          ${
            report.productUrl
              ? `<a href="${escapeHtml(
                  report.productUrl
                )}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Buka halaman produk">
                  ${ICONS.externalLink}
                  <span>Buka Produk</span>
                </a>`
              : ''
          }
          <button type="button" class="btn btn-primary btn-sm" id="reportShareBtn">
            ${ICONS.share}
            <span>Bagikan</span>
          </button>
          <a href="${exportCsvUrl}" class="btn btn-secondary btn-sm" download>
            ${ICONS.download}
            <span>Unduh CSV</span>
          </a>
          <button type="button" class="btn btn-secondary btn-sm" id="reportNewAnalysisBtn">
            ${ICONS.plus}
            <span>Cek Lainnya</span>
          </button>
        </div>
      </div>
    </div>

    <div class="report-hero-grid">
      <div class="card anim-card anim-delay-1">
        <div class="card-header" style="margin-bottom:0.85rem;">
          <div>
            <h3 class="card-title">Skor Kepercayaan</h3>
            <p class="card-subtitle">Nilai rata-rata dari 0 sampai 100</p>
          </div>
          <span class="badge ${riskBadgeClass}">
            <span class="risk-dot ${riskDotClass}"></span>
            ${escapeHtml(m.riskLabel)}
          </span>
        </div>

        <div class="trust-gauge-wrap">
          ${renderTrustScoreGauge(m.productTrustScore, m.riskLevel)}
          <div class="trust-legend">
            <div class="trust-legend-row">
              <span class="risk-dot risk-dot-low"></span>
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--risk-low-ink);">80–100</span>
              <span style="color:var(--text-secondary);">Low Risk</span>
            </div>
            <div class="trust-legend-row">
              <span class="risk-dot risk-dot-moderate"></span>
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--risk-moderate-ink);">60–79</span>
              <span style="color:var(--text-secondary);">Moderate Risk</span>
            </div>
            <div class="trust-legend-row">
              <span class="risk-dot risk-dot-high"></span>
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--risk-high-ink);">0–59</span>
              <span style="color:var(--text-secondary);">High Risk</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card anim-card anim-delay-2">
        <div class="card-header" style="margin-bottom:0.85rem;">
          <div>
            <h3 class="card-title">Perbandingan Rating</h3>
            <p class="card-subtitle">Ulasan mencurigakan diberi bobot lebih kecil</p>
          </div>
        </div>

        <div class="rating-compare-box">
          <div class="rating-col">
            <div class="rating-col-label">Rating Toko</div>
            <div class="rating-col-val" style="color:var(--viz-amber);">${m.originalRating}</div>
            <div style="font-size:0.71rem;color:var(--text-muted);">Rata-rata asli</div>
          </div>
          <div class="rating-arrow">${ICONS.arrowRight}</div>
          <div class="rating-col">
            <div class="rating-col-label">Terkoreksi</div>
            <div class="rating-col-val" style="color:${adjustedColor};">${m.adjustedRating}</div>
            <div style="font-size:0.71rem;color:${adjustedColor};font-weight:700;font-family:var(--font-mono);">
              ${m.ratingDelta > 0 ? `+${m.ratingDelta}` : m.ratingDelta}
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0.8rem;border-radius:8px;background:${
          m.suspiciousRatio >= 40
            ? 'var(--risk-high-bg)'
            : m.suspiciousRatio >= 20
            ? 'var(--risk-moderate-bg)'
            : 'var(--risk-low-bg)'
        };border:1px solid ${
          m.suspiciousRatio >= 40
            ? 'var(--risk-high-border)'
            : m.suspiciousRatio >= 20
            ? 'var(--risk-moderate-border)'
            : 'var(--risk-low-border)'
        };font-size:0.8rem;">
          <span style="color:var(--text-secondary);font-weight:500;">Perlu dicek ulang</span>
          <strong style="font-family:var(--font-mono);color:${
            m.suspiciousRatio >= 40
              ? 'var(--risk-high-ink)'
              : m.suspiciousRatio >= 20
              ? 'var(--risk-moderate-ink)'
              : 'var(--risk-low-ink)'
          };">
            ${m.suspiciousReviewsCount} dari ${m.totalReviews} (${m.suspiciousRatio}%)
          </strong>
        </div>
      </div>

      <div class="card anim-card anim-delay-3" style="border-top:3px solid ${verdictBorderColor};">
        <div class="card-header" style="margin-bottom:0.55rem;">
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);font-weight:600;">
              Kesimpulan Cepat
            </div>
            <h3 class="card-title" style="margin-top:0.15rem;">
              ${escapeHtml(ai.verdictHeadline || 'Ringkasan Pola Ulasan')}
            </h3>
          </div>
        </div>

        <p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:0.8rem;">
          ${escapeHtml(ai.patternExplanation || '')}
        </p>

        <div style="font-size:0.79rem;padding:0.7rem 0.85rem;border-radius:8px;background:var(--bg-subtle);border-left:3px solid ${verdictBorderColor};">
          <strong style="color:var(--text-primary);display:block;margin-bottom:0.25rem;">
            Perhatikan sebelum membeli:
          </strong>
          <ul style="padding-left:1rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            ${(ai.whatToWatchBeforeBuying || [])
              .map((tip) => `<li>${escapeHtml(tip)}</li>`)
              .join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="grid-4 anim-card anim-delay-3" style="margin-bottom:1.25rem;">
      <div class="stat-card">
        <div class="stat-card-label">Detail Pengalaman</div>
        <div class="stat-card-value" style="color:var(--viz-blue);">${m.avgSpecificityScore ?? 0}%</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${m.avgSpecificityScore ?? 0}%;background:var(--viz-blue);"></div>
        </div>
        <div class="stat-card-foot">Ulasan dengan cerita pemakaian</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-label">Variasi Bahasa</div>
        <div class="stat-card-value" style="color:var(--viz-teal);">${ttrPct}%</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${ttrPct}%;background:var(--viz-teal);"></div>
        </div>
        <div class="stat-card-foot">Keberagaman pilihan kata</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-label">Indeks Lonjakan</div>
        <div class="stat-card-value" style="color:${zScoreColor};">${m.peakBurstZScore ?? 0}</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${zScorePct}%;background:${zScoreColor};"></div>
        </div>
        <div class="stat-card-foot">Kepadatan ulasan dalam 1–3 hari</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-label">Dominasi Bintang 5</div>
        <div class="stat-card-value" style="color:var(--viz-amber);">${m.fiveStarConcentration ?? 0}%</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${m.fiveStarConcentration ?? 0}%;background:var(--viz-amber);"></div>
        </div>
        <div class="stat-card-foot">Jumlah sampel: ${escapeHtml(m.sampleConfidence || 'Standar')}</div>
      </div>
    </div>

    <div class="card anim-card anim-delay-4" style="margin-bottom:1.25rem;">
      <div class="card-header" style="margin-bottom:0.85rem;">
        <div>
          <h3 class="card-title">${ICONS.layers} Rincian Sinyal yang Diperiksa</h3>
          <p class="card-subtitle">${escapeHtml(ai.redFlagExplanation || '')}</p>
        </div>
      </div>

      <div class="layer-tabs" id="layerFilterTabs">
        <button type="button" class="layer-tab-btn active" data-layer-tab="all">
          Semua (12)
        </button>
        <button type="button" class="layer-tab-btn" data-layer-tab="teks">
          Isi Teks (${teksHits} temuan)
        </button>
        <button type="button" class="layer-tab-btn" data-layer-tab="perilaku">
          Perilaku (${perilakuHits} temuan)
        </button>
        <button type="button" class="layer-tab-btn" data-layer-tab="koordinasi">
          Koordinasi (${koordinasiHits} temuan)
        </button>
      </div>

      <div class="grid-3" id="layerSignalsGrid"></div>
    </div>

    <div class="grid-2" style="margin-bottom:1.25rem;">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title" style="color:var(--risk-high-ink);">${ICONS.alert} Keluhan yang Sering Muncul</h3>
            <p class="card-subtitle">Masalah yang berulang kali disebut pembeli</p>
          </div>
        </div>

        <div class="theme-list">
          ${
            themes.complaints && themes.complaints.length > 0
              ? themes.complaints
                  .map(
                    (c) => `
                <div class="theme-item theme-item-complaint">
                  <div class="theme-item-header">
                    <span>${escapeHtml(c.theme)}</span>
                    <span class="badge badge-high">${c.count} ulasan</span>
                  </div>
                  ${
                    c.examples && c.examples.length > 0
                      ? `<div class="theme-quote">"${escapeHtml(c.examples[0])}"</div>`
                      : ''
                  }
                </div>
              `
                  )
                  .join('')
              : `<div style="color:var(--text-muted);font-size:0.84rem;padding:0.5rem 0;">Tidak ada keluhan berulang yang menonjol.</div>`
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title" style="color:var(--risk-low-ink);">${ICONS.check} Hal yang Sering Dipuji</h3>
            <p class="card-subtitle">Kelebihan produk yang sering dirasakan pembeli</p>
          </div>
        </div>

        <div class="theme-list">
          ${
            themes.praises && themes.praises.length > 0
              ? themes.praises
                  .map(
                    (p) => `
                <div class="theme-item theme-item-praise">
                  <div class="theme-item-header">
                    <span>${escapeHtml(p.theme)}</span>
                    <span class="badge badge-low">${p.count} ulasan</span>
                  </div>
                  ${
                    p.examples && p.examples.length > 0
                      ? `<div class="theme-quote">"${escapeHtml(p.examples[0])}"</div>`
                      : ''
                  }
                </div>
              `
                  )
                  .join('')
              : `<div style="color:var(--text-muted);font-size:0.84rem;padding:0.5rem 0;">Belum ada pujian khusus yang dominan.</div>`
          }
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:1.25rem;">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${ICONS.chart} Pola Waktu Ulasan</h3>
            <p class="card-subtitle">Puncak kepadatan ${m.maxReviewsIn48h || 0} ulasan dalam 1–3 hari</p>
          </div>
        </div>
        ${renderDailyTimelineChart(m.dailyTimeline)}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Sebaran Rating &amp; Nada Ulasan</h3>
            <p class="card-subtitle">Perbandingan jumlah bintang dan sentimen kalimat</p>
          </div>
        </div>
        ${renderStarDistributionBars(m.starDistribution, m.totalReviews)}

        <div class="stats-mini-3" style="margin-top:1rem;padding-top:0.85rem;border-top:1px solid var(--border-subtle);font-size:0.78rem;">
          <div>
            <span style="color:var(--text-muted);display:block;">Rata-rata Panjang</span>
            <strong style="font-family:var(--font-mono);">${m.avgWordCount} kata</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;">Kalimat Mirip</span>
            <strong style="font-family:var(--font-mono);color:${
              m.duplicateCount > 0 ? 'var(--risk-high-ink)' : 'var(--text-primary)'
            };">${m.duplicateCount} ulasan</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;">Pos / Net / Neg</span>
            <strong style="font-family:var(--font-mono);">
              <span style="color:var(--risk-low-ink);">${m.sentimentDistribution?.positive || 0}</span> /
              <span style="color:var(--text-secondary);">${m.sentimentDistribution?.neutral || 0}</span> /
              <span style="color:var(--risk-high-ink);">${m.sentimentDistribution?.negative || 0}</span>
            </strong>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Daftar Ulasan</h3>
          <p class="card-subtitle">
            Klik tombol Alasan di setiap baris untuk melihat rincian penilaiannya.
          </p>
        </div>
      </div>

      <div class="table-controls">
        <div class="filter-pills" id="reviewFilterPills">
          <button type="button" class="filter-pill active" data-filter="all">
            Semua (${report.reviews.length})
          </button>
          <button type="button" class="filter-pill" data-filter="suspicious">
            Perlu Dicek (${m.suspiciousReviewsCount})
          </button>
          <button type="button" class="filter-pill" data-filter="clean">
            Wajar (${m.cleanReviewsCount})
          </button>
          <button type="button" class="filter-pill" data-filter="layer:teks">
            Isi Teks
          </button>
          <button type="button" class="filter-pill" data-filter="layer:perilaku">
            Perilaku
          </button>
          <button type="button" class="filter-pill" data-filter="layer:koordinasi">
            Koordinasi
          </button>
        </div>

        <div class="search-box-wrap">
          <input
            type="search"
            id="reviewSearchInput"
            class="form-control"
            style="padding:0.42rem 0.8rem;font-size:0.83rem;"
            placeholder="Cari isi ulasan..."
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="review-table">
          <thead>
            <tr>
              <th style="width:45px;">No</th>
              <th style="width:140px;">Pengulas</th>
              <th style="width:115px;">Rating</th>
              <th>Isi Ulasan</th>
              <th style="width:225px;">Tanda Terdeteksi</th>
              <th style="width:98px;">Skor</th>
              <th style="width:86px;">Rincian</th>
            </tr>
          </thead>
          <tbody id="reportReviewsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  let activeLayerTab = 'all';
  const renderSignalsGrid = () => {
    const grid = document.getElementById('layerSignalsGrid');
    if (!grid) return;

    const list =
      activeLayerTab === 'all'
        ? allFlags
        : allFlags.filter((f) => f.layer === activeLayerTab);

    grid.innerHTML = list
      .map((rf) => {
        const triggerClass =
          rf.count > 0
            ? rf.badgeTone === 'alert'
              ? 'triggered-alert'
              : rf.badgeTone === 'warning'
              ? 'triggered-warning'
              : 'triggered-neutral'
            : '';
        const countColor =
          rf.count > 0
            ? rf.badgeTone === 'alert'
              ? 'var(--risk-high-ink)'
              : rf.badgeTone === 'warning'
              ? 'var(--risk-moderate-ink)'
              : 'var(--text-primary)'
            : 'var(--text-muted)';

        return `
          <div class="red-flag-item ${triggerClass}">
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.32rem;">
                <span class="badge">${escapeHtml(rf.layerLabel || 'Sinyal')}</span>
                <span class="badge ${
                  rf.count > 0 ? `badge-${escapeHtml(rf.badgeTone || 'neutral')}` : ''
                }">Risiko: ${escapeHtml(rf.riskWeight || 'Sedang')}</span>
              </div>
              <div style="font-weight:700;font-size:0.86rem;color:var(--text-primary);margin-bottom:0.18rem;">
                ${escapeHtml(rf.label)}
              </div>
              <p style="font-size:0.76rem;color:var(--text-secondary);line-height:1.45;">
                ${escapeHtml(rf.shortDesc || rf.example)}
              </p>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:1.25rem;font-weight:800;font-family:var(--font-mono);color:${countColor};">
                ${rf.count}
              </div>
              <div style="font-size:0.68rem;color:var(--text-muted);">ulasan</div>
            </div>
          </div>
        `;
      })
      .join('');
  };

  renderSignalsGrid();

  document.querySelectorAll('#layerFilterTabs .layer-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document
        .querySelectorAll('#layerFilterTabs .layer-tab-btn')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeLayerTab = btn.getAttribute('data-layer-tab') || 'all';
      renderSignalsGrid();
    });
  });

  document.getElementById('reportShareBtn')?.addEventListener('click', () => {
    openShareReportModal(report);
  });

  document.getElementById('reportNewAnalysisBtn')?.addEventListener('click', () => {
    onNavigate('analyzer');
  });

  let currentFilter = 'all';
  let searchQuery = '';

  const renderTableRows = () => {
    const tbody = document.getElementById('reportReviewsTableBody');
    if (!tbody) return;

    const filtered = (report.reviews || []).filter((rev) => {
      if (currentFilter === 'suspicious' && !rev.isSuspicious) return false;
      if (currentFilter === 'clean' && rev.isSuspicious) return false;
      if (currentFilter.startsWith('layer:')) {
        const targetLayer = currentFilter.split(':')[1];
        if (!rev.redFlags.some((f) => f.layer === targetLayer)) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inText = rev.text.toLowerCase().includes(q);
        const inUser = rev.reviewer.toLowerCase().includes(q);
        if (!inText && !inUser) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">
            Tidak ada ulasan yang cocok dengan filter ini.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((rev) => {
        const scoreBadge =
          rev.riskLevel === 'low'
            ? 'badge-low'
            : rev.riskLevel === 'moderate'
            ? 'badge-moderate'
            : 'badge-high';

        const dotClass =
          rev.riskLevel === 'low'
            ? 'risk-dot-low'
            : rev.riskLevel === 'moderate'
            ? 'risk-dot-moderate'
            : 'risk-dot-high';

        const sentimentClass =
          rev.sentiment === 'positive'
            ? 'badge-positive'
            : rev.sentiment === 'negative'
            ? 'badge-negative'
            : '';

        const sentimentLabel =
          rev.sentiment === 'positive'
            ? 'Positif'
            : rev.sentiment === 'negative'
            ? 'Negatif'
            : 'Netral';

        const flagsHtml =
          rev.redFlags && rev.redFlags.length > 0
            ? rev.redFlags
                .map(
                  (rf) =>
                    `<span class="badge badge-${escapeHtml(
                      rf.badgeTone || 'neutral'
                    )}" style="margin:0 0.25rem 0.25rem 0;">${escapeHtml(rf.label)}</span>`
                )
                .join('')
            : `<span class="badge badge-low">Wajar</span>`;

        return `
          <tr class="${rev.isSuspicious ? 'row-suspicious' : ''}">
            <td class="rev-cell-no" style="font-family:var(--font-mono);color:var(--text-muted);">#${rev.index}</td>
            <td class="rev-cell-user">
              <div style="font-weight:600;">${escapeHtml(rev.reviewer)}</div>
              <div style="font-size:0.73rem;color:var(--text-muted);font-family:var(--font-mono);">
                ${escapeHtml(rev.date)}${rev.timeLabel ? ` ${escapeHtml(rev.timeLabel)}` : ''}
              </div>
            </td>
            <td class="rev-cell-rating">
              <div>${renderStars(rev.rating)}</div>
              <div class="rev-sentiment-wrap" style="margin-top:0.3rem;">
                <span class="badge ${sentimentClass}" style="font-size:0.68rem;">
                  ${sentimentLabel}
                </span>
              </div>
            </td>
            <td class="rev-cell-text">
              <div style="line-height:1.55;">${escapeHtml(rev.text)}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem;font-family:var(--font-mono);">
                ${rev.wordCount} kata
              </div>
            </td>
            <td class="rev-cell-flags">${flagsHtml}</td>
            <td class="rev-cell-score">
              <span class="badge ${scoreBadge}" style="font-family:var(--font-mono);">
                <span class="risk-dot ${dotClass}"></span>
                ${rev.trustScore}/100
              </span>
            </td>
            <td class="rev-cell-action">
              <button type="button" class="why-btn" data-why-index="${rev.index}">
                ${ICONS.info}
                <span>Alasan</span>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-why-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const revIndex = Number(btn.getAttribute('data-why-index'));
        const targetRev = report.reviews.find((r) => r.index === revIndex);
        if (targetRev) {
          openWhyReviewModal(targetRev);
        }
      });
    });
  };

  renderTableRows();

  document.querySelectorAll('#reviewFilterPills .filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document
        .querySelectorAll('#reviewFilterPills .filter-pill')
        .forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      renderTableRows();
    });
  });

  document.getElementById('reviewSearchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTableRows();
  });
}
