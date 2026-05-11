<?php
namespace Trace\Config;

class Database {
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            $config = require __DIR__ . '/env.php';
            
            $host = $config['DB_HOST'];
            $db = $config['DB_NAME'];
            $user = $config['DB_USER'];
            $pass = $config['DB_PASS'];
            $charset = $config['DB_CHARSET'];

            $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            try {
                self::$pdo = new \PDO($dsn, $user, $pass, $options);
            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed']);
                exit;
            }
        }
        return self::$pdo;
    }
}
