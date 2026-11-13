/**
 * dashboard.js
 * Renders the Dashboard view (Feature 1):
 * - Dynamic KPI summary cards (Total Balance, Total Income, Total Expenses, Monthly Spending)
 * - Monthly Spending Overview chart (6-Month Income vs Expenses or Daily Spending)
 * - Expense Category Breakdown doughnut chart & legend
 * - Recent Transactions table with quick edit/delete & navigation
 */

import { buildBudgetBannerHTML, calculateBudgetMetrics } from './budget.js';
import {
  calculateMonthlySummary,
  calculateTotals,
  escapeHTML,
  formatCurrency,
  formatDate,
  formatMonthLabel,
  getCategoryBreakdown,
  getDailySeries,
  getMonthlySeries,
  getMonthlyTransactions,
  sortTransactions,
} from './transactions.js';

let overviewChartInstance = null;
let categoryChartInstance = null;
let overviewMode = 'monthly'; // 'monthly' | 'daily'

/**
 * Destroys active Dashboard Chart.js instances cleanly.
 */
export function destroyDashboardCharts() {
  if (overviewChartInstance) {
    overviewChartInstance.destroy();
    overviewChartInstance = null;
  }
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }
}

/**
 * Renders the Dashboard view.
 * @param {HTMLElement} container
 * @param {{ transactions: Array<object>, budget: object, selectedMonth: string }} state
 * @param {{ onNavigate: Function, onAdd: Function, onEdit: Function, onDelete: Function }} callbacks
 */
export function renderDashboardView(container, state, callbacks) {
  destroyDashboardCharts();

  const { transactions, budget, selectedMonth } = state;
  const totals = calculateTotals(transactions);
  const monthlySummary = calculateMonthlySummary(transactions, selectedMonth);
  const budgetMetrics = calculateBudgetMetrics(transactions, budget.monthlyLimit, selectedMonth);
  const monthLabel = formatMonthLabel(selectedMonth);

  const monthExpensesTxs = getMonthlyTransactions(transactions, selectedMonth);
  const categoryBreakdown = getCategoryBreakdown(monthExpensesTxs, 'expense');
  const recentTransactions = sortTransactions(transactions, 'date-desc').slice(0, 6);

  const showBudgetNotice =
    budgetMetrics.status === 'warning' || budgetMetrics.status === 'exceeded';

  const balanceClass = totals.totalBalance >= 0 ? 'text-primary' : 'text-expense';

  const categoryLegendHTML =
    categoryBreakdown.length === 0
      ? ''
      : `
        <div class="category-list">
          ${categoryBreakdown
            .slice(0, 5)
            .map(
              (item) => `
              <div class="category-row">
                <div class="category-row-left">
                  <span class="category-swatch" style="background-color:${item.color}"></span>
                  <span class="category-name">${escapeHTML(item.category)}</span>
                </div>
                <div class="category-row-right">
                  <span class="tabular-nums" style="font-weight:500;">${formatCurrency(item.amount)}</span>
                  <span class="category-pct tabular-nums">${item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      `;

  const recentRowsHTML = recentTransactions
    .map((tx) => {
      const isIncome = tx.type === 'income';
      const sign = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'text-income' : 'text-expense';
      return `
        <tr>
          <td class="tabular-nums tx-meta-inline">${escapeHTML(formatDate(tx.date))}</td>
          <td>
            <div class="tx-title-cell">
              <span class="tx-title-text">${escapeHTML(tx.title)}</span>
              ${
                tx.description
                  ? `<span class="tx-desc-text" title="${escapeHTML(tx.description)}">${escapeHTML(
                      tx.description
                    )}</span>`
                  : ''
              }
            </div>
          </td>
          <td class="tx-meta-inline">${escapeHTML(tx.category)} · ${isIncome ? 'Income' : 'Expense'}</td>
          <td class="col-right tx-amount ${amountClass}">${sign}${formatCurrency(tx.amount)}</td>
          <td class="col-actions">
            <div class="row-actions">
              <button
                type="button"
                class="icon-btn icon-btn-sm"
                data-dash-edit="${escapeHTML(tx.id)}"
                title="Edit transaction"
                aria-label="Edit ${escapeHTML(tx.title)}"
              >
                <i data-lucide="pencil"></i>
              </button>
              <button
                type="button"
                class="icon-btn icon-btn-sm icon-btn-danger"
                data-dash-delete="${escapeHTML(tx.id)}"
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

  const recentSectionHTML =
    recentTransactions.length === 0
      ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="receipt"></i></div>
          <h3 class="empty-state-title">No transactions yet</h3>
          <p class="empty-state-desc">Record your first income or expense entry to see real-time balances and spending charts.</p>
          <button type="button" class="btn btn-primary btn-sm" id="dash-empty-add-btn">Add Transaction</button>
        </div>
      `
      : `
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th class="col-right">Amount</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${recentRowsHTML}
            </tbody>
          </table>
        </div>
      `;

  container.innerHTML = `
    <div class="view-stack">
      ${showBudgetNotice ? buildBudgetBannerHTML(budgetMetrics, true) : ''}

      <!-- 4 Summary KPI Cards -->
      <section class="kpi-grid" aria-label="Financial Summary">
        <article class="kpi-card">
          <div class="kpi-label">
            <span>Total Balance</span>
            <i data-lucide="landmark" class="kpi-icon"></i>
          </div>
          <div class="kpi-value ${balanceClass}">${formatCurrency(totals.totalBalance)}</div>
          <div class="kpi-meta">
            <span>Income minus expenses</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${totals.transactionCount} entries</span>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Total Income</span>
            <i data-lucide="arrow-up-right" class="kpi-icon text-income"></i>
          </div>
          <div class="kpi-value text-income">${formatCurrency(totals.totalIncome)}</div>
          <div class="kpi-meta">
            <span>All-time inflows</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${formatCurrency(monthlySummary.income)} in ${escapeHTML(monthLabel)}</span>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Total Expenses</span>
            <i data-lucide="arrow-down-right" class="kpi-icon text-expense"></i>
          </div>
          <div class="kpi-value text-expense">${formatCurrency(totals.totalExpenses)}</div>
          <div class="kpi-meta">All-time cumulative outflows</div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Monthly Spending</span>
            <i data-lucide="calendar" class="kpi-icon"></i>
          </div>
          <div class="kpi-value">${formatCurrency(monthlySummary.expenses)}</div>
          <div class="kpi-meta">
            <span>${escapeHTML(monthLabel)}</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${
              budgetMetrics.monthlyLimit > 0
                ? `${budgetMetrics.utilizationPercent.toFixed(1)}% of budget`
                : 'No budget set'
            }</span>
          </div>
        </article>
      </section>

      <!-- Overview & Category Breakdown Charts -->
      <section class="dashboard-charts-grid" aria-label="Spending Charts">
        <article class="surface-card chart-card">
          <div class="chart-header">
            <div>
              <h2 class="section-title">Monthly Spending Overview</h2>
              <p class="section-subtitle" id="dash-overview-subtitle">
                ${
                  overviewMode === 'monthly'
                    ? '6-month comparison of income vs. expenses'
                    : `Daily spending distribution for ${escapeHTML(monthLabel)}`
                }
              </p>
            </div>
            <div class="segmented-control" role="group" aria-label="Overview chart mode">
              <button
                type="button"
                class="segmented-btn ${overviewMode === 'monthly' ? 'is-active' : ''}"
                data-overview-mode="monthly"
              >
                6-Month
              </button>
              <button
                type="button"
                class="segmented-btn ${overviewMode === 'daily' ? 'is-active' : ''}"
                data-overview-mode="daily"
              >
                Daily
              </button>
            </div>
          </div>
          <div id="dash-overview-chart-wrap" class="chart-canvas-wrap">
            <canvas id="dash-overview-canvas" aria-label="Monthly spending overview chart"></canvas>
          </div>
        </article>

        <article class="surface-card chart-card">
          <div class="chart-header">
            <div>
              <h2 class="section-title">Expense Category Breakdown</h2>
              <p class="section-subtitle">${escapeHTML(monthLabel)} spending by category</p>
            </div>
          </div>
          ${
            categoryBreakdown.length === 0
              ? `
                <div class="chart-empty">
                  <i data-lucide="pie-chart" style="width:24px;height:24px;"></i>
                  <span>No expenses recorded for ${escapeHTML(monthLabel)}.</span>
                </div>
              `
              : `
                <div class="chart-canvas-wrap" style="height: 200px;">
                  <canvas id="dash-category-canvas" aria-label="Expense category breakdown chart"></canvas>
                </div>
                ${categoryLegendHTML}
              `
          }
        </article>
      </section>

      <!-- Recent Transactions -->
      <section class="surface-card">
        <div class="section-header" style="margin-bottom: 12px;">
          <div>
            <h2 class="section-title">Recent Transactions</h2>
            <p class="section-subtitle">Latest recorded entries across all accounts and categories.</p>
          </div>
          <button type="button" class="btn-link" id="dash-view-all-btn">
            <span>View All Transactions</span>
            <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
          </button>
        </div>
        ${recentSectionHTML}
      </section>
    </div>
  `;

  // Wire navigation & row actions
  container.querySelector('#dash-view-all-btn')?.addEventListener('click', () => {
    callbacks.onNavigate('transactions');
  });

  container.querySelector('[data-goto-view="budget"]')?.addEventListener('click', () => {
    callbacks.onNavigate('budget');
  });

  container.querySelector('#dash-empty-add-btn')?.addEventListener('click', () => {
    callbacks.onAdd();
  });

  container.querySelectorAll('[data-dash-edit]').forEach((btn) => {
    btn.addEventListener('click', () => callbacks.onEdit(btn.getAttribute('data-dash-edit')));
  });

  container.querySelectorAll('[data-dash-delete]').forEach((btn) => {
    btn.addEventListener('click', () => callbacks.onDelete(btn.getAttribute('data-dash-delete')));
  });

  container.querySelectorAll('[data-overview-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextMode = btn.getAttribute('data-overview-mode');
      if (nextMode && nextMode !== overviewMode) {
        overviewMode = nextMode;
        renderDashboardView(container, state, callbacks);
      }
    });
  });

  // Render Charts
  renderOverviewChart(container, transactions, selectedMonth);
  if (categoryBreakdown.length > 0) {
    renderCategoryChart(container, categoryBreakdown);
  }

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renders the Monthly Spending Overview Chart.js bar chart.
 */
function renderOverviewChart(container, transactions, selectedMonth) {
  if (typeof window.Chart !== 'function') return;
  const canvas = container.querySelector('#dash-overview-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (overviewMode === 'daily') {
    const { labels, dailyExpenses } = getDailySeries(transactions, selectedMonth);
    overviewChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Expense',
            data: dailyExpenses,
            backgroundColor: '#0F766E',
            borderRadius: 4,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Day ${items[0]?.label || ''}`,
              label: (item) => ` Spent: ${formatCurrency(item.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748B', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#64748B',
              font: { size: 11 },
              callback: (val) => `$${val}`,
            },
          },
        },
      },
    });
    return;
  }

  const series = getMonthlySeries(transactions, selectedMonth, 6);
  overviewChartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Income',
          data: series.incomeData,
          backgroundColor: '#16A34A',
          borderRadius: 4,
          maxBarThickness: 22,
        },
        {
          label: 'Expenses',
          data: series.expenseData,
          backgroundColor: '#0F172A',
          borderRadius: 4,
          maxBarThickness: 22,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            color: '#475569',
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${formatCurrency(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748B', font: { size: 11.5 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#F1F5F9' },
          ticks: {
            color: '#64748B',
            font: { size: 11 },
            callback: (val) => `$${val}`,
          },
        },
      },
    },
  });
}

/**
 * Renders the Dashboard Expense Category Breakdown Doughnut chart.
 */
function renderCategoryChart(container, categoryBreakdown) {
  if (typeof window.Chart !== 'function') return;
  const canvas = container.querySelector('#dash-category-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  categoryChartInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoryBreakdown.map((c) => c.category),
      datasets: [
        {
          data: categoryBreakdown.map((c) => c.amount),
          backgroundColor: categoryBreakdown.map((c) => c.color),
          borderColor: '#FFFFFF',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const row = categoryBreakdown[item.dataIndex];
              return ` ${row.category}: ${formatCurrency(row.amount)} (${row.percentage}%)`;
            },
          },
        },
      },
    },
  });
}
