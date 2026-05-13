<?php
namespace Trace\Controllers;
use Trace\Models\Inventory;

class InventoryController extends BaseController {
    private $model;

    public function __construct() {
        $this->checkAuth();
        $this->model = new Inventory();
    }

    public function list() {
        $this->jsonResponse($this->model->getAll($this->currentLocationId));
    }

    public function listCategories() {
        $this->jsonResponse($this->model->getCategories($this->currentLocationId));
    }

    public function addCategory() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $id = $this->model->addCategory($this->currentLocationId, $data['name']);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }

    public function add() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $id = $this->model->add($this->currentLocationId, $data);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }

    public function update() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $id = $data['id'];
            unset($data['id']);
            $this->model->update($this->currentLocationId, $id, $data);
            $this->jsonResponse(['success' => true]);
        }
    }

    public function delete() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            try {
                $this->model->delete($this->currentLocationId, $data['id']);
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
                $amount = $data['purchase_amount'] ?? $data['amount'];
                $this->model->restock($this->currentLocationId, $data['id'], $amount, $data['reason'] ?? 'Restock');
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }
    
    public function logs() {
        $this->jsonResponse($this->model->getLogs($this->currentLocationId));
    }
}
