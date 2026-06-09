#!/usr/bin/env node
const budget = require('./budget_core');

const args = process.argv.slice(2);
const cmd = args[0];

function help() {
  console.log(`
Usage:
  add <expense|earning> <amount> <category> [description] [--date YYYY-MM-DD]
  list [--type] [--category] [--month] [--year]
  summary [--type] [--month] [--year]
  monthly [--type] [--year]
  categories <expense|earning>
  delete <id>
  budget set <category> <limit> <warning>
  budget delete <category>
  budget list
`);
}

function parseOpts(start) {
  const opts = {};
  for (let i = start; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      opts[key] = args[++i] || true;
    }
  }
  return opts;
}

if (cmd === 'add') {
  const type = args[1], amount = parseFloat(args[2]), category = args[3], desc = args[4] || '';
  const opts = parseOpts(5);
  const date = opts.date || new Date().toISOString().slice(0, 10);
  if (type === 'expense') {
    const check = budget.checkBudget(category, amount, date.slice(5, 7), date.slice(0, 4));
    if (check && check.status !== 'ok') {
      if (check.status === 'over') console.log(`  >>> OVER BUDGET! Limit: $${check.limit}, Total: $${check.newTotal}`);
      else console.log(`  >>> WARNING: $${check.remaining} remaining before limit of $${check.limit}`);
    }
  }
  const entry = budget.addEntry(type, amount, category, desc, opts.date);
  console.log(`Added ${type}: $${amount.toFixed(2)} in [${category}] on ${entry.date}`);
} else if (cmd === 'list') {
  const opts = parseOpts(1);
  const entries = budget.listEntries(opts);
  if (!entries.length) { console.log('No entries found.'); process.exit(); }
  console.log('ID    Type     Date         Category           Amount      Description');
  console.log('-'.repeat(70));
  entries.forEach(e => console.log(
    `${String(e.id).padEnd(5)} ${e.type.padEnd(8)} ${e.date}  ${e.category.padEnd(16)} $${e.amount.toFixed(2).padStart(7)}  ${e.description}`
  ));
  const total = entries.reduce((s, e) => s + e.amount, 0);
  console.log('-'.repeat(70));
  console.log(`${'Total:'.padStart(50)} $${total.toFixed(2)}`);
} else if (cmd === 'summary') {
  const opts = parseOpts(1);
  const summary = budget.getSummary(opts);
  if (!Object.keys(summary).length) { console.log('No data.'); process.exit(); }
  const total = Object.values(summary).reduce((s, v) => s + v, 0);
  Object.entries(summary).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    console.log(`  ${cat.padEnd(18)} $${amt.toFixed(2).padStart(7)}  (${(amt/total*100).toFixed(1)}%)`);
  });
  console.log('-'.repeat(40));
  console.log(`  ${'Total'.padEnd(18)} $${total.toFixed(2)}`);
} else if (cmd === 'monthly') {
  const opts = parseOpts(1);
  const monthly = budget.getMonthlyTotals(opts);
  Object.entries(monthly).forEach(([m, t]) => console.log(`  ${m}   $${t.toFixed(2)}`));
} else if (cmd === 'categories') {
  budget.getCategories(args[1]).forEach(c => console.log(`  - ${c}`));
} else if (cmd === 'delete') {
  console.log(budget.deleteEntry(Number(args[1])) ? 'Deleted.' : 'Not found.');
} else if (cmd === 'budget') {
  const sub = args[1];
  if (sub === 'set') {
    const cat = args[2], limit = parseFloat(args[3]), warning = parseFloat(args[4]);
    budget.setBudget(cat, limit, warning);
    console.log(`Budget set: ${cat} limit=$${limit} warning=$${warning}`);
  } else if (sub === 'delete') {
    console.log(budget.deleteBudget(args[2]) ? `Budget deleted for ${args[2]}` : 'Not found.');
  } else if (sub === 'list') {
    const budgets = budget.getBudgets();
    if (!Object.keys(budgets).length) { console.log('No budgets set.'); process.exit(); }
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear());
    console.log('Category         Limit     Warning   Spent     Remaining');
    console.log('-'.repeat(55));
    for (const [cat, b] of Object.entries(budgets)) {
      const check = budget.checkBudget(cat, 0, m, y);
      const spent = check ? check.spent : 0;
      const rem = check ? check.remaining : b.limit;
      console.log(`${cat.padEnd(16)} $${String(b.limit).padStart(6)}  $${String(b.warning).padStart(6)}  $${String(spent).padStart(6)}  $${String(rem).padStart(6)}`);
    }
  } else {
    console.log('Usage: budget set|delete|list');
  }
} else {
  help();
}
