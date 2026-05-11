<?php
$config = require __DIR__ . '/../src/Config/env.php';
$host = $config['DB_HOST'];
$user = $config['DB_USER'];
$pass = $config['DB_PASS'];
$dbName = $config['DB_NAME'];

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$vendors = [
    ['name' => 'Burger King', 'contact_info' => 'contact@bk.com'],
    ['name' => 'Pizza Hut', 'contact_info' => 'contact@pizzahut.com'],
    ['name' => 'KFC', 'contact_info' => 'contact@kfc.com'],
    ['name' => 'Subway', 'contact_info' => 'contact@subway.com'],
    ['name' => 'Taco Bell', 'contact_info' => 'contact@tacobell.com']
];

$vendorItems = [
    'Burger King' => [
        ['name' => 'Whopper', 'price' => 5.99],
        ['name' => 'Cheeseburger', 'price' => 2.99],
        ['name' => 'Fries', 'price' => 1.99],
        ['name' => 'Onion Rings', 'price' => 2.49],
        ['name' => 'Chicken Royale', 'price' => 4.99]
    ],
    'Pizza Hut' => [
        ['name' => 'Pepperoni Pizza', 'price' => 9.99],
        ['name' => 'Cheese Pizza', 'price' => 8.99],
        ['name' => 'Meat Lovers Pizza', 'price' => 11.99],
        ['name' => 'Breadsticks', 'price' => 3.99],
        ['name' => 'Wings', 'price' => 6.99]
    ],
    'KFC' => [
        ['name' => 'Original Recipe Chicken', 'price' => 6.99],
        ['name' => 'Zinger Burger', 'price' => 4.99],
        ['name' => 'Popcorn Chicken', 'price' => 3.99],
        ['name' => 'Mashed Potatoes', 'price' => 1.99],
        ['name' => 'Coleslaw', 'price' => 1.99]
    ],
    'Subway' => [
        ['name' => 'Italian B.M.T.', 'price' => 6.99],
        ['name' => 'Meatball Marinara', 'price' => 5.99],
        ['name' => 'Tuna', 'price' => 5.99],
        ['name' => 'Steak & Cheese', 'price' => 7.99],
        ['name' => 'Chocolate Chip Cookie', 'price' => 0.99]
    ],
    'Taco Bell' => [
        ['name' => 'Crunchy Taco', 'price' => 1.49],
        ['name' => 'Burrito Supreme', 'price' => 3.99],
        ['name' => 'Nachos BellGrande', 'price' => 4.99],
        ['name' => 'Quesadilla', 'price' => 3.49],
        ['name' => 'Crunchwrap Supreme', 'price' => 4.49]
    ]
];

// Ensure category exists
$catRes = $conn->query("SELECT id FROM menu_categories WHERE name = 'Vendor Items'");
if ($catRes->num_rows > 0) {
    $categoryId = $catRes->fetch_assoc()['id'];
} else {
    $conn->query("INSERT INTO menu_categories (name) VALUES ('Vendor Items')");
    $categoryId = $conn->insert_id;
}

$vendorsCount = 0;
$itemsCount = 0;

foreach ($vendors as $v) {
    $stmt = $conn->prepare("SELECT id FROM vendors WHERE name = ?");
    $stmt->bind_param("s", $v['name']);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($res->num_rows > 0) {
        $vendorId = $res->fetch_assoc()['id'];
    } else {
        $stmtInsert = $conn->prepare("INSERT INTO vendors (name, contact_info) VALUES (?, ?)");
        $stmtInsert->bind_param("ss", $v['name'], $v['contact_info']);
        $stmtInsert->execute();
        $vendorId = $stmtInsert->insert_id;
        $vendorsCount++;
    }

    if (isset($vendorItems[$v['name']])) {
        foreach ($vendorItems[$v['name']] as $item) {
            $stmtItem = $conn->prepare("SELECT id FROM menu_items WHERE name = ? AND vendor_id = ?");
            $stmtItem->bind_param("si", $item['name'], $vendorId);
            $stmtItem->execute();
            $resItem = $stmtItem->get_result();

            if ($resItem->num_rows > 0) {
                $menuItemId = $resItem->fetch_assoc()['id'];
            } else {
                $stmtInsertItem = $conn->prepare("INSERT INTO menu_items (category_id, vendor_id, name) VALUES (?, ?, ?)");
                $stmtInsertItem->bind_param("iis", $categoryId, $vendorId, $item['name']);
                $stmtInsertItem->execute();
                $menuItemId = $stmtInsertItem->insert_id;

                // Add variant
                $variantName = 'Standard';
                $stmtInsertVar = $conn->prepare("INSERT INTO menu_variants (menu_item_id, name, price) VALUES (?, ?, ?)");
                $stmtInsertVar->bind_param("isd", $menuItemId, $variantName, $item['price']);
                $stmtInsertVar->execute();
                $itemsCount++;
            }
        }
    }
}

echo "Successfully seeded $vendorsCount vendors and $itemsCount vendor menu items into the database.\n";

$conn->close();
?>
