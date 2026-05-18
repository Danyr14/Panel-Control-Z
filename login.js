// Escuchar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
  const formLogin = document.getElementById('formLogin');
  
  if (formLogin) {
    formLogin.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const usuario = document.getElementById('usuario').value;
      const password = document.getElementById('password').value;
      
      // Credenciales predefinidas (puedes cambiarlas)
      const usuariosValidos = [
        { user: 'admin', pass: 'admin123' },
        { user: 'agricultor', pass: 'campo2024' },
        { user: 'invitado', pass: '1234' }
      ];
      
      // Buscar si el usuario existe
      const usuarioValido = usuariosValidos.find(u => 
        u.user === usuario && u.pass === password
      );
      
      if (usuarioValido) {
        // Guardar sesión
        localStorage.setItem('usuarioActivo', usuario);
        localStorage.setItem('sesionActiva', 'true');
        
        // Redirigir al dashboard
        window.location.href = 'dashboard.html';
      } else {
        alert('Usuario o contraseña incorrectos');
        
        // Limpiar campos
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
      }
    });
  }
});