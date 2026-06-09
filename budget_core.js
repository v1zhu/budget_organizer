const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'budget.json');

const DEFAULT_CATEGORIES = {
  expense: ['Groceries', 'Clothes', 'Rent', 'Utilities', 'Transport', 'Entertainment', 'Health', 'Dining', 'Other'],
  earning: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'],
};

const COLOR_PALETTE = [
  '#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
  '#1abc9c','#e67e22','#34495e','#e91e63','#c0392b',
  '#27ae60','#8e44ad','#f1c40f','#16a085','#d35400',
  '#2980b9','#7f8c8d','#2c3e50','#00bcd4','#ff5722',
];

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { entries: [], category_colors: {}, budgets: {} };
  }
}

function saveData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function ensureCategoryColor(data, category) {
  if (!data.category_colors) data.category_colors = {};
  if (!data.category_colors[category]) {
    const used = Object.values(data.category_colors);
    const color = COLOR_PALETTE.find(c => !used.includes(c)) || COLOR_PALETTE[Object.keys(data.category_colors).length % COLOR_PALETTE.length];
    data.category_colors[category] = color;
  }
  return data.category_colors[category];
}

function setBudget(category, limit, warningMargin) {
  const data = loadData();
  if (!data.budgets) data.budgets = {};
  data.budgets[category] = { limit, warning: warningMargin };
  saveData(data);
  return data.budgets[category];
}

function deleteBudget(category) {
  const data = loadData();
  if (!data.budgets || !data.budgets[category]) return false;
  delete data.budgets[category];
  saveData(data);
  return true;
}

function getBudgets() {
  const data = loadData();
  return data.budgets || {};
}

function checkBudget(category, newAmount, month, year) {
  const now = new Date();
  const m = (month || String(now.getMonth() + 1).padStart(2, '0'));
  const y = year || String(now.getFullYear());
  const data = loadData();
  const budget = (data.budgets || {})[category];
  if (!budget) return null;
  const currentTotal = (data.entries || [])
    .filter(e => e.type === 'expense' && e.category.toLowerCase() === category.toLowerCase() && e.date.startsWith(`${y}-${m}`))
    .reduce((s, e) => s + e.amount, 0);
  const newTotal = currentTotal + newAmount;
  const remaining = budget.limit - newTotal;
  let status = 'ok';
  if (newTotal > budget.limit) status = 'over';
  else if (remaining <= budget.warning) status = 'warning';
  return { status, spent: currentTotal, limit: budget.limit, warning: budget.warning, remaining, newTotal };
}

function addEntry(type, amount, category, description = '', date = null) {
  const data = loadData();
  ensureCategoryColor(data, category);
  const maxId = data.entries.reduce((m, e) => Math.max(m, e.id), 0);
  const entry = {
    id: maxId + 1,
    type,
    amount,
    category,
    description,
    date: date || new Date().toISOString().slice(0, 10),
  };
  data.entries.push(entry);
  saveData(data);
  return entry;
}

function deleteEntry(id) {
  const data = loadData();
  const before = data.entries.length;
  data.entries = data.entries.filter(e => e.id !== id);
  if (data.entries.length === before) return false;
  saveData(data);
  return true;
}

function listEntries(opts = {}) {
  const data = loadData();
  let entries = data.entries;
  if (opts.type) entries = entries.filter(e => e.type === opts.type);
  if (opts.category) entries = entries.filter(e => e.category.toLowerCase() === opts.category.toLowerCase());
  if (opts.month) entries = entries.filter(e => e.date.slice(5, 7) === opts.month.padStart(2, '0'));
  if (opts.year) entries = entries.filter(e => e.date.slice(0, 4) === opts.year);
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

function getSummary(opts = {}) {
  const entries = listEntries(opts);
  const summary = {};
  for (const e of entries) {
    summary[e.category] = (summary[e.category] || 0) + e.amount;
  }
  return summary;
}

function getMonthlyTotals(opts = {}) {
  const entries = listEntries(opts);
  const monthly = {};
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    monthly[key] = (monthly[key] || 0) + e.amount;
  }
  return Object.fromEntries(Object.entries(monthly).sort());
}

function getCategories(type) {
  return DEFAULT_CATEGORIES[type] || [];
}

function getCategoryColors() {
  const data = loadData();
  return data.category_colors || {};
}

function getYearRange() {
  const data = loadData();
  const years = new Set(data.entries.map(e => e.date.slice(0, 4)));
  if (!years.size) return { min: String(new Date().getFullYear()), max: String(new Date().getFullYear()) };
  return { min: Math.min(...[...years].map(Number)).toString(), max: Math.max(...[...years].map(Number)).toString() };
}

function getYearMonths(year) {
  const data = loadData();
  const months = new Set(
    data.entries.filter(e => e.date.slice(0, 4) === year).map(e => e.date.slice(5, 7))
  );
  return [...months].sort();
}

module.exports = { addEntry, deleteEntry, listEntries, getSummary, getMonthlyTotals, getCategories, getCategoryColors, setBudget, deleteBudget, getBudgets, checkBudget, getYearRange, getYearMonths };
