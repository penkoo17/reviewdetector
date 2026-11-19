import { appState } from './state.js';
import { apiClient } from './api.js';
import { renderLandingView } from './views/landingView.js';
import { renderAnalyzerView } from './views/analyzerView.js';
import { renderReportView } from './views/reportView.js';
import { renderHistoryView } from './views/historyView.js';
import { closeModal, showToast } from './components/modal.js';

let navTransitionToken = 0;
let activeScrollObserver = null;

function setupScrollRevealAnimations() {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  if (activeScrollObserver) {
    activeScrollObserver.disconnect();
    activeScrollObserver = null;
  }

  const targets = root.querySelectorAll('.card, .card-subtle, .stat-card');
  if (!targets.length) return;

  if (typeof IntersectionObserver === 'undefined') {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  activeScrollObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: '0px 0px -24px 0px' }
  );

  targets.forEach((el, idx) => {
    if (el.dataset.scrollBound || el.classList.contains('is-visible')) return;
    el.dataset.scrollBound = '1';
    const rect = el.getBoundingClientRect();
    if (rect.top > viewportHeight * 0.96) {
      el.classList.add('scroll-reveal');
      el.style.transitionDelay = `${Math.min(idx % 3, 2) * 55}ms`;
      activeScrollObserver.observe(el);
    }
  });
}

function renderActiveView(viewName) {
  if (viewName === 'landing') {
    renderLandingView({ onNavigate: navigateTo });
  } else if (viewName === 'analyzer') {
    renderAnalyzerView({
      onAnalysisComplete: (report) => {
        appState.activeReport = report;
        const url = new URL(window.location.href);
        url.searchParams.set('report', report.id);
        window.history.pushState({}, '', url);
        showToast(`Selesai memeriksa ${report.metrics.totalReviews} ulasan.`);
        navigateTo('report');
      },
    });
  } else if (viewName === 'report') {
    renderReportView({
      report: appState.activeReport,
      onNavigate: navigateTo,
    });
  } else if (viewName === 'history') {
    renderHistoryView({
      onOpenReport: async (reportId) => {
        try {
          const fullReport = await apiClient.getReportById(reportId);
          appState.activeReport = fullReport;
          const url = new URL(window.location.href);
          url.searchParams.set('report', fullReport.id);
          window.history.pushState({}, '', url);
          navigateTo('report');
        } catch (err) {
          showToast(err.message);
        }
      },
      onNavigate: navigateTo,
    });
  }
}

export function navigateTo(viewName) {
  const root = document.getElementById('appViewRoot');
  const hadContent = Boolean(root && root.innerHTML.trim().length > 0);
  const currentToken = ++navTransitionToken;

  appState.currentView = viewName;

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    const target = btn.getAttribute('data-nav');
    btn.classList.toggle('active', target === viewName);
  });

  const mountView = () => {
    if (currentToken !== navTransitionToken) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderActiveView(viewName);

    if (root) {
      root.classList.remove('view-leave', 'view-enter');
      void root.offsetWidth;
      root.classList.add('view-enter');
    }

    requestAnimationFrame(() => {
      setupScrollRevealAnimations();
    });
  };

  if (hadContent && root) {
    root.classList.remove('view-enter');
    root.classList.add('view-leave');
    setTimeout(mountView, 130);
  } else {
    mountView();
  }
}

async function initApp() {
  const root = document.getElementById('appViewRoot');
  if (root && typeof MutationObserver !== 'undefined') {
    const domObserver = new MutationObserver(() => {
      setupScrollRevealAnimations();
    });
    domObserver.observe(root, { childList: true, subtree: true });
  }

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target) navigateTo(target);
    });
  });

  document.getElementById('brandHomeBtn')?.addEventListener('click', () => {
    navigateTo('landing');
  });

  document.getElementById('headerStartBtn')?.addEventListener('click', () => {
    navigateTo('analyzer');
  });

  const backdrop = document.getElementById('appModalBackdrop');
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  const params = new URLSearchParams(window.location.search);
  const sharedReportId = params.get('report');

  if (sharedReportId) {
    try {
      const report = await apiClient.getReportById(sharedReportId);
      appState.activeReport = report;
      navigateTo('report');
      return;
    } catch {
      // Lanjut ke beranda bila tidak ditemukan
    }
  }

  navigateTo('landing');
}

document.addEventListener('DOMContentLoaded', initApp);
