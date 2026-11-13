/**
 * analytics.js
 * Renders the Expense Analytics view (Feature 4):
 * - Total Savings & Savings Rate
 * - Highest Spending Category
 * - Category-wise expense breakdown (Chart.js horizontal bar + table)
 * - Monthly income versus expenses (Chart.js grouped bar)
 * - Spending distribution (Chart.js doughnut)
 */

import {
  calculateTotals,
  escapeHTML,
  formatCurrency,
  formatMonthLabel,
  getCategoryBreakdown,
  getMonthlySeries,
  getMonthlyTransactions,
} from './transactions.js';

let incomeVsExpenseChart = null;
let distributionChart = null;
let categoryBarChart = null;
let analyticsScope = 'all'; // 'all' | 'month'

/**
 * Destroys active Analytics Chart.js instances cleanly.
 */
export function destroyAnalyticsCharts() {
  if (incomeVsExpenseChart) {
    incomeVsExpenseChart.destroy();
    incomeVsExpenseChart = null;
  }
  if (distributionChart) {
    distributionChart.destroy();
    distributionChart = null;
  }
  if (categoryBarChart) {
    categoryBarChart.destroy();
    categoryBarChart = null;
  }
}

/**
 * Computes pure analytics summary metrics for a transaction set.
 * @param {Array<object>} transactions
 * @returns {object}
 */
export function calculateAnalyticsMetrics(transactions) {
  const totals = calculateTotals(transactions);
  const totalSavings = totals.totalBalance;
  const savingsRate =
    totals.totalIncome > 0
      ? Number(((totalSavings / totals.totalIncome) * 100).toFixed(1))
      : 0;
  const expenseRatio =
    totals.totalIncome > 0
      ? Number(((totals.totalExpenses / totals.totalIncome) * 100).toFixed(1))
      : 0;

  const breakdown = getCategoryBreakdown(transactions, 'expense');
  const highestCategory = breakdown.length > 0 ? breakdown[0] : null;

  const activeMonths = new Set(
    transactions
      .filter((tx) => tx.type === 'expense' && typeof tx.date === 'string' && tx.date.length >= 7)
      .map((tx) => tx.date.slice(0, 7))
  );
  const avgMonthlyExpense =
    activeMonths.size > 0
      ? Number((totals.totalExpenses / activeMonths.size).toFixed(2))
      : 0;

  return {
    totals,
    totalSavings,
    savingsRate,
    expenseRatio,
    highestCategory,
    breakdown,
    avgMonthlyExpense,
    activeMonthCount: activeMonths.size,
  };
}

/**
 * Renders the Expense Analytics view.
 * @param {HTMLElement} container
 * @param {{ transactions: Array<object>, selectedMonth: string }} state
 */
export function renderAnalyticsView(container, state) {
  destroyAnalyticsCharts();

  const { transactions, selectedMonth } = state;
  const scopedTxs =
    analyticsScope === 'month'
      ? getMonthlyTransactions(transactions, selectedMonth)
      : transactions;

  const metrics = calculateAnalyticsMetrics(scopedTxs);
  const scopeLabel =
    analyticsScope === 'month' ? formatMonthLabel(selectedMonth) : 'All Time';

  const savingsClass = metrics.totalSavings >= 0 ? 'text-income' : 'text-expense';

  const breakdownRowsHTML =
    metrics.breakdown.length === 0
      ? ''
      : metrics.breakdown
          .map((item) => {
            const avgPerTx = item.count > 0 ? item.amount / item.count : 0;
            return `
              <tr>
                <td>
                  <div class="category-row-left">
                    <span class="category-swatch" style="background-color:${item.color}"></span>
                    <span style="font-weight:500;">${escapeHTML(item.category)}</span>
                  </div>
                </td>
                <td class="col-right tabular-nums">${item.count}</td>
                <td class="col-right tabular-nums">${formatCurrency(avgPerTx)}</td>
                <td class="col-right tabular-nums">${item.percentage.toFixed(1)}%</td>
                <td class="col-right tabular-nums" style="font-weight:600;">${formatCurrency(item.amount)}</td>
              </tr>
            `;
          })
          .join('');

  container.innerHTML = `
    <div class="view-stack">
      <div class="section-header">
        <div>
          <h2 class="section-title">Expense Analytics</h2>
          <p class="section-subtitle">Analyze spending distribution, category drivers, and monthly income vs. expenses (${escapeHTML(
            scopeLabel
          )}).</p>
        </div>

        <div class="segmented-control" role="group" aria-label="Analytics period scope">
          <button
            type="button"
            class="segmented-btn ${analyticsScope === 'all' ? 'is-active' : ''}"
            data-analytics-scope="all"
          >
            All Time
          </button>
          <button
            type="button"
            class="segmented-btn ${analyticsScope === 'month' ? 'is-active' : ''}"
            data-analytics-scope="month"
          >
            ${escapeHTML(formatMonthLabel(selectedMonth))}
          </button>
        </div>
      </div>

      <!-- KPI Summary Strip -->
      <section class="kpi-grid" aria-label="Analytics Summary">
        <article class="kpi-card">
          <div class="kpi-label">
            <span>Total Savings</span>
            <i data-lucide="piggy-bank" class="kpi-icon"></i>
          </div>
          <div class="kpi-value ${savingsClass}">${formatCurrency(metrics.totalSavings)}</div>
          <div class="kpi-meta">
            <span>${escapeHTML(scopeLabel)} net</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${metrics.savingsRate.toFixed(1)}% savings rate</span>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Highest Spending Category</span>
            <i data-lucide="flame" class="kpi-icon text-warning"></i>
          </div>
          <div class="kpi-value kpi-value-sm">${
            metrics.highestCategory ? escapeHTML(metrics.highestCategory.category) : '—'
          }</div>
          <div class="kpi-meta">
            ${
              metrics.highestCategory
                ? `<span class="tabular-nums">${formatCurrency(
                    metrics.highestCategory.amount
                  )}</span><span aria-hidden="true">·</span><span class="tabular-nums">${metrics.highestCategory.percentage.toFixed(
                    1
                  )}% of expenses</span>`
                : 'No expense data'
            }
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Total Income</span>
            <i data-lucide="trending-up" class="kpi-icon text-income"></i>
          </div>
          <div class="kpi-value text-income">${formatCurrency(metrics.totals.totalIncome)}</div>
          <div class="kpi-meta">${escapeHTML(scopeLabel)} earnings</div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Avg. Monthly Expense</span>
            <i data-lucide="activity" class="kpi-icon"></i>
          </div>
          <div class="kpi-value">${formatCurrency(metrics.avgMonthlyExpense)}</div>
          <div class="kpi-meta">
            <span class="tabular-nums">${metrics.activeMonthCount} active ${
    metrics.activeMonthCount === 1 ? 'month' : 'months'
  }</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${metrics.expenseRatio.toFixed(1)}% of income</span>
          </div>
        </article>
      </section>

      <!-- Charts Row -->
      <section class="analytics-charts-grid">
        <article class="surface-card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="section-title">Monthly Income vs. Expenses</h3>
              <p class="section-subtitle">6-month cash flow comparison ending ${escapeHTML(
                formatMonthLabel(selectedMonth)
              )}</p>
            </div>
          </div>
          <div class="chart-canvas-wrap chart-canvas-wrap-tall">
            <canvas id="analytics-ive-canvas" aria-label="Monthly income versus expenses chart"></canvas>
          </div>
        </article>

        <article class="surface-card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="section-title">Spending Distribution</h3>
              <p class="section-subtitle">Proportional expense share across categories (${escapeHTML(
                scopeLabel
              )})</p>
            </div>
          </div>
          ${
            metrics.breakdown.length === 0
              ? `
                <div class="chart-empty">
                  <i data-lucide="pie-chart" style="width:24px;height:24px;"></i>
                  <span>No expense transactions found for ${escapeHTML(scopeLabel)}.</span>
                </div>
              `
              : `
                <div class="chart-canvas-wrap chart-canvas-wrap-tall">
                  <canvas id="analytics-dist-canvas" aria-label="Spending distribution chart"></canvas>
                </div>
              `
          }
        </article>
      </section>

      <!-- Category-Wise Breakdown Bar + Table -->
      <section class="surface-card chart-card">
        <div class="chart-header">
          <div>
            <h3 class="section-title">Category-Wise Expense Breakdown</h3>
            <p class="section-subtitle">Total spending, share percentage, and transaction volume per category (${escapeHTML(
              scopeLabel
            )})</p>
          </div>
        </div>

        ${
          metrics.breakdown.length === 0
            ? `
              <div class="empty-state">
                <div class="empty-state-icon"><i data-lucide="bar-chart-2"></i></div>
                <h4 class="empty-state-title">No expenses to analyze</h4>
                <p class="empty-state-desc">Add expense transactions to generate category breakdowns and distribution charts.</p>
              </div>
            `
            : `
              <div class="chart-canvas-wrap" style="height: ${Math.max(
                180,
                metrics.breakdown.length * 36
              )}px;">
                <canvas id="analytics-catbar-canvas" aria-label="Category expense horizontal bar chart"></canvas>
              </div>
              <div class="table-scroll" style="margin-top: 8px;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th class="col-right">Entries</th>
                      <th class="col-right">Avg / Entry</th>
                      <th class="col-right">Share</th>
                      <th class="col-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${breakdownRowsHTML}
                  </tbody>
                </table>
              </div>
            `
        }
      </section>
    </div>
  `;

  container.querySelectorAll('[data-analytics-scope]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-analytics-scope');
      if (next && next !== analyticsScope) {
        analyticsScope = next;
        renderAnalyticsView(container, state);
      }
    });
  });

  renderIncomeVsExpenseChart(container, transactions, selectedMonth);
  if (metrics.breakdown.length > 0) {
    renderDistributionChart(container, metrics.breakdown);
    renderCategoryBarChart(container, metrics.breakdown);
  }

  if (window.lucide) window.lucide.createIcons();
}

function renderIncomeVsExpenseChart(container, transactions, selectedMonth) {
  if (typeof window.Chart !== 'function') return;
  const canvas = container.querySelector('#analytics-ive-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const series = getMonthlySeries(transactions, selectedMonth, 6);

  incomeVsExpenseChart = new window.Chart(ctx, {
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
          backgroundColor: '#DC2626',
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

function renderDistributionChart(container, breakdown) {
  if (typeof window.Chart !== 'function') return;
  const canvas = container.querySelector('#analytics-dist-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  distributionChart = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: breakdown.map((b) => b.category),
      datasets: [
        {
          data: breakdown.map((b) => b.amount),
          backgroundColor: breakdown.map((b) => b.color),
          borderColor: '#FFFFFF',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
            color: '#334155',
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const row = breakdown[item.dataIndex];
              return ` ${row.category}: ${formatCurrency(row.amount)} (${row.percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderCategoryBarChart(container, breakdown) {
  if (typeof window.Chart !== 'function') return;
  const canvas = container.querySelector('#analytics-catbar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  categoryBarChart = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: breakdown.map((b) => b.category),
      datasets: [
        {
          label: 'Total Spent',
          data: breakdown.map((b) => b.amount),
          backgroundColor: breakdown.map((b) => b.color),
          borderRadius: 4,
          barThickness: 18,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const row = breakdown[item.dataIndex];
              return ` ${formatCurrency(row.amount)} (${row.percentage}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#F1F5F9' },
          ticks: {
            color: '#64748B',
            font: { size: 11 },
            callback: (val) => `$${val}`,
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#0F172A',
            font: { size: 12, weight: '500' },
          },
        },
      },
    },
  });
}
