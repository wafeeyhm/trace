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
            $orderType = $data['order_type'] ?? 'dine_in';
            $stmt = $this->db->prepare("INSERT INTO orders (total_amount, tax_amount, discount_amount, payment_type, order_type) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$total, $data['tax'] ?? 0, $data['discount'] ?? 0, $data['payment_type'] ?? 'cash', $orderType]);
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
        $filter          = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        $expense_filter  = "AND expense_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        if ($range === 'day') {
            $filter         = "AND DATE(created_at) = CURDATE()";
            $expense_filter = "AND expense_date = CURDATE()";
        }
        if ($range === 'year') {
            $filter         = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            $expense_filter = "AND expense_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        }

        $revenue       = $this->db->query("SELECT COALESCE(SUM(total_amount),0) as val FROM orders WHERE 1=1 $filter")->fetch()['val'];
        $tax_collected = $this->db->query("SELECT COALESCE(SUM(tax_amount),0) as val FROM orders WHERE 1=1 $filter")->fetch()['val'];
        $expenses      = $this->db->query("SELECT COALESCE(SUM(amount),0) as val FROM expenses WHERE 1=1 $expense_filter")->fetch()['val'];

        // Daily trend: revenue + expenses per day for dual-line chart
        $trend = $this->db->query(
            "SELECT DATE(o.created_at) as day,
                    COALESCE(SUM(o.total_amount),0) as rev,
                    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE DATE(e.expense_date)=DATE(o.created_at)),0) as exp
             FROM orders o
             WHERE 1=1 $filter
             GROUP BY DATE(o.created_at)
             ORDER BY day ASC"
        )->fetchAll();

        // Dynamic COGS: sum of (recipe_qty * item cost_per_unit * order_item_qty) for the period
        $cogs = $this->db->query(
            "SELECT COALESCE(SUM(mr.quantity * ii.cost_per_unit * oi.quantity), 0) as val
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN menu_recipes mr ON mr.menu_variant_id = oi.menu_variant_id
             JOIN inventory_items ii ON ii.id = mr.inventory_item_id
             WHERE 1=1 $filter"
        )->fetch()['val'];

        return [
            'revenue'       => (float)$revenue,
            'tax_collected' => (float)$tax_collected,
            'expenses'      => (float)$expenses,
            'cogs'          => (float)$cogs,
            'net_profit'    => (float)($revenue - $expenses),
            'trend'         => $trend,
        ];
    }

    public function getPeakHours($range) {
        $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        if ($range === 'day')  $filter = "AND DATE(created_at) = CURDATE()";
        if ($range === 'year') $filter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";

        return $this->db->query(
            "SELECT HOUR(created_at) as hour,
                    COUNT(*) as orders,
                    COALESCE(SUM(total_amount),0) as revenue
             FROM orders
             WHERE 1=1 $filter
             GROUP BY HOUR(created_at)
             ORDER BY hour ASC"
        )->fetchAll();
    }

    public function getCogsReport($range) {
        $filter = "AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        if ($range === 'day')  $filter = "AND DATE(o.created_at) = CURDATE()";
        if ($range === 'year') $filter = "AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";

        return $this->db->query(
            "SELECT
                mi.name                                             AS item_name,
                mv.name                                             AS variant_name,
                mv.price                                            AS selling_price,
                COALESCE(s.units_sold, 0)                           AS units_sold,
                COALESCE(s.revenue, 0)                              AS revenue,
                COALESCE(r.unit_cogs * s.units_sold, 0)             AS cogs,
                COALESCE(s.revenue - r.unit_cogs * s.units_sold, 0) AS gross_profit
             FROM menu_items mi
             JOIN menu_variants mv ON mv.menu_item_id = mi.id
             LEFT JOIN (
                 SELECT oi.menu_variant_id,
                        SUM(oi.quantity)                 AS units_sold,
                        SUM(oi.quantity * oi.unit_price) AS revenue
                 FROM order_items oi
                 JOIN orders o ON oi.order_id = o.id
                 WHERE 1=1 $filter
                 GROUP BY oi.menu_variant_id
             ) s ON s.menu_variant_id = mv.id
             LEFT JOIN (
                 SELECT mr.menu_variant_id,
                        SUM(mr.quantity * ii.cost_per_unit) AS unit_cogs
                 FROM menu_recipes mr
                 JOIN inventory_items ii ON ii.id = mr.inventory_item_id
                 GROUP BY mr.menu_variant_id
             ) r ON r.menu_variant_id = mv.id
             WHERE s.units_sold > 0
             ORDER BY s.revenue DESC"
        )->fetchAll();
    }
}
