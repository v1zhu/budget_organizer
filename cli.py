#!/usr/bin/env python3
import argparse
from datetime import datetime
from budget_core import add_entry, delete_entry, list_entries, get_summary, get_monthly_totals, get_categories, set_budget, delete_budget, get_budgets, check_budget


def cmd_add(args):
    if args.type == "expense":
        check = check_budget(args.category, args.amount, (args.date or datetime.now().strftime("%Y-%m-%d"))[5:7], (args.date or datetime.now().strftime("%Y-%m-%d"))[:4])
        if check and check["status"] != "ok":
            if check["status"] == "over":
                print(f"  >>> OVER BUDGET! Limit: ${check['limit']}, Total: ${check['newTotal']}")
            else:
                print(f"  >>> WARNING: ${check['remaining']} remaining before limit of ${check['limit']}")
    entry = add_entry(args.type, args.amount, args.category, args.description, args.date)
    print(f"Added {args.type}: ${args.amount:.2f} in [{args.category}] on {entry['date']}")


def cmd_list(args):
    entries = list_entries(args.type, args.category, args.month, args.year)
    if not entries:
        print("No entries found.")
        return
    print(f"{'ID':>4} {'Type':<8} {'Date':<12} {'Category':<18} {'Amount':>8}  Description")
    print("-" * 80)
    for e in entries:
        print(f"{e['id']:>4} {e['type']:<8} {e['date']:<12} {e['category']:<18} ${e['amount']:>6.2f}  {e['description']}")
    total = sum(e["amount"] for e in entries)
    print("-" * 80)
    print(f"{'Total:':>46} ${total:>6.2f}")


def cmd_summary(args):
    summary = get_summary(args.type, args.month, args.year)
    if not summary:
        print("No data for the given filters.")
        return
    total = sum(summary.values())
    label = f"{args.type}s" if args.type else "All"
    period = []
    if args.month:
        period.append(f"month {args.month}")
    if args.year:
        period.append(f"year {args.year}")
    period_str = f" for {', '.join(period)}" if period else ""
    print(f"\n{label} by category{period_str}:")
    print("-" * 40)
    for cat, amt in sorted(summary.items(), key=lambda x: -x[1]):
        pct = (amt / total) * 100 if total > 0 else 0
        print(f"  {cat:<18} ${amt:>7.2f}  ({pct:>5.1f}%)")
    print("-" * 40)
    print(f"  {'Total':<18} ${total:>7.2f}")


def cmd_monthly(args):
    monthly = get_monthly_totals(args.type, args.year)
    if not monthly:
        print("No data.")
        return
    label = f"{args.type}s" if args.type else "All"
    year_str = f" for {args.year}" if args.year else ""
    print(f"\nMonthly {label}{year_str}:")
    print("-" * 30)
    for m, amt in monthly.items():
        print(f"  {m}   ${amt:>7.2f}")


def cmd_categories(args):
    cats = get_categories(args.type)
    print(f"\n{args.type.capitalize()} categories:")
    for c in cats:
        print(f"  - {c}")


def cmd_delete(args):
    if delete_entry(args.id):
        print(f"Deleted entry #{args.id}")
    else:
        print(f"Entry #{args.id} not found.")


def cmd_budget(args):
    if args.budget_cmd == "set":
        set_budget(args.category, args.limit, args.warning)
        print(f"Budget set: {args.category} limit=${args.limit} warning=${args.warning}")
    elif args.budget_cmd == "delete":
        if delete_budget(args.category):
            print(f"Budget deleted for {args.category}")
        else:
            print("Not found.")
    elif args.budget_cmd == "list":
        budgets = get_budgets()
        if not budgets:
            print("No budgets set.")
            return
        now = datetime.now()
        m = now.strftime("%m")
        y = now.strftime("%Y")
        print(f"{'Category':<18} {'Limit':>8} {'Warning':>8} {'Spent':>8} {'Remaining':>8}")
        print("-" * 55)
        for cat, b in budgets.items():
            check = check_budget(cat, 0, m, y)
            spent = check["spent"] if check else 0
            rem = check["remaining"] if check else b["limit"]
            print(f"  {cat:<16} ${b['limit']:>6.0f}  ${b['warning']:>6.0f}  ${spent:>6.0f}  ${rem:>6.0f}")


def main():
    parser = argparse.ArgumentParser(description="Personal Budget Manager")
    sub = parser.add_subparsers(dest="command")

    p_add = sub.add_parser("add", help="Add an entry")
    p_add.add_argument("type", choices=["expense", "earning"])
    p_add.add_argument("amount", type=float)
    p_add.add_argument("category", type=str)
    p_add.add_argument("description", type=str, nargs="?", default="")
    p_add.add_argument("--date", "-d", default=datetime.now().strftime("%Y-%m-%d"))
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="List entries")
    p_list.add_argument("--type", choices=["expense", "earning"])
    p_list.add_argument("--category")
    p_list.add_argument("--month")
    p_list.add_argument("--year")
    p_list.set_defaults(func=cmd_list)

    p_sum = sub.add_parser("summary", help="Summary by category")
    p_sum.add_argument("--type", choices=["expense", "earning"])
    p_sum.add_argument("--month")
    p_sum.add_argument("--year")
    p_sum.set_defaults(func=cmd_summary)

    p_mon = sub.add_parser("monthly", help="Monthly totals")
    p_mon.add_argument("--type", choices=["expense", "earning"])
    p_mon.add_argument("--year")
    p_mon.set_defaults(func=cmd_monthly)

    p_cat = sub.add_parser("categories", help="List categories")
    p_cat.add_argument("type", choices=["expense", "earning"])
    p_cat.set_defaults(func=cmd_categories)

    p_del = sub.add_parser("delete", help="Delete an entry")
    p_del.add_argument("id", type=int)
    p_del.set_defaults(func=cmd_delete)

    p_budget = sub.add_parser("budget", help="Manage budgets")
    p_budget.add_argument("budget_cmd", choices=["set", "delete", "list"])
    p_budget.add_argument("category", nargs="?", default=None)
    p_budget.add_argument("limit", nargs="?", type=float, default=None)
    p_budget.add_argument("warning", nargs="?", type=float, default=None)
    p_budget.set_defaults(func=cmd_budget)

    args = parser.parse_args()
    if args.command:
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
