<?php
namespace Trace\Models;
use Trace\Config\Database;

class Recipe {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }

    public function getByVariant($locationId, $variantId) {
        $stmt = $this->db->prepare("SELECT r.*, i.name as ingredient_name, i.usage_unit as unit FROM menu_recipes r JOIN inventory_items i ON r.inventory_item_id = i.id WHERE r.menu_variant_id = ? AND i.location_id = ?");
        $stmt->execute([$variantId, $locationId]);
        return $stmt->fetchAll();
    }

    public function save($locationId, $variantId, $ingredients) {
        $this->db->beginTransaction();
        try {
            // Verify variant belongs to this location first (via menu_items)
            $stmtV = $this->db->prepare("SELECT m.location_id FROM menu_variants v JOIN menu_items m ON v.menu_item_id = m.id WHERE v.id = ?");
            $stmtV->execute([$variantId]);
            $vLoc = $stmtV->fetchColumn();
            if ($vLoc != $locationId) throw new \Exception("Variant does not belong to this location");

            $this->db->prepare("DELETE FROM menu_recipes WHERE menu_variant_id = ?")->execute([$variantId]);
            $stmt = $this->db->prepare("INSERT INTO menu_recipes (menu_variant_id, inventory_item_id, quantity) VALUES (?, ?, ?)");
            
            foreach ($ingredients as $ing) {
                // Verify ingredient belongs to this location
                $stmtI = $this->db->prepare("SELECT location_id FROM inventory_items WHERE id = ?");
                $stmtI->execute([$ing['inventory_item_id']]);
                if ($stmtI->fetchColumn() != $locationId) throw new \Exception("Ingredient ID {$ing['inventory_item_id']} not found in this location");

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
