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

---

## 🏛️ Architecture

```
trace/
├── pos/                        # Trace Pulse (POS Client)
│   ├── index.html              # Main POS — payment modal, offline banner
│   ├── kds.html                # Trace Kitchen (KDS) — standalone full-screen
│   ├── sw.js                   # Service Worker — offline caching
│   └── assets/
│       ├── css/
│       │   ├── style.css       # Themes incl. high-contrast + numpad styles
│       │   └── print.css       # Thermal receipt @media print (80mm)
│       └── js/
│           ├── core.js         # API fetching, isOnline flag, modal helpers
│           ├── offline-queue.js # LocalStorage order queue + auto-sync
│           ├── pos.js          # Payment flow, cart controls, grid rendering
│           └── kds.js          # KDS polling, timers, status updates
│
├── back-office/                # Trace Lens (Back Office Client)
│   ├── index.html              # Full ingredient/menu/analytics management
│   └── assets/js/back-office.js # CRUD, unit conversion, analytics
│
├── api/                        # Trace API (PHP MVC Backend)
│   ├── index.php               # Router — 16+ verified routes
│   └── src/
│       ├── Models/
│       │   ├── Inventory.php   # Unit conversion CRUD + restock logic
│       │   ├── Transaction.php # Order processing + KDS status + analytics
│       │   └── Menu.php        # Menu, variants, recipes
│       └── Controllers/
│           ├── InventoryController.php
│           └── TransactionController.php
│
└── api/scripts/
    ├── setup.php               # DB initialization + BND-ready seeding
    └── update_units_db.php     # Idempotent migration script
```

### API Endpoints
| Action | Method | Description |
|--------|--------|-------------|
| `get_menu` | GET | Menu items with variants and recipes |
| `get_inventory` | GET | Ingredients with stock, units, conversion factors |
| `add_inventory_item` | POST | Create ingredient with unit conversion |
| `update_inventory_item` | POST | Edit ingredient |
| `delete_inventory_item` | POST | Delete (with recipe safety check) |
| `restock_item` | POST | Add stock via purchase units (auto-converts) |
| `process_order` | POST | Atomic checkout + stock deduction + KDS queue |
| `get_pending_orders` | GET | KDS: all pending/preparing orders with items |
| `update_kds_status` | POST | KDS: pending → preparing → done |
| `get_analytics` | GET | Revenue, tax, expenses, net profit in BND |

---

## 📦 Setup & Installation

### Prerequisites
- XAMPP / WAMP with PHP 8.0+ and MySQL/MariaDB.

### Fresh Install
1. **Clone** into your `htdocs` directory.
2. **Configure**: Open `api/src/Config/env.php` and set your DB credentials.
3. **Initialize**: Visit `http://localhost/trace/api/scripts/setup.php`
   - Click **Init** → creates all tables
   - Click **Seed** → loads BND-priced cafe demo data
4. **Launch**:
   - POS: `http://localhost/trace/pos/`
   - KDS (tablet): `http://[your-ip]/trace/pos/kds.html`
   - Back Office: `http://localhost/trace/back-office/`

### Existing Database Migration
Run this once to apply schema updates without losing data:
```
http://localhost/trace/api/scripts/update_units_db.php
```

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
