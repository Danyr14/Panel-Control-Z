const API_URL = '../api.php';

let ultimaLecturaFecha = null;
let riegoChart = null;

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

function tiempoDesde(fechaTexto) {
  if (!fechaTexto) return 'Sin datos';

  const fecha = new Date(fechaTexto.replace(' ', 'T'));
  const ahora = new Date();

  const diferenciaMs = ahora - fecha;
  const segundos = Math.floor(diferenciaMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);

  if (segundos < 30) return 'Hace unos segundos';
  if (segundos < 60) return `Hace ${segundos} s`;
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas} h`;

  return fecha.toLocaleString('es-MX');
}

function estaESP32EnLinea(fechaTexto) {
  if (!fechaTexto) return false;

  const fecha = new Date(fechaTexto.replace(' ', 'T'));
  const ahora = new Date();
  const diferenciaMs = ahora - fecha;
  const minutos = diferenciaMs / 60000;

  return minutos <= 3;
}

function actualizarKPI(index, valorTexto, estadoTexto, estadoClase, pieTexto) {
  const card = document.querySelectorAll('.kpi-card')[index];

  if (!card) return;

  const valor = card.querySelector('.kpi-main h3');
  const badge = card.querySelector('.status-badge');
  const pie = card.querySelector('.kpi-foot');

  if (valor) valor.textContent = valorTexto;

  if (badge) {
    badge.textContent = estadoTexto;
    badge.className = `status-badge ${estadoClase}`;
  }

  if (pie) pie.textContent = pieTexto;
}

function actualizarEstadoTemperatura(temp) {
  if (temp >= 22 && temp <= 30) {
    actualizarKPI(
      0,
      `${temp.toFixed(1)} °C`,
      'Óptimo',
      'success',
      'Rango esperado entre 22 °C y 30 °C'
    );
  } else if (temp < 22) {
    actualizarKPI(
      0,
      `${temp.toFixed(1)} °C`,
      'Baja',
      'warning',
      'Temperatura por debajo del rango ideal'
    );
  } else {
    actualizarKPI(
      0,
      `${temp.toFixed(1)} °C`,
      'Alta',
      'danger',
      'Temperatura por encima del rango ideal'
    );
  }
}

function actualizarEstadoHumedad(humedad) {
  if (humedad >= 40 && humedad <= 75) {
    actualizarKPI(
      1,
      `${humedad.toFixed(0)} %`,
      'Óptimo',
      'success',
      'Nivel de humedad ambiental adecuado'
    );
  } else if (humedad < 40) {
    actualizarKPI(
      1,
      `${humedad.toFixed(0)} %`,
      'Baja',
      'warning',
      'Ambiente seco, se recomienda monitorear'
    );
  } else {
    actualizarKPI(
      1,
      `${humedad.toFixed(0)} %`,
      'Alta',
      'warning',
      'Humedad elevada, revisar ventilación'
    );
  }
}

function actualizarEstadoAire(aire) {
  if (aire < 2500) {
    actualizarKPI(
      2,
      `${aire.toFixed(0)} RAW`,
      'Buena',
      'success',
      'Calidad de aire dentro del rango esperado'
    );
  } else if (aire < 3500) {
    actualizarKPI(
      2,
      `${aire.toFixed(0)} RAW`,
      'Media',
      'warning',
      'Calidad de aire regular, monitorear'
    );
  } else {
    actualizarKPI(
      2,
      `${aire.toFixed(0)} RAW`,
      'Mala',
      'danger',
      'Valor elevado, se recomienda ventilación'
    );
  }
}

function actualizarEstadoSuelo(suelo) {
  if (suelo >= 40 && suelo <= 85) {
    actualizarKPI(
      3,
      `${suelo.toFixed(0)} %`,
      'Óptimo',
      'success',
      'Humedad del sustrato adecuada'
    );
  } else if (suelo < 40) {
    actualizarKPI(
      3,
      `${suelo.toFixed(0)} %`,
      'Seco',
      'danger',
      'Sustrato seco, revisar riego'
    );
  } else {
    actualizarKPI(
      3,
      `${suelo.toFixed(0)} %`,
      'Muy húmedo',
      'warning',
      'Sustrato muy húmedo, evitar exceso de riego'
    );
  }
}

function actualizarSistema({ sensoresOk, actuadoresOk, redOk, fechaLectura }) {
  const items = document.querySelectorAll('.system-list .system-item');

  if (items[0]) {
    const span = items[0].querySelector('span:last-child');
    span.textContent = sensoresOk ? 'Conectados' : 'Sin datos';
    span.className = sensoresOk ? 'system-ok' : 'system-neutral';
  }

  if (items[1]) {
    const span = items[1].querySelector('span:last-child');
    span.textContent = actuadoresOk ? 'Disponibles' : 'Sin respuesta';
    span.className = actuadoresOk ? 'system-ok' : 'system-neutral';
  }

  if (items[2]) {
    const span = items[2].querySelector('span:last-child');
    span.textContent = redOk ? 'Estable' : 'Error';
    span.className = redOk ? 'system-ok' : 'system-neutral';
  }

  if (items[3]) {
    const span = items[3].querySelector('span:last-child');
    span.textContent = tiempoDesde(fechaLectura);
    span.className = 'system-neutral';
  }

  const espText = document.querySelector('.esp-info .online');
  const espSmall = document.querySelector('.esp-info small');

  if (espText) {
    if (estaESP32EnLinea(fechaLectura)) {
      espText.textContent = '● Conectado correctamente';
      espText.className = 'online';
      espText.style.color = '';
      espText.style.fontWeight = '';
    } else {
      espText.textContent = '● Sin lectura reciente';
      espText.className = '';
      espText.style.color = '#9a7a0b';
      espText.style.fontWeight = '700';
    }
  }

  if (espSmall) {
    espSmall.textContent = `Último envío: ${tiempoDesde(fechaLectura)}`;
  }
}

function obtenerEstadoSueloTexto(valor) {
  if (valor < 40) return 'Seco';
  if (valor <= 85) return 'Óptimo';
  return 'Muy húmedo';
}

function obtenerNecesidadRiegoTexto(valor) {
  if (valor < 40) return 'Alta';
  if (valor <= 85) return 'Media';
  return 'Baja';
}

function actualizarResumenGrafica(humedadActual) {
  const actual = document.getElementById('soil-current');
  const estado = document.getElementById('soil-status');
  const riesgo = document.getElementById('soil-risk');

  if (actual) actual.textContent = `${humedadActual.toFixed(0)} %`;
  if (estado) estado.textContent = obtenerEstadoSueloTexto(humedadActual);
  if (riesgo) riesgo.textContent = obtenerNecesidadRiegoTexto(humedadActual);
}

function formatearHoraGrafica(fechaTexto, index) {
  if (!fechaTexto) return `R${index + 1}`;

  try {
    const fecha = new Date(fechaTexto.replace(' ', 'T'));

    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return `R${index + 1}`;
  }
}

function actualizarGraficaRiego(historial) {
  const canvas = document.getElementById('riegoChart');

  if (!canvas || typeof Chart === 'undefined') return;

  let datos = historial.slice(-6);

  if (!datos.length) {
    datos = [
      { valor: 50, fecha: '' },
      { valor: 55, fecha: '' },
      { valor: 52, fecha: '' },
      { valor: 48, fecha: '' },
      { valor: 51, fecha: '' },
      { valor: 49, fecha: '' }
    ];
  }

  while (datos.length < 6) {
    datos.unshift(datos[0]);
  }

  const labels = datos.map((item, index) => formatearHoraGrafica(item.fecha, index));
  const humedad = datos.map(item => Math.max(0, Math.min(100, item.valor)));
  const necesidadRiego = humedad.map(valor => Math.max(0, Math.min(100, 100 - valor)));

  if (riegoChart) {
    riegoChart.destroy();
  }

  const ctx = canvas.getContext('2d');

  riegoChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Humedad de suelo (%)',
          data: humedad,
          borderColor: '#2f8b57',
          backgroundColor: 'rgba(47, 139, 87, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2f8b57',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          borderWidth: 3
        },
        {
          label: 'Necesidad de riego (%)',
          data: necesidadRiego,
          borderColor: '#d3a13c',
          backgroundColor: 'rgba(211, 161, 60, 0.10)',
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#d3a13c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          borderWidth: 2,
          borderDash: [7, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            color: '#355241',
            font: {
              size: 12,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: '#20352a',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#66756b'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: '#66756b',
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: 'rgba(58, 92, 70, 0.10)'
          }
        }
      }
    }
  });
}

async function obtenerLecturasActuales() {
  const respuesta = await fetch(`${API_URL}?action=get_lecturas_actuales&t=${Date.now()}`);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  return await respuesta.json();
}

async function obtenerEstadoActuadores() {
  const respuesta = await fetch(`${API_URL}?action=get_estado_actuadores&t=${Date.now()}`);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  return await respuesta.json();
}

async function obtenerHistorialSuelo() {
  const hoy = new Date();
  const hace7Dias = new Date();

  hace7Dias.setDate(hoy.getDate() - 7);

  const fechaFin = hoy.toISOString().split('T')[0];
  const fechaInicio = hace7Dias.toISOString().split('T')[0];

  const params = new URLSearchParams({
    action: 'get_historial',
    tipo: 'humedad_suelo',
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    t: Date.now()
  });

  const respuesta = await fetch(`${API_URL}?${params.toString()}`);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) return [];

  return datos
    .map(item => ({
      valor: parseFloat(item.valor),
      fecha: item.fecha_lectura || item.fecha || ''
    }))
    .filter(item => !isNaN(item.valor))
    .slice(-6);
}

async function actualizarDatosDashboard(mostrarNotificacion = false) {
  try {
    const datosLecturas = await obtenerLecturasActuales();
    const lecturas = organizarLecturas(datosLecturas);

    const temperatura = lecturas.temperatura?.valor ?? 0;
    const humedadAmbiente = lecturas.humedad_ambiente?.valor ?? 0;
    const calidadAire = lecturas.calidad_aire?.valor ?? 0;
    const humedadSuelo = lecturas.humedad_suelo?.valor ?? 0;

    ultimaLecturaFecha =
      lecturas.temperatura?.fecha ||
      lecturas.humedad_ambiente?.fecha ||
      lecturas.calidad_aire?.fecha ||
      lecturas.humedad_suelo?.fecha ||
      null;

    actualizarEstadoTemperatura(temperatura);
    actualizarEstadoHumedad(humedadAmbiente);
    actualizarEstadoAire(calidadAire);
    actualizarEstadoSuelo(humedadSuelo);

    let actuadoresOk = false;

    try {
      const actuadores = await obtenerEstadoActuadores();
      actuadoresOk = Boolean(actuadores.ventilador || actuadores.aspersor || actuadores.bomba);
    } catch (errorActuadores) {
      console.warn('No se pudo leer estado de actuadores:', errorActuadores);
    }

    const historialSuelo = await obtenerHistorialSuelo();

    actualizarResumenGrafica(humedadSuelo);

    actualizarGraficaRiego(
      historialSuelo.length
        ? historialSuelo
        : [{ valor: humedadSuelo, fecha: ultimaLecturaFecha }]
    );

    actualizarSistema({
      sensoresOk: datosLecturas.length > 0,
      actuadoresOk,
      redOk: true,
      fechaLectura: ultimaLecturaFecha
    });

    if (mostrarNotificacion) {
      showNotification('Dashboard actualizado con datos reales', 'success');
    }

    console.log('Dashboard actualizado:', {
      temperatura,
      humedadAmbiente,
      calidadAire,
      humedadSuelo,
      ultimaLecturaFecha
    });

  } catch (error) {
    console.error('Error actualizando dashboard:', error);

    actualizarSistema({
      sensoresOk: false,
      actuadoresOk: false,
      redOk: false,
      fechaLectura: ultimaLecturaFecha
    });

    showNotification('No se pudieron cargar los datos del dashboard', 'error');
  }
}

function resaltarMenuActivo() {
  const path = window.location.pathname;
  const links = document.querySelectorAll('.nav-link');

  links.forEach(link => {
    if (link.href.includes(path)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const actualizarBtn = document.querySelector('.primary-btn');

  if (actualizarBtn) {
    actualizarBtn.addEventListener('click', () => {
      actualizarDatosDashboard(true);
    });
  }

  const verDetallesBtn = document.getElementById('verDetallesBtn');

  if (verDetallesBtn) {
    verDetallesBtn.addEventListener('click', () => {
      window.location.href = '../frontend/sensores.html';
    });
  }

  resaltarMenuActivo();
  actualizarDatosDashboard(false);

  setInterval(() => {
    actualizarDatosDashboard(false);
  }, 30000);
});
