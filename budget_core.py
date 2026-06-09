import json
import os
from datetime import datetime
from collections import defaultdict

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "budget.json")

COLOR_PALETTE = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
    "#1abc9c", "#e67e22", "#34495e", "#e91e63", "#c0392b",
    "#27ae60", "#8e44ad", "#f1c40f", "#16a085", "#d35400",
    "#2980b9", "#7f8c8d", "#2c3e50", "#00bcd4", "#ff5722",
]

DEFAULT_CATEGORIES = {
    "expense": ["Groceries", "Clothes", "Rent", "Utilities", "Transport", "Entertainment", "Health", "Dining", "Other"],
    "earning": ["Salary", "Freelance", "Investments", "Gifts", "Other"]
}


def _load_data():
    if not os.path.exists(DATA_FILE):
        return {"entries": [], "category_colors": {}, "budgets": {}}
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def _save_data(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _ensure_category_color(data, category):
    if "category_colors" not in data:
        data["category_colors"] = {}
    if category not in data["category_colors"]:
        used = set(data["category_colors"].values())
        color = next((c for c in COLOR_PALETTE if c not in used), COLOR_PALETTE[len(data["category_colors"]) % len(COLOR_PALETTE)])
        data["category_colors"][category] = color
    return data["category_colors"][category]


def set_budget(category, limit, warning_margin):
    data = _load_data()
    if "budgets" not in data:
        data["budgets"] = {}
    data["budgets"][category] = {"limit": limit, "warning": warning_margin}
    _save_data(data)
    return data["budgets"][category]


def delete_budget(category):
    data = _load_data()
    if not data.get("budgets") or category not in data["budgets"]:
        return False
    del data["budgets"][category]
    _save_data(data)
    return True


def get_budgets():
    data = _load_data()
    return data.get("budgets", {})


def check_budget(category, new_amount, month=None, year=None):
    now = datetime.now()
    m = month or now.strftime("%m")
    y = year or now.strftime("%Y")
    data = _load_data()
    budget = data.get("budgets", {}).get(category)
    if not budget:
        return None
    current_total = sum(
        e["amount"] for e in data.get("entries", [])
        if e["type"] == "expense" and e["category"].lower() == category.lower() and e["date"].startswith(f"{y}-{m}")
    )
    new_total = current_total + new_amount
    remaining = budget["limit"] - new_total
    if new_total > budget["limit"]:
        status = "over"
    elif remaining <= budget["warning"]:
        status = "warning"
    else:
        status = "ok"
    return {"status": status, "spent": current_total, "limit": budget["limit"], "warning": budget["warning"], "remaining": remaining, "newTotal": new_total}


def add_entry(entry_type, amount, category, description="", date=None):
    data = _load_data()
    _ensure_category_color(data, category)
    entry = {
        "type": entry_type,
        "amount": amount,
        "category": category,
        "description": description,
        "date": date or datetime.now().strftime("%Y-%m-%d"),
        "id": len(data["entries"]) + 1 if data["entries"] else 1
    }
    if data["entries"]:
        entry["id"] = max(e["id"] for e in data["entries"]) + 1
    data["entries"].append(entry)
    _save_data(data)
    return entry


def delete_entry(entry_id):
    data = _load_data()
    before = len(data["entries"])
    data["entries"] = [e for e in data["entries"] if e["id"] != entry_id]
    if len(data["entries"]) == before:
        return False
    _save_data(data)
    return True


def list_entries(entry_type=None, category=None, month=None, year=None):
    data = _load_data()
    entries = data["entries"]
    if entry_type:
        entries = [e for e in entries if e["type"] == entry_type]
    if category:
        entries = [e for e in entries if e["category"].lower() == category.lower()]
    if month:
        entries = [e for e in entries if e["date"][5:7] == month.zfill(2)]
    if year:
        entries = [e for e in entries if e["date"][:4] == year]
    return sorted(entries, key=lambda e: e["date"], reverse=True)


def get_summary(entry_type=None, month=None, year=None):
    entries = list_entries(entry_type=entry_type, month=month, year=year)
    summary = defaultdict(float)
    for e in entries:
        summary[e["category"]] += e["amount"]
    return dict(summary)


def get_monthly_totals(entry_type=None, year=None):
    entries = list_entries(entry_type=entry_type, year=year)
    monthly = defaultdict(float)
    for e in entries:
        month_key = e["date"][:7]
        monthly[month_key] += e["amount"]
    return dict(sorted(monthly.items()))


def get_categories(entry_type):
    return DEFAULT_CATEGORIES.get(entry_type, [])


def get_category_colors():
    data = _load_data()
    return data.get("category_colors", {})


def get_year_range():
    data = _load_data()
    years = set(e["date"][:4] for e in data.get("entries", []))
    if not years:
        now = datetime.now()
        return {"min": now.strftime("%Y"), "max": now.strftime("%Y")}
    return {"min": min(years), "max": max(years)}


def get_year_months(year):
    data = _load_data()
    months = set(e["date"][5:7] for e in data.get("entries", []) if e["date"][:4] == year)
    return sorted(months)
