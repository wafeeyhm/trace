# Trace Pro

> **A professional Point-of-Sale & Business Intelligence Suite** built with PHP MVC, Vanilla JS, and MySQL.

Trace Pro is split into two independent client applications powered by a unified REST API:

| System | Description | URL |
|--------|-------------|-----|
| **Trace Pulse** | POS register terminal for order-taking and checkout | `pos/` |
| **Trace Lens** | Back office for inventory, menu, analytics, and settings | `back-office/` |
| **Trace API** | Centralized MVC REST backend serving both clients | `api/` |

---

## 🚀 Key Features

### Trace Pulse (POS)
- **Menu Grid**: Live product display populated from the API.
- **Variant Engine**: Products support multiple sizes/price tiers (e.g., Regular, Large).
- **Smart Cart**: Add items, auto-calculate tax, and process checkout.
- **Recipe-Driven Deduction**: Each sale automatically deducts raw ingredients from stock.
- **Instant Receipts**: Digital receipt generation on every successful order.

### Trace Lens (Back Office)
- **Ingredient Management**: Full CRUD for raw inventory items with low-stock alerts.
- **Menu Setup**: Manage products, variants, categories, and assign vendor sources.
- **Recipe Builder**: Define ingredient quantities per menu variant to drive COGS.
- **Menu Analysis**: Real-time Gross Profit and Margin % per item and variant.
- **Stock Audit Trail**: Full log of every stock movement (Sale, Restock, Adjustment).
- **Analytics Dashboard**: Revenue trends, tax collection, and net profit tracking.
- **Tax Management**: Toggle active taxes that apply automatically at checkout.
- **Expense Tracking**: Log operational expenses that feed into net profit calculations.
- **Vendor Management**: Track third-party suppliers for consignment menu items.
- **Theme Settings**: Switch between premium visual themes (Botanical, XAU, Cyber-Trace, Desert).

---

## 🏛️ Architecture

### Client-Server Model
Both clients are fully decoupled from the backend — they make async API calls and render data dynamically. No PHP is mixed into the frontend.

```
trace/
├── pos/                        # Trace Pulse (POS Client)
│   ├── index.html
│   └── assets/
│       ├── css/style.css
│       └── js/
│           ├── core.js         # Shared API fetching & state
│           ├── theme.js        # Theme persistence
│           └── pos.js          # POS-specific logic
│
├── back-office/                # Trace Lens (Back Office Client)
│   ├── index.html
│   └── assets/
│       ├── css/style.css
│       └── js/
│           ├── core.js
│           ├── theme.js
│           └── back-office.js  # Lens-specific logic
│
├── api/                        # Trace API (MVC Backend)
│   ├── index.php               # Front Controller + Router
│   ├── .htaccess               # Protects /src/ from direct access
│   ├── src/
│   │   ├── Config/
│   │   │   ├── Database.php    # Singleton PDO connection
│   │   │   └── env.php         # ⚠️ DB credentials (keep private)
│   │   ├── Core/
│   │   │   └── Router.php      # Action-based dispatcher
│   │   ├── Models/
│   │   │   ├── Menu.php        # Menu items, variants, categories
│   │   │   ├── Inventory.php   # Ingredients, stock, categories
│   │   │   ├── Transaction.php # Orders and analytics
│   │   │   ├── Recipe.php      # Variant ingredient mappings
│   │   │   ├── Vendor.php      # Supplier management
│   │   │   ├── Tax.php         # Tax rates
│   │   │   └── Expense.php     # Operational expenses
│   │   └── Controllers/
│   │       ├── BaseController.php
│   │       ├── MenuController.php
│   │       ├── InventoryController.php
│   │       ├── TransactionController.php
│   │       └── CatalogController.php
│   └── scripts/                # DB utilities (setup, seed, reset)
│       └── setup.php
│
└── index.html                  # Redirect → Trace Pulse
```

### Verified API Endpoints
| Action | Method | Description |
|--------|--------|-------------|
| `get_menu` | GET | All menu items with variants and recipes |
| `get_inventory` | GET | All ingredients with stock levels |
| `get_inventory_categories` | GET | Ingredient categories |
| `get_menu_categories` | GET | Menu product categories |
| `get_vendors` | GET | Supplier list |
| `get_taxes` | GET | Tax rates and active status |
| `get_expenses` | GET | Expense log |
| `get_analytics` | GET | Revenue, tax, expenses, net profit |
| `get_inventory_logs` | GET | Stock movement audit trail |
| `process_order` | POST | Checkout, deduct stock, log order |
| `restock_item` | POST | Add stock and log expense |
| `save_recipe` | POST | Update variant ingredient mappings |
| `toggle_tax` | POST | Toggle tax active/inactive |
| `add_expense` | POST | Log a new expense |

---

## 📦 Setup & Installation

### Prerequisites
- XAMPP / WAMP / MAMP with PHP 8.0+ and MySQL/MariaDB.

### Steps
1. **Clone** the project into your `htdocs` directory.
2. **Configure environment**:
   - Open `api/src/Config/env.php`.
   - Update `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` to match your local setup.
3. **Initialize the database**:
   - Visit `http://localhost/trace/api/scripts/setup.php`.
   - Click **Init** to create all tables, then **Seed** to load demo data.
4. **Launch**:
   - Visit `http://localhost/trace/` — auto-redirects to Trace Pulse.
   - Access Trace Lens at `http://localhost/trace/back-office/`.

---

## ✅ Verified Test Results

```
API ROUTES            9/9 passing ✅
MENU GRID             3 items, 4 variants loaded ✅
CHECKOUT              Order #1 processed successfully ✅
STOCK DEDUCTION       Espresso Beans: 20.00 → 19.96 after sale ✅
SECURITY              api/src/ blocked from direct access ✅
```
