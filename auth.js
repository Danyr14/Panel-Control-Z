// ============================================
//  SISTEMA DE AUTENTICACIÓN (Frontend)
// ============================================

// Claves para localStorage
const STORAGE_KEYS = {
    USUARIO: 'usuario_actual',
    NOTIFICACIONES: 'notificaciones'
};

// Usuario por defecto (simulado)
const USUARIO_DEFAULT = {
    id: 1,
    nombre: "Invernadero",
    email: "invernaderoinstitucional@gmail.com",
    fecha_registro: "2026-02-15"
};

// Inicializar usuario si no existe
function iniciarSesionFrontend(email, nombre) {
    const usuario = {
        id: Date.now(),
        nombre: nombre || email.split('@')[0],
        email: email,
        fecha_registro: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuario));
    return usuario;
}

// Obtener usuario actual
function getUsuarioActual() {
    const usuario = localStorage.getItem(STORAGE_KEYS.USUARIO);
    if (usuario) {
        return JSON.parse(usuario);
    }
    // Si no hay usuario, usar el default
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(USUARIO_DEFAULT));
    return USUARIO_DEFAULT;
}

// Actualizar nombre del usuario
function actualizarNombreUsuario(nuevoNombre) {
    const usuario = getUsuarioActual();
    usuario.nombre = nuevoNombre;
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuario));
    
    // Actualizar en la UI
    actualizarUINombreUsuario();
    return usuario;
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
    // Redirigir al login
    window.location.href = '../frontend/login.html';
}

// Actualizar el nombre en todos los lugares de la UI
function actualizarUINombreUsuario() {
    const usuario = getUsuarioActual();
    const elementosNombre = document.querySelectorAll('.user-name, .perfil-nombre, .nombre-usuario');
    elementosNombre.forEach(el => {
        if (el.classList.contains('user-name')) {
            el.textContent = usuario.nombre;
        }
    });
}

// ============================================
//  SISTEMA DE NOTIFICACIONES
// ============================================

// Notificaciones por defecto
const NOTIFICACIONES_DEFAULT = [
    { id: 1, titulo: " Temperatura alta", mensaje: "La temperatura ha superado los 28°C", leida: false, fecha: new Date().toISOString(), tipo: "", panel: "dashboard" },
    { id: 2, titulo: " Humedad crítica", mensaje: "La humedad está en 80%, revisar ventilación", leida: false, fecha: new Date().toISOString(), tipo: "", panel: "sensores" },
    { id: 3, titulo: " Sistema conectado", mensaje: "ESP32 conectado correctamente", leida: true, fecha: new Date().toISOString(), tipo: "", panel: "dashboard" },
    { id: 4, titulo: " Actualización disponible", mensaje: "Nueva versión del firmware disponible", leida: false, fecha: new Date().toISOString(), tipo: "", panel: "configuracion" }
];

// Inicializar notificaciones
function inicializarNotificaciones() {
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICACIONES)) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES, JSON.stringify(NOTIFICACIONES_DEFAULT));
    }
}

// Obtener todas las notificaciones
function getNotificaciones() {
    const notis = localStorage.getItem(STORAGE_KEYS.NOTIFICACIONES);
    return notis ? JSON.parse(notis) : [];
}

// Agregar nueva notificación
function agregarNotificacion(titulo, mensaje, tipo = 'info', panel = 'dashboard') {
    const notificaciones = getNotificaciones();
    const nuevaNoti = {
        id: Date.now(),
        titulo: titulo,
        mensaje: mensaje,
        leida: false,
        fecha: new Date().toISOString(),
        tipo: tipo,
        panel: panel
    };
    notificaciones.unshift(nuevaNoti);
    localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
    actualizarBadgeNotificaciones();
    return nuevaNoti;
}

// Marcar notificación como leída
function marcarNotificacionLeida(id) {
    const notificaciones = getNotificaciones();
    const index = notificaciones.findIndex(n => n.id === id);
    if (index !== -1) {
        notificaciones[index].leida = true;
        localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
        actualizarBadgeNotificaciones();
    }
}

// Marcar todas como leídas
function marcarTodasNotificacionesLeidas() {
    const notificaciones = getNotificaciones();
    notificaciones.forEach(n => n.leida = true);
    localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
    actualizarBadgeNotificaciones();
}

// Obtener cantidad de notificaciones no leídas
function getNotificacionesNoLeidas() {
    return getNotificaciones().filter(n => !n.leida).length;
}

// Actualizar badge del botón de notificaciones
function actualizarBadgeNotificaciones() {
    const badge = document.querySelector('.notificaciones-badge');
    const noLeidas = getNotificacionesNoLeidas();
    
    if (badge) {
        if (noLeidas > 0) {
            badge.textContent = noLeidas > 9 ? '9+' : noLeidas;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mostrar modal de notificaciones
function mostrarModalNotificaciones() {
    const notificaciones = getNotificaciones();
    const modal = document.createElement('div');
    modal.className = 'modal-notificaciones';
    modal.innerHTML = `
        <div class="modal-notificaciones-content">
            <div class="modal-header">
                <h3> Notificaciones</h3>
                <div>
                    <button class="btn-marcar-todas" id="marcarTodas">Marcar todas como leídas</button>
                    <button class="btn-cerrar-modal" id="cerrarModalNotis">✕</button>
                </div>
            </div>
            <div class="modal-body" id="listaNotificaciones">
                ${notificaciones.length === 0 ? '<p class="sin-notificaciones">No hay notificaciones</p>' : 
                    notificaciones.map(noti => `
                        <div class="notificacion-item ${noti.leida ? 'leida' : 'no-leida'}" data-id="${noti.id}">
                            <div class="notificacion-icon ${noti.tipo}">${getIconoTipo(noti.tipo)}</div>
                            <div class="notificacion-contenido">
                                <div class="notificacion-titulo">${noti.titulo}</div>
                                <div class="notificacion-mensaje">${noti.mensaje}</div>
                                <div class="notificacion-fecha">${formatearFechaNotificacion(noti.fecha)}</div>
                                <div class="notificacion-panel">Panel: ${noti.panel}</div>
                            </div>
                            ${!noti.leida ? `<button class="btn-marcar-leida" data-id="${noti.id}">✓</button>` : ''}
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Eventos del modal
    document.getElementById('cerrarModalNotis')?.addEventListener('click', () => modal.remove());
    document.getElementById('marcarTodas')?.addEventListener('click', () => {
        marcarTodasNotificacionesLeidas();
        modal.remove();
        mostrarModalNotificaciones();
    });
    
    document.querySelectorAll('.btn-marcar-leida').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            marcarNotificacionLeida(id);
            modal.remove();
            mostrarModalNotificaciones();
        });
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function getIconoTipo(tipo) {
    switch(tipo) {
        case 'success': return '';
        case 'warning': return '';
        case 'danger': return '';
        default: return '';
    }
}

function formatearFechaNotificacion(fecha) {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora - date;
    const minutos = Math.floor(diff / 60000);
    
    if (minutos < 1) return 'Hace unos segundos';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (minutos < 1440) return `Hace ${Math.floor(minutos / 60)} h`;
    return date.toLocaleDateString('es-MX');
}

// ============================================
//  MODAL DE CONFIGURACIÓN
// ============================================

function mostrarModalConfiguracion() {
    const usuario = getUsuarioActual();
    const modal = document.createElement('div');
    modal.className = 'modal-configuracion';
    modal.innerHTML = `
        <div class="modal-configuracion-content">
            <div class="modal-header">
                <h3> Configuración</h3>
                <button class="btn-cerrar-modal" id="cerrarModalConfig">✕</button>
            </div>
            <div class="modal-body">
                <div class="config-group">
                    <label> Nombre de usuario</label>
                    <input type="text" id="configNombre" value="${usuario.nombre}" placeholder="Tu nombre">
                </div>
                <div class="config-group">
                    <label> Email</label>
                    <input type="email" id="configEmail" value="${usuario.email}" readonly disabled style="background:#f5f5f5">
                </div>
                <div class="config-group">
                    <label> Miembro desde</label>
                    <input type="text" value="${usuario.fecha_registro}" readonly disabled style="background:#f5f5f5">
                </div>
                <div class="config-buttons">
                    <button class="btn-guardar" id="guardarConfig">Guardar cambios</button>
                    <button class="btn-cancelar" id="cancelarConfig">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    document.getElementById('cerrarModalConfig')?.addEventListener('click', () => modal.remove());
    document.getElementById('cancelarConfig')?.addEventListener('click', () => modal.remove());
    document.getElementById('guardarConfig')?.addEventListener('click', () => {
        const nuevoNombre = document.getElementById('configNombre').value.trim();
        if (nuevoNombre) {
            actualizarNombreUsuario(nuevoNombre);
            modal.remove();
            mostrarModalExito('Nombre actualizado correctamente');
        } else {
            mostrarModalError('El nombre no puede estar vacío');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ============================================
//  MODAL DE PERFIL
// ============================================

function mostrarModalPerfil() {
    const usuario = getUsuarioActual();
    const modal = document.createElement('div');
    modal.className = 'modal-perfil';
    modal.innerHTML = `
        <div class="modal-perfil-content">
            <div class="modal-header">
                <h3> Mi Perfil</h3>
                <button class="btn-cerrar-modal" id="cerrarModalPerfil">✕</button>
            </div>
            <div class="modal-body">
                <div class="perfil-avatar">
                    <div class="avatar-circle">${usuario.nombre.charAt(0).toUpperCase()}</div>
                </div>
                <div class="perfil-info">
                    <div class="perfil-nombre">${usuario.nombre}</div>
                    <div class="perfil-email">${usuario.email}</div>
                    <div class="perfil-fecha">Miembro desde: ${usuario.fecha_registro}</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    document.getElementById('cerrarModalPerfil')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ============================================
//  MODALES DE MENSAJE
// ============================================

function mostrarModalExito(mensaje) {
    mostrarModalMensaje(mensaje, 'success', '✅ Éxito');
}

function mostrarModalError(mensaje) {
    mostrarModalMensaje(mensaje, 'error', '❌ Error');
}

function mostrarModalMensaje(mensaje, tipo, titulo) {
    const modal = document.createElement('div');
    modal.className = 'modal-mensaje';
    modal.innerHTML = `
        <div class="modal-mensaje-content ${tipo}">
            <h3>${titulo}</h3>
            <p>${mensaje}</p>
            <button class="btn-ok" id="btnOk">Aceptar</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    document.getElementById('btnOk')?.addEventListener('click', () => modal.remove());
    setTimeout(() => modal.remove(), 2000);
}

// ============================================
//  INICIALIZACIÓN
// ============================================

function inicializarBarraSuperior() {
    // Mostrar nombre del usuario
    actualizarUINombreUsuario();
    
    // Inicializar notificaciones
    inicializarNotificaciones();
    actualizarBadgeNotificaciones();
    
    // Agregar badge al botón de notificaciones
    const btnNotificaciones = document.querySelector('.icon-btn[title="Notificaciones"]');
    if (btnNotificaciones && !btnNotificaciones.querySelector('.notificaciones-badge')) {
        const badge = document.createElement('span');
        badge.className = 'notificaciones-badge';
        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #e74c3c;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        `;
        btnNotificaciones.style.position = 'relative';
        btnNotificaciones.appendChild(badge);
        actualizarBadgeNotificaciones();
    }
    
    // Evento: Notificaciones
    document.querySelector('.icon-btn[title="Notificaciones"]')?.addEventListener('click', () => {
        mostrarModalNotificaciones();
    });
    
    // Evento: Configuración
    document.querySelector('.icon-btn[title="Configuración"]')?.addEventListener('click', () => {
        mostrarModalConfiguracion();
    });
    
    // Evento: Perfil
    document.querySelector('.icon-btn[title="Perfil"]')?.addEventListener('click', () => {
        mostrarModalPerfil();
    });
    
    // Evento: Cerrar sesión
    document.querySelector('.icon-btn[title="Cerrar sesión"]')?.addEventListener('click', () => {
        mostrarConfirmacionCierre();
    });
}

function mostrarConfirmacionCierre() {
    const modal = document.createElement('div');
    modal.className = 'modal-confirmacion';
    modal.innerHTML = `
        <div class="modal-confirmacion-content">
            <h3> Cerrar sesión</h3>
            <p>¿Estás seguro de que quieres cerrar sesión?</p>
            <div class="confirmacion-buttons">
                <button class="btn-confirmar" id="confirmarCierre">Sí, cerrar sesión</button>
                <button class="btn-cancelar" id="cancelarCierre">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    document.getElementById('confirmarCierre')?.addEventListener('click', () => {
        cerrarSesion();
    });
    document.getElementById('cancelarCierre')?.addEventListener('click', () => {
        modal.remove();
    });
}

// Agregar estilos
function agregarEstilosBarraSuperior() {
    if (document.querySelector('#estilos-barra-superior')) return;
    
    const style = document.createElement('style');
    style.id = 'estilos-barra-superior';
    style.textContent = `
        /* Modal Notificaciones */
        .modal-notificaciones, .modal-configuracion, .modal-perfil, .modal-mensaje, .modal-confirmacion {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: none;
            justify-content: center;
            align-items: center;
        }
        
        .modal-notificaciones-content, .modal-configuracion-content, .modal-perfil-content {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .modal-perfil-content {
            max-width: 400px;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e8e4;
            background: var(--green-soft);
        }
        
        .modal-header h3 {
            margin: 0;
        }
        
        .btn-cerrar-modal {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        
        .modal-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .notificacion-item {
            display: flex;
            gap: 12px;
            padding: 12px;
            border-bottom: 1px solid #eee;
            transition: background 0.2s;
        }
        
        .notificacion-item.no-leida {
            background: #e8f5ec;
        }
        
        .notificacion-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .notificacion-contenido {
            flex: 1;
        }
        
        .notificacion-titulo {
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .notificacion-mensaje {
            font-size: 13px;
            color: #666;
            margin-bottom: 4px;
        }
        
        .notificacion-fecha, .notificacion-panel {
            font-size: 11px;
            color: #999;
        }
        
        .btn-marcar-leida {
            background: var(--green);
            color: white;
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
        }
        
        .btn-marcar-todas {
            background: none;
            border: none;
            color: var(--green);
            cursor: pointer;
            font-size: 12px;
        }
        
        .config-group {
            margin-bottom: 20px;
        }
        
        .config-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .config-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        
        .config-buttons {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }
        
        .btn-guardar {
            background: var(--green);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            flex: 1;
        }
        
        .btn-cancelar {
            background: #95a5a6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            flex: 1;
        }
        
        .perfil-avatar {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .avatar-circle {
            width: 80px;
            height: 80px;
            background: var(--green);
            color: white;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: bold;
        }
        
        .perfil-info {
            text-align: center;
        }
        
        .perfil-nombre {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .perfil-email {
            color: #666;
            margin-bottom: 8px;
        }
        
        .perfil-fecha {
            font-size: 12px;
            color: #999;
        }
        
        .modal-mensaje-content {
            background: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            min-width: 280px;
        }
        
        .modal-mensaje-content.success { border-top: 4px solid #27ae60; }
        .modal-mensaje-content.error { border-top: 4px solid #e74c3c; }
        
        .btn-ok {
            background: var(--green);
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 8px;
            margin-top: 15px;
            cursor: pointer;
        }
        
        .modal-confirmacion-content {
            background: white;
            padding: 25px;
            border-radius: 16px;
            text-align: center;
            min-width: 300px;
        }
        
        .confirmacion-buttons {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }
        
        .btn-confirmar {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            flex: 1;
        }
        
        .sin-notificaciones {
            text-align: center;
            color: #999;
            padding: 40px;
        }
    `;
    document.head.appendChild(style);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    agregarEstilosBarraSuperior();
    inicializarBarraSuperior();
});