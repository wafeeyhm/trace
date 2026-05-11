<?php
namespace Trace\Controllers;
use Trace\Models\Inventory;

class InventoryController extends BaseController {
    private $model;

    public function __construct() {
        $this->model = new Inventory();
    }

    public function list() {
        $this->jsonResponse($this->model->getAll());
    }

    public function listCategories() {
        $this->jsonResponse($this->model->getCategories());
    }

    public function addCategory() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $id = $this->model->addCategory($data['name']);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }

    public function restock() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            try {
                $this->model->restock($data['id'], $data['amount'], $data['reason'] ?? 'Restock');
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }
    
    public function logs() {
        $this->jsonResponse($this->model->getLogs());
    }
}
