import { ICONS, MARKETPLACE_LOGOS } from '../components/icons.js';
import { appState } from '../state.js';
import { apiClient } from '../api.js';
import { showToast } from '../components/modal.js';

export function renderLandingView({ onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  const logosRow = Object.values(MARKETPLACE_LOGOS)
    .map((mp) => `<span class="mp-chip">${mp.svg}<span>${mp.name}</span></span>`)
    .join('');

  root.innerHTML = `
    <section class="hero-split">
      <!-- Kolom Kiri: Headline, Quick Link Input & Marketplace -->
      <div class="anim-card">
        <div class="hero-kicker">
          ${ICONS.shield}
          <span>Cek Kredibilitas Ulasan E-Commerce</span>
        </div>

        <h1 class="hero-title">
          See through the stars before you buy.
        </h1>

        <p class="hero-desc">
          Rating tinggi belum tentu mencerminkan pengalaman pembeli nyata. Tempel tautan produk untuk melihat skor kepercayaan, rating terkoreksi, dan ringkasan keluhan sebelum Anda checkout.
        </p>

        <!-- Quick Scan Input Bar langsung dari Beranda -->
        <div class="hero-quick-form">
          <input
            type="url"
            id="heroQuickUrlInput"
            class="hero-quick-input"
            placeholder="Tempel link produk (Shopee, Tokopedia, Amazon...)"
          />
          <button type="button" class="btn btn-primary" id="heroQuickScanBtn">
            ${ICONS.search}
            <span>Periksa Sekarang</span>
          </button>
        </div>

        <div class="hero-meta-row">
          <div style="font-size:0.79rem;color:var(--text-muted);">
            Tidak menghakimi mutlak — hanya memetakan pola agar belanja lebih aman.
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="landingHistoryBtn">
            ${ICONS.clock}
            <span>Riwayat</span>
          </button>
        </div>

        <div style="display:flex;align-items:center;gap:0.42rem;flex-wrap:wrap;">
          ${logosRow}
        </div>
      </div>

      <!-- Kolom Kanan: Visual Snapshot Preview (Bukan wall of text) -->
      <div class="preview-card anim-card anim-delay-2">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.85rem;">
          <span class="mp-chip">${MARKETPLACE_LOGOS.shopee.svg}<span>Contoh Hasil Laporan</span></span>
          <span class="badge badge-moderate"><span class="risk-dot risk-dot-moderate"></span>Moderate Risk &middot; 64/100</span>
        </div>

        <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:0.9rem;">
          Perbandingan Rating &amp; Pola Ulasan
        </div>

        <div class="rating-compare-box" style="margin-bottom:0.85rem;">
          <div class="rating-col">
            <div class="rating-col-label">Rating Toko</div>
            <div class="rating-col-val" style="color:var(--viz-amber);font-size:1.65rem;">4.8</div>
          </div>
          <div class="rating-arrow">${ICONS.arrowRight}</div>
          <div class="rating-col">
            <div class="rating-col-label">Terkoreksi</div>
            <div class="rating-col-val" style="color:var(--risk-moderate-ink);font-size:1.65rem;">4.1</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.78rem;padding:0.5rem 0.75rem;border-radius:8px;background:var(--risk-moderate-bg);border:1px solid var(--risk-moderate-border);margin-bottom:0.9rem;">
          <span style="color:var(--text-secondary);">Ulasan perlu dicek ulang</span>
          <strong style="font-family:var(--font-mono);color:var(--risk-moderate-ink);">14 dari 38 (37%)</strong>
        </div>

        <div class="preview-divider"></div>

        <div class="grid-2" style="gap:0.65rem;font-size:0.77rem;">
          <div style="padding:0.65rem 0.75rem;border-radius:8px;background:#fffafa;border:1px solid #fee2e2;">
            <div style="font-weight:700;color:var(--risk-high-ink);margin-bottom:0.2rem;">Keluhan Utama</div>
            <div style="color:var(--text-secondary);">Baterai cepat habis, kemasan penyok</div>
          </div>
          <div style="padding:0.65rem 0.75rem;border-radius:8px;background:#f8fdfb;border:1px solid #d1fae5;">
            <div style="font-weight:700;color:var(--risk-low-ink);margin-bottom:0.2rem;">Pujian Utama</div>
            <div style="color:var(--text-secondary);">Bahan kokoh, pengiriman cepat</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Strip Ringkas 3 Langkah (Pendek, 1 Baris per Kartu) -->
    <section class="feature-strip anim-card anim-delay-3">
      <div class="feature-strip-item">
        <span class="feature-step-num">01</span>
        <div>
          <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.15rem;">Tempel Link Produk</div>
          <div style="font-size:0.79rem;color:var(--text-secondary);">Salin tautan produk dari marketplace dan jalankan pemindaian otomatis.</div>
        </div>
      </div>

      <div class="feature-strip-item">
        <span class="feature-step-num">02</span>
        <div>
          <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.15rem;">Deteksi 3 Lapis Pola</div>
          <div style="font-size:0.79rem;color:var(--text-secondary);">Memeriksa kualitas teks, perilaku waktu, dan kemiripan antar-akun.</div>
        </div>
      </div>

      <div class="feature-strip-item">
        <span class="feature-step-num">03</span>
        <div>
          <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.15rem;">Keputusan Lebih Yakin</div>
          <div style="font-size:0.79rem;color:var(--text-secondary);">Lihat rating terkoreksi, rincian alasan skor, serta keluhan teratas.</div>
        </div>
      </div>
    </section>
  `;

  const quickInput = document.getElementById('heroQuickUrlInput');
  const quickBtn = document.getElementById('heroQuickScanBtn');

  const runHeroScan = async () => {
    const rawUrl = quickInput?.value.trim() || '';
    if (!rawUrl) {
      onNavigate('analyzer');
      return;
    }

    appState.analyzerDraft.productUrl = rawUrl;
    try {
      if (quickBtn) {
        quickBtn.disabled = true;
        quickBtn.innerHTML = `${ICONS.clock}<span>Memeriksa...</span>`;
      }
      const report = await apiClient.analyzeProduct({ productUrl: rawUrl });
      appState.activeReport = report;
      const url = new URL(window.location.href);
      url.searchParams.set('report', report.id);
      window.history.pushState({}, '', url);
      showToast(`Selesai memeriksa ${report.metrics.totalReviews} ulasan.`);
      onNavigate('report');
    } catch (err) {
      showToast(err.message);
    } finally {
      if (quickBtn) {
        quickBtn.disabled = false;
        quickBtn.innerHTML = `${ICONS.search}<span>Periksa Sekarang</span>`;
      }
    }
  };

  quickBtn?.addEventListener('click', runHeroScan);
  quickInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runHeroScan();
    }
  });

  document.getElementById('landingHistoryBtn')?.addEventListener('click', () => {
    onNavigate('history');
  });
}
