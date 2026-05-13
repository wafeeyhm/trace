<?php
/**
 * Trace Pro - API Front Controller
 * MVC implementation for modular and secure data handling.
 */

// PSR-4 style Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'Trace\\';
    $base_dir = __DIR__ . '/src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

use Trace\Core\Router;
use Trace\Controllers\MenuController;
use Trace\Controllers\InventoryController;
use Trace\Controllers\TransactionController;
use Trace\Controllers\CatalogController;
use Trace\Controllers\AuthController;

header("Content-Type: application/json");

// Initialize Router
$router = new Router();

// --- Auth ---
$router->add('login', AuthController::class, 'login');
$router->add('logout', AuthController::class, 'logout');
$router->add('get_me', AuthController::class, 'me');

// --- Menu ---
$router->add('get_menu', MenuController::class, 'list');
$router->add('get_menu_categories', MenuController::class, 'listCategories');

// --- Inventory ---
$router->add('get_inventory', InventoryController::class, 'list');
$router->add('get_inventory_categories', InventoryController::class, 'listCategories');
$router->add('add_inventory_category', InventoryController::class, 'addCategory');
$router->add('add_inventory_item', InventoryController::class, 'add');
$router->add('update_inventory_item', InventoryController::class, 'update');
$router->add('delete_inventory_item', InventoryController::class, 'delete');
$router->add('restock_item', InventoryController::class, 'restock');
$router->add('get_inventory_logs', InventoryController::class, 'logs');

// --- Transactions & Analytics ---
$router->add('process_order', TransactionController::class, 'processOrder');
$router->add('add_waste', TransactionController::class, 'addWaste');
$router->add('get_analytics', TransactionController::class, 'analytics');
$router->add('get_pending_orders', TransactionController::class, 'pendingOrders');
$router->add('update_kds_status', TransactionController::class, 'updateKdsStatus');

// --- Vendors ---
$router->add('get_vendors', CatalogController::class, 'listVendors');
$router->add('add_vendor', CatalogController::class, 'addVendor');

// --- Taxes ---
$router->add('get_taxes', CatalogController::class, 'listTaxes');
$router->add('add_tax', CatalogController::class, 'addTax');
$router->add('toggle_tax', CatalogController::class, 'toggleTax');
$router->add('delete_tax', CatalogController::class, 'deleteTax');

// --- Expenses ---
$router->add('get_expenses', CatalogController::class, 'listExpenses');
$router->add('add_expense', CatalogController::class, 'addExpense');
$router->add('delete_expense', CatalogController::class, 'deleteExpense');

// --- Recipes ---
$router->add('get_recipe', CatalogController::class, 'getRecipe');
$router->add('save_recipe', CatalogController::class, 'saveRecipe');

// Dispatch
$action = $_GET['action'] ?? '';
$router->dispatch($action);
