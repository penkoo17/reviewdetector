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
    <div style="max-width:720px;margin:2rem auto 0;">
      <div class="anim-card" style="margin-bottom:1.5rem;">
        <div style="font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--viz-blue);margin-bottom:0.35rem;">
          Pemindai Ulasan Produk
        </div>
        <h2 style="font-size:1.75rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:0.35rem;">
          Periksa Link Produk
        </h2>
        <p style="color:var(--text-secondary);font-size:0.92rem;">
          Tempel tautan produk yang ingin Anda cek untuk melihat kewajaran ulasannya sebelum membeli.
        </p>
      </div>

      <div class="card anim-card anim-delay-1">
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
