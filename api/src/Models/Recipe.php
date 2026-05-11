<?php
namespace Trace\Models;
use Trace\Config\Database;

class Recipe {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }

    public function getByVariant($variantId) {
        $stmt = $this->db->prepare("SELECT r.*, i.name as ingredient_name, i.unit FROM menu_recipes r JOIN inventory_items i ON r.inventory_item_id = i.id WHERE r.menu_variant_id = ?");
        $stmt->execute([$variantId]);
        return $stmt->fetchAll();
    }

    public function save($variantId, $ingredients) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("DELETE FROM menu_recipes WHERE menu_variant_id = ?")->execute([$variantId]);
            $stmt = $this->db->prepare("INSERT INTO menu_recipes (menu_variant_id, inventory_item_id, quantity) VALUES (?, ?, ?)");
            foreach ($ingredients as $ing) {
                $stmt->execute([$variantId, $ing['inventory_item_id'], $ing['quantity']]);
            }
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
