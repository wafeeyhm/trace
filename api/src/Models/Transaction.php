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
        $trend = $this->db->query("SELECT DATE(created_at) as day, SUM(total_amount) as rev FROM orders WHERE 1=1 $filter GROUP BY DATE(created_at) ORDER BY day ASC")->fetchAll();
        
        return [
            'revenue' => (float)$revenue, 
            'tax_collected' => (float)$tax_collected,
            'expenses' => (float)$expenses,
            'net_profit' => (float)($revenue - $expenses),
            'trend' => $trend
        ];
    }
}
