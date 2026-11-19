import { appState } from '../state.js';
import { apiClient } from '../api.js';
import { escapeHtml } from '../components/charts.js';
import { ICONS, MARKETPLACE_LOGOS } from '../components/icons.js';
import { showToast } from '../components/modal.js';

export function renderAnalyzerView({ onAnalysisComplete }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  const draft = appState.analyzerDraft;
  const marketplaceChipsHtml = Object.values(MARKETPLACE_LOGOS)
    .map((mp) => `<span class="mp-chip">${mp.svg}<span>${mp.name}</span></span>`)
    .join('');

  root.innerHTML = `
    <div style="max-width:760px;margin:0.75rem auto 0;">
      <div class="anim-card" style="margin-bottom:1.5rem;">
        <div style="font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--viz-blue);margin-bottom:0.35rem;">
          Pemindai Ulasan Produk
        </div>
        <h2 style="font-size:1.75rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:0.35rem;">
          Periksa Link Produk
        </h2>
        <p style="color:var(--text-secondary);font-size:0.92rem;">
          Tempel tautan produk yang ingin Anda cek. Sistem akan mengambil ulasannya dan memeriksa pola keaslian dari sisi teks, perilaku, dan koordinasi.
        </p>
      </div>

      <div class="card anim-card anim-delay-1" style="margin-bottom:1.25rem;">
        <div class="form-group">
          <label class="form-label" for="inputProductUrl">
            Tautan Produk
          </label>
          <input
            type="url"
            id="inputProductUrl"
            class="form-control"
            style="padding:0.9rem 1.05rem;font-size:0.95rem;"
            placeholder="Tempel link dari Shopee, Tokopedia, atau marketplace lain..."
            value="${escapeHtml(draft.productUrl)}"
            autofocus
          />

          <div style="margin-top:0.85rem;">
            <div style="font-size:0.74rem;color:var(--text-muted);margin-bottom:0.45rem;font-weight:500;">
              Marketplace yang didukung:
            </div>
            <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
              ${marketplaceChipsHtml}
            </div>
          </div>
        </div>

        <div id="scanProgressBox" style="display:none;margin-bottom:1.15rem;padding:0.95rem 1.05rem;border-radius:10px;background:var(--viz-blue-bg);border:1px solid var(--viz-blue-border);">
          <div style="font-weight:600;font-size:0.86rem;color:var(--viz-blue);margin-bottom:0.2rem;" id="scanProgressTitle">
            Mengambil data produk dan ulasan...
          </div>
          <div style="font-size:0.78rem;color:var(--text-secondary);" id="scanProgressStep">
            Memeriksa isi ulasan, pola waktu, dan kesamaan kalimat...
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-lg"
          id="submitScanAnalyzeBtn"
          style="width:100%;"
        >
          ${ICONS.search}
          <span>Periksa Ulasan Sekarang</span>
        </button>
      </div>

      <div class="grid-3 anim-card anim-delay-2">
        <div class="card-subtle" style="padding:1.05rem 1.15rem;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--viz-blue);margin-bottom:0.4rem;">
            Isi Teks (5)
          </div>
          <ul style="padding-left:1rem;font-size:0.78rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            <li>Terlalu generik</li>
            <li>Detail tidak masuk akal</li>
            <li>Emosi berlebihan</li>
            <li>Tidak menyebut pengalaman</li>
            <li>Rating tidak cocok isi</li>
          </ul>
        </div>

        <div class="card-subtle" style="padding:1.05rem 1.15rem;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--risk-moderate-ink);margin-bottom:0.4rem;">
            Perilaku (4)
          </div>
          <ul style="padding-left:1rem;font-size:0.78rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            <li>Review burst (24–72 jam)</li>
            <li>Rating seragam 5 bintang</li>
            <li>Reviewer baru aktif</li>
            <li>Reviewer hanya satu toko</li>
          </ul>
        </div>

        <div class="card-subtle" style="padding:1.05rem 1.15rem;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--risk-high-ink);margin-bottom:0.4rem;">
            Koordinasi (3)
          </div>
          <ul style="padding-left:1rem;font-size:0.78rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            <li>Review sangat mirip</li>
            <li>Kelompok reviewer sama</li>
            <li>Pola waktu serentak</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  const urlInput = document.getElementById('inputProductUrl');
  urlInput?.addEventListener('input', () => {
    draft.productUrl = urlInput.value;
  });

  const runScanAndAnalyze = async () => {
    const rawUrl = urlInput?.value.trim() || '';
    draft.productUrl = rawUrl;

    if (!rawUrl) {
      showToast('Masukkan link produk terlebih dahulu.');
      urlInput?.focus();
      return;
    }

    const btn = document.getElementById('submitScanAnalyzeBtn');
    const progressBox = document.getElementById('scanProgressBox');
    const progressTitle = document.getElementById('scanProgressTitle');
    const progressStep = document.getElementById('scanProgressStep');

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `${ICONS.clock}<span>Sedang Memeriksa Ulasan...</span>`;
      }
      if (progressBox) progressBox.style.display = 'block';
      if (progressTitle) {
        progressTitle.textContent = 'Mengambil informasi produk dan daftar ulasan...';
      }
      if (progressStep) {
        progressStep.textContent = 'Memeriksa 12 sinyal pada isi teks, perilaku, dan koordinasi...';
      }

      setTimeout(() => {
        if (btn?.disabled && progressTitle) {
          progressTitle.textContent =
            'Menghitung skor kepercayaan, rating terkoreksi, dan ringkasan keluhan...';
        }
      }, 850);

      const report = await apiClient.analyzeProduct({
        productUrl: rawUrl,
      });

      onAnalysisComplete(report);
    } catch (err) {
      showToast(err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${ICONS.search}<span>Periksa Ulasan Sekarang</span>`;
      }
      if (progressBox) progressBox.style.display = 'none';
    }
  };

  document.getElementById('submitScanAnalyzeBtn')?.addEventListener('click', runScanAndAnalyze);
  urlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runScanAndAnalyze();
    }
  });
}
