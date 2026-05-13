<?php
namespace Trace\Controllers;

use Trace\Models\User;

class AuthController extends BaseController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function login() {
        if ($this->getRequestMethod() === 'POST') {
            $data = $this->getPostData();
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';

            try {
                $user = $this->userModel->authenticate($email, $password);
                if ($user) {
                    session_start();
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['tenant_id'] = $user['tenant_id'];
                    $_SESSION['location_id'] = $user['location_id'];
                    $_SESSION['role'] = $user['role'];
                    $_SESSION['user_name'] = $user['name'];

                    $this->jsonResponse([
                        'success' => true,
                        'user' => [
                            'name' => $user['name'],
                            'role' => $user['role'],
                            'location_id' => $user['location_id']
                        ]
                    ]);
                } else {
                    $this->jsonResponse(['error' => 'Invalid credentials'], 401);
                }
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()], 500);
            }
        }
    }

    public function logout() {
        session_start();
        session_destroy();
        $this->jsonResponse(['success' => true]);
    }

    public function me() {
        session_start();
        if (isset($_SESSION['user_id'])) {
            $this->jsonResponse([
                'authenticated' => true,
                'user' => [
                    'name' => $_SESSION['user_name'],
                    'role' => $_SESSION['role'],
                    'location_id' => $_SESSION['location_id']
                ]
            ]);
        } else {
            $this->jsonResponse(['authenticated' => false], 401);
        }
    }
}
