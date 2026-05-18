<?php
session_start();
require 'config.php';

// Verificar si el usuario está logueado
if (!isset($_SESSION["email"])) {
    
    header("Location: ../../frontend/");
    exit;
}

// Obtener información del usuario
$stmt = $pdo->prepare("SELECT nombre_usuario, email, fecha_registro FROM administrador WHERE id_admin = ?");
$stmt->execute([$_SESSION["id_admin"]]);
$user_data = $stmt->fetch(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel de Control</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .container {
            background: #B6CCC1;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .info {
            margin: 20px 0;
            padding: 15px;
            background: white;
            border-radius: 5px;
        }
        .logout {
            display: inline-block;
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .logout:hover {
            background: #c82333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Bienvenido, <?php echo htmlspecialchars($user_data['nombre_usuario'] ?? $_SESSION["email"]); ?>!</h1>
        
        <div class="info">
            <h3>Información de tu cuenta:</h3>
            <p><strong>Email:</strong> <?php echo htmlspecialchars($_SESSION["email"]); ?></p>
            <?php if ($user_data && $user_data['fecha_registro']): ?>
                <p><strong>Miembro desde:</strong> <?php echo htmlspecialchars($user_data['fecha_registro']); ?></p>
            <?php endif; ?>
        </div>
        
        
        <a href="" class="logout">Cerrar sesión</a>
    </div>
</body>
</html>