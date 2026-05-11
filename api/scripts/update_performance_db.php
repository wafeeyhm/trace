<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'trace_db';

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 1. Create taxes table
$sql1 = "CREATE TABLE IF NOT EXISTS taxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
if ($conn->query($sql1) === TRUE) {
    echo "Table taxes created successfully\n";
} else {
    echo "Error creating table taxes: " . $conn->error . "\n";
}

// 2. Create expenses table
$sql2 = "CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
if ($conn->query($sql2) === TRUE) {
    echo "Table expenses created successfully\n";
} else {
    echo "Error creating table expenses: " . $conn->error . "\n";
}

$conn->close();
?>
