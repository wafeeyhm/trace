<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'trace_db';

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Define the new categories
$newCategories = [
    'Powders',
    'Dairy & Milk',
    'Syrups',
    'Sodas & Water',
    'Purees & Concentrates',
    'Jams',
    'Garnishes & Add-ons',
    'Ice',
    'Packaging'
];

// 1. Insert new categories into inventory_categories
$categoryIds = [];
foreach ($newCategories as $catName) {
    // Check if category exists first
    $stmt = $conn->prepare("SELECT id FROM inventory_categories WHERE name = ?");
    $stmt->bind_param("s", $catName);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($res->num_rows > 0) {
        $categoryIds[$catName] = $res->fetch_assoc()['id'];
    } else {
        $stmtInsert = $conn->prepare("INSERT INTO inventory_categories (name) VALUES (?)");
        $stmtInsert->bind_param("s", $catName);
        $stmtInsert->execute();
        $categoryIds[$catName] = $stmtInsert->insert_id;
    }
}
echo "Ensured " . count($newCategories) . " new categories exist in the database.\n";

// 2. Map items to categories based on keywords
$itemMappings = [
    'Powders' => ['matcha powder'],
    'Dairy & Milk' => ['milk'],
    'Syrups' => ['syrup'],
    'Sodas & Water' => ['coke', 'sprite', 'soda', 'water'],
    'Purees & Concentrates' => ['nutrifres', 'lemon juice', 'ribena'],
    'Jams' => ['jam'],
    'Garnishes & Add-ons' => ['cherries'],
    'Ice' => ['ice cubes'],
    'Packaging' => ['cup', 'lid', 'straw', 'sticker', 'cups, lids, straw']
];

// Fetch all existing items
$itemsRes = $conn->query("SELECT id, name FROM inventory_items");

$updateCount = 0;
while ($item = $itemsRes->fetch_assoc()) {
    $itemId = $item['id'];
    $itemName = strtolower($item['name']);
    $assignedCategory = null;

    // Find matching category
    foreach ($itemMappings as $catName => $keywords) {
        foreach ($keywords as $keyword) {
            if (strpos($itemName, $keyword) !== false) {
                $assignedCategory = $catName;
                break 2; // Break out of both loops
            }
        }
    }

    // Default to Raw Materials if no match (though our rules cover almost everything)
    if ($assignedCategory && isset($categoryIds[$assignedCategory])) {
        $newCatId = $categoryIds[$assignedCategory];
        
        $updateStmt = $conn->prepare("UPDATE inventory_items SET category_id = ? WHERE id = ?");
        $updateStmt->bind_param("ii", $newCatId, $itemId);
        if ($updateStmt->execute()) {
            $updateCount++;
        }
    }
}

echo "Successfully updated categories for $updateCount inventory items.\n";

$conn->close();
?>
