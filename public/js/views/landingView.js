import { ICONS, MARKETPLACE_LOGOS } from '../components/icons.js';

export function renderLandingView({ onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  const logosRow = Object.values(MARKETPLACE_LOGOS)
    .map((mp) => `<span class="mp-chip">${mp.svg}<span>${mp.name}</span></span>`)
    .join('');

  root.innerHTML = `
    <section class="hero-minimal anim-card">
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

      <div style="display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:2rem;">
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

    <section style="margin-bottom:2rem;">
      <div class="grid-3">
        <div class="card card-interactive anim-card anim-delay-1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <span class="badge badge-info">Isi Teks &middot; 5 Sinyal</span>
            <span style="color:var(--text-muted);">${ICONS.fileText}</span>
          </div>
          <h3 class="card-title" style="margin-bottom:0.35rem;">Pemeriksaan Teks</h3>
          <p class="card-subtitle" style="line-height:1.6;">
            Menemukan ulasan yang terlalu singkat, membahas fitur yang tidak sesuai produk, pujian berlebihan, atau keluhan di balik rating tinggi.
          </p>
        </div>

        <div class="card card-interactive anim-card anim-delay-2">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <span class="badge badge-moderate">Perilaku &middot; 4 Sinyal</span>
            <span style="color:var(--text-muted);">${ICONS.chart}</span>
          </div>
          <h3 class="card-title" style="margin-bottom:0.35rem;">Pola Perilaku</h3>
          <p class="card-subtitle" style="line-height:1.6;">
            Melihat lonjakan ulasan dalam 24–72 jam, rating 5 bintang seragam, akun baru yang langsung aktif, serta pengulas tanpa riwayat toko lain.
          </p>
        </div>

        <div class="card card-interactive anim-card anim-delay-3">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <span class="badge badge-high">Koordinasi &middot; 3 Sinyal</span>
            <span style="color:var(--text-muted);">${ICONS.layers}</span>
          </div>
          <h3 class="card-title" style="margin-bottom:0.35rem;">Indikasi Koordinasi</h3>
          <p class="card-subtitle" style="line-height:1.6;">
            Mendeteksi kalimat yang hampir sama antar-pembeli, kelompok akun serupa, serta ulasan yang masuk berdekatan di jam yang sama.
          </p>
        </div>
      </div>
    </section>

    <section class="card anim-card anim-delay-4">
      <div class="card-header" style="margin-bottom:1rem;">
        <div>
          <h3 class="card-title">Panduan Skor Kepercayaan</h3>
          <p class="card-subtitle">Setiap produk dinilai dari 0 sampai 100 berdasarkan kewajaran pola ulasannya.</p>
        </div>
      </div>

      <div class="grid-3">
        <div style="padding:0.9rem 1rem;border-radius:10px;background:var(--risk-low-bg);border:1px solid var(--risk-low-border);">
          <div class="trust-legend-row" style="font-weight:700;font-size:0.86rem;color:var(--risk-low-ink);margin-bottom:0.2rem;">
            <span class="risk-dot risk-dot-low"></span>
            <span>80–100 &middot; Low Risk</span>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);">
            Sebagian besar ulasan tampak alami, menceritakan pemakaian nyata, dan sesuai dengan rating bintangnya.
          </p>
        </div>

        <div style="padding:0.9rem 1rem;border-radius:10px;background:var(--risk-moderate-bg);border:1px solid var(--risk-moderate-border);">
          <div class="trust-legend-row" style="font-weight:700;font-size:0.86rem;color:var(--risk-moderate-ink);margin-bottom:0.2rem;">
            <span class="risk-dot risk-dot-moderate"></span>
            <span>60–79 &middot; Moderate Risk</span>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);">
            Ada beberapa ulasan umum atau pola kurang wajar. Sebaiknya baca komentar dengan skor tinggi sebelum membeli.
          </p>
        </div>

        <div style="padding:0.9rem 1rem;border-radius:10px;background:var(--risk-high-bg);border:1px solid var(--risk-high-border);">
          <div class="trust-legend-row" style="font-weight:700;font-size:0.86rem;color:var(--risk-high-ink);margin-bottom:0.2rem;">
            <span class="risk-dot risk-dot-high"></span>
            <span>0–59 &middot; High Risk</span>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);">
            Banyak tanda ketidakwajaran seperti kalimat mirip, lonjakan ulasan singkat, atau rating tidak cocok dengan isi teks.
          </p>
        </div>
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
