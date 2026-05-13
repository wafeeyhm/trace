<?php
namespace Trace\Models;
use Trace\Config\Database;

class Vendor {
    private $db;
    public function __construct() { $this->db = Database::getConnection(); }
    public function getAll($tenantId) { 
        $stmt = $this->db->prepare("SELECT * FROM vendors WHERE tenant_id = ? ORDER BY name ASC");
        $stmt->execute([$tenantId]);
        return $stmt->fetchAll();
    }
    public function add($tenantId, $name, $contactInfo) {
        $stmt = $this->db->prepare("INSERT INTO vendors (tenant_id, name, contact_info) VALUES (?, ?, ?)");
        $stmt->execute([$tenantId, $name, $contactInfo]);
        return $this->db->lastInsertId();
    }
}
