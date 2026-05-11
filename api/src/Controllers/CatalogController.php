<?php
namespace Trace\Controllers;
use Trace\Models\Vendor;
use Trace\Models\Tax;
use Trace\Models\Expense;
use Trace\Models\Recipe;

class CatalogController extends BaseController {
    // --- Vendors ---
    public function listVendors() {
        $this->jsonResponse((new Vendor())->getAll());
    }
    public function addVendor() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            $id = (new Vendor())->add($d['name'], $d['contact_info'] ?? null);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }

    // --- Taxes ---
    public function listTaxes() {
        $this->jsonResponse((new Tax())->getAll());
    }
    public function addTax() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            $id = (new Tax())->add($d['name'], $d['rate']);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }
    public function toggleTax() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            (new Tax())->toggle($d['id']);
            $this->jsonResponse(['success' => true]);
        }
    }
    public function deleteTax() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            (new Tax())->delete($d['id']);
            $this->jsonResponse(['success' => true]);
        }
    }

    // --- Expenses ---
    public function listExpenses() {
        $this->jsonResponse((new Expense())->getAll());
    }
    public function addExpense() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            $id = (new Expense())->add($d['description'], $d['amount'], $d['expense_date']);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }
    public function deleteExpense() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            (new Expense())->delete($d['id']);
            $this->jsonResponse(['success' => true]);
        }
    }

    // --- Recipes ---
    public function getRecipe() {
        $variantId = $_GET['variant_id'] ?? null;
        if (!$variantId) { $this->jsonResponse(['error' => 'variant_id required']); return; }
        $this->jsonResponse((new Recipe())->getByVariant($variantId));
    }
    public function saveRecipe() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            try {
                (new Recipe())->save($d['variant_id'], $d['ingredients']);
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }
}
