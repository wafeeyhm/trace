<?php
namespace Trace\Models;
use Trace\Config\Database;

class Inventory {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll() {
        return $this->db->query("SELECT i.*, c.name as category_name FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id = c.id ORDER BY i.name ASC")->fetchAll();
    }

    public function getCategories() {
        return $this->db->query("SELECT * FROM inventory_categories ORDER BY name ASC")->fetchAll();
    }

    public function addCategory($name) {
        $stmt = $this->db->prepare("INSERT INTO inventory_categories (name) VALUES (?)");
        $stmt->execute([$name]);
        return $this->db->lastInsertId();
    }

    public function restock($id, $amount, $reason = 'Restock') {
        $this->db->beginTransaction();
        try {
            $itemStmt = $this->db->prepare("SELECT name, cost_per_unit FROM inventory_items WHERE id = ?");
            $itemStmt->execute([$id]);
            $itemData = $itemStmt->fetch();
            $total_cost = $amount * $itemData['cost_per_unit'];
            
            $this->db->prepare("INSERT INTO expenses (description, amount, expense_date) VALUES (?, ?, CURRENT_DATE)")->execute(["Restock: " . $itemData['name'], $total_cost]);
            $this->db->prepare("UPDATE inventory_items SET stock_level = stock_level + ? WHERE id = ?")->execute([$amount, $id]);
            $this->db->prepare("INSERT INTO inventory_logs (inventory_item_id, type, change_amount, reason) VALUES (?, 'restock', ?, ?)")->execute([$id, $amount, $reason]);
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    public function getLogs() {
        return $this->db->query("SELECT l.*, i.name as item_name FROM inventory_logs l JOIN inventory_items i ON l.inventory_item_id = i.id ORDER BY l.created_at DESC LIMIT 100")->fetchAll();
    }
}
