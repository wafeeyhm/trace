<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'trace_db';

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 1. Create vendors table
$sql1 = "CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
if ($conn->query($sql1) === TRUE) {
    echo "Table vendors created successfully\n";
} else {
    echo "Error creating table vendors: " . $conn->error . "\n";
}

// 2. Add vendor_id to menu_items
$sql2 = "ALTER TABLE menu_items ADD COLUMN vendor_id INT DEFAULT NULL";
if ($conn->query($sql2) === TRUE) {
    echo "Added vendor_id to menu_items successfully\n";
} else {
    echo "Error adding vendor_id: " . $conn->error . " (It might already exist)\n";
}

// 3. Add foreign key
$sql3 = "ALTER TABLE menu_items ADD CONSTRAINT fk_menu_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL";
if ($conn->query($sql3) === TRUE) {
    echo "Added foreign key successfully\n";
} else {
    echo "Error adding foreign key: " . $conn->error . "\n";
}

$conn->close();
?>
