<?php
namespace Trace\Controllers;
use Trace\Models\Vendor;
use Trace\Models\Tax;
use Trace\Models\Expense;
use Trace\Models\Recipe;

class CatalogController extends BaseController {
    public function __construct() {
        $this->checkAuth();
    }

    // --- Vendors (Tenant Scoped) ---
    public function listVendors() {
        $this->jsonResponse((new Vendor())->getAll($this->currentTenantId));
    }
    public function addVendor() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            $id = (new Vendor())->add($this->currentTenantId, $d['name'], $d['contact_info'] ?? null);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }

    // --- Taxes (Location Scoped) ---
    public function listTaxes() {
        $this->jsonResponse((new Tax())->getAll($this->currentLocationId));
    }
    public function addTax() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            $id = (new Tax())->add($this->currentLocationId, $d['name'], $d['rate']);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }
    public function toggleTax() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            (new Tax())->toggle($this->currentLocationId, $d['id']);
            $this->jsonResponse(['success' => true]);
        }
    }
    public function deleteTax() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            (new Tax())->delete($this->currentLocationId, $d['id']);
            $this->jsonResponse(['success' => true]);
        }
    }

    // --- Expenses (Location Scoped) ---
    public function listExpenses() {
        $this->jsonResponse((new Expense())->getAll($this->currentLocationId));
    }
    public function addExpense() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            $id = (new Expense())->add($this->currentLocationId, $d['description'], $d['amount'], $d['expense_date']);
            $this->jsonResponse(['success' => true, 'id' => $id]);
        }
    }
    public function deleteExpense() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            (new Expense())->delete($this->currentLocationId, $d['id']);
            $this->jsonResponse(['success' => true]);
        }
    }

    // --- Recipes (Location Scoped) ---
    public function getRecipe() {
        $variantId = $_GET['variant_id'] ?? null;
        if (!$variantId) { $this->jsonResponse(['error' => 'variant_id required']); return; }
        $this->jsonResponse((new Recipe())->getByVariant($this->currentLocationId, $variantId));
    }
    public function saveRecipe() {
        if ($this->getRequestMethod() === 'POST') {
            $d = $this->getPostData();
            try {
                (new Recipe())->save($this->currentLocationId, $d['variant_id'], $d['ingredients']);
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()]);
            }
        }
    }
}
