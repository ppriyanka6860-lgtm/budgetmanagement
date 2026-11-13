/**
 * budget.js
 * Pure budget calculations and Budget Management view renderer (Feature 5).
 * Tracks monthly expenses against monthly budget, remaining budget,
 * utilization percentage, 80% warning threshold, and exceeded alert state.
 */

import {
  calculateMonthlySummary,
  escapeHTML,
  formatCurrency,
  formatMonthLabel,
  getCategoryBreakdown,
  getMonthlyTransactions,
} from './transactions.js';

/**
 * Pure calculation of budget utilization metrics for a given month.
 * @param {Array<object>} transactions
 * @param {number} monthlyLimit
 * @param {string} monthKey
 * @returns {object}
 */
export function calculateBudgetMetrics(transactions, monthlyLimit, monthKey) {
  const limit = Number(monthlyLimit) > 0 ? Number(Number(monthlyLimit).toFixed(2)) : 0;
  const summary = calculateMonthlySummary(transactions, monthKey);
  const monthlyExpenses = summary.expenses;
  const monthlyIncome = summary.income;
  const remaining = Number((limit - monthlyExpenses).toFixed(2));
  const utilizationPercent =
    limit > 0 ? Number(((monthlyExpenses / limit) * 100).toFixed(1)) : 0;
  const barPercent = Math.min(100, Math.max(0, utilizationPercent));

  let status = 'unset';
  if (limit > 0) {
    if (monthlyExpenses > limit) {
      status = 'exceeded';
    } else if (utilizationPercent >= 80) {
      status = 'warning';
    } else {
      status = 'nominal';
    }
  }

  return {
    monthKey,
    monthlyLimit: limit,
    monthlyExpenses,
    monthlyIncome,
    remaining,
    utilizationPercent,
    barPercent,
    status,
    overageAmount: monthlyExpenses > limit ? Number((monthlyExpenses - limit).toFixed(2)) : 0,
  };
}

/**
 * Builds the semantic status banner HTML for budget warnings and exceeded alerts.
 * @param {object} metrics
 * @param {boolean} showActionLink
 * @returns {string}
 */
export function buildBudgetBannerHTML(metrics, showActionLink = false) {
  const monthName = formatMonthLabel(metrics.monthKey);
  const actionBtn = showActionLink
    ? `<button type="button" class="btn btn-secondary btn-sm" data-goto-view="budget">Manage Budget</button>`
    : '';

  if (metrics.status === 'unset') {
    return `
      <div class="status-banner" role="status">
        <div class="status-banner-content">
          <i data-lucide="info" class="status-banner-icon"></i>
          <div>
            <div class="status-banner-title">No Monthly Budget Configured</div>
            <div class="status-banner-desc">Set a monthly spending limit to track utilization and receive 80% threshold warnings.</div>
          </div>
        </div>
        ${actionBtn}
      </div>
    `;
  }

  if (metrics.status === 'exceeded') {
    return `
      <div class="status-banner status-banner-exceeded" role="alert">
        <div class="status-banner-content">
          <i data-lucide="alert-octagon" class="status-banner-icon"></i>
          <div>
            <div class="status-banner-title">Budget Exceeded for ${escapeHTML(monthName)}</div>
            <div class="status-banner-desc">
              Expenses reached <strong class="tabular-nums">${formatCurrency(metrics.monthlyExpenses)}</strong>
              (${metrics.utilizationPercent.toFixed(1)}% of your ${formatCurrency(metrics.monthlyLimit)} budget),
              exceeding the limit by <strong class="tabular-nums">${formatCurrency(metrics.overageAmount)}</strong>.
            </div>
          </div>
        </div>
        ${actionBtn}
      </div>
    `;
  }

  if (metrics.status === 'warning') {
    return `
      <div class="status-banner status-banner-warning" role="alert">
        <div class="status-banner-content">
          <i data-lucide="alert-triangle" class="status-banner-icon"></i>
          <div>
            <div class="status-banner-title">Approaching Budget Limit (${metrics.utilizationPercent.toFixed(1)}% Used)</div>
            <div class="status-banner-desc">
              You have spent <strong class="tabular-nums">${formatCurrency(metrics.monthlyExpenses)}</strong>
              of your ${formatCurrency(metrics.monthlyLimit)} budget for ${escapeHTML(monthName)}.
              <strong class="tabular-nums">${formatCurrency(metrics.remaining)}</strong> remaining.
            </div>
          </div>
        </div>
        ${actionBtn}
      </div>
    `;
  }

  return `
    <div class="status-banner status-banner-nominal" role="status">
      <div class="status-banner-content">
        <i data-lucide="check-circle-2" class="status-banner-icon"></i>
        <div>
          <div class="status-banner-title">Within Monthly Budget (${metrics.utilizationPercent.toFixed(1)}% Used)</div>
          <div class="status-banner-desc">
            <strong class="tabular-nums">${formatCurrency(metrics.remaining)}</strong> remaining out of your
            ${formatCurrency(metrics.monthlyLimit)} limit for ${escapeHTML(monthName)}.
          </div>
        </div>
      </div>
      ${actionBtn}
    </div>
  `;
}

/**
 * Renders the Budget Management view (Feature 5).
 * @param {HTMLElement} container
 * @param {{ transactions: Array<object>, budget: { monthlyLimit: number, updatedAt: string }, selectedMonth: string }} state
 * @param {{ onSaveBudget: Function, onNavigate: Function }} callbacks
 */
export function renderBudgetView(container, state, callbacks) {
  const { transactions, budget, selectedMonth } = state;
  const metrics = calculateBudgetMetrics(transactions, budget.monthlyLimit, selectedMonth);
  const monthTxs = getMonthlyTransactions(transactions, selectedMonth);
  const categoryExpenses = getCategoryBreakdown(monthTxs, 'expense');
  const monthLabel = formatMonthLabel(selectedMonth);

  const fillClass =
    metrics.status === 'exceeded'
      ? 'progress-fill-exceeded'
      : metrics.status === 'warning'
      ? 'progress-fill-warning'
      : 'progress-fill-nominal';

  const remainingLabel = metrics.remaining < 0 ? 'Over Budget By' : 'Remaining Budget';
  const remainingDisplay =
    metrics.remaining < 0
      ? `-${formatCurrency(Math.abs(metrics.remaining))}`
      : formatCurrency(metrics.remaining);
  const remainingClass =
    metrics.status === 'exceeded'
      ? 'text-expense'
      : metrics.status === 'warning'
      ? 'text-warning'
      : 'text-income';

  const categoryRowsHTML =
    categoryExpenses.length === 0
      ? `<p class="text-muted" style="font-size:13px;padding:12px 0;">No expenses recorded for ${escapeHTML(
          monthLabel
        )} yet.</p>`
      : categoryExpenses
          .map((item) => {
            const pctOfBudget =
              metrics.monthlyLimit > 0
                ? ((item.amount / metrics.monthlyLimit) * 100).toFixed(1)
                : '0.0';
            return `
              <div class="category-row">
                <div class="category-row-left">
                  <span class="category-swatch" style="background-color:${item.color}"></span>
                  <span class="category-name">${escapeHTML(item.category)}</span>
                </div>
                <div class="category-row-right">
                  <span class="tabular-nums" style="font-weight:500;">${formatCurrency(item.amount)}</span>
                  <span class="category-pct tabular-nums">${pctOfBudget}% of budget</span>
                </div>
              </div>
            `;
          })
          .join('');

  container.innerHTML = `
    <div class="view-stack">
      <div class="section-header">
        <div>
          <h2 class="section-title">Budget Management</h2>
          <p class="section-subtitle">Configure your monthly spending cap and monitor real-time utilization for ${escapeHTML(
            monthLabel
          )}.</p>
        </div>
      </div>

      ${buildBudgetBannerHTML(metrics, false)}

      <div class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-label">
            <span>Monthly Budget</span>
            <i data-lucide="target" class="kpi-icon"></i>
          </div>
          <div class="kpi-value">${formatCurrency(metrics.monthlyLimit)}</div>
          <div class="kpi-meta">Target cap · Updated ${escapeHTML(budget.updatedAt || 'Today')}</div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Monthly Expenses</span>
            <i data-lucide="trending-down" class="kpi-icon"></i>
          </div>
          <div class="kpi-value text-expense">${formatCurrency(metrics.monthlyExpenses)}</div>
          <div class="kpi-meta">${escapeHTML(monthLabel)} total spending</div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>${remainingLabel}</span>
            <i data-lucide="wallet" class="kpi-icon"></i>
          </div>
          <div class="kpi-value ${remainingClass}">${remainingDisplay}</div>
          <div class="kpi-meta">${
            metrics.remaining < 0 ? 'Limit exceeded' : 'Available to spend'
          }</div>
        </article>

        <article class="kpi-card">
          <div class="kpi-label">
            <span>Utilization</span>
            <i data-lucide="gauge" class="kpi-icon"></i>
          </div>
          <div class="kpi-value ${remainingClass}">${metrics.utilizationPercent.toFixed(1)}%</div>
          <div class="kpi-meta">Warning triggers at 80.0%</div>
        </article>
      </div>

      <div class="budget-layout">
        <section class="surface-card">
          <div class="section-header">
            <div>
              <h3 class="section-title">Spending Progress (${escapeHTML(monthLabel)})</h3>
              <p class="section-subtitle">Visual tracker against your 80% warning marker and 100% cap.</p>
            </div>
          </div>

          <div class="budget-progress-wrap">
            <div class="budget-progress-labels">
              <span class="tabular-nums"><strong>${formatCurrency(
                metrics.monthlyExpenses
              )}</strong> spent</span>
              <span class="tabular-nums text-muted">Limit: ${formatCurrency(
                metrics.monthlyLimit
              )}</span>
            </div>

            <div
              class="progress-track"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="${Math.min(100, Math.round(metrics.utilizationPercent))}"
              aria-label="Monthly budget utilization"
            >
              <div class="progress-fill ${fillClass}" style="width: ${metrics.barPercent}%"></div>
              <div class="progress-threshold-mark" title="80% Warning Threshold"></div>
            </div>

            <div class="budget-threshold-note">
              <span>0%</span>
              <span>80% Warning (${formatCurrency(metrics.monthlyLimit * 0.8)})</span>
              <span>100%</span>
            </div>
          </div>

          <div class="category-list" style="margin-top: 20px;">
            <div class="section-subtitle" style="margin-bottom: 4px; font-weight: 600; color: var(--text-secondary);">
              Category Contribution to Monthly Budget
            </div>
            ${categoryRowsHTML}
          </div>
        </section>

        <section class="surface-card">
          <h3 class="section-title">Set Monthly Budget</h3>
          <p class="section-subtitle">Update your monthly spending limit. Threshold alerts recalculate automatically.</p>

          <form id="budget-form" class="budget-form" novalidate>
            <div class="form-group">
              <label for="budget-limit-input" class="form-label">
                Monthly Budget Limit (USD) <span class="required-mark">*</span>
              </label>
              <input
                type="number"
                id="budget-limit-input"
                name="monthlyLimit"
                class="input-control mono-input"
                step="10"
                min="1"
                value="${metrics.monthlyLimit > 0 ? metrics.monthlyLimit : ''}"
                placeholder="e.g., 3500"
                required
              />
              <span class="field-error" id="err-budget-limit" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <span class="form-label">Quick Presets</span>
              <div class="budget-presets">
                <button type="button" class="preset-btn" data-budget-preset="2000">$2,000</button>
                <button type="button" class="preset-btn" data-budget-preset="3200">$3,200</button>
                <button type="button" class="preset-btn" data-budget-preset="4500">$4,500</button>
                <button type="button" class="preset-btn" data-budget-preset="6000">$6,000</button>
              </div>
            </div>

            <div>
              <button type="submit" class="btn btn-primary">
                <i data-lucide="check" class="btn-icon"></i>
                <span>Save Monthly Budget</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `;

  // Event listeners
  const form = container.querySelector('#budget-form');
  const limitInput = container.querySelector('#budget-limit-input');
  const errEl = container.querySelector('#err-budget-limit');

  container.querySelectorAll('[data-budget-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-budget-preset');
      if (limitInput) {
        limitInput.value = val;
        limitInput.classList.remove('is-invalid');
        if (errEl) errEl.textContent = '';
      }
    });
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = limitInput?.value?.trim() || '';
    const num = Number(raw);

    if (!raw || !Number.isFinite(num) || num <= 0) {
      limitInput?.classList.add('is-invalid');
      if (errEl) errEl.textContent = 'Please enter a valid monthly budget greater than $0.';
      limitInput?.focus();
      return;
    }

    if (num > 100000000) {
      limitInput?.classList.add('is-invalid');
      if (errEl) errEl.textContent = 'Budget limit is too large.';
      return;
    }

    limitInput?.classList.remove('is-invalid');
    if (errEl) errEl.textContent = '';
    callbacks.onSaveBudget(num);
  });

  if (window.lucide) window.lucide.createIcons();
}
