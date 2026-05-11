<?php
namespace Trace\Models;
use Trace\Config\Database;

class Vendor {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }
    public function getAll() { return $this->db->query("SELECT * FROM vendors ORDER BY name ASC")->fetchAll(); }
    public function add($name, $contactInfo) {
        $stmt = $this->db->prepare("INSERT INTO vendors (name, contact_info) VALUES (?, ?)");
        $stmt->execute([$name, $contactInfo]);
        return $this->db->lastInsertId();
    }
}
