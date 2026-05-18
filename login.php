<?php
session_start();
require 'config.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $email = trim($_POST["email"] ?? "");
    $password = $_POST["password"] ?? "";
    $consentimiento = $_POST["consentimiento"] ?? "";

    if ($email === "" || $password === "") {
        header("Location: ../../frontend/login.html?error=" . urlencode("Por favor, complete todos los campos."));
        exit;
    }

    if ($consentimiento === "") {
        header("Location: ../../frontend/login.html?error=" . urlencode("Debes aceptar el aviso de privacidad y los términos."));
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header("Location: ../../frontend/login.html?error=" . urlencode("Por favor, ingrese un correo válido."));
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id_admin, email, password_hash FROM administrador WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user["password_hash"])) {

            session_regenerate_id(true);

            $_SESSION["email"] = $user["email"];
            $_SESSION["id_admin"] = $user["id_admin"];

            header("Location: ../../frontend/index.html");
            exit;

        } else {
            header("Location: ../../frontend/login.html?error=" . urlencode("Correo o contraseña incorrectos."));
            exit;
        }

    } catch (PDOException $e) {
        header("Location: ../../frontend/login.html?error=" . urlencode("Error al consultar la base de datos."));
        exit;
    }

} else {
    header("Location: ../../frontend/login.html");
    exit;
}
?>