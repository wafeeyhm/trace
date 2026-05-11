<?php
namespace Trace\Models;
use Trace\Config\Database;

class Expense {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }
    public function getAll() { return $this->db->query("SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC")->fetchAll(); }
    public function add($description, $amount, $date) {
        $stmt = $this->db->prepare("INSERT INTO expenses (description, amount, expense_date) VALUES (?, ?, ?)");
        $stmt->execute([$description, $amount, $date]);
        return $this->db->lastInsertId();
    }
    public function delete($id) {
        $this->db->prepare("DELETE FROM expenses WHERE id = ?")->execute([$id]);
    }
}
