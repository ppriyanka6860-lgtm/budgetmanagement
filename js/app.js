/**
 * app.js
 * Main application controller for ClearLedger Expense Tracker.
 * Coordinates navigation, global month context, transaction add/edit modal,
 * confirmation dialogs, toast notifications, and view synchronization.
 */

import { destroyAnalyticsCharts, renderAnalyticsView } from './analytics.js';
import { renderBudgetView } from './budget.js';
import { destroyDashboardCharts, renderDashboardView } from './dashboard.js';
import {
  addTransaction,
  clearAllTransactions,
  deleteTransaction,
  getBudget,
  getTransactions,
  resetSampleData,
  saveBudget,
  updateTransaction,
} from './storage.js';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  escapeHTML,
  formatMonthLabel,
  getAvailableMonths,
  getCurrentMonthKey,
  getTodayDateString,
  renderTransactionsView,
  transactionsToCSV,
  validateTransaction,
} from './transactions.js';

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  analytics: 'Analytics',
  budget: 'Budget',
};

const state = {
  activeView: 'dashboard',
  selectedMonth: getCurrentMonthKey(),
  transactions: [],
  budget: { monthlyLimit: 3200, updatedAt: '' },
  filters: {
    search: '',
    category: 'all',
    type: 'all',
    month: 'all',
    sortBy: 'date-desc',
  },
  editingId: null,
  confirmAction: null,
};

/* ==========================================================================
   DOM References
   ========================================================================== */

const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  sidebarOpenBtn: document.getElementById('sidebar-open-btn'),
  sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
  navButtons: document.querySelectorAll('.nav-item[data-view]'),
  brandLink: document.querySelector('[data-nav-link="dashboard"]'),
  topbarTitle: document.getElementById('topbar-title'),
  globalMonthSelect: document.getElementById('global-month-select'),
  openAddTxBtn: document.getElementById('open-add-tx-btn'),
  exportCsvBtn: document.getElementById('export-csv-btn'),
  resetDemoBtn: document.getElementById('reset-demo-btn'),
  clearAllBtn: document.getElementById('clear-all-btn'),
  main: document.getElementById('app-main'),

  // Transaction Modal
  txModal: document.getElementById('tx-modal'),
  txModalTitle: document.getElementById('tx-modal-title'),
  txModalClose: document.getElementById('tx-modal-close'),
  txCancelBtn: document.getElementById('tx-cancel-btn'),
  txForm: document.getElementById('tx-form'),
  txId: document.getElementById('tx-id'),
  txTypeInput: document.getElementById('tx-type'),
  txTypeButtons: document.querySelectorAll('[data-tx-type]'),
  txTitle: document.getElementById('tx-title'),
  txAmount: document.getElementById('tx-amount'),
  txCategory: document.getElementById('tx-category'),
  txDate: document.getElementById('tx-date'),
  txDescription: document.getElementById('tx-description'),
  txSubmitBtn: document.getElementById('tx-submit-btn'),

  // Confirm Modal
  confirmModal: document.getElementById('confirm-modal'),
  confirmModalTitle: document.getElementById('confirm-modal-title'),
  confirmModalMessage: document.getElementById('confirm-modal-message'),
  confirmModalClose: document.getElementById('confirm-modal-close'),
  confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
  confirmOkBtn: document.getElementById('confirm-ok-btn'),

  // Toasts
  toastRegion: document.getElementById('toast-region'),
};

/* ==========================================================================
   Initialization & Data Sync
   ========================================================================== */

function refreshStoreData() {
  state.transactions = getTransactions();
  state.budget = getBudget();
  populateGlobalMonthSelector();
}

function populateGlobalMonthSelector() {
  const months = getAvailableMonths(state.transactions);
  if (!months.includes(state.selectedMonth)) {
    state.selectedMonth = months[0] || getCurrentMonthKey();
  }

  els.globalMonthSelect.innerHTML = months
    .map(
      (m) =>
        `<option value="${escapeHTML(m)}" ${
          m === state.selectedMonth ? 'selected' : ''
        }>${escapeHTML(formatMonthLabel(m))}</option>`
    )
    .join('');
}

function renderActiveView() {
  destroyDashboardCharts();
  destroyAnalyticsCharts();

  const availableMonths = getAvailableMonths(state.transactions);

  if (state.activeView === 'dashboard') {
    renderDashboardView(
      els.main,
      {
        transactions: state.transactions,
        budget: state.budget,
        selectedMonth: state.selectedMonth,
      },
      {
        onNavigate: (view) => setActiveView(view),
        onAdd: () => openTransactionModal(),
        onEdit: (id) => openTransactionModal(id),
        onDelete: (id) => promptDeleteTransaction(id),
      }
    );
  } else if (state.activeView === 'transactions') {
    renderTransactionsView(
      els.main,
      {
        transactions: state.transactions,
        filters: state.filters,
        availableMonths,
      },
      {
        onFilterChange: (patch, shouldReRender) => {
          state.filters = { ...state.filters, ...patch };
          if (shouldReRender) renderActiveView();
        },
        onResetFilters: () => {
          state.filters = {
            search: '',
            category: 'all',
            type: 'all',
            month: 'all',
            sortBy: 'date-desc',
          };
          renderActiveView();
        },
        onAdd: () => openTransactionModal(),
        onEdit: (id) => openTransactionModal(id),
        onDelete: (id) => promptDeleteTransaction(id),
      }
    );
  } else if (state.activeView === 'analytics') {
    renderAnalyticsView(els.main, {
      transactions: state.transactions,
      selectedMonth: state.selectedMonth,
    });
  } else if (state.activeView === 'budget') {
    renderBudgetView(
      els.main,
      {
        transactions: state.transactions,
        budget: state.budget,
        selectedMonth: state.selectedMonth,
      },
      {
        onSaveBudget: (monthlyLimit) => {
          saveBudget(monthlyLimit);
          refreshStoreData();
          renderActiveView();
          showToast('Monthly budget updated.', 'success');
        },
        onNavigate: (view) => setActiveView(view),
      }
    );
  }

  if (window.lucide) window.lucide.createIcons();
}

function setActiveView(view) {
  if (!VIEW_TITLES[view]) return;
  state.activeView = view;

  els.navButtons.forEach((btn) => {
    const isMatch = btn.getAttribute('data-view') === view;
    btn.classList.toggle('is-active', isMatch);
    if (isMatch) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  els.topbarTitle.textContent = VIEW_TITLES[view];
  closeMobileSidebar();
  renderActiveView();
}

/* ==========================================================================
   Sidebar Drawer (Mobile)
   ========================================================================== */

function openMobileSidebar() {
  els.sidebar.classList.add('is-open');
  els.sidebarBackdrop.hidden = false;
  els.sidebarOpenBtn.setAttribute('aria-expanded', 'true');
}

function closeMobileSidebar() {
  els.sidebar.classList.remove('is-open');
  els.sidebarBackdrop.hidden = true;
  els.sidebarOpenBtn.setAttribute('aria-expanded', 'false');
}

/* ==========================================================================
   Transaction Add / Edit Modal (Feature 2)
   ========================================================================== */

function populateCategorySelect(type, selectedCategory = '') {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const targetCat = categories.includes(selectedCategory) ? selectedCategory : categories[0];

  els.txCategory.innerHTML = categories
    .map(
      (cat) =>
        `<option value="${escapeHTML(cat)}" ${
          cat === targetCat ? 'selected' : ''
        }>${escapeHTML(cat)}</option>`
    )
    .join('');
}

function setTransactionTypeUI(type, preferredCategory = '') {
  const normalized = type === 'income' ? 'income' : 'expense';
  els.txTypeInput.value = normalized;

  els.txTypeButtons.forEach((btn) => {
    const isSelected = btn.getAttribute('data-tx-type') === normalized;
    btn.classList.toggle('is-active', isSelected);
    btn.setAttribute('aria-pressed', String(isSelected));
  });

  populateCategorySelect(normalized, preferredCategory);
}

function clearFormErrors() {
  const fields = ['title', 'amount', 'category', 'date', 'description'];
  fields.forEach((field) => {
    const errEl = document.getElementById(`err-tx-${field}`);
    const inputEl = document.getElementById(`tx-${field}`);
    if (errEl) errEl.textContent = '';
    if (inputEl) inputEl.classList.remove('is-invalid');
  });
}

function displayFormErrors(errors) {
  clearFormErrors();
  let firstInvalid = null;

  for (const [field, message] of Object.entries(errors)) {
    const errEl = document.getElementById(`err-tx-${field}`);
    const inputEl = document.getElementById(`tx-${field}`);
    if (errEl) errEl.textContent = message;
    if (inputEl) {
      inputEl.classList.add('is-invalid');
      if (!firstInvalid) firstInvalid = inputEl;
    }
  }

  firstInvalid?.focus();
}

function openTransactionModal(editId = null) {
  clearFormErrors();
  state.editingId = editId;

  if (editId) {
    const existing = state.transactions.find((tx) => tx.id === editId);
    if (!existing) return;

    els.txModalTitle.textContent = 'Edit Transaction';
    els.txSubmitBtn.textContent = 'Update Transaction';
    els.txId.value = existing.id;
    els.txTitle.value = existing.title;
    els.txAmount.value = existing.amount;
    els.txDate.value = existing.date;
    els.txDescription.value = existing.description || '';
    setTransactionTypeUI(existing.type, existing.category);
  } else {
    els.txModalTitle.textContent = 'Add Transaction';
    els.txSubmitBtn.textContent = 'Save Transaction';
    els.txId.value = '';
    els.txTitle.value = '';
    els.txAmount.value = '';
    els.txDate.value = getTodayDateString();
    els.txDescription.value = '';
    setTransactionTypeUI('expense');
  }

  els.txModal.hidden = false;
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => els.txTitle.focus(), 20);
}

function closeTransactionModal() {
  els.txModal.hidden = true;
  state.editingId = null;
  clearFormErrors();
}

function handleTransactionSubmit(e) {
  e.preventDefault();

  const payload = {
    type: els.txTypeInput.value,
    title: els.txTitle.value.trim(),
    amount: els.txAmount.value,
    category: els.txCategory.value,
    date: els.txDate.value,
    description: els.txDescription.value.trim(),
  };

  const validation = validateTransaction(payload);
  if (!validation.valid) {
    displayFormErrors(validation.errors);
    return;
  }

  const normalizedPayload = {
    ...payload,
    amount: Number(Number(payload.amount).toFixed(2)),
  };

  if (state.editingId) {
    updateTransaction(state.editingId, normalizedPayload);
    showToast('Transaction updated.', 'success');
  } else {
    addTransaction(normalizedPayload);
    // Switch active month to newly added transaction's month if helpful
    if (normalizedPayload.date && /^\d{4}-\d{2}/.test(normalizedPayload.date)) {
      state.selectedMonth = normalizedPayload.date.slice(0, 7);
    }
    showToast('Transaction added.', 'success');
  }

  closeTransactionModal();
  refreshStoreData();
  renderActiveView();
}

/* ==========================================================================
   Confirmation Modal (Delete / Clear / Reset)
   ========================================================================== */

function openConfirmModal({ title, message, confirmLabel, onConfirm }) {
  els.confirmModalTitle.textContent = title;
  els.confirmModalMessage.textContent = message;
  els.confirmOkBtn.textContent = confirmLabel || 'Confirm';
  state.confirmAction = onConfirm;
  els.confirmModal.hidden = false;
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => els.confirmCancelBtn.focus(), 20);
}

function closeConfirmModal() {
  els.confirmModal.hidden = true;
  state.confirmAction = null;
}

function promptDeleteTransaction(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;

  openConfirmModal({
    title: 'Delete Transaction',
    message: `Are you sure you want to delete "${tx.title}"? This action cannot be undone.`,
    confirmLabel: 'Delete',
    onConfirm: () => {
      deleteTransaction(id);
      refreshStoreData();
      renderActiveView();
      showToast('Transaction deleted.', 'success');
    },
  });
}

/* ==========================================================================
   Data Utilities (Export CSV, Reset Demo, Clear All)
   ========================================================================== */

function handleExportCSV() {
  if (state.transactions.length === 0) {
    showToast('No transactions available to export.', 'warning');
    return;
  }
  const csv = transactionsToCSV(state.transactions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clearledger-transactions-${getTodayDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Transactions exported to CSV.', 'success');
}

function promptResetSampleData() {
  openConfirmModal({
    title: 'Reset Sample Data',
    message:
      'Replace current entries with the default sample dataset and $3,200 monthly budget?',
    confirmLabel: 'Reset Data',
    onConfirm: () => {
      resetSampleData();
      state.selectedMonth = getCurrentMonthKey();
      refreshStoreData();
      renderActiveView();
      showToast('Sample data restored.', 'success');
    },
  });
}

function promptClearAllData() {
  openConfirmModal({
    title: 'Clear All Transactions',
    message:
      'Remove all recorded transactions from local storage? Your monthly budget setting will remain.',
    confirmLabel: 'Clear All',
    onConfirm: () => {
      clearAllTransactions();
      refreshStoreData();
      renderActiveView();
      showToast('All transactions cleared.', 'success');
    },
  });
}

/* ==========================================================================
   Toast Notifications
   ========================================================================== */

function showToast(message, variant = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;
  const iconName = variant === 'warning' ? 'alert-triangle' : 'check-circle-2';
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <span>${escapeHTML(message)}</span>
  `;
  els.toastRegion.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

/* ==========================================================================
   Global Event Listeners & Boot
   ========================================================================== */

function bindGlobalEvents() {
  // Navigation
  els.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      setActiveView(view);
    });
  });

  els.brandLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveView('dashboard');
  });

  // Mobile sidebar drawer
  els.sidebarOpenBtn?.addEventListener('click', openMobileSidebar);
  els.sidebarCloseBtn?.addEventListener('click', closeMobileSidebar);
  els.sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  // Global active month selector
  els.globalMonthSelect?.addEventListener('change', (e) => {
    state.selectedMonth = e.target.value;
    renderActiveView();
  });

  // Open Add Transaction Modal
  els.openAddTxBtn?.addEventListener('click', () => openTransactionModal());

  // Transaction Modal interactions
  els.txTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setTransactionTypeUI(btn.getAttribute('data-tx-type'));
    });
  });

  els.txForm?.addEventListener('submit', handleTransactionSubmit);
  els.txModalClose?.addEventListener('click', closeTransactionModal);
  els.txCancelBtn?.addEventListener('click', closeTransactionModal);
  els.txModal?.addEventListener('click', (e) => {
    if (e.target === els.txModal) closeTransactionModal();
  });

  // Live error clearing on transaction form inputs
  ['tx-title', 'tx-amount', 'tx-category', 'tx-date', 'tx-description'].forEach((id) => {
    const input = document.getElementById(id);
    input?.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const err = document.getElementById(`err-${id}`);
      if (err) err.textContent = '';
    });
  });

  // Confirm Modal interactions
  els.confirmModalClose?.addEventListener('click', closeConfirmModal);
  els.confirmCancelBtn?.addEventListener('click', closeConfirmModal);
  els.confirmOkBtn?.addEventListener('click', () => {
    const fn = state.confirmAction;
    closeConfirmModal();
    if (typeof fn === 'function') fn();
  });
  els.confirmModal?.addEventListener('click', (e) => {
    if (e.target === els.confirmModal) closeConfirmModal();
  });

  // Sidebar data utilities
  els.exportCsvBtn?.addEventListener('click', handleExportCSV);
  els.resetDemoBtn?.addEventListener('click', promptResetSampleData);
  els.clearAllBtn?.addEventListener('click', promptClearAllData);

  // Escape key closes open modals or drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!els.confirmModal.hidden) {
        closeConfirmModal();
      } else if (!els.txModal.hidden) {
        closeTransactionModal();
      } else if (els.sidebar.classList.contains('is-open')) {
        closeMobileSidebar();
      }
    }
  });
}

function initApp() {
  refreshStoreData();
  bindGlobalEvents();
  setActiveView('dashboard');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
