<?php
namespace Trace\Models;
use Trace\Config\Database;

class Expense {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }
    public function getAll($locationId) { 
        $stmt = $this->db->prepare("SELECT * FROM expenses WHERE location_id = ? ORDER BY expense_date DESC, created_at DESC");
        $stmt->execute([$locationId]);
        return $stmt->fetchAll();
    }
    public function add($locationId, $description, $amount, $date) {
        $stmt = $this->db->prepare("INSERT INTO expenses (location_id, description, amount, expense_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$locationId, $description, $amount, $date]);
        return $this->db->lastInsertId();
    }
    public function delete($locationId, $id) {
        $this->db->prepare("DELETE FROM expenses WHERE id = ? AND location_id = ?")->execute([$id, $locationId]);
    }
}
