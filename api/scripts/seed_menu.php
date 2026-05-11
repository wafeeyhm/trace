<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'trace_db';

$conn = new mysqli($host, $user, $pass, $dbName);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$rawData = "Summer Break	Ice cubes	120
Summer Break	Monin Cheryy Syrup	30
Summer Break	Lemon Juice	4
Summer Break	Coke Zero	130
Summer Break	Maraschino Cherries	1
Summer Break	Cups, Lids, Straw	1
Summer Break	Stickers	1
Matcha Latte	Ice Cubes	100
Matcha Latte	Chaboys Matcha Powder Shizuko	4
Matcha Latte	Oatside milk	170
Matcha Latte	French Vanilla Monin syrup	15
Matcha Latte	Cups, Lids, Straw	1
Matcha Latte	Stickers	1
Strawberry Matcha Latte	Ice Cubes	100
Strawberry Matcha Latte	Nutrifres Strawberry	20
Strawberry Matcha Latte	Bonne Maman Strawberry Jam	20
Strawberry Matcha Latte	French Vanilla Monin syrup	15
Strawberry Matcha Latte	Nestlé Ideal Full Cream Evaporated Milk	5
Strawberry Matcha Latte	Oatside milk	50
Strawberry Matcha Latte	Harvey Fresh full cream milk	100
Strawberry Matcha Latte	Chaboys Matcha Powder Rin	4
Strawberry Matcha Latte	Cups, Lids, Straw	1
Strawberry Matcha Latte	Stickers	1
Tokyo Dream	Chaboys Matcha Powder Shizuko	4
Tokyo Dream	Ice Cubes	100
Tokyo Dream	Sprite	130
Tokyo Dream	Nutrifres Strawberry	20
Tokyo Dream	Bonne Maman Strawberry Jam	20
Tokyo Dream	Cups, Lids, Straw	1
Tokyo Dream	Stickers	1
Tokyo Dream	Rainfresh Super Oxygenated Water	40
Midnight Galaxy	Nutrifres Blueberry	15
Midnight Galaxy	Ribena	15
Midnight Galaxy	Ice Cubes	120
Midnight Galaxy	Coke Zero	130
Midnight Galaxy	Monin Cheryy Syrup	5
Midnight Galaxy	Maraschino Cherries	1
Midnight Galaxy	Cups, Lids, Straw	1
Midnight Galaxy	Stickers	1
Sunset Breeze	Monin Peach Syrup	30
Sunset Breeze	Ice Cubes	120
Sunset Breeze	Sprite	130
Sunset Breeze	Nutrifres Strawberry	15
Sunset Breeze	Cups, Lids, Straw	1
Sunset Breeze	Stickers	1
Electric Blue	Monin Blue Zesty Orange Syrup	22
Electric Blue	Monin Wild Mint Syrup	8
Electric Blue	Ice Cubes	120
Electric Blue	Ice cream soda	130
Electric Blue	Maraschino Cherries	1
Cherry Blossom	Nutrifres Strawberry	15
Cherry Blossom	Monin Cheryy Syrup	15
Cherry Blossom	Ice Cubes	120
Cherry Blossom	Ice cream soda	130
Cherry Blossom	Maraschino Cherries	1
Cherry Blossom	Cups, Lids, Straw	1
Cherry Blossom	Stickers	1
Peach Perfect	Nutrifres Peach	10
Peach Perfect	Monin Peach Syrup	5
Peach Perfect	Monin Wild Mint Syrup	7
Peach Perfect	Ice Cubes	120
Peach Perfect	Sprite	130
Peach Perfect	Cups, Lids, Straw	1
Peach Perfect	Stickers	1
Blueberry Matcha Latte	Ice Cubes	100
Blueberry Matcha Latte	Nutrifres Blueberry	20
Blueberry Matcha Latte	Bonne Maman Blueberry Jam	20
Blueberry Matcha Latte	French Vanilla Monin syrup	15
Blueberry Matcha Latte	Nestlé Ideal Full Cream Evaporated Milk	5
Blueberry Matcha Latte	Oatside milk	50
Blueberry Matcha Latte	Harvey Fresh full cream milk	100
Blueberry Matcha Latte	Chaboys Matcha Powder Rin	4
Blueberry Matcha Latte	Cups, Lids, Straw	1
Blueberry Matcha Latte	Stickers	1
Midori Mint	Ice Cubes	100
Midori Mint	Chaboys Matcha Powder Shizuko	4
Midori Mint	Oatside milk	170
Midori Mint	French Vanilla Monin syrup	15
Midori Mint	Cups, Lids, Straw	1
Midori Mint	Stickers	1
Midori Mint	Monin Wild Mint Syrup	10";

$lines = explode("\n", str_replace("\r", '', trim($rawData)));
$recipes = [];
$menuItemsSet = [];

foreach ($lines as $line) {
    $parts = explode("\t", $line);
    if (count($parts) >= 3) {
        $menuItem = trim($parts[0]);
        $ingredient = trim($parts[1]);
        $qty = floatval(trim($parts[2]));
        
        $recipes[] = [
            'menu_item' => $menuItem,
            'ingredient' => $ingredient,
            'qty' => $qty
        ];
        $menuItemsSet[$menuItem] = true;
    }
}

// Ensure \"Cold Drinks\" category exists
$catRes = $conn->query("SELECT id FROM menu_categories WHERE name = 'Cold Drinks'");
if ($catRes->num_rows > 0) {
    $categoryId = $catRes->fetch_assoc()['id'];
} else {
    $conn->query("INSERT INTO menu_categories (name) VALUES ('Cold Drinks')");
    $categoryId = $conn->insert_id;
}

$menuMap = []; // menu_item_name => menu_variant_id

// Insert menu items and their default variant
foreach (array_keys($menuItemsSet) as $menuItemName) {
    // Check if menu item exists
    $stmt = $conn->prepare("SELECT id FROM menu_items WHERE name = ?");
    $stmt->bind_param("s", $menuItemName);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($res->num_rows > 0) {
        $menuItemId = $res->fetch_assoc()['id'];
    } else {
        $stmtInsert = $conn->prepare("INSERT INTO menu_items (category_id, name) VALUES (?, ?)");
        $stmtInsert->bind_param("is", $categoryId, $menuItemName);
        $stmtInsert->execute();
        $menuItemId = $stmtInsert->insert_id;
    }
    
    // Check if variant exists
    $variantName = 'Standard';
    $stmtVar = $conn->prepare("SELECT id FROM menu_variants WHERE menu_item_id = ? AND name = ?");
    $stmtVar->bind_param("is", $menuItemId, $variantName);
    $stmtVar->execute();
    $resVar = $stmtVar->get_result();
    
    if ($resVar->num_rows > 0) {
        $menuMap[$menuItemName] = $resVar->fetch_assoc()['id'];
    } else {
        $price = 15.00; // Default price
        $stmtInsertVar = $conn->prepare("INSERT INTO menu_variants (menu_item_id, name, price) VALUES (?, ?, ?)");
        $stmtInsertVar->bind_param("isd", $menuItemId, $variantName, $price);
        $stmtInsertVar->execute();
        $menuMap[$menuItemName] = $stmtInsertVar->insert_id;
    }
}

// Fetch all inventory items for case-insensitive matching
$inventoryMap = [];
$resInv = $conn->query("SELECT id, name FROM inventory_items");
while ($row = $resInv->fetch_assoc()) {
    $inventoryMap[strtolower(trim($row['name']))] = $row['id'];
}

$count = 0;
// Insert recipes
foreach ($recipes as $r) {
    $variantId = $menuMap[$r['menu_item']];
    $ingredientLower = strtolower($r['ingredient']);
    
    if (isset($inventoryMap[$ingredientLower])) {
        $inventoryId = $inventoryMap[$ingredientLower];
        
        // Check if recipe already exists to avoid duplicates
        $stmtCheck = $conn->prepare("SELECT id FROM menu_recipes WHERE menu_variant_id = ? AND inventory_item_id = ?");
        $stmtCheck->bind_param("ii", $variantId, $inventoryId);
        $stmtCheck->execute();
        if ($stmtCheck->get_result()->num_rows == 0) {
            $stmtInsert = $conn->prepare("INSERT INTO menu_recipes (menu_variant_id, inventory_item_id, quantity) VALUES (?, ?, ?)");
            $stmtInsert->bind_param("iid", $variantId, $inventoryId, $r['qty']);
            if ($stmtInsert->execute()) {
                $count++;
            }
        }
    } else {
        echo "Warning: Ingredient not found in inventory: " . $r['ingredient'] . "\n";
    }
}

echo "Successfully seeded $count recipe ingredients into the database.\n";

$conn->close();
?>
