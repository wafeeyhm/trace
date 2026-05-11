<?php
/**
 * Trace Pro - API Front Controller
 * MVC implementation for modular and secure data handling.
 */

// Simple Autoloader
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

header("Content-Type: application/json");

// Initialize Router
$router = new Router();

// Menu Routes
$router->add('get_menu', MenuController::class, 'list');
$router->add('get_menu_categories', MenuController::class, 'listCategories');

// Inventory Routes
$router->add('get_inventory', InventoryController::class, 'list');
$router->add('get_inventory_categories', InventoryController::class, 'listCategories');
$router->add('add_inventory_category', InventoryController::class, 'addCategory');
$router->add('restock_item', InventoryController::class, 'restock');
$router->add('get_inventory_logs', InventoryController::class, 'logs');

// Transaction & Analytics Routes
$router->add('process_order', TransactionController::class, 'processOrder');
$router->add('get_analytics', TransactionController::class, 'analytics');

// Dispatch
$action = $_GET['action'] ?? '';
$router->dispatch($action);
