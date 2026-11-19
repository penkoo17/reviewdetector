import { appState } from './state.js';
import { apiClient } from './api.js';
import { renderLandingView } from './views/landingView.js';
import { renderAnalyzerView } from './views/analyzerView.js';
import { renderReportView } from './views/reportView.js';
import { renderHistoryView } from './views/historyView.js';
import { closeModal, showToast } from './components/modal.js';

function triggerViewTransition() {
  const root = document.getElementById('appViewRoot');
  if (!root) return;
  root.classList.remove('view-enter');
  void root.offsetWidth;
  root.classList.add('view-enter');
}

export function navigateTo(viewName) {
  appState.currentView = viewName;

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    const target = btn.getAttribute('data-nav');
    btn.classList.toggle('active', target === viewName);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

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

  triggerViewTransition();
}

async function initApp() {
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
      // Lanjut ke halaman utama bila laporan tidak ditemukan
    }
  }

  navigateTo('landing');
}

document.addEventListener('DOMContentLoaded', initApp);
