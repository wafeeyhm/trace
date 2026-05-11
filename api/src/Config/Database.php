<?php
namespace Trace\Config;

class Database {
    private static $host = 'localhost';
    private static $db = 'trace_db';
    private static $user = 'root';
    private static $pass = '';
    private static $charset = 'utf8mb4';
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            $dsn = "mysql:host=" . self::$host . ";dbname=" . self::$db . ";charset=" . self::$charset;
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
            ];
            try {
                self::$pdo = new \PDO($dsn, self::$user, self::$pass, $options);
            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed']);
                exit;
            }
        }
        return self::$pdo;
    }
}
