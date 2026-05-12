<?php
namespace Trace\Models;
use Trace\Config\Database;

class Menu {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll() {
        $items = $this->db->query("SELECT m.*, c.name as category_name, v.name as vendor_name FROM menu_items m LEFT JOIN menu_categories c ON m.category_id = c.id LEFT JOIN vendors v ON m.vendor_id = v.id WHERE m.is_active = 1")->fetchAll();
        foreach ($items as &$item) {
            $stmt = $this->db->prepare("
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
            
            foreach ($item['variants'] as &$v) {
                $rStmt = $this->db->prepare("SELECT r.*, i.name as ingredient_name, i.usage_unit as unit FROM menu_recipes r JOIN inventory_items i ON r.inventory_item_id = i.id WHERE r.menu_variant_id = ?");
                $rStmt->execute([$v['id']]);
                $v['recipes'] = $rStmt->fetchAll();
            }
        }
        return $items;
    }

    public function getCategories() {
        return $this->db->query("SELECT * FROM menu_categories ORDER BY name ASC")->fetchAll();
    }
}
