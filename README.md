# Trace Pro - Professional POS & BI Suite

Trace Pro is a high-performance business management system designed to replicate the robust workflow of Loyverse. It features a modern Point-of-Sale (POS) terminal integrated with a relational Back Office for inventory, menu, and financial management.

## 🚀 Key Features

### 1. Point-of-Sale (POS) Terminal
- **Digital Ticket System**: Real-time cart management with multi-item support.
- **Variant Engine**: Supports products with multiple sizes/prices (e.g., Small, Large).
- **Instant Receipts**: Digital receipt generation with order history tracking.

### 2. Automated Inventory Control
- **Recipe-Driven Deduction**: Every sale triggers an automatic deduction of raw ingredients based on pre-defined recipes.
- **Stock Audit Trail**: Comprehensive logs for every movement (Sale, Restock, Waste).
- **Low Stock Alerts**: Visual badges and indicators for items below safety thresholds.

### 3. Financial Business Intelligence (BI)
- **COGS Tracking**: Automatic calculation of Cost of Goods Sold for every menu item.
- **Profit Margin Analysis**: Real-time monitoring of Gross Profit and Margin % per item and variant.
- **Revenue Analytics**: Daily, Monthly, and Yearly revenue trends via interactive charts.

### 4. Back Office Suite
- **Comprehensive CRUD**: Manage Ingredients, Menu Items, and Categories through a unified interface.
- **Relational Organization**: Dual-category system for Inventory (Back of House) and Menu (Front of House).

### 5. Vendor Management
- **Third-Party Consignment**: Track which products are sourced from external vendors versus produced in-house.
- **Vendor Tracking**: Assign and manage third-party suppliers directly in the Back Office Menu Setup.

---

## 🛠️ System Architecture

### Database Schema (`trace_db`)
- `inventory_categories` & `menu_categories`: Granular categorization logic.
- `inventory_items`: Raw ingredients with cost and stock tracking.
- `vendors`: Third-party suppliers for consignment or pre-packaged goods.
- `menu_items`: Product listings mapped to categories and vendors.
- `menu_variants`: Specific sizes/versions of products with distinct pricing.
- `menu_recipes`: Relational map linking variants to specific ingredient quantities.
- `orders` & `order_items`: Transactional ledger.
- `inventory_logs`: Historical audit of all stock changes.

### Tech Stack
- **Backend**: PHP 8.x with PDO (MySQL/MariaDB).
- **Frontend**: Tailwind CSS, Chart.js, Vanilla JavaScript.
- **Design**: Dark-mode premium aesthetic with glassmorphism effects.

---

## 📦 Setup & Installation

### Prerequisites
- XAMPP / WAMP / MAMP installed.
- PHP 8.0+ and MySQL/MariaDB running.

### Installation Steps
1. **Clone/Copy** the project folder into your `htdocs` directory.
2. **Initialize Database**:
   - Open your browser and navigate to `http://localhost/trace/setup.php`.
   - Click **Init** to create all relational tables.
3. **Seeding Data**:
   - Run `php seed_ingredients.php` to load custom inventory items.
   - Run `php seed_menu.php` to load menu setups and their ingredient recipes.
   - Run `php seed_categories.php` to auto-categorize inventory.
4. **Launch Terminal**:
   - Navigate to `http://localhost/trace/index.html` to start using the system.

---

## 📖 Standard Workflows

### Setting up a Recipe
1. Enter the **Back Office** (Gear icon).
2. Go to **Menu Setup**.
3. Click the **Mortar & Pestle** icon for a product.
4. Add ingredients and specify the exact quantity used (e.g., 0.018 for beans).
5. Save the recipe. The **COGS** and **Margin %** will update instantly.

### Monitoring Performance
1. Visit the **Menu Analysis** tab to see which products have the highest margins.
2. Visit the **Analytics** page to track revenue growth over time.
3. Check **Stock Logs** to verify that sales are deducting the correct amount of inventory.

---

## 📋 Verification Plan
1. ✅ **POS Logic**: Add items, select variants, and process a charge.
2. ✅ **Auto-Deduction**: Verify stock levels decrease after a sale.
3. ✅ **Financials**: Verify that COGS is calculated correctly in Menu Analysis.
4. ✅ **Navigation**: Ensure smooth transitions between Register, Back Office, and Analytics.
