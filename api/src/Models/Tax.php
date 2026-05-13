<?php
namespace Trace\Models;
use Trace\Config\Database;

class Tax {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }
    public function getAll($locationId) { 
        $stmt = $this->db->prepare("SELECT * FROM taxes WHERE location_id = ? ORDER BY name ASC");
        $stmt->execute([$locationId]);
        return $stmt->fetchAll();
    }
    public function add($locationId, $name, $rate) {
        $stmt = $this->db->prepare("INSERT INTO taxes (location_id, name, rate) VALUES (?, ?, ?)");
        $stmt->execute([$locationId, $name, $rate]);
        return $this->db->lastInsertId();
    }
    public function toggle($locationId, $id) {
        $stmt = $this->db->prepare("UPDATE taxes SET is_active = NOT is_active WHERE id = ? AND location_id = ?");
        $stmt->execute([$id, $locationId]);
    }
    public function delete($locationId, $id) {
        $this->db->prepare("DELETE FROM taxes WHERE id = ? AND location_id = ?")->execute([$id, $locationId]);
    }
}
