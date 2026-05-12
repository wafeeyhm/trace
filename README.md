# Trace Pro: Cafe Digitalization Suite

> **A professional Cafe Management & Digital Inventory Suite** built with PHP MVC, Vanilla JS, and MySQL. Specialized for small cafes transitioning from paper-based tracking to a streamlined digital workflow.

Trace Pro is split into two independent client applications powered by a unified REST API:

| System | Description | URL |
|--------|-------------|-----|
| **Trace Pulse** | POS terminal with large-button grid, category filters, and live stock cues | `pos/` |
| **Trace Lens** | Back office for ingredient CRUD, unit conversion, and COGS analytics | `back-office/` |
| **Trace API** | Centralized MVC REST backend serving both clients | `api/` |

---

## 🚀 Key Features (Phase One: Paper to Digital)

### ☕ Trace Pulse (POS)
- **High-Visibility Grid**: Large, tappable product buttons designed for fast operation.
- **Category Filter Bar**: Pill-style navigation for quick access (Coffee, Bakery, Cold Drinks, etc.).
- **Low Stock "Amber Glow"**: Product buttons pulse with an amber warning if any recipe ingredients are below safety levels.
- **BND $ Localization**: Fully localized for Brunei Dollar (BND $) across all displays.
- **Variant Engine**: Supports multiple sizes/tiers per product with dedicated pricing.
- **Instant Receipts**: Digital receipt generation with BND formatting.

### 🔬 Trace Lens (Back Office)
- **Unit Conversion System**: Track inventory in **Usage Units** (grams, ml) while restocking in **Purchase Units** (kg, liters, bags).
- **Ingredient CRUD**: Full Add/Edit/Delete management for raw materials with recipe-dependency safety checks.
- **Live Unit Preview**: Visual "1 purchase = X usage" preview in modals to ensure conversion accuracy.
- **Recipe-Driven COGS**: Define precise usage amounts (e.g., 18g espresso) to drive automatic stock deduction.
- **Analytics Dashboard**: Revenue, tax collection, expenses, and net profit tracking in BND $.
- **Stock Audit Trail**: Full log of every stock movement (Sale, Restock, Adjustment).

---

## 🏛️ Architecture

### Client-Server Model
The frontend is fully decoupled from the backend. Clients make asynchronous API calls and render data dynamically using a centralized theme and core logic system.

```
trace/
├── pos/                        # Trace Pulse (POS Client)
│   ├── index.html
│   └── assets/
│       ├── css/style.css       # Includes low-stock amber animations
│       └── js/pos.js           # Grid rendering & category filtering
│
├── back-office/                # Trace Lens (Back Office Client)
│   ├── index.html
│   └── assets/js/back-office.js # Ingredient CRUD & Unit Conversion logic
│
├── api/                        # Trace API (MVC Backend)
│   ├── index.php               # Router with 12+ verified routes
│   └── src/
│       ├── Models/
│       │   ├── Inventory.php   # Handles Unit Conversion & CRUD
│       │   └── Transaction.php # Atomic stock deduction logic
│       └── Controllers/
│           └── InventoryController.php
│
└── api/scripts/                # DB utilities
    ├── setup.php               # BND-ready initialization & seeding
    └── update_units_db.php     # Migration for unit conversion schema
```

### Verified API Endpoints
| Action | Method | Description |
|--------|--------|-------------|
| `get_menu` | GET | All menu items with variants and recipes |
| `get_inventory` | GET | Ingredients with stock levels and units |
| `add_inventory_item` | POST | Create new ingredient with units/factor |
| `update_inventory_item` | POST | Edit existing ingredient and conversion factor |
| `delete_inventory_item` | POST | Delete ingredient (with recipe safety check) |
| `restock_item` | POST | Add stock via Purchase Units (multiplies by factor) |
| `get_analytics` | GET | Revenue, tax, expenses, net profit in BND |
| `process_order` | POST | Atomic checkout, stock deduction, and logging |

---

## 📦 Setup & Installation

### Prerequisites
- XAMPP / WAMP with PHP 8.0+ and MySQL/MariaDB.

### Steps
1. **Clone** the project into your `htdocs` directory.
2. **Configure environment**:
   - Open `api/src/Config/env.php`.
   - Update database credentials to match your local setup.
3. **Initialize & Seed**:
   - Visit `http://localhost/trace/api/scripts/setup.php`.
   - Click **Init** then **Seed** to load the BND-localized cafe dataset.
4. **Launch**:
   - POS: `http://localhost/trace/pos/`
   - Back Office: `http://localhost/trace/back-office/`

---

## ✅ Phase One Verification Status
- **BND Currency**: Verified across all modules ✅
- **Unit Conversion**: verified (1 bag = 1000g restock logic) ✅
- **Low Stock Glow**: Verified in POS grid ✅
- **Ingredient CRUD**: Verified with API safety checks ✅
