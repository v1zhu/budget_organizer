const express = require('express');
const path = require('path');
const budget = require('./budget_core');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/api/entries', (req, res) => {
  res.json(budget.listEntries(req.query));
});

app.post('/api/entries', (req, res) => {
  const { type, amount, category, description, date } = req.body;
  const d = date || new Date().toISOString().slice(0, 10);
  let budgetCheck = null;
  if (type === 'expense') {
    budgetCheck = budget.checkBudget(category, amount, d.slice(5, 7), d.slice(0, 4));
  }
  const entry = budget.addEntry(type, amount, category, description, date);
  res.status(201).json({ entry, budgetCheck });
});

app.delete('/api/entries/:id', (req, res) => {
  if (budget.deleteEntry(Number(req.params.id))) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'not found' });
  }
});

app.get('/api/summary', (req, res) => {
  const summary = budget.getSummary(req.query);
  const total = Object.values(summary).reduce((s, v) => s + v, 0) || 1;
  const data = Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, pct: Math.round((value / total) * 1000) / 10 }));
  res.json(data);
});

app.get('/api/monthly', (req, res) => {
  const monthly = budget.getMonthlyTotals(req.query);
  const data = Object.entries(monthly).map(([month, total]) => ({ month, total }));
  res.json(data);
});

app.get('/api/categories/:type', (req, res) => {
  res.json(budget.getCategories(req.params.type));
});

app.get('/api/category-colors', (req, res) => {
  res.json(budget.getCategoryColors());
});

app.get('/api/budgets', (req, res) => {
  const budgets = budget.getBudgets();
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear());
  const enriched = {};
  for (const [cat, b] of Object.entries(budgets)) {
    const check = budget.checkBudget(cat, 0, m, y);
    enriched[cat] = { ...b, spent: check ? check.spent : 0, remaining: check ? check.remaining : b.limit };
  }
  res.json(enriched);
});

app.post('/api/budgets', (req, res) => {
  const { category, limit, warning } = req.body;
  res.json(budget.setBudget(category, limit, warning));
});

app.delete('/api/budgets/:category', (req, res) => {
  if (budget.deleteBudget(req.params.category)) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'not found' });
  }
});

app.get('/api/budgets/check', (req, res) => {
  const { category, amount, month, year } = req.query;
  res.json(budget.checkBudget(category, parseFloat(amount || 0), month, year));
});

app.get('/api/years', (req, res) => {
  res.json(budget.getYearRange());
});

app.get('/api/years/:year/months', (req, res) => {
  res.json(budget.getYearMonths(req.params.year));
});

app.listen(PORT, () => {
  console.log(`Budget web UI running at http://localhost:${PORT}`);
});
