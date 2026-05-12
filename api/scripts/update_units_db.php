<?php
$config = require __DIR__ . '/../src/Config/env.php';
$host = $config['DB_HOST'];
$user = $config['DB_USER'];
$pass = $config['DB_PASS'];
$dbName = $config['DB_NAME'];

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

echo "Running migrations for inventory units...\n";

// Add new columns to inventory_items
$queries = [
    "ALTER TABLE inventory_items ADD COLUMN purchase_unit VARCHAR(20) DEFAULT 'unit' AFTER name",
    "ALTER TABLE inventory_items ADD COLUMN usage_unit VARCHAR(20) DEFAULT 'unit' AFTER purchase_unit",
    "ALTER TABLE inventory_items ADD COLUMN conversion_factor DECIMAL(10, 4) DEFAULT 1.0000 AFTER usage_unit",
    // Phase Two: KDS status on orders
    "ALTER TABLE orders ADD COLUMN kds_status ENUM('pending', 'preparing', 'done') DEFAULT 'pending' AFTER payment_type",
];

echo "Running migrations...\n";

foreach ($queries as $sql) {
    try {
        if ($conn->query($sql)) {
            echo "OK: $sql\n";
        }
    } catch (Exception $e) {
        echo "Skipped (already exists): " . $conn->error . "\n";
    }
}

// Migrate existing 'unit' to 'purchase_unit' and 'usage_unit' if 'unit' column exists
$res = $conn->query("SHOW COLUMNS FROM inventory_items LIKE 'unit'");
if ($res && $res->num_rows > 0) {
    $conn->query("UPDATE inventory_items SET purchase_unit = unit, usage_unit = unit");
    $conn->query("ALTER TABLE inventory_items DROP COLUMN unit");
    echo "Migrated 'unit' to 'purchase_unit'/'usage_unit' and dropped 'unit'.\n";
}

echo "Migration complete.\n";
$conn->close();
?>
