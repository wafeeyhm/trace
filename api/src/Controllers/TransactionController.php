<?php
namespace Trace\Controllers;
use Trace\Models\Transaction;

class TransactionController extends BaseController {
    private $model;

    public function __construct() {
        $this->model = new Transaction();
    }

    public function processOrder() {
        if ($this->getRequestMethod() === 'POST') {
            try {
                $orderId = $this->model->processOrder($this->getPostData());
                $this->jsonResponse(['success' => true, 'order_id' => $orderId]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }

    public function analytics() {
        $range = $_GET['range'] ?? 'month';
        $this->jsonResponse($this->model->getAnalytics($range));
    }

    public function pendingOrders() {
        $this->jsonResponse($this->model->getPendingOrders());
    }

    public function updateKdsStatus() {
        if ($this->getRequestMethod() === 'POST') {
            try {
                $data = $this->getPostData();
                $this->model->updateKdsStatus($data['order_id'], $data['status']);
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }
}
