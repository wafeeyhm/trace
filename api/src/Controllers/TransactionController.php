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
}
