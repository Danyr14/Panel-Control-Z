const API_URL = 'http://localhost/PANEL-COSECHA-Z/backend/api/api.php';

let reglasActuales = [];

// Mapa según tu base actual
const sensores = {
  1: { nombre: 'DHT11 Temperatura', etiqueta: 'Temperatura', unidad: '°C' },
  2: { nombre: 'DHT11 Humedad ambiental', etiqueta: 'Humedad ambiente', unidad: '%' },
  3: { nombre: 'MQ-135 Calidad de aire', etiqueta: 'Calidad de aire', unidad: 'RAW' },
  4: { nombre: 'Sensor Humedad de suelo', etiqueta: 'Humedad de suelo', unidad: '%' }
};

const actuadores = {
  5: { nombre: 'Aspersor / Bomba' },
  6: { nombre: 'Ventilador' }
};

function showConfirmModal(message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-content">
      <h3>Confirmar acción</h3>
      <p>${message}</p>
      <button class="action-btn on-btn" id="confirmYes">Sí</button>
      <button class="action-btn off-btn" id="confirmNo">No</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';

  modal.querySelector('#confirmYes').onclick = () => {
    onConfirm();
    modal.remove();
  };

  modal.querySelector('#confirmNo').onclick = () => {
    modal.remove();
  };
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');

  let bgColor = '#2c3e50';
  let icon = 'ℹ️';

  if (type === 'success') {
    bgColor = '#27ae60';
    icon = '✅';
  }

  if (type === 'error') {
    bgColor = '#e74c3c';
    icon = '❌';
  }

  if (type === 'warning') {
    bgColor = '#f39c12';
    icon = '⚠️';
  }

  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  notification.innerHTML = `${icon} ${message}`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function operadorVisual(operador) {
  const mapa = {
    '<=': '≤',
    '>=': '≥',
    '==': '='
  };

  return mapa[operador] || operador;
}

function operadorBD(operador) {
  const mapa = {
    '≤': '<=',
    '≥': '>=',
    '=': '=='
  };

  return mapa[operador] || operador;
}

function obtenerSensor(idSensor) {
  return sensores[idSensor] || {
    nombre: `Sensor ${idSensor}`,
    etiqueta: `Sensor ${idSensor}`,
    unidad: ''
  };
}

function obtenerActuador(idActuador) {
  return actuadores[idActuador] || {
    nombre: `Actuador ${idActuador}`
  };
}

function textoCondicion(regla) {
  const sensor = obtenerSensor(Number(regla.id_sensor_condicion));
  return `${sensor.etiqueta} ${operadorVisual(regla.condicion_operador)} ${parseFloat(regla.condicion_valor)} ${sensor.unidad}`;
}

function textoAccion(regla) {
  const accion = regla.accion_resultado === 'encender' ? 'Encender' : 'Apagar';
  return accion;
}

async function cargarReglas() {
  const tbody = document.getElementById('reglasBody');

  try {
    const respuesta = await fetch(`${API_URL}?action=get_automatizaciones&t=${Date.now()}`);

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();
    reglasActuales = Array.isArray(datos) ? datos : [];

    if (reglasActuales.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:20px;">
            No hay reglas registradas.
          </td>
        </tr>
      `;
      return;
    }

    renderizarReglas();

  } catch (error) {
    console.error('Error cargando reglas:', error);

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:20px; color:#b23636;">
          No se pudieron cargar las reglas desde MySQL.
        </td>
      </tr>
    `;

    showNotification('No se pudieron cargar las reglas', 'error');
  }
}

function renderizarReglas() {
  const tbody = document.getElementById('reglasBody');

  tbody.innerHTML = reglasActuales.map(regla => {
    const id = Number(regla.id_automatizacion);
    const sensor = obtenerSensor(Number(regla.id_sensor_condicion));
    const actuador = obtenerActuador(Number(regla.id_actuador_accion));
    const activa = Number(regla.activa) === 1;

    return `
      <tr data-id="${id}">
        <td class="sensor-name">${sensor.nombre}</td>

        <td class="condition-text">${textoCondicion(regla)}</td>

        <td class="actuator-name">${actuador.nombre}</td>

        <td class="action-text">${textoAccion(regla)}</td>

        <td>
          <span 
            class="status-badge ${activa ? 'status-active' : 'status-inactive'}"
            data-id="${id}">
            ${activa ? 'Activado' : 'Desactivado'}
          </span>
        </td>

        <td>
          <div class="table-buttons">
            <button 
              class="table-edit-btn yellow" 
              type="button" 
              data-id="${id}" 
              data-type="condicion">
              Editar condición
            </button>

            <button 
              class="table-edit-btn blue" 
              type="button" 
              data-id="${id}" 
              data-type="accion">
              Editar acción
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  activarEventosTabla();
}

function obtenerReglaPorId(id) {
  return reglasActuales.find(regla => Number(regla.id_automatizacion) === Number(id));
}

async function cambiarEstadoRegla(id, activar) {
  try {
    const respuesta = await fetch(`${API_URL}?action=toggle_automatizacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: id,
        activa: activar ? 1 : 0
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || datos.success === false) {
      throw new Error(datos.error || `HTTP ${respuesta.status}`);
    }

    showNotification(
      activar ? 'Regla activada correctamente' : 'Regla desactivada correctamente',
      activar ? 'success' : 'warning'
    );

    await cargarReglas();

  } catch (error) {
    console.error('Error cambiando estado:', error);
    showNotification('No se pudo cambiar el estado de la regla', 'error');
  }
}

async function cambiarTodasLasReglas(activar) {
  try {
    const respuesta = await fetch(`${API_URL}?action=toggle_todas_automatizaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        activa: activar ? 1 : 0
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || datos.success === false) {
      throw new Error(datos.error || `HTTP ${respuesta.status}`);
    }

    showNotification(
      activar ? 'Todas las reglas fueron activadas' : 'Todas las reglas fueron desactivadas',
      activar ? 'success' : 'warning'
    );

    await cargarReglas();

  } catch (error) {
    console.error('Error actualizando todas las reglas:', error);
    showNotification('No se pudieron actualizar todas las reglas', 'error');
  }
}

async function actualizarRegla(id, cambios) {
  try {
    const respuesta = await fetch(`${API_URL}?action=actualizar_automatizacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id_automatizacion: id,
        ...cambios
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || datos.success === false) {
      throw new Error(datos.error || `HTTP ${respuesta.status}`);
    }

    showNotification('Regla actualizada correctamente', 'success');
    await cargarReglas();

  } catch (error) {
    console.error('Error actualizando regla:', error);
    showNotification('No se pudo actualizar la regla', 'error');
  }
}

function showEditConditionModal(regla) {
  const sensor = obtenerSensor(Number(regla.id_sensor_condicion));

  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-content" style="width: 450px;">
      <h3>Editar condición - ${sensor.nombre}</h3>

      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
          Selecciona el operador:
        </label>

        <select id="parametroSelect" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #ddd;">
          <option value="<=">≤ Menor o igual que</option>
          <option value=">=">≥ Mayor o igual que</option>
          <option value="<">&lt; Menor que</option>
          <option value=">">&gt; Mayor que</option>
          <option value="==">= Igual a</option>
        </select>

        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
          Valor umbral:
        </label>

        <input 
          type="number" 
          id="valorInput" 
          step="0.01"
          style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #ddd;" 
          placeholder="Ingrese el valor">

        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
          Unidad de medida:
        </label>

        <input 
          type="text" 
          id="unidadInput" 
          style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #ddd;" 
          value="${sensor.unidad}"
          disabled>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="action-btn off-btn" id="cancelBtn">Cancelar</button>
        <button class="action-btn on-btn" id="saveBtn">Guardar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';

  modal.querySelector('#parametroSelect').value = regla.condicion_operador;
  modal.querySelector('#valorInput').value = parseFloat(regla.condicion_valor);

  modal.querySelector('#cancelBtn').onclick = () => modal.remove();

  modal.querySelector('#saveBtn').onclick = async () => {
    const operador = modal.querySelector('#parametroSelect').value;
    const valor = modal.querySelector('#valorInput').value;

    if (valor === '' || isNaN(valor)) {
      showNotification('Ingresa un valor válido', 'error');
      return;
    }

    modal.remove();

    await actualizarRegla(regla.id_automatizacion, {
      condicion_operador: operador,
      condicion_valor: valor
    });
  };
}

function showEditActionModal(regla) {
  const actuador = obtenerActuador(Number(regla.id_actuador_accion));

  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-content" style="width: 450px;">
      <h3>Editar acción - ${actuador.nombre}</h3>

      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
          Tipo de acción:
        </label>

        <select id="accionSelect" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #ddd;">
          <option value="encender">Encender</option>
          <option value="apagar">Apagar</option>
        </select>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="action-btn off-btn" id="cancelBtn">Cancelar</button>
        <button class="action-btn on-btn" id="saveBtn">Guardar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';

  modal.querySelector('#accionSelect').value = regla.accion_resultado;

  modal.querySelector('#cancelBtn').onclick = () => modal.remove();

  modal.querySelector('#saveBtn').onclick = async () => {
    const accion = modal.querySelector('#accionSelect').value;

    modal.remove();

    await actualizarRegla(regla.id_automatizacion, {
      accion_resultado: accion
    });
  };
}

function activarEventosTabla() {
  document.querySelectorAll('.status-badge[data-id]').forEach(badge => {
    badge.addEventListener('click', () => {
      const id = badge.dataset.id;
      const regla = obtenerReglaPorId(id);

      if (!regla) return;

      const activa = Number(regla.activa) === 1;
      const nuevoEstado = !activa;

      showConfirmModal(
        `¿Deseas ${nuevoEstado ? 'activar' : 'desactivar'} la regla "${regla.nombre_regla}"?`,
        () => cambiarEstadoRegla(id, nuevoEstado)
      );
    });
  });

  document.querySelectorAll('.table-edit-btn.yellow').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const regla = obtenerReglaPorId(id);

      if (regla) {
        showEditConditionModal(regla);
      }
    });
  });

  document.querySelectorAll('.table-edit-btn.blue').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const regla = obtenerReglaPorId(id);

      if (regla) {
        showEditActionModal(regla);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const apagarTodo = document.getElementById('apagarTodo');
  const encenderTodo = document.getElementById('encenderTodo');

  if (apagarTodo) {
    apagarTodo.addEventListener('click', () => {
      showConfirmModal('¿Deseas desactivar todas las reglas automáticas?', () => {
        cambiarTodasLasReglas(false);
      });
    });
  }

  if (encenderTodo) {
    encenderTodo.addEventListener('click', () => {
      showConfirmModal('¿Deseas activar todas las reglas automáticas?', () => {
        cambiarTodasLasReglas(true);
      });
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

  cargarReglas();
});