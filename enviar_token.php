<?php
session_start();
require 'config.php';

//  Rutas de PHPMailer
require '../../PHPMailer/src/Exception.php';
require '../../PHPMailer/src/PHPMailer.php';
require '../../PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = trim($_POST["email"] ?? "");
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        
        header("Location: ../../frontend/recuperar.html?error=" . urlencode("Correo electrónico no válido."));
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT id_admin, email, nombre_usuario FROM administrador WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        $token = bin2hex(random_bytes(32));
        $expira = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $update = $pdo->prepare("UPDATE administrador SET token_recuperacion = ?, expiracion_token = ? WHERE id_admin = ?");
        $update->execute([$token, $expira, $user['id_admin']]);
        
        // 
        $base_url = (isset($_SERVER['HTTPS']) ? "https://" : "http://") . $_SERVER['HTTP_HOST'];
        $project_folder = "/Panel-Cosecha-Z"; 
        $enlace = $base_url . $project_folder . "/backend/api/resetear_password.php?token=" . urlencode($token);
        //$enlace = "http://" . $_SERVER['HTTP_HOST'] . "/backend/api/resetear_password.php?token=" . urlencode($token);
        
        $mail = new PHPMailer(true);
        
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'invernaderoinstitucional@gmail.com';
            $mail->Password   = 'crzhyuowzbdvhxya'; 
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;
            
            $mail->setFrom('invernaderoinstitucional@gmail.com', 'Sistema Control Cultivo');
            $mail->addAddress($email);
            
            $mail->isHTML(true);
            $nombre = $user['nombre_usuario'] ?? $email;
            $mail->Subject = 'Recuperación de contraseña';
            $mail->Body    = "
            <html>
            <body>
                <h2>Hola, $nombre</h2>
                <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
                <p><a href='$enlace'>$enlace</a></p>
                <p><strong>Este enlace expirará en 1 hora.</strong></p>
                <p>Si no solicitaste este cambio, ignora este mensaje.</p>
                <hr>
                <p>Sistema de Control de Cultivo</p>
            </body>
            </html>
            ";
            
            $mail->AltBody = "Hola, $nombre\n\nHas solicitado restablecer tu contraseña. Copia y pega este enlace en tu navegador:\n\n$enlace\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste este cambio, ignora este mensaje.";
            
            $mail->send();
            
            
            header("Location: ../../frontend/recuperar.html?message=" . urlencode("Si el correo existe en nuestro sistema, recibirás un enlace de recuperación."));
            exit;
            
        } catch (Exception $e) {
            // 
            header("Location: ../../frontend/recuperar.html?error=" . urlencode("Error al enviar el correo. Por favor, intenta más tarde."));
            exit;
        }
    } else {
        // 
        header("Location: ../../frontend/recuperar.html?message=" . urlencode("Si el correo existe en nuestro sistema, recibirás un enlace de recuperación."));
        exit;
    }
} else {
    header("Location: ../../frontend/recuperar.html");
    exit;
}
?>