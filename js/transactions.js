/**
 * transactions.js
 * Pure transaction calculations, validation, filtering/sorting, formatting,
 * and Transaction History view rendering.
 * Completely independent of LocalStorage so backend API integration is seamless.
 */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Business',
  'Gifts',
  'Other',
];

export const CATEGORY_COLORS = {
  Food: '#0F766E',
  Housing: '#1D4ED8',
  Transport: '#0284C7',
  Utilities: '#D97706',
  Healthcare: '#DC2626',
  Entertainment: '#7C3AED',
  Shopping: '#DB2777',
  Education: '#4F46E5',
  Salary: '#16A34A',
  Freelance: '#0D9488',
  Investments: '#2563EB',
  Business: '#0EA5E9',
  Gifts: '#9333EA',
  Other: '#64748B',
};

const FALLBACK_COLORS = [
  '#0F766E',
  '#1D4ED8',
  '#D97706',
  '#DC2626',
  '#4F46E5',
  '#0284C7',
  '#64748B',
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Escapes HTML special characters to prevent XSS in template strings.
 * @param {string} value
 * @returns {string}
 */
export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a number as USD currency.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const numeric = Number(amount);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

/**
 * Returns today's date in YYYY-MM-DD format.
 * @returns {string}
 */
export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns current month key in YYYY-MM format.
 * @returns {string}
 */
export function getCurrentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Formats YYYY-MM-DD into readable date (e.g., "Nov 13, 2026") without timezone drift.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr || '—';
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats YYYY-MM into "November 2026".
 * @param {string} monthKey
 * @returns {string}
 */
export function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || '';
  const [year, month] = monthKey.split('-').map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Formats YYYY-MM into short label "Nov 2026".
 * @param {string} monthKey
 * @returns {string}
 */
export function formatShortMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || '';
  const [year, month] = monthKey.split('-').map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Returns color hex for a category.
 * @param {string} category
 * @param {number} index
 * @returns {string}
 */
export function getCategoryColor(category, index = 0) {
  return CATEGORY_COLORS[category] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/**
 * Dynamically computes total income, total expenses, and total balance.
 * Total Balance = Total Income - Total Expenses.
 * @param {Array<object>} transactions
 * @returns {{ totalIncome: number, totalExpenses: number, totalBalance: number, transactionCount: number }}
 */
export function calculateTotals(transactions) {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpenses += amt;
    }
  }

  const roundedIncome = Number(totalIncome.toFixed(2));
  const roundedExpenses = Number(totalExpenses.toFixed(2));
  const totalBalance = Number((roundedIncome - roundedExpenses).toFixed(2));

  return {
    totalIncome: roundedIncome,
    totalExpenses: roundedExpenses,
    totalBalance,
    transactionCount: transactions.length,
  };
}

/**
 * Returns transactions belonging to a given YYYY-MM month.
 * @param {Array<object>} transactions
 * @param {string} monthKey
 * @returns {Array<object>}
 */
export function getMonthlyTransactions(transactions, monthKey) {
  if (!monthKey || monthKey === 'all') return transactions;
  return transactions.filter((tx) => typeof tx.date === 'string' && tx.date.startsWith(monthKey));
}

/**
 * Computes monthly income, expenses, net savings, and count for a month.
 * @param {Array<object>} transactions
 * @param {string} monthKey
 * @returns {{ income: number, expenses: number, net: number, count: number }}
 */
export function calculateMonthlySummary(transactions, monthKey) {
  const monthTxs = getMonthlyTransactions(transactions, monthKey);
  const totals = calculateTotals(monthTxs);
  return {
    income: totals.totalIncome,
    expenses: totals.totalExpenses,
    net: totals.totalBalance,
    count: totals.transactionCount,
  };
}

/**
 * Groups transactions by category for a specific type ('expense' or 'income').
 * @param {Array<object>} transactions
 * @param {'expense'|'income'} type
 * @returns {Array<{ category: string, amount: number, count: number, percentage: number, color: string }>}
 */
export function getCategoryBreakdown(transactions, type = 'expense') {
  const filtered = transactions.filter((tx) => tx.type === type);
  const total = filtered.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

  const map = new Map();
  for (const tx of filtered) {
    const cat = tx.category || 'Other';
    const current = map.get(cat) || { category: cat, amount: 0, count: 0 };
    current.amount += Number(tx.amount) || 0;
    current.count += 1;
    map.set(cat, current);
  }

  return Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .map((item, idx) => ({
      category: item.category,
      amount: Number(item.amount.toFixed(2)),
      count: item.count,
      percentage: total > 0 ? Number(((item.amount / total) * 100).toFixed(1)) : 0,
      color: getCategoryColor(item.category, idx),
    }));
}

/**
 * Builds an ordered list of available YYYY-MM month keys (always including current month).
 * @param {Array<object>} transactions
 * @returns {Array<string>}
 */
export function getAvailableMonths(transactions) {
  const set = new Set([getCurrentMonthKey()]);
  for (const tx of transactions) {
    if (typeof tx.date === 'string' && /^\d{4}-\d{2}/.test(tx.date)) {
      set.add(tx.date.slice(0, 7));
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

/**
 * Builds monthly income vs. expense time series ending at anchorMonthKey.
 * @param {Array<object>} transactions
 * @param {string} anchorMonthKey
 * @param {number} monthsCount
 * @returns {{ monthKeys: string[], labels: string[], incomeData: number[], expenseData: number[], netData: number[] }}
 */
export function getMonthlySeries(transactions, anchorMonthKey, monthsCount = 6) {
  const [anchorYear, anchorMonth] = (anchorMonthKey || getCurrentMonthKey())
    .split('-')
    .map(Number);

  const monthKeys = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const dt = new Date(anchorYear, anchorMonth - 1 - i, 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push(key);
  }

  const labels = monthKeys.map((k) => formatShortMonthLabel(k));
  const incomeData = [];
  const expenseData = [];
  const netData = [];

  for (const key of monthKeys) {
    const summary = calculateMonthlySummary(transactions, key);
    incomeData.push(summary.income);
    expenseData.push(summary.expenses);
    netData.push(summary.net);
  }

  return { monthKeys, labels, incomeData, expenseData, netData };
}

/**
 * Builds daily expense series for every day in a given YYYY-MM month.
 * @param {Array<object>} transactions
 * @param {string} monthKey
 * @returns {{ labels: string[], dailyExpenses: number[] }}
 */
export function getDailySeries(transactions, monthKey) {
  const [year, month] = (monthKey || getCurrentMonthKey()).split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyExpenses = new Array(daysInMonth).fill(0);
  const labels = [];

  for (let d = 1; d <= daysInMonth; d += 1) {
    labels.push(String(d));
  }

  const monthTxs = getMonthlyTransactions(transactions, monthKey);
  for (const tx of monthTxs) {
    if (tx.type !== 'expense') continue;
    const day = Number(tx.date.slice(8, 10));
    if (day >= 1 && day <= daysInMonth) {
      dailyExpenses[day - 1] = Number((dailyExpenses[day - 1] + Number(tx.amount || 0)).toFixed(2));
    }
  }

  return { labels, dailyExpenses };
}

/**
 * Filters transactions by search text, category, type, and month.
 * @param {Array<object>} transactions
 * @param {{ search?: string, category?: string, type?: string, month?: string }} filters
 * @returns {Array<object>}
 */
export function filterTransactions(transactions, filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase();
  const category = filters.category || 'all';
  const type = filters.type || 'all';
  const month = filters.month || 'all';

  return transactions.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    if (month !== 'all' && (!tx.date || !tx.date.startsWith(month))) return false;

    if (search) {
      const haystack = [
        tx.title,
        tx.description,
        tx.category,
        tx.type,
        tx.date,
        String(tx.amount),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

/**
 * Sorts transactions by date or amount.
 * @param {Array<object>} transactions
 * @param {'date-desc'|'date-asc'|'amount-desc'|'amount-asc'} sortBy
 * @returns {Array<object>}
 */
export function sortTransactions(transactions, sortBy = 'date-desc') {
  const copy = [...transactions];
  copy.sort((a, b) => {
    if (sortBy === 'date-asc') {
      return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    }
    if (sortBy === 'amount-desc') {
      return Number(b.amount) - Number(a.amount) || b.date.localeCompare(a.date);
    }
    if (sortBy === 'amount-asc') {
      return Number(a.amount) - Number(b.amount) || b.date.localeCompare(a.date);
    }
    // Default: date-desc
    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
  });
  return copy;
}

/**
 * Validates transaction form payload.
 * @param {object} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateTransaction(data) {
  const errors = {};
  const title = String(data.title || '').trim();
  const amount = Number(data.amount);
  const type = data.type;
  const category = String(data.category || '').trim();
  const date = String(data.date || '').trim();
  const description = String(data.description || '').trim();

  if (!title) {
    errors.title = 'Please enter a transaction title.';
  } else if (title.length < 2) {
    errors.title = 'Title must be at least 2 characters.';
  } else if (title.length > 80) {
    errors.title = 'Title cannot exceed 80 characters.';
  }

  if (data.amount === '' || data.amount === null || data.amount === undefined) {
    errors.amount = 'Please enter an amount.';
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (amount > 100000000) {
    errors.amount = 'Amount exceeds the maximum supported limit.';
  }

  if (type !== 'income' && type !== 'expense') {
    errors.type = 'Transaction type must be income or expense.';
  }

  const allowedCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!category || !allowedCategories.includes(category)) {
    errors.category = 'Please select a valid category.';
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Please select a valid date.';
  } else {
    const [y, m, d] = date.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    if (
      parsed.getFullYear() !== y ||
      parsed.getMonth() !== m - 1 ||
      parsed.getDate() !== d
    ) {
      errors.date = 'Please enter a valid calendar date.';
    }
  }

  if (description.length > 200) {
    errors.description = 'Description cannot exceed 200 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Serializes transactions into a clean RFC-4180 CSV string.
 * @param {Array<object>} transactions
 * @returns {string}
 */
export function transactionsToCSV(transactions) {
  const headers = ['ID', 'Date', 'Title', 'Type', 'Category', 'Amount', 'Description'];
  const escapeCSV = (val) => {
    const s = String(val ?? '');
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = sortTransactions(transactions, 'date-desc').map((tx) =>
    [
      tx.id,
      tx.date,
      tx.title,
      tx.type,
      tx.category,
      Number(tx.amount).toFixed(2),
      tx.description,
    ]
      .map(escapeCSV)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Renders the Transaction History view (Feature 3) with search, filters, sorting, edit/delete.
 * @param {HTMLElement} container
 * @param {{ transactions: Array<object>, filters: object, availableMonths: Array<string> }} state
 * @param {{ onFilterChange: Function, onEdit: Function, onDelete: Function, onAdd: Function, onResetFilters: Function }} callbacks
 */
export function renderTransactionsView(container, state, callbacks) {
  const { transactions, filters, availableMonths } = state;
  const allCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));

  const monthOptionsHTML = [
    '<option value="all">All Months</option>',
    ...availableMonths.map(
      (m) =>
        `<option value="${escapeHTML(m)}" ${filters.month === m ? 'selected' : ''}>${escapeHTML(
          formatMonthLabel(m)
        )}</option>`
    ),
  ].join('');

  const categoryOptionsHTML = [
    '<option value="all">All Categories</option>',
    ...allCategories.map(
      (cat) =>
        `<option value="${escapeHTML(cat)}" ${
          filters.category === cat ? 'selected' : ''
        }>${escapeHTML(cat)}</option>`
    ),
  ].join('');

  container.innerHTML = `
    <div class="view-stack">
      <div class="section-header">
        <div>
          <h2 class="section-title">Transaction History</h2>
          <p class="section-subtitle">Search, filter, sort, edit, or delete recorded income and expense entries.</p>
        </div>
        <button type="button" class="btn btn-primary" id="tx-view-add-btn">
          <i data-lucide="plus" class="btn-icon"></i>
          <span>New Entry</span>
        </button>
      </div>

      <section class="surface-card">
        <div class="table-toolbar">
          <div class="toolbar-filters">
            <div class="search-input-wrap">
              <i data-lucide="search" class="search-icon"></i>
              <input
                type="search"
                id="tx-search-input"
                class="input-control search-input"
                placeholder="Search title, note, or category..."
                value="${escapeHTML(filters.search || '')}"
                aria-label="Search transactions"
              />
            </div>

            <div class="segmented-control" role="group" aria-label="Filter by transaction type">
              <button type="button" class="segmented-btn ${filters.type === 'all' ? 'is-active' : ''}" data-filter-type="all">All</button>
              <button type="button" class="segmented-btn ${filters.type === 'income' ? 'is-active' : ''}" data-filter-type="income">Income</button>
              <button type="button" class="segmented-btn ${filters.type === 'expense' ? 'is-active' : ''}" data-filter-type="expense">Expense</button>
            </div>

            <select id="tx-category-filter" class="select-control filter-select" aria-label="Filter by category">
              ${categoryOptionsHTML}
            </select>

            <select id="tx-month-filter" class="select-control filter-select" aria-label="Filter by month">
              ${monthOptionsHTML}
            </select>

            <select id="tx-sort-select" class="select-control filter-select" aria-label="Sort transactions">
              <option value="date-desc" ${filters.sortBy === 'date-desc' ? 'selected' : ''}>Date: Newest First</option>
              <option value="date-asc" ${filters.sortBy === 'date-asc' ? 'selected' : ''}>Date: Oldest First</option>
              <option value="amount-desc" ${filters.sortBy === 'amount-desc' ? 'selected' : ''}>Amount: High to Low</option>
              <option value="amount-asc" ${filters.sortBy === 'amount-asc' ? 'selected' : ''}>Amount: Low to High</option>
            </select>
          </div>
        </div>

        <div id="tx-toolbar-meta" class="toolbar-meta"></div>
        <div id="tx-table-wrap"></div>
      </section>
    </div>
  `;

  // Event bindings
  const searchInput = container.querySelector('#tx-search-input');
  const categorySelect = container.querySelector('#tx-category-filter');
  const monthSelect = container.querySelector('#tx-month-filter');
  const sortSelect = container.querySelector('#tx-sort-select');
  const typeButtons = container.querySelectorAll('[data-filter-type]');
  const addBtn = container.querySelector('#tx-view-add-btn');

  addBtn?.addEventListener('click', () => callbacks.onAdd());

  searchInput?.addEventListener('input', (e) => {
    callbacks.onFilterChange({ search: e.target.value }, false);
    updateTransactionsTableOnly(container, transactions, { ...filters, search: e.target.value }, callbacks);
  });

  categorySelect?.addEventListener('change', (e) => {
    callbacks.onFilterChange({ category: e.target.value }, true);
  });

  monthSelect?.addEventListener('change', (e) => {
    callbacks.onFilterChange({ month: e.target.value }, true);
  });

  sortSelect?.addEventListener('change', (e) => {
    callbacks.onFilterChange({ sortBy: e.target.value }, true);
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextType = btn.getAttribute('data-filter-type');
      callbacks.onFilterChange({ type: nextType }, true);
    });
  });

  updateTransactionsTableOnly(container, transactions, filters, callbacks);
}

/**
 * Updates only the table body and metadata count without replacing filter inputs.
 * @param {HTMLElement} container
 * @param {Array<object>} transactions
 * @param {object} filters
 * @param {object} callbacks
 */
export function updateTransactionsTableOnly(container, transactions, filters, callbacks) {
  const metaEl = container.querySelector('#tx-toolbar-meta');
  const tableWrap = container.querySelector('#tx-table-wrap');
  if (!metaEl || !tableWrap) return;

  const filtered = sortTransactions(filterTransactions(transactions, filters), filters.sortBy);
  const filteredTotals = calculateTotals(filtered);
  const hasActiveFilter =
    Boolean(filters.search) ||
    filters.category !== 'all' ||
    filters.type !== 'all' ||
    filters.month !== 'all';

  metaEl.innerHTML = `
    <span>Showing <strong class="tabular-nums">${filtered.length}</strong> of <strong class="tabular-nums">${transactions.length}</strong> transactions</span>
    <span class="tabular-nums">Filtered Net: <strong class="${
      filteredTotals.totalBalance >= 0 ? 'text-income' : 'text-expense'
    }">${filteredTotals.totalBalance >= 0 ? '+' : ''}${formatCurrency(filteredTotals.totalBalance)}</strong></span>
  `;

  if (transactions.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="receipt"></i></div>
        <h3 class="empty-state-title">No transactions recorded yet</h3>
        <p class="empty-state-desc">Add your first income or expense entry to start tracking balances, charts, and budgets.</p>
        <button type="button" class="btn btn-primary btn-sm" id="tx-empty-add-btn">Add First Transaction</button>
      </div>
    `;
    tableWrap.querySelector('#tx-empty-add-btn')?.addEventListener('click', () => callbacks.onAdd());
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (filtered.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="filter-x"></i></div>
        <h3 class="empty-state-title">No matching transactions</h3>
        <p class="empty-state-desc">No entries match your active search or filter criteria.</p>
        ${
          hasActiveFilter
            ? '<button type="button" class="btn btn-secondary btn-sm" id="tx-clear-filters-btn">Clear Filters</button>'
            : ''
        }
      </div>
    `;
    tableWrap
      .querySelector('#tx-clear-filters-btn')
      ?.addEventListener('click', () => callbacks.onResetFilters());
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const rowsHTML = filtered
    .map((tx) => {
      const isIncome = tx.type === 'income';
      const sign = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'text-income' : 'text-expense';
      const typeLabel = isIncome ? 'Income' : 'Expense';
      const desc = tx.description
        ? `<span class="tx-desc-text" title="${escapeHTML(tx.description)}">${escapeHTML(
            tx.description
          )}</span>`
        : '';

      return `
        <tr>
          <td class="tabular-nums tx-meta-inline">${escapeHTML(formatDate(tx.date))}</td>
          <td>
            <div class="tx-title-cell">
              <span class="tx-title-text">${escapeHTML(tx.title)}</span>
              ${desc}
            </div>
          </td>
          <td class="tx-meta-inline">${escapeHTML(tx.category)}</td>
          <td class="tx-type-label ${amountClass}">${typeLabel}</td>
          <td class="col-right tx-amount ${amountClass}">${sign}${formatCurrency(tx.amount)}</td>
          <td class="col-actions">
            <div class="row-actions">
              <button
                type="button"
                class="icon-btn icon-btn-sm"
                data-edit-id="${escapeHTML(tx.id)}"
                title="Edit transaction"
                aria-label="Edit ${escapeHTML(tx.title)}"
              >
                <i data-lucide="pencil"></i>
              </button>
              <button
                type="button"
                class="icon-btn icon-btn-sm icon-btn-danger"
                data-delete-id="${escapeHTML(tx.id)}"
                title="Delete transaction"
                aria-label="Delete ${escapeHTML(tx.title)}"
              >
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  tableWrap.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Transaction</th>
            <th>Category</th>
            <th>Type</th>
            <th class="col-right">Amount</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </div>
  `;

  tableWrap.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      callbacks.onEdit(btn.getAttribute('data-edit-id'));
    });
  });

  tableWrap.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      callbacks.onDelete(btn.getAttribute('data-delete-id'));
    });
  });

  if (window.lucide) window.lucide.createIcons();
}
