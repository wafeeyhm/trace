<?php
namespace Trace\Models;
use Trace\Config\Database;

class Inventory {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($locationId) {
        $stmt = $this->db->prepare("SELECT i.*, c.name as category_name FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id = c.id WHERE i.location_id = ? ORDER BY i.name ASC");
        $stmt->execute([$locationId]);
        return $stmt->fetchAll();
    }

    public function getCategories($locationId) {
        $stmt = $this->db->prepare("SELECT * FROM inventory_categories WHERE location_id = ? ORDER BY name ASC");
        $stmt->execute([$locationId]);
        return $stmt->fetchAll();
    }

    public function addCategory($locationId, $name) {
        $stmt = $this->db->prepare("INSERT INTO inventory_categories (location_id, name) VALUES (?, ?)");
        $stmt->execute([$locationId, $name]);
        return $this->db->lastInsertId();
    }

    public function add($locationId, $data) {
        $stmt = $this->db->prepare("INSERT INTO inventory_items (location_id, category_id, name, purchase_unit, usage_unit, conversion_factor, cost_per_unit, stock_level, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $locationId,
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

    public function update($locationId, $id, $data) {
        $stmt = $this->db->prepare("UPDATE inventory_items SET category_id = ?, name = ?, purchase_unit = ?, usage_unit = ?, conversion_factor = ?, cost_per_unit = ?, min_stock = ? WHERE id = ? AND location_id = ?");
        return $stmt->execute([
            $data['category_id'],
            $data['name'],
            $data['purchase_unit'],
            $data['usage_unit'],
            $data['conversion_factor'],
            $data['cost_per_unit'],
            $data['min_stock'],
            $id,
            $locationId
        ]);
    }

    public function delete($locationId, $id) {
        $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM menu_recipes r JOIN menu_variants v ON r.menu_variant_id = v.id JOIN menu_items m ON v.menu_item_id = m.id WHERE r.inventory_item_id = ? AND m.location_id = ?");
        $stmt->execute([$id, $locationId]);
        if ($stmt->fetch()['count'] > 0) {
            throw new \Exception("Cannot delete: Ingredient is used in active recipes.");
        }
        $stmt = $this->db->prepare("DELETE FROM inventory_items WHERE id = ? AND location_id = ?");
        return $stmt->execute([$id, $locationId]);
    }

    public function restock($locationId, $id, $purchase_amount, $reason = 'Restock') {
        $this->db->beginTransaction();
        try {
            $itemStmt = $this->db->prepare("SELECT name, cost_per_unit, conversion_factor FROM inventory_items WHERE id = ? AND location_id = ?");
            $itemStmt->execute([$id, $locationId]);
            $itemData = $itemStmt->fetch();
            if (!$itemData) throw new \Exception("Item not found");
            
            $usage_amount = $purchase_amount * $itemData['conversion_factor'];
            $total_cost = $purchase_amount * ($itemData['cost_per_unit'] * $itemData['conversion_factor']);
            
            $this->db->prepare("INSERT INTO expenses (location_id, description, amount, expense_date) VALUES (?, ?, ?, CURRENT_DATE)")->execute([$locationId, "Restock: " . $itemData['name'], $total_cost]);
            $this->db->prepare("UPDATE inventory_items SET stock_level = stock_level + ? WHERE id = ?")->execute([$usage_amount, $id]);
            $this->db->prepare("INSERT INTO inventory_logs (inventory_item_id, type, change_amount, reason) VALUES (?, 'restock', ?, ?)")->execute([$id, $usage_amount, $reason]);
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    public function getLogs($locationId) {
        $stmt = $this->db->prepare("SELECT l.*, i.name as item_name FROM inventory_logs l JOIN inventory_items i ON l.inventory_item_id = i.id WHERE i.location_id = ? ORDER BY l.created_at DESC LIMIT 100");
        $stmt->execute([$locationId]);
        return $stmt->fetchAll();
    }
}
