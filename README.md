# Budget Manager

Personal budget manager with a CLI and web UI. Tracks expenses and earnings by category, visualizes spending with charts, and supports per-category budget limits with warnings.

## Quick Start

```bash
cd budget_organizer
npm install
npm start        # web UI at http://localhost:5000
```

## CLI Usage

```bash
# Add entries
node cli.js add expense 25.50 Groceries "Milk and eggs"
node cli.js add expense 120 Clothes "New jacket" --date 2024-06-15
node cli.js add earning 5000 Salary "June pay"

# List entries
node cli.js list
node cli.js list --type expense --month 06 --year 2024

# Summary by category
node cli.js summary --type expense --month 06
node cli.js summary --type earning --year 2024

# Monthly totals
node cli.js monthly --type expense --year 2024

# Delete an entry
node cli.js delete 3
```

Python CLI also available: `python3 cli.py <command> ...`

## Budget Limits

Set per-category budgets with warning thresholds:

```bash
node cli.js budget set Clothes 200 20
node cli.js budget set Groceries 300 30
node cli.js budget list
node cli.js budget delete Clothes
```

When an expense approaches or exceeds the limit, a warning is shown on add:

```
$ node cli.js add expense 190 Clothes "Suit"
  >>> WARNING: $10 remaining before limit of $200
```

## Web UI

```
npm start
```

Opens at `http://localhost:5000`. Left sidebar shows all years with data -- click a year to expand months, click a month to view and add entries. Charts include:

- **Pie chart** -- expense breakdown by category
- **Doughnut chart** -- income vs expenses
- **Line chart** -- monthly trends
- **Scatter chart** -- individual expenses over time
- **Bar chart** -- year summary monthly breakdown

Budget progress bars show spending vs limit with green/yellow/red status.

## Data

All data stored in `data/budget.json`:

```json
{
  "entries": [
    { "id": 1, "type": "expense", "amount": 25.50, "category": "Groceries", "description": "Milk", "date": "2024-06-09" }
  ],
  "category_colors": { "Groceries": "#e74c3c" },
  "budgets": { "Groceries": { "limit": 300, "warning": 30 } }
}
```

## Categories

Default expense categories: Groceries, Clothes, Rent, Utilities, Transport, Entertainment, Health, Dining, Other

Default earning categories: Salary, Freelance, Investments, Gifts, Other
