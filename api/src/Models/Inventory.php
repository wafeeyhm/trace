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

    public function add($data) {
        $stmt = $this->db->prepare("INSERT INTO inventory_items (category_id, name, purchase_unit, usage_unit, conversion_factor, cost_per_unit, stock_level, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['category_id'],
            $data['name'],
            $data['purchase_unit'] ?? 'unit',
            $data['usage_unit'] ?? 'unit',
            $data['conversion_factor'] ?? 1.0,
            $data['cost_per_unit'] ?? 0.0,
            $data['stock_level'] ?? 0.0,
            $data['min_stock'] ?? 0.0
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $stmt = $this->db->prepare("UPDATE inventory_items SET category_id = ?, name = ?, purchase_unit = ?, usage_unit = ?, conversion_factor = ?, cost_per_unit = ?, min_stock = ? WHERE id = ?");
        return $stmt->execute([
            $data['category_id'],
            $data['name'],
            $data['purchase_unit'],
            $data['usage_unit'],
            $data['conversion_factor'],
            $data['cost_per_unit'],
            $data['min_stock'],
            $id
        ]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM menu_recipes WHERE inventory_item_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetch()['count'] > 0) {
            throw new \Exception("Cannot delete: Ingredient is used in active recipes.");
        }
        $stmt = $this->db->prepare("DELETE FROM inventory_items WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function restock($id, $purchase_amount, $reason = 'Restock') {
        $this->db->beginTransaction();
        try {
            $itemStmt = $this->db->prepare("SELECT name, cost_per_unit, conversion_factor FROM inventory_items WHERE id = ?");
            $itemStmt->execute([$id]);
            $itemData = $itemStmt->fetch();
            
            $usage_amount = $purchase_amount * $itemData['conversion_factor'];
            $total_cost = $purchase_amount * ($itemData['cost_per_unit'] * $itemData['conversion_factor']);
            
            $this->db->prepare("INSERT INTO expenses (description, amount, expense_date) VALUES (?, ?, CURRENT_DATE)")->execute(["Restock: " . $itemData['name'], $total_cost]);
            $this->db->prepare("UPDATE inventory_items SET stock_level = stock_level + ? WHERE id = ?")->execute([$usage_amount, $id]);
            $this->db->prepare("INSERT INTO inventory_logs (inventory_item_id, type, change_amount, reason) VALUES (?, 'restock', ?, ?)")->execute([$id, $usage_amount, $reason]);
            
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
