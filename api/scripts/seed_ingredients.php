<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'trace_db';

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$data = [
    ['Chaboys Matcha Powder Shizuko', 17.00, 100, 'g'],
    ['Chaboys Matcha Powder Rin', 27.00, 100, 'g'],
    ['Fresh Milk', 2.80, 1000, 'ml'],
    ['French Vanilla Monin syrup', 18.00, 700, 'ml'],
    ['Coke Zero', 1.05, 320, 'ml'],
    ['Monin Cheryy Syrup', 18.00, 700, 'ml'],
    ['Lemon Juice', 3.60, 270, 'ml'],
    ['Maraschino Cherries', 9.50, 200, 'g'],
    ['Ice Cubes', 1.50, 1500, 'g'],
    ['Cups', 3.80, 50, 'pc'],
    ['Lids', 1.80, 50, 'pc'],
    ['Straws', 2.50, 100, 'pc'],
    ['Cups, Lids, Straw', 15.00, 100, 'Set'],
    ['Oatside milk', 4.70, 1000, 'ml'],
    ['Nutrifres Strawberry', 6.00, 1000, 'ml'],
    ['Bonne Maman Strawberry Jam', 7.00, 370, 'g'],
    ['Harvey Fresh full cream milk', 2.80, 1000, 'ml'],
    ['Nestlé Ideal Full Cream Evaporated Milk', 1.50, 350, 'ml'],
    ['Sprite', 1.05, 320, 'ml'],
    ['Stickers', 20.80, 520, 'pc'],
    ['Rainfresh Super Oxygenated Water', 1.00, 1500, 'ml'],
    ['Ribena', 6.40, 1000, 'ml'],
    ['Nutrifres Peach', 6.00, 1000, 'ml'],
    ['Monin Wild Mint Syrup', 18.00, 700, 'ml'],
    ['Monin Peach Syrup', 18.00, 700, 'ml'],
    ['Monin Blue Zesty Orange Syrup', 18.00, 700, 'ml'],
    ['Ice cream soda', 1.05, 320, 'ml'],
    ['Nutrifres Blueberry', 6.00, 1000, 'ml'],
    ['Bonne Maman Blueberry Jam', 7.00, 370, 'g']
];

// Determine Category ID based on name
function getCategoryId($name) {
    $nameLower = strtolower($name);
    if (strpos($nameLower, 'milk') !== false) {
        return 2; // Dairy
    }
    if (strpos($nameLower, 'cup') !== false || strpos($nameLower, 'lid') !== false || strpos($nameLower, 'straw') !== false || strpos($nameLower, 'sticker') !== false) {
        return 3; // Packaging
    }
    return 1; // Raw Materials
}

$stmt = $conn->prepare("INSERT INTO inventory_items (category_id, name, unit, cost_per_unit, stock_level) VALUES (?, ?, ?, ?, ?)");

$count = 0;
foreach ($data as $item) {
    $name = $item[0];
    $price = $item[1];
    $qty = $item[2];
    $unit = $item[3];
    
    $categoryId = getCategoryId($name);
    $costPerUnit = $price / $qty;
    $stockLevel = $qty;

    $stmt->bind_param("issdd", $categoryId, $name, $unit, $costPerUnit, $stockLevel);
    if ($stmt->execute()) {
        $count++;
    }
}

echo "Successfully seeded $count ingredients into the database.\n";

$stmt->close();
$conn->close();
?>
