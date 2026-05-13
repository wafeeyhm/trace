# Trace Pro: Cafe Digitalization Suite

> **A production-ready Cafe Management & POS Suite** built with PHP MVC, Vanilla JS, and MySQL. Designed for small cafes transitioning from paper-based tracking to a fully digital, offline-resilient workflow.

| System | Description | URL |
|--------|-------------|-----|
| **Trace Pulse** | POS terminal — tap-only, offline-capable, KDS-connected | `pos/` |
| **Trace Lens** | Back office — ingredient CRUD, unit conversion, analytics | `back-office/` |
| **Trace Kitchen** | Kitchen Display System — real-time order queue for iPad/tablet | `pos/kds.html` |
| **Trace API** | Centralized PHP MVC REST backend | `api/` |

---

## 🚀 Features

### ☕ Phase One — Digitalizing the Paper Trail
- **Unit Conversion System**: Track stock in usage units (grams, ml) while restocking in purchase units (kg, bags). The system converts automatically.
- **Ingredient CRUD**: Full Add / Edit / Delete / Restock management with recipe-dependency safety checks.
- **Live Unit Preview**: Ingredient modal shows "1 kg = 1000 g" live as you type.
- **Category Filter Bar**: Pill-style navigation for rapid menu browsing.
- **Low Stock Amber Glow**: Product buttons pulse amber when any recipe ingredient is below minimum.
- **BND $ Localization**: Fully localized for Brunei Dollar across all modules.

### ⚡ Phase Two — The Pulse (POS Interface)
- **Offline Resilience**: Service Worker caches menu data. A LocalStorage queue captures orders during WiFi outages and syncs automatically on reconnect.
- **Zero-Keyboard Checkout**: 3-stage tap-through payment flow (Method → Numpad → Confirm). No typing required during a rush.
- **On-Screen Numpad**: Cash tender entry with live change-due calculation.
- **Cart Quantity Controls**: `[−]` / `[+]` buttons on every cart line. No re-adding needed.
- **Kitchen Display System**: `kds.html` polls the API every 4 seconds. Order cards show elapsed timers (green → amber → red), START and DONE actions.
- **Thermal Receipt Printing**: `window.print()` with 80mm thermal-optimized `@media print` CSS. Auto-triggers on checkout.
- **High-Contrast Theme**: Gold-accent, near-black theme toggled from the sidebar. Persisted to localStorage.

### 🗑️ Phase Four — Waste & Leakage (Operational Loss)
- **Waste Mode Toggle**: Dedicated sidebar action in POS to switch into loss-logging mode.
- **One-Tap Reasons**: Log losses for "Dropped", "Burned", or "Expired" with a zero-keyboard modal.
- **Auto-Calculated Loss**: The system automatically calculates the cost of lost ingredients based on current supplier prices.
- **Operational Loss Reporting**: Real-time financial visibility into leakage via the "Operational Loss" card in the Back Office dashboard.

### 🧠 Phase Five — The Engine & Data Foundations (Core API)
- **Multi-Tenant Architecture**: Support for tiered hierarchy: **Tenants** (Organizations) > **Locations** (Branches) > **Users**.
- **Branch Isolation**: Every database query is cryptographically scoped to the user's specific location. Baristas in Branch A cannot view or modify data in Branch B.
- **Secure Authentication Service**: Session-based login system with role-based access control (Admin, Manager, Barista).
- **Scoped Recipe Engine**: Analytics, COGS, and Inventory deductions are all context-aware, ensuring financial precision across multiple branches.

---

## 🏛️ Architecture

```
trace/
├── pos/                        # Trace Pulse (POS Client)
│   ├── index.html              # Main POS — payment modal, waste mode, offline banner
│   ├── kds.html                # Trace Kitchen (KDS) — standalone full-screen
│   ├── sw.js                   # Service Worker — offline caching
│   └── assets/
│       ├── css/
│       │   ├── style.css       # Themes incl. high-contrast + waste mode active styles
│       │   └── print.css       # Thermal receipt @media print (80mm)
│       └── js/
│           ├── core.js         # API fetching, isOnline flag, modal helpers
│           ├── offline-queue.js # LocalStorage order queue + auto-sync
│           ├── pos.js          # Payment flow, cart controls, waste mode logic
│           └── kds.js          # KDS polling, timers, status updates
│
├── back-office/                # Trace Lens (Back Office Client)
│   ├── index.html              # Full ingredient/menu/analytics management
│   └── assets/js/back-office.js # CRUD, unit conversion, analytics, multi-branch reporting
│
├── api/                        # Trace API (PHP MVC Backend)
│   ├── index.php               # Router — Auth + Catalog + Inventory + Transaction
│   └── src/
│       ├── Models/
│       │   ├── Inventory.php   # Scoped unit conversion CRUD + restock logic
│       │   ├── Transaction.php # Scoped order processing + waste + analytics
│       │   ├── Menu.php        # Scoped menu, variants, recipes
│       │   ├── User.php        # Auth logic + context management
│       │   └── Vendor.php      # Tenant-level supplier tracking
│       └── Controllers/
│           ├── AuthController.php # Login, Logout, Session handling
│           ├── InventoryController.php
│           ├── TransactionController.php
│           └── CatalogController.php
│
└── api/scripts/
    └── setup.php               # DB initialization + Multi-tenant seeding
```

### API Endpoints
| Action | Method | Description |
|--------|--------|-------------|
| `login` | POST | Authenticate user and initialize session |
| `logout` | POST | Clear user session |
| `get_me` | GET | Retrieve current user context (Name, Role, Location) |
| `get_menu` | GET | Scoped: Menu items with variants and recipes |
| `get_inventory` | GET | Scoped: Ingredients with stock, units, conversion factors |
| `add_inventory_item` | POST | Scoped: Create ingredient with unit conversion |
| `update_inventory_item` | POST | Scoped: Edit ingredient |
| `delete_inventory_item` | POST | Scoped: Delete (with recipe safety check) |
| `restock_item` | POST | Scoped: Add stock via purchase units (auto-converts) |
| `process_order` | POST | Scoped: Atomic checkout + stock deduction + KDS queue |
| `add_waste` | POST | Scoped: Log operational loss and deduct inventory |
| `get_pending_orders` | GET | KDS: all pending/preparing orders for current location |
| `update_kds_status` | POST | KDS: pending → preparing → done |
| `get_analytics` | GET | Scoped: Revenue, COGS, Operational Loss, Tax, Expenses, Net Profit |

---

## 📦 Setup & Installation

### Prerequisites
- XAMPP / WAMP with PHP 8.0+ and MySQL/MariaDB.

### Fresh Install
1. **Clone** into your `htdocs` directory.
2. **Configure**: Open `api/src/Config/env.php` and set your DB credentials.
3. **Initialize**: Visit `http://localhost/trace/api/scripts/setup.php`
   - Click **Init** → creates all tables
   - Click **Seed** → loads Multi-tenant demo data
4. **Login**:
   - Default User: `admin@trace.pro`
   - Default Pass: `password123`

---

## ✅ Verification Status

| Feature | Status |
|---------|--------|
| BND $ currency — all modules | ✅ |
| Unit conversion — purchase → usage | ✅ |
| Ingredient CRUD with safety checks | ✅ |
| Low stock amber glow (POS) | ✅ |
| Offline queue + auto-sync | ✅ |
| Zero-keyboard 3-stage payment | ✅ |
| Cart `[+]`/`[−]` quantity controls | ✅ |
| KDS API polling (4s, cross-device) | ✅ |
| KDS order timers (green/amber/red) | ✅ |
| Thermal `window.print()` receipt | ✅ |
| High-contrast gold theme | ✅ |
| Dynamic COGS & Real-time margins | ✅ |
| Peak Hour sales distribution | ✅ |
| Operational Loss tracking (POS) | ✅ |
| Revenue vs. Operational Loss chart | ✅ |
| Multi-tenant hierarchy (Tenant/Location) | ✅ |
| Branch Isolation (Scoped Queries) | ✅ |
| Session-based Auth Service | ✅ |
| Mobile-responsive back office | ✅ |
