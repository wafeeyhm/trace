<?php
namespace Trace\Controllers;

abstract class BaseController {
    protected function jsonResponse($data) {
        header("Content-Type: application/json");
        echo json_encode($data);
    }

    protected function getPostData() {
        return json_decode(file_get_contents('php://input'), true);
    }

    protected function getRequestMethod() {
        return $_SERVER['REQUEST_METHOD'];
    }
}
