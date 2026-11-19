import { ICONS, MARKETPLACE_LOGOS } from '../components/icons.js';

export function renderLandingView({ onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  const logosRow = Object.values(MARKETPLACE_LOGOS)
    .map((mp) => `<span class="mp-chip">${mp.svg}<span>${mp.name}</span></span>`)
    .join('');

  root.innerHTML = `
    <section class="hero-minimal anim-card" style="margin:3.25rem auto 2.5rem;">
      <div class="hero-kicker">
        ${ICONS.shield}
        <span>Analisis Kredibilitas Ulasan E-Commerce</span>
      </div>

      <h1 class="hero-title">
        See through the stars before you buy.
      </h1>

      <p class="hero-desc">
        Rating tinggi belum tentu menggambarkan pengalaman pembeli sebenarnya. Tempel link produk untuk memeriksa kewajaran ulasan dan hal penting yang perlu Anda ketahui sebelum membeli.
      </p>

      <div class="hero-note">
        <strong>Cara kerja kami:</strong> Review Detector tidak menghakimi ulasan secara mutlak. Aplikasi ini membantu melihat seberapa wajar pola ulasannya dan bagian mana yang perlu dicek ulang sebelum checkout.
      </div>

      <div style="display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:2.25rem;">
        <button type="button" class="btn btn-primary btn-lg" id="landingStartAnalyzeBtn">
          ${ICONS.link}
          <span>Periksa Link Produk</span>
          ${ICONS.arrowRight}
        </button>
        <button type="button" class="btn btn-secondary btn-lg" id="landingHistoryBtn">
          ${ICONS.clock}
          <span>Lihat Riwayat</span>
        </button>
      </div>

      <div style="display:flex;align-items:center;justify-content:center;gap:0.45rem;flex-wrap:wrap;">
        <span style="font-size:0.75rem;color:var(--text-muted);margin-right:0.2rem;">Mendukung:</span>
        ${logosRow}
      </div>
    </section>
  `;

  document.getElementById('landingStartAnalyzeBtn')?.addEventListener('click', () => {
    onNavigate('analyzer');
  });

  document.getElementById('landingHistoryBtn')?.addEventListener('click', () => {
    onNavigate('history');
  });
}
