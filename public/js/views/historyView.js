import { apiClient } from '../api.js';
import { escapeHtml } from '../components/charts.js';
import { ICONS, renderMarketplaceBadge } from '../components/icons.js';
import { showToast } from '../components/modal.js';

export async function renderHistoryView({ onOpenReport, onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
      <div>
        <h2 style="font-size:1.55rem;font-weight:800;letter-spacing:-0.025em;">Riwayat Analisis</h2>
        <p style="color:var(--text-secondary);font-size:0.88rem;">
          Daftar produk yang pernah Anda periksa beserta perbandingan rating asli dan terkoreksi.
        </p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" id="historyNewAnalysisBtn">
        ${ICONS.plus}
        <span>Periksa Produk</span>
      </button>
    </div>
    <div id="historyListContainer">
      <div class="card" style="text-align:center;padding:2rem;color:var(--text-muted);">Memuat riwayat...</div>
    </div>
  `;

  document.getElementById('historyNewAnalysisBtn')?.addEventListener('click', () => {
    onNavigate('analyzer');
  });

  const container = document.getElementById('historyListContainer');

  const loadList = async () => {
    try {
      const { reports } = await apiClient.getReportsHistory();

      if (!reports || reports.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center;padding:3rem 1.5rem;max-width:540px;margin:0 auto;">
            <div style="margin-bottom:0.6rem;color:var(--text-muted);">${ICONS.clock}</div>
            <h3 style="font-size:1.08rem;font-weight:700;margin-bottom:0.35rem;">Belum Ada Riwayat</h3>
            <p style="color:var(--text-secondary);font-size:0.86rem;margin-bottom:1.25rem;">
              Produk yang sudah Anda periksa akan otomatis tersimpan di sini agar mudah dibuka kembali.
            </p>
            <button type="button" class="btn btn-primary" id="emptyHistoryStartBtn">Periksa Produk Pertama</button>
          </div>
        `;
        document.getElementById('emptyHistoryStartBtn')?.addEventListener('click', () => {
          onNavigate('analyzer');
        });
        return;
      }

      container.innerHTML = `
        <div class="grid-2">
          ${reports
            .map((item) => {
              const badgeClass =
                item.riskLevel === 'low'
                  ? 'badge-low'
                  : item.riskLevel === 'moderate'
                  ? 'badge-moderate'
                  : 'badge-high';
              const dotClass =
                item.riskLevel === 'low'
                  ? 'risk-dot-low'
                  : item.riskLevel === 'moderate'
                  ? 'risk-dot-moderate'
                  : 'risk-dot-high';
              const formattedDate = new Date(item.createdAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return `
                <div class="card card-interactive" style="display:flex;flex-direction:column;justify-content:space-between;">
                  <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.65rem;">
                      <div style="display:flex;align-items:center;gap:0.5rem;">
                        ${renderMarketplaceBadge(item.marketplace)}
                        <span style="font-size:0.73rem;color:var(--text-muted);font-family:var(--font-mono);">${escapeHtml(
                          formattedDate
                        )}</span>
                      </div>
                      <span class="badge ${badgeClass}">
                        <span class="risk-dot ${dotClass}"></span>
                        ${item.productTrustScore}/100 &middot; ${escapeHtml(item.riskLabel)}
                      </span>
                    </div>

                    <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:0.75rem;line-height:1.35;">
                      ${escapeHtml(item.productName)}
                    </h3>

                    <div class="rating-compare-box" style="padding:0.7rem;margin-bottom:0.75rem;">
                      <div class="rating-col">
                        <div class="rating-col-label">Rating Toko</div>
                        <div style="font-size:1.3rem;font-weight:800;font-family:var(--font-mono);color:var(--viz-amber);">
                          ${item.originalRating}
                        </div>
                      </div>
                      <div class="rating-arrow">${ICONS.arrowRight}</div>
                      <div class="rating-col">
                        <div class="rating-col-label">Terkoreksi</div>
                        <div style="font-size:1.3rem;font-weight:800;font-family:var(--font-mono);color:${
                          item.riskLevel === 'high'
                            ? 'var(--risk-high-ink)'
                            : item.riskLevel === 'moderate'
                            ? 'var(--risk-moderate-ink)'
                            : 'var(--risk-low-ink)'
                        };">
                          ${item.adjustedRating}
                        </div>
                      </div>
                    </div>

                    <p style="font-size:0.81rem;color:var(--text-secondary);margin-bottom:1rem;">
                      Perlu dicek: <strong>${item.suspiciousReviewsCount}/${item.totalReviews}</strong> ulasan &middot;
                      ${escapeHtml(item.verdictHeadline)}
                    </p>
                  </div>

                  <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding-top:0.85rem;border-top:1px solid var(--border-subtle);">
                    <button type="button" class="btn btn-primary btn-sm" data-open-report="${escapeHtml(
                      item.id
                    )}">
                      Buka Laporan
                    </button>
                    <div style="display:flex;gap:0.4rem;">
                      <a
                        href="${apiClient.getExportCsvUrl(item.id)}"
                        class="btn btn-secondary btn-sm"
                        download
                      >
                        ${ICONS.download}
                        <span>CSV</span>
                      </a>
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        data-delete-report="${escapeHtml(item.id)}"
                        title="Hapus laporan"
                      >
                        ${ICONS.trash}
                      </button>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;

      container.querySelectorAll('[data-open-report]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-open-report');
          if (id) onOpenReport(id);
        });
      });

      container.querySelectorAll('[data-delete-report]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete-report');
          if (!id) return;
          try {
            await apiClient.deleteReportById(id);
            showToast('Laporan dihapus dari riwayat.');
            loadList();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--risk-high-ink);">Gagal memuat riwayat: ${escapeHtml(
        err.message
      )}</div>`;
    }
  };

  loadList();
}
