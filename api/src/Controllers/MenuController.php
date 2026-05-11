<?php
namespace Trace\Controllers;
use Trace\Models\Menu;

class MenuController extends BaseController {
    private $model;

    public function __construct() {
        $this->model = new Menu();
    }

    public function list() {
        $this->jsonResponse($this->model->getAll());
    }

    public function listCategories() {
        $this->jsonResponse($this->model->getCategories());
    }
}
