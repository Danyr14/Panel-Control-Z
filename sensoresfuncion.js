// URL de tu API local XAMPP
const API_URL = 'http://localhost/PANEL-COSECHA-Z/backend/api/api.php';

// Función para mostrar modal de confirmación
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

  document.getElementById('confirmYes').onclick = () => {
    onConfirm();
    modal.remove();
  };

  document.getElementById('confirmNo').onclick = () => {
    modal.remove();
  };
}

// Función para mostrar notificación temporal
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
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Convertir el arreglo que manda la API en objeto por tipo_medicion
function organizarLecturas(datos) {
  const lecturas = {};

  datos.forEach(item => {
    lecturas[item.tipo_medicion] = {
      valor: parseFloat(item.valor),
      fecha: item.fecha_lectura,
      unidad: item.unidad_medida,
      nombre: item.nombre_dispositivo
    };
  });

  return lecturas;
}

// Aplicar ancho y color a una barra de progreso
function actualizarBarra(selectorPrincipal, selectorRespaldo, porcentaje, fondo = null) {
  const barra =
    document.querySelector(selectorPrincipal) ||
    document.querySelector(selectorRespaldo);

  if (!barra) {
    console.warn(`No se encontró la barra: ${selectorPrincipal}`);
    return;
  }

  barra.style.setProperty('width', `${porcentaje}%`, 'important');

  if (fondo) {
    barra.style.setProperty('background', fondo, 'important');
  }
}

// Función para actualizar los valores de los sensores desde MySQL
async function actualizarDatosSensores(mostrarNotificacion = false) {
  try {
    const respuesta = await fetch(`${API_URL}?action=get_lecturas_actuales&t=${Date.now()}`);

    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    const datos = await respuesta.json();
    const lecturas = organizarLecturas(datos);

    const temperatura = lecturas.temperatura?.valor ?? 0;
    const humedadAmbiente = lecturas.humedad_ambiente?.valor ?? 0;
    const calidadAire = lecturas.calidad_aire?.valor ?? 0;
    const humedadSuelo = lecturas.humedad_suelo?.valor ?? 0;

    console.log('Lecturas reales:', {
      temperatura,
      humedadAmbiente,
      calidadAire,
      humedadSuelo
    });

    // Elementos principales de valores
    const valores = document.querySelectorAll('.sensor-value-block strong');

    if (valores[0]) valores[0].textContent = `${temperatura.toFixed(1)} °C`;
    if (valores[1]) valores[1].textContent = `${humedadAmbiente.toFixed(0)} %`;
    if (valores[2]) valores[2].textContent = `${calidadAire.toFixed(0)} RAW`;
    if (valores[3]) valores[3].textContent = `${humedadSuelo.toFixed(0)} %`;

    // Porcentajes de barras
    const tempPercent = Math.min(100, Math.max(0, ((temperatura - 15) / 20) * 100));
    const humedadPercent = Math.min(100, Math.max(0, humedadAmbiente));
    const airePercent = Math.min(100, Math.max(0, (calidadAire / 4095) * 100));
    const sueloPercent = Math.min(100, Math.max(0, humedadSuelo));

    // Barras de progreso
    actualizarBarra(
      '.fill-temp',
      '.sensor-panel:nth-child(1) .sensor-fill',
      tempPercent
    );

    actualizarBarra(
      '.fill-humidity',
      '.sensor-panel:nth-child(2) .sensor-fill',
      humedadPercent
    );

    actualizarBarra(
      '.fill-air',
      '.sensor-panel:nth-child(3) .sensor-fill',
      airePercent
    );

    actualizarBarra(
      '.fill-soil',
      '.sensor-panel:nth-child(4) .sensor-fill',
      sueloPercent,
      'linear-gradient(90deg, #f4c542 0%, #65c466 50%, #2f80ed 100%)'
    );

    // Estados visuales
    actualizarEstadoSensor(temperatura, humedadAmbiente, calidadAire, humedadSuelo);

    // Fecha y hora de última lectura
    const fechaLectura =
      lecturas.temperatura?.fecha ||
      lecturas.humedad_ambiente?.fecha ||
      lecturas.calidad_aire?.fecha ||
      lecturas.humedad_suelo?.fecha;

    if (fechaLectura) {
      const fecha = new Date(fechaLectura.replace(' ', 'T'));

      const fechaElement = document.querySelector('.reading-item:first-child strong');
      const horaElement = document.querySelector('.reading-item:nth-child(2) strong');

      if (fechaElement) {
        fechaElement.textContent = fecha.toLocaleDateString('es-MX');
      }

      if (horaElement) {
        horaElement.textContent = fecha.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    if (mostrarNotificacion) {
      showNotification('Datos reales cargados desde MySQL', 'success');
    }

  } catch (error) {
    console.error('Error cargando sensores:', error);
    showNotification('No se pudieron cargar los datos reales de sensores', 'error');
  }
}

// Función para actualizar el estado de los sensores
function actualizarEstadoSensor(temp, humidity, air, soil) {
  // Estado de Temperatura
  const tempBadge = document.querySelector('.sensor-panel:first-child .status-badge');
  const tempSummary = document.querySelector('.summary-item:first-child strong');

  if (temp >= 22 && temp <= 30) {
    if (tempBadge) {
      tempBadge.textContent = 'Óptimo';
      tempBadge.className = 'status-badge success';
    }

    if (tempSummary) {
      tempSummary.textContent = 'Estable';
      tempSummary.className = 'ok-text';
    }

  } else if (temp < 22) {
    if (tempBadge) {
      tempBadge.textContent = 'Baja';
      tempBadge.className = 'status-badge warning';
    }

    if (tempSummary) {
      tempSummary.textContent = 'Baja';
      tempSummary.className = 'warn-text';
    }

  } else {
    if (tempBadge) {
      tempBadge.textContent = 'Alta';
      tempBadge.className = 'status-badge danger';
    }

    if (tempSummary) {
      tempSummary.textContent = 'Alta';
      tempSummary.className = 'bad-text';
    }
  }

  // Estado de Humedad Ambiental
  const humidityBadge = document.querySelector('.sensor-panel:nth-child(2) .status-badge');
  const humiditySummary = document.querySelector('.summary-item:nth-child(2) strong');

  if (humidity >= 40 && humidity <= 75) {
    if (humidityBadge) {
      humidityBadge.textContent = 'Óptimo';
      humidityBadge.className = 'status-badge success';
    }

    if (humiditySummary) {
      humiditySummary.textContent = 'Estable';
      humiditySummary.className = 'ok-text';
    }

  } else if (humidity < 40) {
    if (humidityBadge) {
      humidityBadge.textContent = 'Baja';
      humidityBadge.className = 'status-badge warning';
    }

    if (humiditySummary) {
      humiditySummary.textContent = 'Baja';
      humiditySummary.className = 'warn-text';
    }

  } else {
    if (humidityBadge) {
      humidityBadge.textContent = 'Alta';
      humidityBadge.className = 'status-badge warning';
    }

    if (humiditySummary) {
      humiditySummary.textContent = 'Alta';
      humiditySummary.className = 'warn-text';
    }
  }

  // Estado de Calidad de Aire MQ-135 RAW
  const airBadge = document.querySelector('.sensor-panel:nth-child(3) .status-badge');
  const airSummary = document.querySelector('.summary-item:nth-child(3) strong');

  if (air < 2500) {
    if (airBadge) {
      airBadge.textContent = 'Buena';
      airBadge.className = 'status-badge success';
    }

    if (airSummary) {
      airSummary.textContent = 'Buena';
      airSummary.className = 'ok-text';
    }

  } else if (air < 3500) {
    if (airBadge) {
      airBadge.textContent = 'Media';
      airBadge.className = 'status-badge warning';
    }

    if (airSummary) {
      airSummary.textContent = 'Media';
      airSummary.className = 'warn-text';
    }

  } else {
    if (airBadge) {
      airBadge.textContent = 'Mala';
      airBadge.className = 'status-badge danger';
    }

    if (airSummary) {
      airSummary.textContent = 'Mala';
      airSummary.className = 'bad-text';
    }
  }

  // Estado de Humedad de Suelo
  const soilBadge = document.querySelector('.sensor-panel:nth-child(4) .status-badge');
  const soilSummary = document.querySelector('.summary-item:nth-child(4) strong');

  if (soilBadge) {
    if (soil >= 40 && soil <= 85) {
      soilBadge.textContent = 'Óptimo';
      soilBadge.className = 'status-badge success';
    } else if (soil < 40) {
      soilBadge.textContent = 'Seco';
      soilBadge.className = 'status-badge danger';
    } else {
      soilBadge.textContent = 'Muy húmedo';
      soilBadge.className = 'status-badge warning';
    }
  }

  if (soilSummary) {
    if (soil >= 40 && soil <= 85) {
      soilSummary.textContent = 'Estable';
      soilSummary.className = 'ok-text';
    } else if (soil < 40) {
      soilSummary.textContent = 'Seco';
      soilSummary.className = 'bad-text';
    } else {
      soilSummary.textContent = 'Muy húmedo';
      soilSummary.className = 'warn-text';
    }
  }
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  // Botón actualizar datos
  const actualizarBtn = document.querySelector('.primary-btn');

  if (actualizarBtn) {
    actualizarBtn.addEventListener('click', () => {
      actualizarDatosSensores(true);
    });
  }

  // Resaltar enlace activo en el menú
  const path = window.location.pathname;
  const links = document.querySelectorAll('.nav-link');

  links.forEach(link => {
    if (link.href.includes(path)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Cargar datos reales al abrir la página
  actualizarDatosSensores(false);

  // Actualización automática cada 30 segundos
  setInterval(() => {
    actualizarDatosSensores(false);
  }, 30000);
});