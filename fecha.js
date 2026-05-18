// ========== RELOJ EN TIEMPO REAL CDMX ==========
function actualizarFechaHoraCDMX() {
  const ahora = new Date();
  
  // Formato de fecha
  const fecha = ahora.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Formato de hora
  const hora = ahora.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const fechaElement = document.getElementById('fecha-actual');
  const horaElement = document.getElementById('hora-actual');
  
  if (fechaElement) {
    fechaElement.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  }
  if (horaElement) {
    horaElement.textContent = hora;
  }
}

// ========== NAVEGACIÓN ACTIVA ==========
function setActiveNavigation() {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll('.nav-link');
  
  links.forEach(link => {
    if (link.href.includes(currentPath)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ========== INICIALIZAR TODO AL CARGAR ==========
document.addEventListener('DOMContentLoaded', function() {
  // Iniciar reloj
  actualizarFechaHoraCDMX();
  setInterval(actualizarFechaHoraCDMX, 1000);
  
  // Activar navegación
  setActiveNavigation();
});