<?php
namespace Trace\Controllers;

abstract class BaseController {
    protected $currentLocationId = null;
    protected $currentTenantId = null;

    protected function jsonResponse($data, $status = 200) {
        http_response_code($status);
        header("Content-Type: application/json");
        echo json_encode($data);
    }

    protected function getPostData() {
        return json_decode(file_get_contents('php://input'), true);
    }

    protected function getRequestMethod() {
        return $_SERVER['REQUEST_METHOD'];
    }

    protected function checkAuth() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['user_id'])) {
            $this->jsonResponse(['error' => 'Unauthorized'], 401);
            exit;
        }

        $this->currentLocationId = $_SESSION['location_id'];
        $this->currentTenantId = $_SESSION['tenant_id'];
    }
}
