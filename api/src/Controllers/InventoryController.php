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

    public function add() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $id = $this->model->add($data);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }

    public function update() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $id = $data['id'];
            unset($data['id']);
            $this->model->update($id, $data);
            $this->jsonResponse(['success' => true]);
        }
    }

    public function delete() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            try {
                $this->model->delete($data['id']);
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }

    public function restock() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            try {
                // Support both 'amount' and 'purchase_amount' for compatibility
                $amount = $data['purchase_amount'] ?? $data['amount'];
                $this->model->restock($data['id'], $amount, $data['reason'] ?? 'Restock');
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
