<?php

$host = "127.0.0.1";
$port = "3307";
$dbname = "control_cultivo";
$user = "root";
$pass = "";

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $e) {
    die(json_encode([
        "success" => false,
        "error" => "Error de conexión a la base de datos",
        "detalle" => $e->getMessage()
    ]));
}
?>