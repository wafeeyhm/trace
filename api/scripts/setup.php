<?php
$config = require __DIR__ . '/../src/Config/env.php';
$host = $config['DB_HOST'];
$user = $config['DB_USER'];
$pass = $config['DB_PASS'];
$dbName = $config['DB_NAME'];

$action = $_GET['action'] ?? '';
$results = [];

if ($action) {
    $conn = new mysqli($host, $user, $pass);
    if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

    if ($action === 'initialize') {
        $conn->query("CREATE DATABASE IF NOT EXISTS $dbName");
        $conn->select_db($dbName);

        $tables = [
            "tenants" => "CREATE TABLE IF NOT EXISTS tenants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            "locations" => "CREATE TABLE IF NOT EXISTS locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )",
            "users" => "CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT,
                location_id INT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'manager', 'barista') DEFAULT 'barista',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
            )",
            "vendors" => "CREATE TABLE IF NOT EXISTS vendors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT,
                name VARCHAR(255) NOT NULL,
                contact_info VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )",
            "inventory_categories" => "CREATE TABLE IF NOT EXISTS inventory_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                name VARCHAR(100) NOT NULL,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )",
            "inventory_items" => "CREATE TABLE IF NOT EXISTS inventory_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                category_id INT,
                name VARCHAR(255) NOT NULL,
                purchase_unit VARCHAR(20) DEFAULT 'unit',
                usage_unit VARCHAR(20) DEFAULT 'unit',
                conversion_factor DECIMAL(10, 4) DEFAULT 1.0000,
                cost_per_unit DECIMAL(10, 4) DEFAULT 0.0000,
                stock_level DECIMAL(10, 2) DEFAULT 0.00,
                min_stock DECIMAL(10, 2) DEFAULT 5.00,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
            )",
            "menu_categories" => "CREATE TABLE IF NOT EXISTS menu_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                name VARCHAR(100) NOT NULL,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )",
            "menu_items" => "CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                category_id INT,
                vendor_id INT DEFAULT NULL,
                name VARCHAR(255) NOT NULL,
                image_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
            )",
            "menu_variants" => "CREATE TABLE IF NOT EXISTS menu_variants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                menu_item_id INT,
                name VARCHAR(100) NOT NULL,
                price DECIMAL(10, 2) DEFAULT 0.00,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
            )",
            "menu_recipes" => "CREATE TABLE IF NOT EXISTS menu_recipes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                menu_variant_id INT,
                inventory_item_id INT,
                quantity DECIMAL(10, 4) NOT NULL,
                FOREIGN KEY (menu_variant_id) REFERENCES menu_variants(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
            )",
            "orders" => "CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                total_amount DECIMAL(10, 2) NOT NULL,
                tax_amount DECIMAL(10, 2) DEFAULT 0.00,
                discount_amount DECIMAL(10, 2) DEFAULT 0.00,
                payment_type ENUM('cash', 'card', 'ewallet') DEFAULT 'cash',
                kds_status ENUM('pending', 'preparing', 'done') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )",
            "order_items" => "CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                menu_variant_id INT,
                quantity INT NOT NULL,
                unit_price DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_variant_id) REFERENCES menu_variants(id) ON DELETE CASCADE
            )",
            "inventory_logs" => "CREATE TABLE IF NOT EXISTS inventory_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_item_id INT,
                type ENUM('restock', 'waste', 'sale_deduction', 'adjustment') NOT NULL,
                change_amount DECIMAL(10, 4) NOT NULL,
                reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
            )",
            "expenses" => "CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                expense_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )",
            "taxes" => "CREATE TABLE IF NOT EXISTS taxes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_id INT,
                name VARCHAR(100) NOT NULL,
                rate DECIMAL(5, 2) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )"
        ];

        foreach ($tables as $name => $sql) {
            if ($conn->query($sql)) $results[] = ['task' => "Table: $name", 'status' => 'success', 'msg' => 'Verified'];
        }
    }

    if ($action === 'seed') {
        $conn->select_db($dbName);
        $conn->query("SET FOREIGN_KEY_CHECKS = 0;");
        $res = $conn->query("SHOW TABLES");
        while($row = $res->fetch_array()) $conn->query("TRUNCATE TABLE " . $row[0]);
        $conn->query("SET FOREIGN_KEY_CHECKS = 1;");

        // Seed Tenant & Location
        $conn->query("INSERT INTO tenants (name) VALUES ('Trace Group')");
        $tenantId = $conn->insert_id;
        $conn->query("INSERT INTO locations (tenant_id, name, address) VALUES ($tenantId, 'Main Street Cafe', '123 Coffee Lane')");
        $locId = $conn->insert_id;

        // Seed User (Password: password123)
        $passHash = password_hash('password123', PASSWORD_DEFAULT);
        $conn->query("INSERT INTO users (tenant_id, location_id, name, email, password_hash, role) VALUES ($tenantId, $locId, 'Admin User', 'admin@trace.pro', '$passHash', 'admin')");

        // Seed Categories
        $conn->query("INSERT INTO inventory_categories (location_id, name) VALUES ($locId, 'Raw Materials'), ($locId, 'Dairy'), ($locId, 'Packaging')");
        $conn->query("INSERT INTO menu_categories (location_id, name) VALUES ($locId, 'Coffee'), ($locId, 'Bakery'), ($locId, 'Cold Drinks')");

        // Seed Inventory
        $conn->query("INSERT INTO inventory_items (location_id, category_id, name, purchase_unit, usage_unit, conversion_factor, cost_per_unit, stock_level, min_stock) VALUES 
            ($locId, 1, 'Espresso Beans', 'kg', 'g', 1000, 0.025, 20000, 1000),
            ($locId, 2, 'Whole Milk', 'L', 'ml', 1000, 0.0018, 50000, 5000),
            ($locId, 1, 'Vanilla Syrup', 'bottle', 'shot', 25, 0.48, 250, 50),
            ($locId, 3, 'Paper Cup 12oz', 'sleeve', 'pcs', 50, 0.15, 500, 100)");

        // Seed Menu
        $conn->query("INSERT INTO menu_items (location_id, category_id, name) VALUES ($locId, 1, 'Caffe Latte'), ($locId, 1, 'Cappuccino'), ($locId, 2, 'Butter Croissant')");
        
        // Seed Variants
        $conn->query("INSERT INTO menu_variants (menu_item_id, name, price) VALUES 
            (1, 'Regular (12oz)', 4.50), (1, 'Large (16oz)', 5.50),
            (2, 'Standard', 4.80),
            (3, 'Classic', 3.50)");

        // Seed Recipes
        $conn->query("INSERT INTO menu_recipes (menu_variant_id, inventory_item_id, quantity) VALUES 
            (1, 1, 18), (1, 2, 250), (1, 4, 1),
            (2, 1, 24), (2, 2, 350), (2, 4, 1)");

        // Seed Taxes
        $conn->query("INSERT INTO taxes (location_id, name, rate) VALUES ($locId, 'Standard Service Charge', 10.00)");

        $results[] = ['task' => 'Trace Phase 5 Seeding', 'status' => 'success', 'msg' => 'Multi-tenant Data Loaded'];
    }

    if ($action === 'reset') {
        $conn->query("DROP DATABASE IF EXISTS $dbName");
        $results[] = ['task' => 'Nuke', 'status' => 'success', 'msg' => 'System Cleared'];
    }
    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><title>Trace Pro | Setup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #020617; color: #f8fafc; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-6 text-slate-100">
    <div class="glass max-w-2xl w-full rounded-3xl p-12 text-center shadow-2xl">
        <div class="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center mb-6 border border-accent/30 mx-auto"><i class="fas fa-crown text-4xl text-sky-400"></i></div>
        <h1 class="text-4xl font-black mb-2">Trace Pro</h1>
        <p class="text-slate-400 mb-10 uppercase text-[10px] font-bold tracking-[0.3em]">Management Console</p>

        <?php if ($results): ?>
            <div class="space-y-2 mb-8">
                <?php foreach ($results as $res): ?>
                    <div class="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold flex justify-between">
                        <span><?= $res['task'] ?></span><span class="<?= $res['status'] === 'success' ? 'text-emerald-400' : 'text-red-400' ?> uppercase"><?= $res['msg'] ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <div class="grid grid-cols-3 gap-4 mb-8">
            <a href="?action=initialize" class="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-sky-500 hover:text-slate-950 transition-all font-black uppercase text-[10px] tracking-widest group">
                <i class="fas fa-microchip block text-2xl mb-2 text-sky-400 group-hover:text-slate-950"></i>Init</a>
            <a href="?action=seed" class="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500 hover:text-slate-950 transition-all font-black uppercase text-[10px] tracking-widest group">
                <i class="fas fa-vial block text-2xl mb-2 text-emerald-400 group-hover:text-slate-950"></i>Seed</a>
            <a href="?action=reset" onclick="return confirm('Nuke DB?')" class="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest group">
                <i class="fas fa-radiation block text-2xl mb-2 text-red-500 group-hover:text-white"></i>Nuke</a>
        </div>
        <a href="../../pos/index.html" class="block w-full bg-white text-slate-950 py-4 rounded-xl font-black hover:scale-[1.02] transition-transform">Launch POS Terminal</a>
    </div>
</body>
</html>
