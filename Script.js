/* ============================================================
   FINANCE X — script.js
   Central state, all logic, no placeholders
   ============================================================ */

'use strict';

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const STORAGE_KEY   = 'financex_data';
const SETTINGS_KEY  = 'financex_settings';
const GOALS_KEY     = 'financex_goals';

const CHART_COLORS = [
  '#00e5a0','#0aefff','#ff4f7b','#ffca3a',
  '#a78bfa','#fb923c','#38bdf8','#f472b6',
  '#4ade80','#facc15','#c084fc','#34d399'
];

const DEFAULT_CATEGORIES = [
  { id: 'food',        name: 'Food & Dining',   emoji: '🍔', type: 'expense' },
  { id: 'transport',   name: 'Transport',        emoji: '🚗', type: 'expense' },
  { id: 'shopping',    name: 'Shopping',         emoji: '🛍️', type: 'expense' },
  { id: 'bills',       name: 'Bills & Utilities',emoji: '💡', type: 'expense' },
  { id: 'health',      name: 'Health',           emoji: '❤️', type: 'expense' },
  { id: 'entertainment',name:'Entertainment',    emoji: '🎮', type: 'expense' },
  { id: 'education',   name: 'Education',        emoji: '📚', type: 'expense' },
  { id: 'other_exp',   name: 'Other',            emoji: '📦', type: 'expense' },
  { id: 'salary',      name: 'Salary',           emoji: '💼', type: 'income'  },
  { id: 'freelance',   name: 'Freelance',        emoji: '💻', type: 'income'  },
  { id: 'investment',  name: 'Investments',      emoji: '📈', type: 'income'  },
  { id: 'other_inc',   name: 'Other Income',     emoji: '💰', type: 'income'  },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatCurrency(amount, symbol) {
  const s = symbol || appState.settings.currency || '$';
  return `${s}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateRange(period) {
  const now = new Date();
  let from, to;
  to = today();
  if (period === '7d') {
    from = new Date(now - 7 * 864e5).toISOString().slice(0, 10);
  } else if (period === '30d') {
    from = new Date(now - 30 * 864e5).toISOString().slice(0, 10);
  } else if (period === 'thisMonth') {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;
  } else if (period === 'lastMonth') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`;
    const d2 = new Date(now.getFullYear(), now.getMonth(), 0);
    to = d2.toISOString().slice(0, 10);
  } else if (period === 'all') {
    return { from: '2000-01-01', to: '2099-12-31' };
  } else {
    return null; // custom
  }
  return { from, to };
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

// ============================================================
// APP STATE
// ============================================================

const appState = {
  transactions: [],
  categories:   [],
  settings: {
    name:     '',
    currency: '$',
    hostedUrl:''
  },
  goals: [],
  filters: {
    period:   '30d',
    type:     'all',
    category: 'all',
    from:     '',
    to:       '',
    search:   ''
  },
  trendPeriod: '7d',
  editingTxId: null,
  deletingTxId: null
};

// ============================================================
// PERSISTENCE
// ============================================================

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions: appState.transactions,
      categories:   appState.categories
    }));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appState.settings));
    localStorage.setItem(GOALS_KEY, JSON.stringify(appState.goals));
  } catch(e) { console.warn('Save failed:', e); }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      appState.transactions = d.transactions || [];
      appState.categories   = d.categories   || [...DEFAULT_CATEGORIES];
    } else {
      appState.categories = [...DEFAULT_CATEGORIES];
      insertSampleData();
    }
    const rawS = localStorage.getItem(SETTINGS_KEY);
    if (rawS) { Object.assign(appState.settings, JSON.parse(rawS)); }
    const rawG = localStorage.getItem(GOALS_KEY);
    if (rawG) { appState.goals = JSON.parse(rawG); }
  } catch(e) {
    appState.categories   = [...DEFAULT_CATEGORIES];
    appState.transactions = [];
    insertSampleData();
  }
}

function insertSampleData() {
  // 45 days of sample transactions so charts have meaningful data
  const now = new Date();
  const samples = [
    // Recent month
    { type:'income',  cat:'salary',      desc:'Monthly Salary',       amount:4200, daysAgo:1  },
    { type:'expense', cat:'food',        desc:'Grocery run',           amount:87.50, daysAgo:1  },
    { type:'expense', cat:'transport',   desc:'Gas station',           amount:52.00, daysAgo:2  },
    { type:'expense', cat:'food',        desc:'Restaurant dinner',     amount:43.20, daysAgo:3  },
    { type:'expense', cat:'bills',       desc:'Electricity bill',      amount:110.00, daysAgo:4 },
    { type:'expense', cat:'shopping',    desc:'Online order',          amount:67.99, daysAgo:5  },
    { type:'expense', cat:'entertainment',desc:'Streaming services',   amount:28.99, daysAgo:6  },
    { type:'income',  cat:'freelance',   desc:'Freelance project',     amount:750,  daysAgo:7  },
    { type:'expense', cat:'food',        desc:'Coffee shop',           amount:18.60, daysAgo:7  },
    { type:'expense', cat:'health',      desc:'Gym membership',        amount:45.00, daysAgo:8  },
    { type:'expense', cat:'food',        desc:'Lunch out',             amount:24.50, daysAgo:9  },
    { type:'expense', cat:'transport',   desc:'Uber ride',             amount:14.80, daysAgo:10 },
    { type:'expense', cat:'shopping',    desc:'Clothing store',        amount:95.00, daysAgo:11 },
    { type:'expense', cat:'bills',       desc:'Internet bill',         amount:59.99, daysAgo:12 },
    { type:'income',  cat:'investment',  desc:'Dividend payment',      amount:120,  daysAgo:13 },
    { type:'expense', cat:'food',        desc:'Grocery run',           amount:74.30, daysAgo:14 },
    { type:'expense', cat:'education',   desc:'Online course',         amount:29.99, daysAgo:15 },
    { type:'expense', cat:'entertainment',desc:'Movie tickets',        amount:34.00, daysAgo:16 },
    { type:'expense', cat:'food',        desc:'Takeout dinner',        amount:38.75, daysAgo:17 },
    { type:'expense', cat:'transport',   desc:'Monthly transit pass',  amount:85.00, daysAgo:18 },
    { type:'expense', cat:'health',      desc:'Pharmacy',              amount:22.40, daysAgo:19 },
    { type:'expense', cat:'shopping',    desc:'Home supplies',         amount:56.20, daysAgo:20 },
    { type:'income',  cat:'freelance',   desc:'Freelance design work', amount:400,  daysAgo:21 },
    { type:'expense', cat:'food',        desc:'Coffee shop',           amount:21.00, daysAgo:22 },
    { type:'expense', cat:'bills',       desc:'Water bill',            amount:35.00, daysAgo:23 },
    { type:'expense', cat:'food',        desc:'Restaurant lunch',      amount:29.40, daysAgo:24 },
    { type:'expense', cat:'entertainment',desc:'Concert tickets',      amount:80.00, daysAgo:25 },
    { type:'expense', cat:'shopping',    desc:'Book purchase',         amount:18.99, daysAgo:26 },
    // Previous month data
    { type:'income',  cat:'salary',      desc:'Monthly Salary',        amount:4200, daysAgo:32 },
    { type:'expense', cat:'food',        desc:'Grocery run',           amount:91.00, daysAgo:32 },
    { type:'expense', cat:'bills',       desc:'Electricity bill',      amount:98.00, daysAgo:33 },
    { type:'expense', cat:'transport',   desc:'Gas station',           amount:48.50, daysAgo:35 },
    { type:'expense', cat:'food',        desc:'Restaurant',            amount:55.00, daysAgo:36 },
    { type:'income',  cat:'freelance',   desc:'Freelance project',     amount:600,  daysAgo:38 },
    { type:'expense', cat:'shopping',    desc:'Electronics',           amount:149.99,daysAgo:40 },
    { type:'expense', cat:'health',      desc:'Doctor visit',          amount:80.00, daysAgo:42 },
    { type:'expense', cat:'entertainment',desc:'Streaming',            amount:28.99, daysAgo:44 },
  ];
  samples.forEach(s => {
    const d = new Date(now - s.daysAgo * 864e5);
    appState.transactions.push({
      id:       genId(),
      type:     s.type,
      amount:   s.amount,
      category: s.cat,
      date:     d.toISOString().slice(0,10),
      description: s.desc,
      notes:    ''
    });
  });
  // Sort newest first
  appState.transactions.sort((a,b) => b.date.localeCompare(a.date));
}

// ============================================================
// FILTER ENGINE
// ============================================================

function getFilteredTransactions(overrideFilters) {
  const f = overrideFilters || appState.filters;
  let txs = appState.transactions;

  // Period / date range
  let from, to;
  if (f.period === 'custom') {
    from = f.from || '2000-01-01';
    to   = f.to   || '2099-12-31';
  } else {
    const r = dateRange(f.period);
    if (r) { from = r.from; to = r.to; }
  }
  if (from && to) {
    txs = txs.filter(t => t.date >= from && t.date <= to);
  }

  // Type
  if (f.type !== 'all') {
    txs = txs.filter(t => t.type === f.type);
  }

  // Category
  if (f.category !== 'all') {
    txs = txs.filter(t => t.category === f.category);
  }

  // Search
  if (f.search) {
    const q = f.search.toLowerCase();
    txs = txs.filter(t =>
      t.description.toLowerCase().includes(q) ||
      t.notes.toLowerCase().includes(q) ||
      getCategoryById(t.category)?.name.toLowerCase().includes(q)
    );
  }

  return txs;
}

function getTotals(txs) {
  let income = 0, expense = 0;
  txs.forEach(t => {
    if (t.type === 'income')  income  += t.amount;
    if (t.type === 'expense') expense += t.amount;
  });
  return { income, expense, balance: income - expense, savings: income - expense };
}

function getPreviousPeriodTotals() {
  const f = appState.filters;
  let from, to;
  if (f.period === 'custom') { return null; }
  const r = dateRange(f.period);
  if (!r || f.period === 'all') { return null; }
  const span = new Date(r.to) - new Date(r.from);
  const prevTo   = new Date(new Date(r.from) - 864e5).toISOString().slice(0,10);
  const prevFrom = new Date(new Date(r.from) - span - 864e5).toISOString().slice(0,10);
  const prevTxs = appState.transactions.filter(t => t.date >= prevFrom && t.date <= prevTo);
  return getTotals(prevTxs);
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatChange(pct, inverse) {
  if (pct === null) return '';
  const sign = pct >= 0 ? '+' : '';
  const cls  = (inverse ? pct > 0 : pct < 0) ? 'up' : 'down';
  return `<span class="card-change ${cls}">${sign}${pct.toFixed(1)}% vs previous period</span>`;
}

// ============================================================
// CATEGORY HELPERS
// ============================================================

function getCategoryById(id) {
  return appState.categories.find(c => c.id === id) || null;
}

function getCategoriesForType(type) {
  return appState.categories.filter(c => c.type === type || c.type === 'both');
}

// ============================================================
// CHART INSTANCES
// ============================================================

const charts = {};

function destroyChart(name) {
  if (charts[name]) { charts[name].destroy(); delete charts[name]; }
}

function getChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };
}

// ===== TREND CHART =====
function renderTrendChart(txs) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  destroyChart('trend');

  const days = appState.trendPeriod === '7d' ? 7 : 30;
  const labels = [], incomeData = [], expenseData = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const ds = d.toISOString().slice(0,10);
    labels.push(d.toLocaleDateString('en-US', { month:'short', day:'numeric' }));
    const dayTxs = txs.filter(t => t.date === ds);
    incomeData.push( dayTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0) );
    expenseData.push( dayTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0) );
  }

  charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#00e5a0',
          backgroundColor: 'rgba(0,229,160,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#00e5a0',
          borderWidth: 2
        },
        {
          label: 'Expense',
          data: expenseData,
          borderColor: '#ff4f7b',
          backgroundColor: 'rgba(255,79,123,0.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ff4f7b',
          borderWidth: 2
        }
      ]
    },
    options: {
      ...getChartDefaults(),
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9999bb', font: { size: 9, family: 'DM Mono' }, maxTicksLimit: 7 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9999bb', font: { size: 9, family: 'DM Mono' },
            callback: v => `${appState.settings.currency}${v}` }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#9999bb', font: { size: 10 }, boxWidth: 10, boxHeight: 10 }
        },
        tooltip: {
          backgroundColor: '#16161f',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#f0f0f8',
          bodyColor: '#9999bb',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        }
      }
    }
  });
}

// ===== CATEGORY CHART =====
function renderCategoryChart(txs) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  destroyChart('category');

  const expenses = txs.filter(t => t.type === 'expense');
  const map = {};
  expenses.forEach(t => {
    const cat = getCategoryById(t.category);
    const name = cat ? cat.name : 'Other';
    map[name] = (map[name] || 0) + t.amount;
  });
  const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const labels = sorted.map(e => e[0]);
  const data   = sorted.map(e => e[1]);

  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS,
        borderColor: '#0a0a0f',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      ...getChartDefaults(),
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#16161f',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${formatCurrency(ctx.parsed)}`
          }
        }
      }
    }
  });

  // Render legend
  const legendEl = document.getElementById('categoryLegend');
  if (legendEl) {
    legendEl.innerHTML = sorted.map((e, i) =>
      `<div class="legend-item">
        <span class="legend-dot" style="background:${CHART_COLORS[i]}"></span>
        <span class="legend-label">${e[0]}</span>
        <span class="legend-value">${formatCurrency(e[1])}</span>
      </div>`
    ).join('');
  }
}

// ===== COMPARE CHART =====
function renderCompareChart(txs) {
  const ctx = document.getElementById('compareChart');
  if (!ctx) return;
  destroyChart('compare');

  // Build last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month:'short' });
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const monthTxs = appState.transactions.filter(t => t.date.startsWith(`${y}-${m}`));
    months.push({
      label,
      income:  monthTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),
      expense: monthTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
    });
  }

  charts.compare = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Income',
          data: months.map(m => m.income),
          backgroundColor: 'rgba(0,229,160,0.5)',
          borderColor: '#00e5a0',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Expense',
          data: months.map(m => m.expense),
          backgroundColor: 'rgba(255,79,123,0.4)',
          borderColor: '#ff4f7b',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      ...getChartDefaults(),
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9999bb', font: { size: 9, family: 'DM Mono' } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9999bb', font: { size: 9, family: 'DM Mono' },
            callback: v => `${appState.settings.currency}${v}` }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#9999bb', font: { size: 10 }, boxWidth: 10, boxHeight: 10 }
        },
        tooltip: {
          backgroundColor: '#16161f',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        }
      }
    }
  });
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================

function renderDashboard() {
  const txs    = getFilteredTransactions();
  const totals = getTotals(txs);
  const prev   = getPreviousPeriodTotals();
  const sym    = appState.settings.currency;

  // Summary cards
  document.getElementById('totalBalance').textContent  = formatCurrency(totals.balance, sym);
  document.getElementById('totalIncome').textContent   = formatCurrency(totals.income, sym);
  document.getElementById('totalExpenses').textContent = formatCurrency(totals.expense, sym);
  document.getElementById('totalSavings').textContent  = formatCurrency(totals.savings, sym);

  if (prev) {
    document.getElementById('incomeChange').innerHTML   = formatChange(pctChange(totals.income,  prev.income),  false);
    document.getElementById('expenseChange').innerHTML  = formatChange(pctChange(totals.expense, prev.expense), true);
    const bPct = pctChange(totals.balance, prev.balance);
    document.getElementById('balanceChange').innerHTML  = formatChange(bPct, false);
    const rate = totals.income > 0 ? (totals.savings / totals.income * 100).toFixed(1) : '0.0';
    document.getElementById('savingsRate').innerHTML    = `<span class="card-change">${rate}% savings rate</span>`;
  } else {
    ['balanceChange','incomeChange','expenseChange','savingsRate'].forEach(id =>
      document.getElementById(id).innerHTML = '');
  }

  // Charts
  renderTrendChart(appState.transactions);
  renderCategoryChart(txs);
  renderCompareChart(txs);

  // Monthly summary
  renderMonthlySummary();

  // Recent transactions (last 5)
  const recent = [...txs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  renderTransactionList('recentTransactions', recent, true);

  // Notification dot if high expenses
  const dot = document.getElementById('notifDot');
  if (prev && totals.expense > prev.expense * 1.2) {
    dot.classList.add('show');
  } else {
    dot.classList.remove('show');
  }
}

function renderMonthlySummary() {
  const el = document.getElementById('monthlySummary');
  if (!el) return;
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const txs = appState.transactions.filter(t => t.date.startsWith(`${y}-${m}`));
    const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    months.push({ label, income, expense });
  }
  const maxExp = Math.max(...months.map(m => m.expense), 1);
  el.innerHTML = months.map(m => {
    const w = ((m.expense / maxExp) * 100).toFixed(1);
    return `<div class="month-row">
      <div class="month-name">${m.label.split(' ')[0]}</div>
      <div class="month-bar-wrap"><div class="month-bar" style="width:${w}%"></div></div>
      <div class="month-amounts">
        <div class="month-income">+${formatCurrency(m.income)}</div>
        <div class="month-expense">-${formatCurrency(m.expense)}</div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// RENDER: TRANSACTION LIST
// ============================================================

function renderTransactionList(containerId, txs, compact) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (txs.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div>No transactions found.</div>`;
    return;
  }
  el.innerHTML = txs.map(tx => {
    const cat = getCategoryById(tx.category);
    const emoji = cat ? cat.emoji : '📦';
    const catName = cat ? cat.name : 'Other';
    const sign = tx.type === 'income' ? '+' : '-';
    return `<div class="tx-item" data-id="${tx.id}">
      <div class="tx-icon ${tx.type}">${emoji}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(tx.description)}</div>
        <div class="tx-meta">
          <span>${formatDate(tx.date)}</span>
          <span class="tx-cat-badge">${catName}</span>
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${tx.type}">${sign}${formatCurrency(tx.amount)}</div>
        ${!compact ? `<div class="tx-actions">
          <button class="tx-action-btn edit" data-edit="${tx.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="tx-action-btn delete" data-delete="${tx.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ============================================================
// RENDER: ALL TRANSACTIONS PAGE
// ============================================================

function renderTransactionsPage() {
  const txs = getFilteredTransactions();
  const sorted = [...txs].sort((a,b) => b.date.localeCompare(a.date));
  renderTransactionList('allTransactions', sorted, false);

  // Stats
  const count = sorted.length;
  const total = sorted.reduce((s,t) => s + (t.type==='income' ? t.amount : -t.amount), 0);
  document.getElementById('txCount').textContent = `${count} item${count !== 1 ? 's' : ''}`;
  document.getElementById('txTotal').textContent = formatCurrency(Math.abs(total));
}

// ============================================================
// RENDER: AI ADVISOR
// ============================================================

function renderAdvisor() {
  const allTxs  = appState.transactions;
  const now     = new Date();
  const sym     = appState.settings.currency;

  // Current month
  const curM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const curTxs = allTxs.filter(t => t.date.startsWith(curM));
  const curTotals = getTotals(curTxs);

  // Previous month
  const prevDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const prevM = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
  const prevTxs = allTxs.filter(t => t.date.startsWith(prevM));
  const prevTotals = getTotals(prevTxs);

  // Category breakdowns current month
  const expCatMap = {};
  curTxs.filter(t=>t.type==='expense').forEach(t => {
    const cat = getCategoryById(t.category);
    const name = cat ? cat.name : 'Other';
    expCatMap[name] = (expCatMap[name] || 0) + t.amount;
  });
  const prevExpCatMap = {};
  prevTxs.filter(t=>t.type==='expense').forEach(t => {
    const cat = getCategoryById(t.category);
    const name = cat ? cat.name : 'Other';
    prevExpCatMap[name] = (prevExpCatMap[name] || 0) + t.amount;
  });

  // Financial Health Score
  let score = 60;
  const components = [];

  // Savings rate score
  const savingsRate = curTotals.income > 0
    ? (curTotals.savings / curTotals.income) * 100 : 0;
  const savingsScore = clamp(Math.round(savingsRate * 2), 0, 30);
  components.push({ label: 'Savings Rate', value: savingsScore, max: 30, color: '#00e5a0' });

  // Expense control score (lower expense/income ratio is better)
  const expRatio = curTotals.income > 0
    ? curTotals.expense / curTotals.income : 1;
  const expCtrlScore = clamp(Math.round((1 - expRatio) * 25), 0, 25);
  components.push({ label: 'Expense Control', value: expCtrlScore, max: 25, color: '#0aefff' });

  // Income stability (has income this month)
  const incomeScore = curTotals.income > 0 ? 25 : 10;
  components.push({ label: 'Income', value: incomeScore, max: 25, color: '#ffca3a' });

  // Trend score (expense trending down is good)
  let trendScore = 10;
  if (prevTotals.expense > 0 && curTotals.expense < prevTotals.expense) trendScore = 20;
  if (prevTotals.expense > 0 && curTotals.expense > prevTotals.expense * 1.3) trendScore = 0;
  components.push({ label: 'Trend', value: trendScore, max: 20, color: '#ff4f7b' });

  score = components.reduce((s,c) => s+c.value, 0);

  // Render score
  const circumference = 2 * Math.PI * 50; // 314.16
  const offset = circumference - (score / 100) * circumference;
  const ringEl = document.getElementById('scoreRing');
  if (ringEl) {
    ringEl.style.strokeDashoffset = circumference;
    setTimeout(() => { ringEl.style.strokeDashoffset = offset; }, 200);
    if (score >= 70) ringEl.style.stroke = '#00e5a0';
    else if (score >= 40) ringEl.style.stroke = '#ffca3a';
    else ringEl.style.stroke = '#ff4f7b';
  }
  const scoreEl = document.getElementById('financialScore');
  if (scoreEl) scoreEl.textContent = score;

  // Score breakdown
  const breakdownEl = document.getElementById('scoreBreakdown');
  if (breakdownEl) {
    breakdownEl.innerHTML = components.map(c => `
      <div class="score-item">
        <div class="score-item-label">
          <span>${c.label}</span>
          <span style="color:${c.color}">${c.value}/${c.max}</span>
        </div>
        <div class="score-item-bar">
          <div class="score-item-fill" style="width:${(c.value/c.max)*100}%;background:${c.color}"></div>
        </div>
      </div>
    `).join('');
  }

  // Build insights
  const insights = [];

  // Spending increased vs previous month
  if (prevTotals.expense > 0) {
    const expChange = ((curTotals.expense - prevTotals.expense) / prevTotals.expense) * 100;
    if (expChange > 20) {
      insights.push({
        type:'bad', icon:'⚠️',
        title:'Spending Spike Detected',
        text:`Your expenses are up ${expChange.toFixed(1)}% compared to last month (${formatCurrency(prevTotals.expense, sym)} → ${formatCurrency(curTotals.expense, sym)}). Review your spending categories to find opportunities to cut back.`
      });
    } else if (expChange < -10) {
      insights.push({
        type:'good', icon:'🎯',
        title:'Spending Under Control',
        text:`Great job! Your expenses decreased by ${Math.abs(expChange).toFixed(1)}% compared to last month. Keep it up!`
      });
    }
  }

  // Income change
  if (prevTotals.income > 0) {
    const incChange = ((curTotals.income - prevTotals.income) / prevTotals.income) * 100;
    if (incChange < -15) {
      insights.push({
        type:'warn', icon:'📉',
        title:'Income Drop',
        text:`Your income this month (${formatCurrency(curTotals.income, sym)}) is ${Math.abs(incChange).toFixed(1)}% lower than last month (${formatCurrency(prevTotals.income, sym)}). Consider diversifying your income streams.`
      });
    } else if (incChange > 10) {
      insights.push({
        type:'good', icon:'📈',
        title:'Income Growing',
        text:`Your income increased by ${incChange.toFixed(1)}% compared to last month. Excellent progress!`
      });
    }
  }

  // Category spikes
  const foodCur  = expCatMap['Food & Dining'] || 0;
  const foodPrev = prevExpCatMap['Food & Dining'] || 0;
  if (foodCur > 300 || (foodPrev > 0 && foodCur > foodPrev * 1.4)) {
    insights.push({
      type:'warn', icon:'🍔',
      title:'High Food Spending',
      text:`You've spent ${formatCurrency(foodCur, sym)} on Food & Dining this month${foodPrev > 0 ? `, up ${((foodCur-foodPrev)/foodPrev*100).toFixed(0)}% from last month` : ''}. Meal prepping or cooking at home more often can reduce this significantly.`
    });
  }

  // Savings insight
  if (savingsRate < 10 && curTotals.income > 0) {
    insights.push({
      type:'bad', icon:'💸',
      title:'Low Savings Rate',
      text:`Your savings rate is ${savingsRate.toFixed(1)}% this month. Financial experts recommend saving at least 20% of income. Try identifying your top 3 expense categories and reducing each by 10%.`
    });
  } else if (savingsRate >= 20 && curTotals.income > 0) {
    insights.push({
      type:'good', icon:'🏆',
      title:'Strong Savings Rate',
      text:`You're saving ${savingsRate.toFixed(1)}% of your income this month — above the recommended 20%. Consider investing the surplus in an index fund or emergency fund.`
    });
  }

  // No income recorded
  if (curTotals.income === 0) {
    insights.push({
      type:'info', icon:'💡',
      title:'No Income Recorded',
      text:`You haven't logged any income for this month yet. Make sure to record all income sources to get accurate insights and a meaningful financial health score.`
    });
  }

  // Entertainment spending
  const entCur = expCatMap['Entertainment'] || 0;
  if (entCur > 150) {
    insights.push({
      type:'info', icon:'🎮',
      title:'Entertainment Spending',
      text:`You've spent ${formatCurrency(entCur, sym)} on entertainment this month. This is fine if it fits your budget, but consider whether any subscriptions or services could be cancelled.`
    });
  }

  // General tip if few insights
  if (insights.length < 2) {
    insights.push({
      type:'info', icon:'💡',
      title:'Pro Tip: Track Consistently',
      text:`The more transactions you log, the better your financial insights become. Try to record every expense and income — even small ones. Your spending patterns will become clearer over time.`
    });
  }

  // Render insights
  const insightsEl = document.getElementById('advisorInsights');
  if (insightsEl) {
    insightsEl.innerHTML = insights.map(ins => `
      <div class="insight-card ${ins.type}">
        <div class="insight-icon">${ins.icon}</div>
        <div class="insight-body">
          <div class="insight-title">${ins.title}</div>
          <div class="insight-text">${ins.text}</div>
        </div>
      </div>
    `).join('');
  }

  // Goals
  renderGoals();
}

// ============================================================
// RENDER: GOALS
// ============================================================

function renderGoals() {
  const el = document.getElementById('goalsList');
  if (!el) return;
  if (appState.goals.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:20px 0"><div class="empty-icon">🎯</div>No goals set yet.</div>';
    return;
  }
  el.innerHTML = appState.goals.map(g => {
    const pct = g.target > 0 ? clamp((g.current / g.target) * 100, 0, 100) : 0;
    return `<div class="goal-item">
      <div class="goal-header">
        <span class="goal-name">${escapeHtml(g.name)}</span>
        <button class="goal-delete-btn" data-goal-delete="${g.id}">✕</button>
      </div>
      <div class="goal-bar-wrap">
        <div class="goal-bar" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="goal-amounts">${formatCurrency(g.current)} / ${formatCurrency(g.target)}</span>
        <span class="goal-pct">${pct.toFixed(1)}%</span>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// RENDER: SETTINGS
// ============================================================

function renderSettings() {
  document.getElementById('userName').value      = appState.settings.name     || '';
  document.getElementById('currencySymbol').value = appState.settings.currency || '$';
  document.getElementById('hostedUrl').value     = appState.settings.hostedUrl || '';
  renderCategoriesList();
}

function renderCategoriesList() {
  const el = document.getElementById('categoriesList');
  if (!el) return;
  el.innerHTML = appState.categories.map(c => `
    <div class="cat-item">
      <span class="cat-emoji">${c.emoji || '📦'}</span>
      <span class="cat-name">${escapeHtml(c.name)}</span>
      <span class="cat-type ${c.type}">${c.type}</span>
      <button class="cat-del-btn" data-cat-delete="${c.id}" title="Delete category">✕</button>
    </div>
  `).join('');
}

// ============================================================
// FILTER SYNC: both filter bars stay in sync
// ============================================================

function syncFiltersToUI() {
  const f = appState.filters;
  const safe = id => { const el = document.getElementById(id); return el; };

  [['filterPeriod','txFilterPeriod']].forEach(([a,b]) => {
    const v = f.period;
    if(safe(a)) safe(a).value = v;
    if(safe(b)) safe(b).value = v;
  });
  [['filterType','txFilterType']].forEach(([a,b]) => {
    if(safe(a)) safe(a).value = f.type;
    if(safe(b)) safe(b).value = f.type;
  });
  [['filterCategory','txFilterCategory']].forEach(([a,b]) => {
    if(safe(a)) safe(a).value = f.category;
    if(safe(b)) safe(b).value = f.category;
  });
  // Show/hide custom date
  const cg = document.getElementById('customDateGroup');
  if (cg) cg.style.display = f.period === 'custom' ? 'flex' : 'none';
  if(safe('filterFrom')) safe('filterFrom').value = f.from;
  if(safe('filterTo')) safe('filterTo').value = f.to;
}

function populateCategoryFilters() {
  const options = `<option value="all">All Categories</option>` +
    appState.categories.map(c =>
      `<option value="${c.id}">${c.emoji || ''} ${c.name}</option>`
    ).join('');
  ['filterCategory','txFilterCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = options;
  });
}

// ============================================================
// UPDATE: full state re-render
// ============================================================

function updateAll() {
  populateCategoryFilters();
  syncFiltersToUI();
  renderDashboard();
  renderTransactionsPage();
}

// ============================================================
// TRANSACTION MODAL
// ============================================================

function openTxModal(txId) {
  const modal = document.getElementById('txModal');
  appState.editingTxId = txId || null;

  // Title
  document.getElementById('txModalTitle').textContent = txId ? 'Edit Transaction' : 'Add Transaction';

  // Populate category selects
  const catSelect = document.getElementById('txCategory');
  catSelect.innerHTML = appState.categories.map(c =>
    `<option value="${c.id}">${c.emoji || ''} ${c.name}</option>`
  ).join('');

  // Currency symbol
  document.getElementById('modalCurrencySymbol').textContent = appState.settings.currency || '$';

  if (txId) {
    // Edit mode: fill fields
    const tx = appState.transactions.find(t => t.id === txId);
    if (tx) {
      setTypeToggle(tx.type);
      document.getElementById('txAmount').value      = tx.amount;
      document.getElementById('txDate').value        = tx.date;
      document.getElementById('txDescription').value = tx.description;
      document.getElementById('txNotes').value       = tx.notes || '';
      catSelect.value = tx.category;
    }
  } else {
    // New transaction defaults
    setTypeToggle('expense');
    document.getElementById('txAmount').value      = '';
    document.getElementById('txDate').value        = today();
    document.getElementById('txDescription').value = '';
    document.getElementById('txNotes').value       = '';
  }

  modal.classList.add('open');
  setTimeout(() => document.getElementById('txAmount').focus(), 300);
}

function closeTxModal() {
  document.getElementById('txModal').classList.remove('open');
  appState.editingTxId = null;
}

function setTypeToggle(type) {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

function getCurrentType() {
  const active = document.querySelector('.type-btn.active');
  return active ? active.dataset.type : 'expense';
}

function saveTxModal() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  const date   = document.getElementById('txDate').value;
  const desc   = document.getElementById('txDescription').value.trim();
  const notes  = document.getElementById('txNotes').value.trim();
  const cat    = document.getElementById('txCategory').value;
  const type   = getCurrentType();

  if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
  if (!date)   { showToast('Please select a date', 'error'); return; }
  if (!desc)   { showToast('Please add a description', 'error'); return; }

  if (appState.editingTxId) {
    // Edit existing
    const tx = appState.transactions.find(t => t.id === appState.editingTxId);
    if (tx) {
      tx.type = type; tx.amount = amount; tx.date = date;
      tx.description = desc; tx.notes = notes; tx.category = cat;
    }
    showToast('Transaction updated', 'success');
  } else {
    // Add new
    appState.transactions.push({ id: genId(), type, amount, date, description: desc, notes, category: cat });
    showToast('Transaction added', 'success');
  }

  // Sort
  appState.transactions.sort((a,b) => b.date.localeCompare(a.date));
  saveData();
  closeTxModal();
  updateAll();
}

// ============================================================
// DELETE TRANSACTION
// ============================================================

function confirmDeleteTx(txId) {
  appState.deletingTxId = txId;
  document.getElementById('confirmModal').classList.add('open');
}

function executeDeleteTx() {
  if (!appState.deletingTxId) return;
  appState.transactions = appState.transactions.filter(t => t.id !== appState.deletingTxId);
  appState.deletingTxId = null;
  saveData();
  document.getElementById('confirmModal').classList.remove('open');
  updateAll();
  showToast('Transaction deleted', 'info');
}

// ============================================================
// CATEGORIES MANAGEMENT
// ============================================================

function addCategory() {
  const nameEl = document.getElementById('newCategoryName');
  const typeEl = document.getElementById('newCategoryType');
  const name = nameEl.value.trim();
  if (!name) { showToast('Enter a category name', 'error'); return; }
  if (appState.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    showToast('Category already exists', 'error'); return;
  }
  const emoji = getEmojiForCategory(name);
  appState.categories.push({
    id:    name.toLowerCase().replace(/\s+/g,'-') + '-' + genId().slice(0,4),
    name,
    emoji,
    type:  typeEl.value
  });
  nameEl.value = '';
  saveData();
  renderCategoriesList();
  populateCategoryFilters();
  showToast(`Category "${name}" added`, 'success');
}

function deleteCategory(id) {
  const cat = appState.categories.find(c => c.id === id);
  if (!cat) return;
  appState.categories = appState.categories.filter(c => c.id !== id);
  saveData();
  renderCategoriesList();
  populateCategoryFilters();
  showToast(`Category removed`, 'info');
}

function getEmojiForCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('food') || n.includes('eat') || n.includes('dining')) return '🍔';
  if (n.includes('transport') || n.includes('car') || n.includes('travel')) return '🚗';
  if (n.includes('shop') || n.includes('cloth')) return '🛍️';
  if (n.includes('bill') || n.includes('util') || n.includes('electric')) return '💡';
  if (n.includes('health') || n.includes('med') || n.includes('gym')) return '❤️';
  if (n.includes('entertain') || n.includes('game') || n.includes('movie')) return '🎮';
  if (n.includes('education') || n.includes('book') || n.includes('course')) return '📚';
  if (n.includes('salary') || n.includes('wage')) return '💼';
  if (n.includes('freelance')) return '💻';
  if (n.includes('invest')) return '📈';
  if (n.includes('saving')) return '🏦';
  return '📦';
}

// ============================================================
// SETTINGS: SAVE PROFILE
// ============================================================

function saveSettings() {
  appState.settings.name     = document.getElementById('userName').value.trim();
  appState.settings.currency = document.getElementById('currencySymbol').value.trim() || '$';
  appState.settings.hostedUrl= document.getElementById('hostedUrl').value.trim();
  saveData();
  updateAll();
  showToast('Settings saved', 'success');
}

// ============================================================
// EXPORT / IMPORT
// ============================================================

function exportData() {
  const data = {
    version:      '1.0',
    exported:     new Date().toISOString(),
    transactions: appState.transactions,
    categories:   appState.categories,
    settings:     appState.settings,
    goals:        appState.goals
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `finance-x-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.transactions) { showToast('Invalid backup file', 'error'); return; }
      appState.transactions = data.transactions || [];
      appState.categories   = data.categories   || [...DEFAULT_CATEGORIES];
      appState.goals        = data.goals         || [];
      if (data.settings) Object.assign(appState.settings, data.settings);
      saveData();
      updateAll();
      renderSettings();
      showToast('Data imported successfully', 'success');
    } catch(err) {
      showToast('Failed to parse backup file', 'error');
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) return;
  appState.transactions = [];
  appState.categories   = [...DEFAULT_CATEGORIES];
  appState.goals        = [];
  appState.settings     = { name: '', currency: '$', hostedUrl: '' };
  saveData();
  updateAll();
  renderSettings();
  showToast('All data reset', 'info');
}

// ============================================================
// QR CODE
// ============================================================

function generateQR() {
  const url = document.getElementById('hostedUrl').value.trim();
  if (!url) { showToast('Please enter a hosted URL first', 'error'); return; }
  appState.settings.hostedUrl = url;
  saveData();
  const canvas = document.getElementById('qrCanvas');
  QRCode.toCanvas(canvas, url, {
    width: 180,
    margin: 1,
    color: { dark: '#f0f0f8', light: '#16161f' }
  }, err => {
    if (err) showToast('QR generation failed', 'error');
    else showToast('QR code generated', 'success');
  });
}

// ============================================================
// PWA / INSTALL
// ============================================================

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const btn1 = document.getElementById('installBtn');
  const btn2 = document.getElementById('installActionBtn');
  const hint = document.getElementById('installHint');
  if (btn1) btn1.style.display = 'flex';
  if (btn2) btn2.style.display = 'flex';
  if (hint) hint.style.display = 'none';
});

function triggerInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') showToast('App installed!', 'success');
    deferredPrompt = null;
    const btn1 = document.getElementById('installBtn');
    const btn2 = document.getElementById('installActionBtn');
    if (btn1) btn1.style.display = 'none';
    if (btn2) btn2.style.display = 'none';
  });
}

// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('[Finance X] Service Worker registered:', reg.scope);
    }).catch(err => {
      console.warn('[Finance X] SW registration failed:', err);
    });
  });
}

// ============================================================
// TOAST
// ============================================================

let toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type || ''}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ============================================================
// NAVIGATION
// ============================================================

function navigateTo(page) {
  // Update pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  // Update nav buttons
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  // Render page-specific content
  if (page === 'dashboard')    renderDashboard();
  if (page === 'transactions') renderTransactionsPage();
  if (page === 'advisor')      renderAdvisor();
  if (page === 'settings')     renderSettings();
}

// ============================================================
// GOALS MODAL
// ============================================================

function openGoalModal() {
  document.getElementById('goalName').value    = '';
  document.getElementById('goalTarget').value  = '';
  document.getElementById('goalCurrent').value = '';
  document.getElementById('goalModal').classList.add('open');
}

function saveGoal() {
  const name    = document.getElementById('goalName').value.trim();
  const target  = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  if (!name)            { showToast('Enter a goal name', 'error'); return; }
  if (!target || target <= 0) { showToast('Enter a valid target', 'error'); return; }
  appState.goals.push({ id: genId(), name, target, current });
  saveData();
  document.getElementById('goalModal').classList.remove('open');
  renderGoals();
  showToast('Goal added', 'success');
}

// ============================================================
// EVENT LISTENERS: WIRE EVERYTHING UP
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ===== SPLASH =====
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    document.getElementById('splash').style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
    }, 400);
  }, 1400);

  // ===== LOAD DATA =====
  loadData();
  updateAll();

  // ===== BOTTOM NAV =====
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // FAB add button
  document.getElementById('fabAddBtn').addEventListener('click', () => openTxModal());

  // Header settings button
  document.getElementById('settingsNavBtn').addEventListener('click', () => navigateTo('settings'));

  // ===== FILTER EVENTS (Dashboard) =====
  document.getElementById('filterPeriod').addEventListener('change', e => {
    appState.filters.period = e.target.value;
    const cg = document.getElementById('customDateGroup');
    cg.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    syncFiltersToUI();
    updateAll();
  });
  document.getElementById('filterType').addEventListener('change', e => {
    appState.filters.type = e.target.value;
    syncFiltersToUI(); updateAll();
  });
  document.getElementById('filterCategory').addEventListener('change', e => {
    appState.filters.category = e.target.value;
    syncFiltersToUI(); updateAll();
  });
  document.getElementById('filterFrom').addEventListener('change', e => {
    appState.filters.from = e.target.value; updateAll();
  });
  document.getElementById('filterTo').addEventListener('change', e => {
    appState.filters.to = e.target.value; updateAll();
  });

  // ===== FILTER EVENTS (Transactions page) =====
  document.getElementById('txFilterPeriod').addEventListener('change', e => {
    appState.filters.period = e.target.value;
    syncFiltersToUI(); updateAll();
  });
  document.getElementById('txFilterType').addEventListener('change', e => {
    appState.filters.type = e.target.value;
    syncFiltersToUI(); updateAll();
  });
  document.getElementById('txFilterCategory').addEventListener('change', e => {
    appState.filters.category = e.target.value;
    syncFiltersToUI(); updateAll();
  });

  // ===== SEARCH =====
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  searchInput.addEventListener('input', e => {
    appState.filters.search = e.target.value;
    clearSearch.style.display = e.target.value ? 'block' : 'none';
    renderTransactionsPage();
  });
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    appState.filters.search = '';
    clearSearch.style.display = 'none';
    renderTransactionsPage();
  });

  // ===== TREND TABS =====
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.trendPeriod = btn.dataset.trend;
      renderTrendChart(getFilteredTransactions());
    });
  });

  // ===== VIEW ALL BUTTON =====
  document.getElementById('viewAllBtn').addEventListener('click', () => navigateTo('transactions'));

  // ===== ADD TRANSACTION BUTTON =====
  document.getElementById('addTransactionBtn').addEventListener('click', () => openTxModal());

  // ===== TRANSACTION LIST CLICKS (delegation) =====
  ['recentTransactions','allTransactions'].forEach(listId => {
    document.getElementById(listId).addEventListener('click', e => {
      const editBtn   = e.target.closest('[data-edit]');
      const deleteBtn = e.target.closest('[data-delete]');
      if (editBtn)   openTxModal(editBtn.dataset.edit);
      if (deleteBtn) confirmDeleteTx(deleteBtn.dataset.delete);
    });
  });

  // ===== TRANSACTION MODAL =====
  document.getElementById('txModalClose').addEventListener('click', closeTxModal);
  document.getElementById('txCancelBtn').addEventListener('click', closeTxModal);
  document.getElementById('txSaveBtn').addEventListener('click', saveTxModal);
  document.getElementById('txModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeTxModal();
  });

  // Type toggle buttons
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTypeToggle(btn.dataset.type);
      // Repopulate categories based on type
      const catSelect = document.getElementById('txCategory');
      const type = btn.dataset.type;
      catSelect.innerHTML = appState.categories
        .filter(c => c.type === type || c.type === 'both')
        .map(c => `<option value="${c.id}">${c.emoji || ''} ${c.name}</option>`)
        .join('');
    });
  });

  // ===== CONFIRM DELETE MODAL =====
  document.getElementById('confirmClose').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    appState.deletingTxId = null;
  });
  document.getElementById('confirmCancel').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    appState.deletingTxId = null;
  });
  document.getElementById('confirmDelete').addEventListener('click', executeDeleteTx);
  document.getElementById('confirmModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove('open');
      appState.deletingTxId = null;
    }
  });

  // ===== ADVISOR =====
  document.getElementById('refreshAdvisor').addEventListener('click', () => {
    renderAdvisor();
    showToast('Advisor refreshed', 'info');
  });

  // Goal modal
  document.getElementById('addGoalBtn').addEventListener('click', openGoalModal);
  document.getElementById('goalModalClose').addEventListener('click', () =>
    document.getElementById('goalModal').classList.remove('open'));
  document.getElementById('goalCancelBtn').addEventListener('click', () =>
    document.getElementById('goalModal').classList.remove('open'));
  document.getElementById('goalSaveBtn').addEventListener('click', saveGoal);
  document.getElementById('goalModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });

  // Goal delete delegation
  document.getElementById('goalsList').addEventListener('click', e => {
    const btn = e.target.closest('[data-goal-delete]');
    if (btn) {
      appState.goals = appState.goals.filter(g => g.id !== btn.dataset.goalDelete);
      saveData();
      renderGoals();
      showToast('Goal removed', 'info');
    }
  });

  // ===== SETTINGS =====
  // Auto-save profile on blur
  ['userName','currencySymbol'].forEach(id => {
    document.getElementById(id).addEventListener('blur', saveSettings);
  });

  // Categories
  document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
  document.getElementById('newCategoryName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addCategory();
  });
  document.getElementById('categoriesList').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat-delete]');
    if (btn) deleteCategory(btn.dataset.catDelete);
  });

  // Export / Import / Reset
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () =>
    document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', e => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', resetData);

  // QR Code
  document.getElementById('generateQrBtn').addEventListener('click', generateQR);
  document.getElementById('hostedUrl').addEventListener('blur', saveSettings);

  // Install buttons
  document.getElementById('installBtn').addEventListener('click', triggerInstall);
  document.getElementById('installActionBtn').addEventListener('click', triggerInstall);

  // Keyboard: close modals with Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m =>
        m.classList.remove('open'));
      appState.editingTxId  = null;
      appState.deletingTxId = null;
    }
  });

  // Amount input: allow only numeric
  document.getElementById('txAmount').addEventListener('input', e => {
    const v = e.target.value;
    if (v < 0) e.target.value = '';
  });

});
