# Trace Pro - Professional POS & BI Suite

Trace Pro is a high-performance business management system designed to replicate the robust workflow of Loyverse. It features a modern Point-of-Sale (POS) terminal integrated with a relational Back Office for inventory, menu, and financial management.

## 🚀 Key Features

### 1. Trace Pulse (POS Terminal)
- **Digital Ticket System**: Real-time cart management with multi-item support.
- **Variant Engine**: Supports products with multiple sizes/prices (e.g., Small, Large).
- **Instant Receipts**: Digital receipt generation with order history tracking.

### 2. Trace Lens (Back Office Suite)
- **Automated Inventory Control**: Recipe-driven deduction and stock audit trails.
- **Financial Business Intelligence (BI)**: COGS tracking, margin analysis, and revenue trends.
- **Comprehensive Management**: Unified interface for Ingredients, Menu Setup, and Vendors.

### 3. Modular Architecture
- **Separated Systems**: Pulse and Lens operate as independent client applications.
- **Unified API**: A centralized MVC-based API handles all data orchestration.
- **Shared Aesthetics**: Consistent dark-mode premium design across all interfaces.

---

## 🛠️ System Architecture

### MVC API (`api/src/`)
The system follows a professional **Model-View-Controller** pattern:
- **Models**: Business logic and data access (SQL).
- **Controllers**: Request handling and response coordination.
- **Core**: Routing and Database connection management.

### Security
- **Protected Logic**: Internal source code is shielded from direct public access.
- **Credential Masking**: Sensitive database information is externalized to an environment configuration file (`env.php`).
- **Access Control**: Utilities and setup scripts are isolated in a protected directory.

---

## 📦 Setup & Installation

### Prerequisites
- XAMPP / WAMP / MAMP installed.
- PHP 8.0+ and MySQL/MariaDB running.

### Installation Steps
1. **Clone/Copy** the project folder into your `htdocs` directory.
2. **Configure Environment**:
   - Navigate to `api/src/Config/env.php`.
   - Update your database credentials if they differ from the defaults.
3. **Initialize Database**:
   - Open your browser and navigate to `http://localhost/trace/api/scripts/setup.php`.
   - Click **Init** to create the relational schema.
4. **Seeding Data**:
   - Click **Seed** in the setup console to load professional demonstration data.
5. **Launch Terminal**:
   - Navigate to `http://localhost/trace/` (automatically redirects to Trace Pulse).

---

## 📖 Modern Workflows

### Client-Server Interaction
Trace Pro uses a clean client-server model. Both **Trace Pulse** and **Trace Lens** make asynchronous requests to the Trace API, ensuring a fast and responsive user experience without page reloads.

### Secure Management
Administrative tools and database maintenance scripts are now centralized in the `api/scripts/` folder, allowing for better access control and security in production environments.

---

## 📋 Verification Plan
1. ✅ **MVC Logic**: Verify API actions return structured JSON through controllers.
2. ✅ **System Separation**: Ensure local assets for Pulse and Lens load correctly.
3. ✅ **Theme Sync**: Verify that theme settings selected in Lens persist to Pulse via shared localStorage logic.
4. ✅ **Security**: Confirm that internal files in `api/src/` are blocked from direct browser access.
