const API_URL = 'http://localhost/PANEL-COSECHA-Z/backend/api/api.php';

let actuadoresEstado = {
  ventilador: false,
  aspersor: false
};

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'notification-toast';

  let bgColor = '#2c3e50';
  if (type === 'success') bgColor = '#27ae60';
  if (type === 'error') bgColor = '#e74c3c';
  if (type === 'warning') bgColor = '#f39c12';

  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function pintarToggle(actuador, encendido) {
  const toggle = document.querySelector(`.toggle-switch[data-actuador="${actuador}"]`);

  if (!toggle) {
    console.warn(`No se encontró toggle para: ${actuador}`);
    return;
  }

  toggle.classList.remove('toggle-on', 'toggle-off');
  toggle.classList.add(encendido ? 'toggle-on' : 'toggle-off');
}

function actualizarResumen() {
  const activos = Object.values(actuadoresEstado).filter(Boolean).length;
  const inactivos = Object.values(actuadoresEstado).filter(estado => !estado).length;

  const activosSpan = document.querySelector('.mini-summary:first-child strong');
  const inactivosSpan = document.querySelector('.mini-summary:nth-child(2) strong');
  const modoSpan = document.querySelector('.mini-summary:nth-child(3) strong');

  if (activosSpan) activosSpan.textContent = activos;
  if (inactivosSpan) inactivosSpan.textContent = inactivos;
  if (modoSpan) modoSpan.textContent = 'Manual';
}

async function cargarEstadoActuadores() {
  try {
    const respuesta = await fetch(`${API_URL}?action=get_estado_actuadores&t=${Date.now()}`);

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    actuadoresEstado.ventilador = datos.ventilador === 'encendido';
    actuadoresEstado.aspersor =
      datos.aspersor === 'encendido' ||
      datos.bomba === 'encendido';

    pintarToggle('ventilador', actuadoresEstado.ventilador);
    pintarToggle('aspersor', actuadoresEstado.aspersor);

    actualizarResumen();

    console.log('Estados cargados:', datos);

  } catch (error) {
    console.error('Error cargando actuadores:', error);
    showNotification('No se pudo cargar el estado de los actuadores', 'error');
  }
}

async function cambiarEstadoActuador(actuador, encender) {
  const estado = encender ? 'encendido' : 'apagado';

  try {
    const respuesta = await fetch(`${API_URL}?action=cambiar_estado_actuador`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actuador: actuador,
        estado: estado
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || datos.success === false) {
      throw new Error(datos.error || `HTTP ${respuesta.status}`);
    }

    actuadoresEstado[actuador] = encender;
    pintarToggle(actuador, encender);
    actualizarResumen();

    showNotification(`${actuador} ${estado} correctamente`, 'success');

    console.log('Cambio manual enviado:', datos);

  } catch (error) {
    console.error('Error cambiando actuador:', error);
    showNotification(`No se pudo cambiar ${actuador}`, 'error');
    cargarEstadoActuadores();
  }
}

async function apagarTodo() {
  await cambiarEstadoActuador('ventilador', false);
  await cambiarEstadoActuador('aspersor', false);
}

async function encenderTodo() {
  await cambiarEstadoActuador('ventilador', true);
  await cambiarEstadoActuador('aspersor', true);
}

function actualizarBarra(barra, porcentaje) {
  porcentaje = Math.max(0, Math.min(100, porcentaje));

  const fill = barra.querySelector('.param-fill');
  const thumb = barra.querySelector('.param-thumb');
  const valorTexto = barra.closest('.param-item')?.querySelector('.param-top strong');

  if (fill) fill.style.width = `${porcentaje}%`;
  if (thumb) thumb.style.left = `${porcentaje}%`;
  if (valorTexto) valorTexto.textContent = `${Math.round(porcentaje)}%`;
}

function getValorPorClick(barra, clientX) {
  const rect = barra.getBoundingClientRect();
  const x = clientX - rect.left;
  const porcentaje = (x / rect.width) * 100;

  return Math.max(0, Math.min(100, porcentaje));
}

document.addEventListener('DOMContentLoaded', function() {
  const toggles = document.querySelectorAll('.toggle-switch[data-actuador]');

  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const actuador = this.dataset.actuador;
      const estaEncendido = this.classList.contains('toggle-on');

      cambiarEstadoActuador(actuador, !estaEncendido);
    });
  });

  const apagarTodoBtn = document.querySelector('.control-actions .off-btn');
  const encenderTodoBtn = document.querySelector('.control-actions .on-btn');

  if (apagarTodoBtn) {
    apagarTodoBtn.addEventListener('click', apagarTodo);
  }

  if (encenderTodoBtn) {
    encenderTodoBtn.addEventListener('click', encenderTodo);
  }

  const paramBars = document.querySelectorAll('.param-bar');

  paramBars.forEach(barra => {
    const fill = barra.querySelector('.param-fill');

    let valorInicial = 0;

    if (fill) {
      if (fill.classList.contains('humidity-fill')) valorInicial = 80;
      if (fill.classList.contains('fan-fill')) valorInicial = 40;
      if (fill.classList.contains('spray-fill')) valorInicial = 55;
    }

    actualizarBarra(barra, valorInicial);

    barra.addEventListener('click', function(e) {
      const nuevoValor = getValorPorClick(this, e.clientX);
      actualizarBarra(this, nuevoValor);
    });
  });

  const updateBtn = document.querySelector('.update-main-btn');

  if (updateBtn) {
    updateBtn.addEventListener('click', function() {
      showNotification('Parámetros actualizados visualmente', 'success');
    });
  }

  const path = window.location.pathname;
  const links = document.querySelectorAll('.nav-link');

  links.forEach(link => {
    if (link.href.includes(path)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  cargarEstadoActuadores();

  setInterval(cargarEstadoActuadores, 10000);
});