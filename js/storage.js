/**
 * storage.js
 * Centralized persistence repository using browser LocalStorage.
 * Structured with clean CRUD boundaries so LocalStorage calls can be replaced
 * directly with REST API fetch() calls (Node.js/Express/SQL) in Phase 2.
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'clearledger_transactions_v1',
  BUDGET: 'clearledger_budget_v1',
  INITIALIZED: 'clearledger_initialized_v1',
};

const DEFAULT_BUDGET = {
  monthlyLimit: 3200,
  updatedAt: formatISODate(new Date()),
};

/**
 * Formats a Date object into YYYY-MM-DD using local calendar fields.
 * @param {Date} dateObj
 * @returns {string}
 */
function formatISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a YYYY-MM-DD string shifted by N months and pinned to a safe day.
 * @param {number} monthOffset
 * @param {number} dayOfMonth
 * @returns {string}
 */
function shiftMonthDate(monthOffset, dayOfMonth) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(Math.max(1, dayOfMonth), maxDay);
  target.setDate(clampedDay);
  return formatISODate(target);
}

/**
 * Generates a unique transaction identifier.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `tx_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Builds realistic initial seed transactions relative to the current calendar month.
 * @returns {Array<object>}
 */
function createSampleTransactions() {
  return [
    {
      id: 'tx_seed_01',
      title: 'Monthly Salary Deposit',
      amount: 5400.0,
      category: 'Salary',
      type: 'income',
      date: shiftMonthDate(0, 1),
      description: 'Primary engineering payroll deposit',
    },
    {
      id: 'tx_seed_02',
      title: 'Apartment Rent',
      amount: 1450.0,
      category: 'Housing',
      type: 'expense',
      date: shiftMonthDate(0, 2),
      description: 'Monthly lease payment',
    },
    {
      id: 'tx_seed_03',
      title: 'Whole Foods Groceries',
      amount: 218.4,
      category: 'Food',
      type: 'expense',
      date: shiftMonthDate(0, 4),
      description: 'Weekly groceries and pantry restock',
    },
    {
      id: 'tx_seed_04',
      title: 'City Electric & Fiber Internet',
      amount: 164.25,
      category: 'Utilities',
      type: 'expense',
      date: shiftMonthDate(0, 6),
      description: 'Monthly electricity and gigabit internet',
    },
    {
      id: 'tx_seed_05',
      title: 'UI Audit Consulting',
      amount: 780.0,
      category: 'Freelance',
      type: 'income',
      date: shiftMonthDate(0, 8),
      description: 'Design system review invoice #104',
    },
    {
      id: 'tx_seed_06',
      title: 'Metro Transit Pass & Fuel',
      amount: 112.5,
      category: 'Transport',
      type: 'expense',
      date: shiftMonthDate(0, 9),
      description: 'Monthly commuter pass and fuel top-up',
    },
    {
      id: 'tx_seed_07',
      title: 'Dental Checkup & Pharmacy',
      amount: 145.0,
      category: 'Healthcare',
      type: 'expense',
      date: shiftMonthDate(0, 10),
      description: 'Routine checkup co-pay',
    },
    {
      id: 'tx_seed_08',
      title: 'Neighborhood Bistro & Coffee',
      amount: 86.75,
      category: 'Food',
      type: 'expense',
      date: shiftMonthDate(0, 12),
      description: 'Team lunch and coffee beans',
    },
    {
      id: 'tx_seed_09',
      title: 'Ergonomic Desk Lamp',
      amount: 129.0,
      category: 'Shopping',
      type: 'expense',
      date: shiftMonthDate(0, 13),
      description: 'Home office lighting upgrade',
    },
    // Previous Month (-1)
    {
      id: 'tx_seed_10',
      title: 'Monthly Salary Deposit',
      amount: 5400.0,
      category: 'Salary',
      type: 'income',
      date: shiftMonthDate(-1, 1),
      description: 'Primary engineering payroll deposit',
    },
    {
      id: 'tx_seed_11',
      title: 'Apartment Rent',
      amount: 1450.0,
      category: 'Housing',
      type: 'expense',
      date: shiftMonthDate(-1, 2),
      description: 'Monthly lease payment',
    },
    {
      id: 'tx_seed_12',
      title: 'Supermarket & Fresh Produce',
      amount: 462.8,
      category: 'Food',
      type: 'expense',
      date: shiftMonthDate(-1, 11),
      description: 'Monthly household groceries',
    },
    {
      id: 'tx_seed_13',
      title: 'Utilities & Mobile Plan',
      amount: 192.0,
      category: 'Utilities',
      type: 'expense',
      date: shiftMonthDate(-1, 16),
      description: 'Electricity, water, and mobile',
    },
    {
      id: 'tx_seed_14',
      title: 'Dividend Distribution',
      amount: 310.0,
      category: 'Investments',
      type: 'income',
      date: shiftMonthDate(-1, 20),
      description: 'Quarterly index fund payout',
    },
    {
      id: 'tx_seed_15',
      title: 'Concert Tickets & Streaming',
      amount: 184.0,
      category: 'Entertainment',
      type: 'expense',
      date: shiftMonthDate(-1, 24),
      description: 'Live show and monthly subscriptions',
    },
    // Two Months Ago (-2)
    {
      id: 'tx_seed_16',
      title: 'Monthly Salary Deposit',
      amount: 5200.0,
      category: 'Salary',
      type: 'income',
      date: shiftMonthDate(-2, 1),
      description: 'Primary payroll deposit',
    },
    {
      id: 'tx_seed_17',
      title: 'Apartment Rent',
      amount: 1450.0,
      category: 'Housing',
      type: 'expense',
      date: shiftMonthDate(-2, 2),
      description: 'Monthly lease payment',
    },
    {
      id: 'tx_seed_18',
      title: 'Groceries & Dining',
      amount: 438.9,
      category: 'Food',
      type: 'expense',
      date: shiftMonthDate(-2, 14),
      description: 'Groceries and weekend dinner',
    },
    {
      id: 'tx_seed_19',
      title: 'Online Systems Course',
      amount: 240.0,
      category: 'Education',
      type: 'expense',
      date: shiftMonthDate(-2, 19),
      description: 'Annual technical workshop enrollment',
    },
    // Three Months Ago (-3)
    {
      id: 'tx_seed_20',
      title: 'Monthly Salary Deposit',
      amount: 5200.0,
      category: 'Salary',
      type: 'income',
      date: shiftMonthDate(-3, 1),
      description: 'Primary payroll deposit',
    },
    {
      id: 'tx_seed_21',
      title: 'Apartment Rent',
      amount: 1450.0,
      category: 'Housing',
      type: 'expense',
      date: shiftMonthDate(-3, 2),
      description: 'Monthly lease payment',
    },
    {
      id: 'tx_seed_22',
      title: 'Train Travel & Groceries',
      amount: 595.4,
      category: 'Transport',
      type: 'expense',
      date: shiftMonthDate(-3, 15),
      description: 'Regional rail tickets and supplies',
    },
  ];
}

/**
 * Ensures initial seed data is populated once on very first app launch.
 */
function ensureInitialized() {
  try {
    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (initialized === null) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(createSampleTransactions()));
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(DEFAULT_BUDGET));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  } catch (error) {
    console.error('Failed to initialize LocalStorage:', error);
  }
}

/**
 * Normalizes a transaction record to enforce strict shape & types.
 * @param {object} raw
 * @returns {object}
 */
function normalizeTransaction(raw) {
  return {
    id: String(raw.id || generateId()),
    title: String(raw.title || '').trim(),
    amount: Number(Number(raw.amount || 0).toFixed(2)),
    category: String(raw.category || 'Other').trim(),
    type: raw.type === 'income' ? 'income' : 'expense',
    date: String(raw.date || formatISODate(new Date())),
    description: String(raw.description || '').trim(),
  };
}

/**
 * Retrieves all stored transactions.
 * Future REST mapping: GET /api/transactions
 * @returns {Array<object>}
 */
export function getTransactions() {
  ensureInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTransaction);
  } catch (error) {
    console.error('Error reading transactions from LocalStorage:', error);
    return [];
  }
}

/**
 * Persists the complete transactions array.
 * @param {Array<object>} transactions
 * @returns {Array<object>}
 */
export function saveTransactions(transactions) {
  const normalized = Array.isArray(transactions)
    ? transactions.map(normalizeTransaction)
    : [];
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  } catch (error) {
    console.error('Error saving transactions to LocalStorage:', error);
  }
  return normalized;
}

/**
 * Adds a single new transaction and returns the created record.
 * Future REST mapping: POST /api/transactions
 * @param {object} transactionInput
 * @returns {object}
 */
export function addTransaction(transactionInput) {
  const transactions = getTransactions();
  const created = normalizeTransaction({
    ...transactionInput,
    id: transactionInput.id || generateId(),
  });
  transactions.unshift(created);
  saveTransactions(transactions);
  return created;
}

/**
 * Updates an existing transaction by ID.
 * Future REST mapping: PUT /api/transactions/:id
 * @param {string} id
 * @param {object} updates
 * @returns {object|null}
 */
export function updateTransaction(id, updates) {
  const transactions = getTransactions();
  const idx = transactions.findIndex((tx) => tx.id === id);
  if (idx === -1) return null;

  const updated = normalizeTransaction({
    ...transactions[idx],
    ...updates,
    id,
  });
  transactions[idx] = updated;
  saveTransactions(transactions);
  return updated;
}

/**
 * Deletes a transaction by ID.
 * Future REST mapping: DELETE /api/transactions/:id
 * @param {string} id
 * @returns {boolean}
 */
export function deleteTransaction(id) {
  const transactions = getTransactions();
  const next = transactions.filter((tx) => tx.id !== id);
  if (next.length === transactions.length) return false;
  saveTransactions(next);
  return true;
}

/**
 * Retrieves budget configuration.
 * Future REST mapping: GET /api/budget
 * @returns {{ monthlyLimit: number, updatedAt: string }}
 */
export function getBudget() {
  ensureInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGET);
    if (!raw) return { ...DEFAULT_BUDGET };
    const parsed = JSON.parse(raw);
    const limit = Number(parsed?.monthlyLimit);
    return {
      monthlyLimit: Number.isFinite(limit) && limit >= 0 ? Number(limit.toFixed(2)) : DEFAULT_BUDGET.monthlyLimit,
      updatedAt: String(parsed?.updatedAt || formatISODate(new Date())),
    };
  } catch (error) {
    console.error('Error reading budget from LocalStorage:', error);
    return { ...DEFAULT_BUDGET };
  }
}

/**
 * Saves monthly budget limit.
 * Future REST mapping: PUT /api/budget
 * @param {number} monthlyLimit
 * @returns {{ monthlyLimit: number, updatedAt: string }}
 */
export function saveBudget(monthlyLimit) {
  const numericLimit = Number(monthlyLimit);
  const payload = {
    monthlyLimit: Number.isFinite(numericLimit) && numericLimit > 0 ? Number(numericLimit.toFixed(2)) : 0,
    updatedAt: formatISODate(new Date()),
  };
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  } catch (error) {
    console.error('Error saving budget to LocalStorage:', error);
  }
  return payload;
}

/**
 * Clears all transactions while keeping initialization flag active so empty state persists.
 */
export function clearAllTransactions() {
  saveTransactions([]);
}

/**
 * Restores realistic sample transactions and default budget.
 */
export function resetSampleData() {
  saveTransactions(createSampleTransactions());
  saveBudget(DEFAULT_BUDGET.monthlyLimit);
}
