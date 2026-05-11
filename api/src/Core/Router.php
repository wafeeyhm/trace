<?php
namespace Trace\Core;

class Router {
    private $routes = [];

    public function add($action, $controller, $method) {
        $this->routes[$action] = ['controller' => $controller, 'method' => $method];
    }

    public function dispatch($action) {
        if (isset($this->routes[$action])) {
            $route = $this->routes[$action];
            $controllerName = $route['controller'];
            $methodName = $route['method'];

            $controller = new $controllerName();
            $controller->$methodName();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Action not found: ' . $action]);
        }
    }
}
