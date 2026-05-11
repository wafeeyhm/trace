<?php
namespace Trace\Models;
use Trace\Config\Database;

class Tax {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }
    public function getAll() { return $this->db->query("SELECT * FROM taxes ORDER BY name ASC")->fetchAll(); }
    public function add($name, $rate) {
        $stmt = $this->db->prepare("INSERT INTO taxes (name, rate) VALUES (?, ?)");
        $stmt->execute([$name, $rate]);
        return $this->db->lastInsertId();
    }
    public function toggle($id) {
        $stmt = $this->db->prepare("UPDATE taxes SET is_active = NOT is_active WHERE id = ?");
        $stmt->execute([$id]);
    }
    public function delete($id) {
        $this->db->prepare("DELETE FROM taxes WHERE id = ?")->execute([$id]);
    }
}
