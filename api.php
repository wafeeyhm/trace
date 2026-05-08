<?php
header("Content-Type: application/json");
$host = 'localhost'; $db = 'trace_db'; $user = 'root'; $pass = ''; $charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];

try { $pdo = new PDO($dsn, $user, $pass, $options); } catch (\PDOException $e) { die(json_encode(['error' => 'Connection failed'])); }

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    // --- Categories ---
    case 'get_inventory_categories':
        echo json_encode($pdo->query("SELECT * FROM inventory_categories ORDER BY name ASC")->fetchAll());
        break;
    case 'add_inventory_category':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO inventory_categories (name) VALUES (?)");
            $stmt->execute([$data['name']]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;

    case 'get_menu_categories':
        echo json_encode($pdo->query("SELECT * FROM menu_categories ORDER BY name ASC")->fetchAll());
        break;
    case 'add_menu_category':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO menu_categories (name) VALUES (?)");
            $stmt->execute([$data['name']]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;

    // --- Inventory / Ingredients ---
    case 'get_inventory':
        echo json_encode($pdo->query("SELECT i.*, c.name as category_name FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id = c.id ORDER BY i.name ASC")->fetchAll());
        break;
    case 'add_inventory_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO inventory_items (category_id, name, unit, cost_per_unit, stock_level, min_stock) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['category_id'], $data['name'], $data['unit'], $data['cost_per_unit'], $data['stock_level'], $data['min_stock']]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;
    case 'update_inventory_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("UPDATE inventory_items SET category_id = ?, name = ?, unit = ?, cost_per_unit = ?, min_stock = ? WHERE id = ?");
            $stmt->execute([$data['category_id'], $data['name'], $data['unit'], $data['cost_per_unit'], $data['min_stock'], $data['id']]);
            echo json_encode(['success' => true]);
        }
        break;
    case 'delete_inventory_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $pdo->prepare("DELETE FROM inventory_items WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        }
        break;

    case 'restock_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'];
            $amount = $data['amount'];
            $reason = $data['reason'] ?? 'Restock';

            $pdo->beginTransaction();
            try {
                $pdo->prepare("UPDATE inventory_items SET stock_level = stock_level + ? WHERE id = ?")->execute([$amount, $id]);
                $pdo->prepare("INSERT INTO inventory_logs (inventory_item_id, type, change_amount, reason) VALUES (?, 'restock', ?, ?)")->execute([$id, $amount, $reason]);
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) { $pdo->rollBack(); echo json_encode(['error' => $e->getMessage()]); }
        }
        break;

    // --- Menu Management ---
    case 'get_menu':
        $items = $pdo->query("SELECT m.*, c.name as category_name FROM menu_items m LEFT JOIN menu_categories c ON m.category_id = c.id WHERE m.is_active = 1")->fetchAll();
        foreach ($items as &$item) {
            $stmt = $pdo->prepare("
                SELECT v.*, 
                (SELECT SUM(r.quantity * i.cost_per_unit) 
                 FROM menu_recipes r 
                 JOIN inventory_items i ON r.inventory_item_id = i.id 
                 WHERE r.menu_variant_id = v.id) as cogs
                FROM menu_variants v 
                WHERE v.menu_item_id = ?
            ");
            $stmt->execute([$item['id']]);
            $item['variants'] = $stmt->fetchAll();
        }
        echo json_encode($items);
        break;
    case 'add_menu_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO menu_items (category_id, name) VALUES (?, ?)");
            $stmt->execute([$data['category_id'], $data['name']]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;

    case 'update_menu_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("UPDATE menu_items SET category_id = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['category_id'], $data['name'], $data['id']]);
                
                // For simplicity in this demo, we clear and re-add variants if provided
                if (isset($data['variants'])) {
                    $pdo->prepare("DELETE FROM menu_variants WHERE menu_item_id = ?")->execute([$data['id']]);
                    $vStmt = $pdo->prepare("INSERT INTO menu_variants (menu_item_id, name, price) VALUES (?, ?, ?)");
                    foreach ($data['variants'] as $v) {
                        $vStmt->execute([$data['id'], $v['name'], $v['price']]);
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) { $pdo->rollBack(); echo json_encode(['error' => $e->getMessage()]); }
        }
        break;

    case 'delete_menu_item':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $pdo->prepare("DELETE FROM menu_items WHERE id = ?")->execute([$data['id']]);
            echo json_encode(['success' => true]);
        }
        break;

    // --- Orders & Transactions ---
    case 'process_order':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $cart = $data['cart']; $total = $data['total'];
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO orders (total_amount, tax_amount, discount_amount, payment_type) VALUES (?, ?, ?, ?)");
                $stmt->execute([$total, $data['tax'] ?? 0, $data['discount'] ?? 0, $data['payment_type'] ?? 'cash']);
                $orderId = $pdo->lastInsertId();
                foreach ($cart as $item) {
                    $pdo->prepare("INSERT INTO order_items (order_id, menu_variant_id, quantity, unit_price) VALUES (?, ?, ?, ?)")->execute([$orderId, $item['variant_id'], $item['quantity'], $item['price']]);
                    $stmtRec = $pdo->prepare("SELECT inventory_item_id, quantity FROM menu_recipes WHERE menu_variant_id = ?");
                    $stmtRec->execute([$item['variant_id']]);
                    foreach ($stmtRec->fetchAll() as $rec) {
                        $deduction = $rec['quantity'] * $item['quantity'];
                        $pdo->prepare("UPDATE inventory_items SET stock_level = stock_level - ? WHERE id = ?")->execute([$deduction, $rec['inventory_item_id']]);
                        $pdo->prepare("INSERT INTO inventory_logs (inventory_item_id, type, change_amount, reason) VALUES (?, 'sale_deduction', ?, ?)")->execute([$rec['inventory_item_id'], -$deduction, "Order #$orderId"]);
                    }
                }
                $pdo->commit(); echo json_encode(['success' => true, 'order_id' => $orderId]);
            } catch (Exception $e) { $pdo->rollBack(); echo json_encode(['error' => $e->getMessage()]); }
        }
        break;

    case 'get_analytics':
        $range = $_GET['range'] ?? 'month';
        $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        if ($range === 'day') $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        if ($range === 'year') $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        $revenue = $pdo->query("SELECT SUM(total_amount) as val FROM orders WHERE 1=1 $filter")->fetch()['val'] ?? 0;
        $popularity = $pdo->query("SELECT m.name, SUM(oi.quantity) as total FROM order_items oi JOIN menu_variants mv ON oi.menu_variant_id = mv.id JOIN menu_items m ON mv.menu_item_id = m.id WHERE oi.order_id IN (SELECT id FROM orders WHERE 1=1 $filter) GROUP BY m.id ORDER BY total DESC")->fetchAll();
        $trend = $pdo->query("SELECT DATE(created_at) as day, SUM(total_amount) as rev FROM orders WHERE 1=1 $filter GROUP BY DATE(created_at) ORDER BY day ASC")->fetchAll();
        echo json_encode(['revenue' => (float)$revenue, 'popularity' => $popularity, 'trend' => $trend]);
        break;

    case 'save_recipe':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $variantId = $data['variant_id'];
            $ingredients = $data['ingredients']; // Array of {inventory_item_id, quantity}

            $pdo->beginTransaction();
            try {
                // Clear existing recipe
                $pdo->prepare("DELETE FROM menu_recipes WHERE menu_variant_id = ?")->execute([$variantId]);
                // Insert new ingredients
                $stmt = $pdo->prepare("INSERT INTO menu_recipes (menu_variant_id, inventory_item_id, quantity) VALUES (?, ?, ?)");
                foreach ($ingredients as $ing) {
                    $stmt->execute([$variantId, $ing['inventory_item_id'], $ing['quantity']]);
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) { $pdo->rollBack(); echo json_encode(['error' => $e->getMessage()]); }
        }
        break;

    case 'get_recipe':
        $variantId = $_GET['variant_id'];
        $stmt = $pdo->prepare("SELECT r.*, i.name as ingredient_name, i.unit FROM menu_recipes r JOIN inventory_items i ON r.inventory_item_id = i.id WHERE r.menu_variant_id = ?");
        $stmt->execute([$variantId]);
        echo json_encode($stmt->fetchAll());
        break;
    case 'get_inventory_logs':
        echo json_encode($pdo->query("SELECT l.*, i.name as item_name FROM inventory_logs l JOIN inventory_items i ON l.inventory_item_id = i.id ORDER BY l.created_at DESC LIMIT 100")->fetchAll());
        break;
}
?>
