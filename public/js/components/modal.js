import { escapeHtml, renderStars } from './charts.js';
import { ICONS } from './icons.js';

export function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${ICONS.check}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 220ms ease';
    setTimeout(() => toast.remove(), 240);
  }, 3000);
}

export function closeModal() {
  const backdrop = document.getElementById('appModalBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

export function openModal(htmlContent) {
  const backdrop = document.getElementById('appModalBackdrop');
  const content = document.getElementById('appModalContent');
  if (!backdrop || !content) return;

  content.innerHTML = htmlContent;
  backdrop.classList.remove('hidden');

  const closeBtns = content.querySelectorAll('[data-close-modal]');
  closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));
}

export function openWhyReviewModal(review) {
  const badgeClass =
    review.riskLevel === 'low'
      ? 'badge-low'
      : review.riskLevel === 'moderate'
      ? 'badge-moderate'
      : 'badge-high';

  const dotClass =
    review.riskLevel === 'low'
      ? 'risk-dot-low'
      : review.riskLevel === 'moderate'
      ? 'risk-dot-moderate'
      : 'risk-dot-high';

  const flagsHtml =
    review.redFlags && review.redFlags.length > 0
      ? review.redFlags
          .map(
            (rf) => `
          <div style="padding:0.85rem;border-radius:10px;background:${
            rf.badgeTone === 'alert'
              ? 'var(--risk-high-bg)'
              : rf.badgeTone === 'warning'
              ? 'var(--risk-moderate-bg)'
              : 'var(--bg-subtle)'
          };border:1px solid ${
              rf.badgeTone === 'alert'
                ? 'var(--risk-high-border)'
                : rf.badgeTone === 'warning'
                ? 'var(--risk-moderate-border)'
                : 'var(--border-subtle)'
            };margin-bottom:0.6rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.3rem;">
              <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;">
                <span class="badge">${escapeHtml(rf.layerLabel || 'Sinyal')}</span>
                <span class="badge badge-${escapeHtml(rf.badgeTone || 'neutral')}">${ICONS.flag} ${escapeHtml(
              rf.label
            )}</span>
                ${rf.riskWeight ? `<span class="badge">Risiko: ${escapeHtml(rf.riskWeight)}</span>` : ''}
              </div>
              <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--risk-high-ink);font-weight:700;">-${
                rf.penalty || 15
              } poin</span>
            </div>
            <p style="font-size:0.83rem;color:var(--text-primary);">${escapeHtml(rf.reason)}</p>
          </div>
        `
          )
          .join('')
      : `
        <div style="padding:0.9rem;border-radius:10px;background:var(--risk-low-bg);border:1px solid var(--risk-low-border);color:var(--risk-low-ink);font-size:0.85rem;">
          Tidak ada tanda kejanggalan. Ulasan ini menceritakan pengalaman pemakaian (${review.wordCount} kata) yang selaras dengan rating yang diberikan.
        </div>
      `;

  const sentimentIndo =
    review.sentiment === 'positive'
      ? 'Positif'
      : review.sentiment === 'negative'
      ? 'Negatif'
      : 'Netral';

  const html = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.1rem;">
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);font-weight:600;">
          Rincian Penilaian Ulasan
        </div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-top:0.15rem;">
          Alasan Skor Ulasan #${review.index} (${review.trustScore}/100)
        </h3>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" data-close-modal>${ICONS.close} Tutup</button>
    </div>

    <div style="padding:0.95rem;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border-subtle);margin-bottom:1.1rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.45rem;">
        <div>
          <strong style="font-size:0.88rem;">${escapeHtml(review.reviewer)}</strong>
          <span style="font-size:0.78rem;color:var(--text-muted);margin-left:0.4rem;font-family:var(--font-mono);">${escapeHtml(
            review.date
          )}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span>${renderStars(review.rating)}</span>
          <span class="badge ${badgeClass}"><span class="risk-dot ${dotClass}"></span>${escapeHtml(
    review.riskLabel
  )}</span>
        </div>
      </div>
      <p style="font-size:0.88rem;color:var(--text-primary);font-style:italic;">"${escapeHtml(
        review.text
      )}"</p>
    </div>

    <div style="margin-bottom:1.1rem;">
      <h4 style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.04em;">
        Faktor yang Memengaruhi Skor
      </h4>
      ${flagsHtml}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.55rem;padding:0.8rem;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border-subtle);font-size:0.76rem;margin-bottom:1rem;">
      <div>
        <div style="color:var(--text-muted);">Detail Pengalaman</div>
        <div style="font-weight:700;font-family:var(--font-mono);color:var(--viz-blue);">${
          review.specificityScore ?? 0
        }%</div>
      </div>
      <div>
        <div style="color:var(--text-muted);">Panjang Kalimat</div>
        <div style="font-weight:700;font-family:var(--font-mono);color:var(--text-primary);">${
          review.wordCount
        } kata</div>
      </div>
      <div>
        <div style="color:var(--text-muted);">Nada Kalimat</div>
        <div style="font-weight:700;color:${
          review.sentiment === 'positive'
            ? 'var(--risk-low-ink)'
            : review.sentiment === 'negative'
            ? 'var(--risk-high-ink)'
            : 'var(--text-secondary)'
        };">${sentimentIndo}</div>
      </div>
    </div>

    <div style="font-size:0.79rem;color:var(--text-secondary);border-left:2px solid var(--bg-inverse);padding:0.45rem 0.85rem;">
      Skor ini menunjukkan tingkat kewajaran pola ulasan sebagai bahan pertimbangan sebelum membeli, bukan vonis mutlak.
    </div>
  `;

  openModal(html);
}

export function openShareReportModal(report) {
  const shareUrl = `${window.location.origin}/?report=${encodeURIComponent(report.id)}`;
  const summaryText = [
    `Laporan Ulasan Produk — Review Detector`,
    `Produk: ${report.productName} (${report.marketplace})`,
    `- Skor Kepercayaan: ${report.metrics.productTrustScore}/100 (${report.metrics.riskLabel})`,
    `- Rating Toko: ${report.metrics.originalRating} -> Rating Terkoreksi: ${report.metrics.adjustedRating}`,
    `- Ulasan Perlu Dicek: ${report.metrics.suspiciousReviewsCount} dari ${report.metrics.totalReviews} ulasan`,
    `- Kesimpulan: ${report.aiInsights?.verdictHeadline || ''}`,
    `Lihat hasil lengkap: ${shareUrl}`,
  ].join('\n');

  const html = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.1rem;">
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);font-weight:600;">
          Bagikan Hasil
        </div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-top:0.15rem;">Bagikan Laporan Produk</h3>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" data-close-modal>${ICONS.close} Tutup</button>
    </div>

    <div class="form-group">
      <label class="form-label">Tautan Laporan</label>
      <div style="display:flex;gap:0.5rem;">
        <input type="text" class="form-control" id="shareLinkInput" value="${escapeHtml(
          shareUrl
        )}" readonly />
        <button type="button" class="btn btn-primary" id="copyShareLinkBtn">Salin</button>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Ringkasan Teks</label>
      <textarea class="form-control" id="shareSummaryText" rows="6" readonly>${escapeHtml(
        summaryText
      )}</textarea>
      <div style="margin-top:0.55rem;display:flex;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary btn-sm" id="copyShareSummaryBtn">Salin Ringkasan</button>
      </div>
    </div>
  `;

  openModal(html);

  document.getElementById('copyShareLinkBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl);
    showToast('Tautan laporan berhasil disalin.');
  });

  document.getElementById('copyShareSummaryBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summaryText);
    showToast('Ringkasan berhasil disalin.');
  });
}
