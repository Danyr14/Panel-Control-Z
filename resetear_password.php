<?php
session_start();
require 'config.php';

$token = $_GET['token'] ?? '';
$error = '';
$success = '';
$user = null;

// Verificar token
if (!empty($token)) {
    $stmt = $pdo->prepare("SELECT id_admin, email FROM administrador WHERE token_recuperacion = ? AND expiracion_token > NOW()");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        $error = "El enlace de recuperación no es válido o ha expirado.";
    }
} else {
    
    header("Location: ../../frontend/recuperar.html");
    exit;
}

// Procesar nueva contraseña
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST['new_password']) && $user) {
    $new_password = $_POST['new_password'];
    $confirm_password = $_POST['confirm_password'];
    
    if (strlen($new_password) < 8) {
        $error = "La contraseña debe tener al menos 8 caracteres.";
    } elseif (!preg_match("/[A-Z]/", $new_password)) {
        $error = "La contraseña debe contener al menos una mayúscula.";
    } elseif (!preg_match("/[0-9]/", $new_password)) {
        $error = "La contraseña debe contener al menos un número.";
    } elseif ($new_password !== $confirm_password) {
        $error = "Las contraseñas no coinciden.";
    } else {
        $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        $update = $pdo->prepare("UPDATE administrador SET password_hash = ?, token_recuperacion = NULL, expiracion_token = NULL WHERE id_admin = ?");
        $update->execute([$password_hash, $user['id_admin']]);
        
        $success = "¡Contraseña actualizada correctamente!";
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Restablecer Contraseña</title>
    <link rel="stylesheet" href="../../css/resetear.css">

</head>
<body>
    <h2>Restablecer Contraseña</h2>
    
    <?php if ($error): ?>
        <div class="error"><?php echo htmlspecialchars($error); ?></div>
    <?php endif; ?>
    
    <?php if ($success): ?>
        <div class="success">
            <?php echo htmlspecialchars($success); ?>
            <p>Serás redirigido al login en <span id="contador">5</span> segundos...</p>
        </div>
        <script>
            let segundos = 5;
            const contador = document.getElementById('contador');
            const intervalo = setInterval(() => {
                segundos--;
                contador.textContent = segundos;
                if (segundos <= 0) {
                    clearInterval(intervalo);
                    
                    window.location.href = '../../frontend/login.html';
                }
            }, 1000);
        </script>
    <?php elseif (!$error && $user): ?>
        <form method="POST">
            <div>
                <label for="new_password">Nueva contraseña:</label>
                <input type="password" id="new_password" name="new_password" required>
                <div class="requirements">
                    * Mínimo 8 caracteres<br>
                    * Al menos una mayúscula<br>
                    * Al menos un número
                </div>
            </div>
            <div>
                <label for="confirm_password">Confirmar contraseña:</label>
                <input type="password" id="confirm_password" name="confirm_password" required>
            </div>
            <button type="submit">Cambiar contraseña</button>
        </form>
    <?php endif; ?>
    
    
    <p><a href="../../frontend/login.html">Volver al inicio de sesión</a></p>
</body>
</html>