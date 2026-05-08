<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'trace_db';

$action = $_GET['action'] ?? '';
$results = [];

if ($action) {
    $conn = new mysqli($host, $user, $pass);
    if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

    if ($action === 'initialize') {
        $conn->query("CREATE DATABASE IF NOT EXISTS $dbName");
        $conn->select_db($dbName);

        $tables = [
            "inventory_categories" => "CREATE TABLE IF NOT EXISTS inventory_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            )",
            "inventory_items" => "CREATE TABLE IF NOT EXISTS inventory_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT,
                name VARCHAR(255) NOT NULL,
                unit VARCHAR(20) DEFAULT 'unit',
                cost_per_unit DECIMAL(10, 4) DEFAULT 0.0000,
                stock_level DECIMAL(10, 2) DEFAULT 0.00,
                min_stock DECIMAL(10, 2) DEFAULT 5.00,
                FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
            )",
            "menu_categories" => "CREATE TABLE IF NOT EXISTS menu_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            )",
            "menu_items" => "CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT,
                name VARCHAR(255) NOT NULL,
                image_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL
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
                total_amount DECIMAL(10, 2) NOT NULL,
                tax_amount DECIMAL(10, 2) DEFAULT 0.00,
                discount_amount DECIMAL(10, 2) DEFAULT 0.00,
                payment_type ENUM('cash', 'card', 'ewallet') DEFAULT 'cash',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

        // Seed Categories
        $conn->query("INSERT INTO inventory_categories (name) VALUES ('Raw Materials'), ('Dairy'), ('Packaging')");
        $conn->query("INSERT INTO menu_categories (name) VALUES ('Coffee'), ('Bakery'), ('Cold Drinks')");

        // Seed Inventory
        $conn->query("INSERT INTO inventory_items (category_id, name, unit, cost_per_unit, stock_level) VALUES 
            (1, 'Espresso Beans', 'kg', 25.00, 20.0),
            (2, 'Whole Milk', 'L', 1.80, 50.0),
            (1, 'Vanilla Syrup', 'pcs', 12.00, 10.0),
            (3, 'Paper Cup 12oz', 'pcs', 0.15, 500.0)");

        // Seed Menu
        $conn->query("INSERT INTO menu_items (category_id, name) VALUES (1, 'Caffe Latte'), (1, 'Cappuccino'), (2, 'Croissant')");
        
        // Seed Variants
        $conn->query("INSERT INTO menu_variants (menu_item_id, name, price) VALUES 
            (1, 'Regular (12oz)', 4.00), (1, 'Large (16oz)', 5.00),
            (2, 'Standard', 3.95),
            (3, 'Classic', 3.50)");

        // Seed Recipes
        $conn->query("INSERT INTO menu_recipes (menu_variant_id, inventory_item_id, quantity) VALUES 
            (1, 1, 0.018), (1, 2, 0.250), (1, 4, 1.000),
            (2, 1, 0.024), (2, 2, 0.350), (2, 4, 1.000)");

        $results[] = ['task' => 'Loyverse Seeding', 'status' => 'success', 'msg' => 'Professional Data Loaded'];
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
    <meta charset="UTF-8"><title>Trace Pro | Back Office</title>
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
        <a href="index.html" class="block w-full bg-white text-slate-950 py-4 rounded-xl font-black hover:scale-[1.02] transition-transform">Launch POS Terminal</a>
    </div>
</body>
</html>
