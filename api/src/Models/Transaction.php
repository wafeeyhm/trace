<?php
namespace Trace\Models;
use Trace\Config\Database;

class Transaction {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function processOrder($data) {
        $cart = $data['cart']; 
        $total = $data['total'];
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("INSERT INTO orders (total_amount, tax_amount, discount_amount, payment_type) VALUES (?, ?, ?, ?)");
            $stmt->execute([$total, $data['tax'] ?? 0, $data['discount'] ?? 0, $data['payment_type'] ?? 'cash']);
            $orderId = $this->db->lastInsertId();
            foreach ($cart as $item) {
                $this->db->prepare("INSERT INTO order_items (order_id, menu_variant_id, quantity, unit_price) VALUES (?, ?, ?, ?)")->execute([$orderId, $item['variant_id'], $item['quantity'], $item['price']]);
                $stmtRec = $this->db->prepare("SELECT inventory_item_id, quantity FROM menu_recipes WHERE menu_variant_id = ?");
                $stmtRec->execute([$item['variant_id']]);
                foreach ($stmtRec->fetchAll() as $rec) {
                    $deduction = $rec['quantity'] * $item['quantity'];
                    $this->db->prepare("UPDATE inventory_items SET stock_level = stock_level - ? WHERE id = ?")->execute([$deduction, $rec['inventory_item_id']]);
                    $this->db->prepare("INSERT INTO inventory_logs (inventory_item_id, type, change_amount, reason) VALUES (?, 'sale_deduction', ?, ?)")->execute([$rec['inventory_item_id'], -$deduction, "Order #$orderId"]);
                }
            }
            $this->db->commit();
            return $orderId;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getPendingOrders() {
        $orders = $this->db->query(
            "SELECT o.id, o.kds_status, o.created_at, o.payment_type
             FROM orders o
             WHERE o.kds_status IN ('pending', 'preparing')
             ORDER BY o.created_at ASC"
        )->fetchAll();

        foreach ($orders as &$order) {
            $stmt = $this->db->prepare(
                "SELECT oi.quantity, mv.name as variant_name, mi.name as item_name
                 FROM order_items oi
                 JOIN menu_variants mv ON oi.menu_variant_id = mv.id
                 JOIN menu_items mi ON mv.menu_item_id = mi.id
                 WHERE oi.order_id = ?"
            );
            $stmt->execute([$order['id']]);
            $order['items'] = $stmt->fetchAll();
        }
        return $orders;
    }

    public function updateKdsStatus($orderId, $status) {
        $allowed = ['pending', 'preparing', 'done'];
        if (!in_array($status, $allowed)) {
            throw new \Exception("Invalid KDS status: $status");
        }
        $stmt = $this->db->prepare("UPDATE orders SET kds_status = ? WHERE id = ?");
        return $stmt->execute([$status, $orderId]);
    }

    public function getAnalytics($range) {
        $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        $expense_filter = "AND expense_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        if ($range === 'day') {
            $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
            $expense_filter = "AND expense_date >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        }
        if ($range === 'year') {
            $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            $expense_filter = "AND expense_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        }
        
        $revenue = $this->db->query("SELECT SUM(total_amount) as val FROM orders WHERE 1=1 $filter")->fetch()['val'] ?? 0;
        $tax_collected = $this->db->query("SELECT SUM(tax_amount) as val FROM orders WHERE 1=1 $filter")->fetch()['val'] ?? 0;
        $expenses = $this->db->query("SELECT SUM(amount) as val FROM expenses WHERE 1=1 $expense_filter")->fetch()['val'] ?? 0;
        
        // Dynamic COGS Calculation (Real-time based on current supplier prices)
        $cogs = $this->db->query("
            SELECT SUM(oi.quantity * (
                SELECT IFNULL(SUM(r.quantity * i.cost_per_unit), 0)
                FROM menu_recipes r
                JOIN inventory_items i ON r.inventory_item_id = i.id
                WHERE r.menu_variant_id = oi.menu_variant_id
            )) as val
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE 1=1 $filter
        ")->fetch()['val'] ?? 0;

        // Waste Calculation
        $waste = $this->db->query("
            SELECT SUM(ABS(l.change_amount) * i.cost_per_unit) as val
            FROM inventory_logs l
            JOIN inventory_items i ON l.inventory_item_id = i.id
            WHERE l.type = 'waste' $filter
        ")->fetch()['val'] ?? 0;

        // Peak Hours (24h distribution)
        $peak_hours = $this->db->query("
            SELECT HOUR(created_at) as hour, SUM(total_amount) as total 
            FROM orders 
            WHERE 1=1 $filter 
            GROUP BY HOUR(created_at) 
            ORDER BY hour ASC
        ")->fetchAll();

        // Time-series Trend (Revenue vs Waste)
        $trend_raw = $this->db->query("
            SELECT DATE(created_at) as day, SUM(total_amount) as rev 
            FROM orders 
            WHERE 1=1 $filter 
            GROUP BY DATE(created_at) 
            ORDER BY day ASC
        ")->fetchAll();

        $trend = [];
        foreach ($trend_raw as $t) {
            $day = $t['day'];
            $waste_on_day = $this->db->query("
                SELECT SUM(ABS(l.change_amount) * i.cost_per_unit) 
                FROM inventory_logs l
                JOIN inventory_items i ON l.inventory_item_id = i.id
                WHERE l.type = 'waste' AND DATE(l.created_at) = '$day'
            ")->fetchColumn() ?: 0;

            $trend[] = [
                'day' => $day,
                'rev' => (float)$t['rev'],
                'waste' => (float)$waste_on_day
            ];
        }
        
        return [
            'revenue' => (float)$revenue, 
            'tax_collected' => (float)$tax_collected,
            'expenses' => (float)$expenses,
            'cogs' => (float)$cogs,
            'waste' => (float)$waste,
            'net_profit' => (float)($revenue - $expenses - $cogs),
            'trend' => $trend,
            'peak_hours' => $peak_hours
        ];
    }
}
