// URL de tu API local XAMPP
const API_URL = 'http://localhost/PANEL-COSECHA-Z/backend/api/api.php';

// Variable global de Chart.js
let chartInstance = null;

// Últimos datos cargados, útiles para PDF
let historialActual = [];
let sensorActual = 'temperatura';

const CONFIG_SENSORES = {
  temperatura: {
    titulo: 'Temperatura',
    labelY: 'Temperatura (°C)',
    unidad: '°C',
    color: 'rgb(255, 99, 132)'
  },
  humedad_ambiente: {
    titulo: 'Humedad ambiente',
    labelY: 'Humedad ambiente (%)',
    unidad: '%',
    color: 'rgb(54, 162, 235)'
  },
  humedad_suelo: {
    titulo: 'Humedad de suelo',
    labelY: 'Humedad de suelo (%)',
    unidad: '%',
    color: 'rgb(46, 204, 113)'
  },
  calidad_aire: {
    titulo: 'Calidad de aire',
    labelY: 'Calidad de aire RAW',
    unidad: 'RAW',
    color: 'rgb(75, 192, 192)'
  }
};

function formatearFecha(dateString) {
  if (!dateString) return '';

  const fecha = new Date(dateString.replace(' ', 'T'));

  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatearFechaHora(dateString) {
  if (!dateString) return '';

  const fecha = new Date(dateString.replace(' ', 'T'));

  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');

  let bgColor = '#2c3e50';
  let icon = 'ℹ️';

  switch (type) {
    case 'success':
      bgColor = '#27ae60';
      icon = '✅';
      break;
    case 'error':
      bgColor = '#e74c3c';
      icon = '❌';
      break;
    case 'warning':
      bgColor = '#f39c12';
      icon = '⚠️';
      break;
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

async function obtenerHistorialDesdeMySQL(tipoSensor, fechaInicio, fechaFin) {
  const params = new URLSearchParams();

  params.append('action', 'get_historial');
  params.append('tipo', tipoSensor);

  if (fechaInicio && fechaFin) {
    params.append('fecha_inicio', fechaInicio);
    params.append('fecha_fin', fechaFin);
  }

  params.append('t', Date.now());

  const url = `${API_URL}?${params.toString()}`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error('La API no devolvió un arreglo válido');
  }

  return datos.map(item => ({
    fecha: item.fecha,
    valor: parseFloat(item.valor)
  }));
}

function mostrarGrafica(datos, tipoSensor) {
  const config = CONFIG_SENSORES[tipoSensor] || CONFIG_SENSORES.temperatura;

  const labels = datos.map(item => formatearFechaHora(item.fecha));
  const valores = datos.map(item => item.valor);

  if (chartInstance) {
    chartInstance.destroy();
  }

  const canvas = document.getElementById('historialChart');

  if (!canvas) {
    console.error('No se encontró el canvas historialChart');
    return;
  }

  const ctx = canvas.getContext('2d');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: config.labelY,
        data: valores,
        borderColor: config.color,
        backgroundColor: config.color.replace('rgb', 'rgba').replace(')', ', 0.18)'),
        tension: 0.3,
        fill: true,
        pointBackgroundColor: config.color,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${config.titulo}: ${context.raw} ${config.unidad}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: config.labelY
          }
        },
        x: {
          title: {
            display: true,
            text: 'Fecha y hora'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
}

async function actualizarGrafica() {
  const tipoSensor = document.getElementById('tipoSensor').value;
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;

  sensorActual = tipoSensor;

  try {
    const datos = await obtenerHistorialDesdeMySQL(tipoSensor, fechaInicio, fechaFin);

    historialActual = datos;

    if (datos.length === 0) {
      mostrarGrafica([], tipoSensor);
      showNotification('No hay datos en el rango seleccionado', 'warning');
      return;
    }

    mostrarGrafica(datos, tipoSensor);
    showNotification('Historial cargado desde MySQL', 'success');

  } catch (error) {
    console.error('Error cargando historial:', error);
    showNotification('No se pudo cargar el historial desde MySQL', 'error');
  }
}

function limpiarFiltros() {
  document.getElementById('tipoSensor').value = 'temperatura';
  document.getElementById('fechaInicio').value = '';
  document.getElementById('fechaFin').value = '';

  actualizarGrafica();
  showNotification('Filtros limpiados', 'info');
}

async function descargarPDF() {
  if (typeof html2pdf === 'undefined') {
    showNotification('Error: Librería PDF no cargada', 'error');
    return;
  }

  const config = CONFIG_SENSORES[sensorActual] || CONFIG_SENSORES.temperatura;
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;

  if (!historialActual || historialActual.length === 0) {
    showNotification('No hay datos para generar el PDF', 'warning');
    return;
  }

  const canvas = document.getElementById('historialChart');
  const chartImage = canvas.toDataURL('image/png', 1.0);

  const filas = historialActual.slice(-50).map(item => `
    <tr>
      <td>${formatearFechaHora(item.fecha)}</td>
      <td>${item.valor} ${config.unidad}</td>
    </tr>
  `).join('');

  const pdfContainer = document.createElement('div');
  pdfContainer.style.padding = '20px';
  pdfContainer.style.backgroundColor = 'white';
  pdfContainer.style.fontFamily = 'Arial, sans-serif';

  pdfContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #2c3e50;">Reporte de ${config.titulo}</h1>
      <p>Fecha de generación: ${new Date().toLocaleString('es-MX')}</p>
      ${fechaInicio ? `<p><strong>Desde:</strong> ${new Date(fechaInicio).toLocaleDateString('es-MX')}</p>` : ''}
      ${fechaFin ? `<p><strong>Hasta:</strong> ${new Date(fechaFin).toLocaleDateString('es-MX')}</p>` : ''}
      <hr>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <img src="${chartImage}" style="width: 100%; max-width: 760px;">
    </div>

    <h2 style="color: #2c3e50;">Últimos registros</h2>

    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">Fecha y hora</th>
          <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `;

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `reporte_${config.titulo.toLowerCase().replaceAll(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
    image: {
      type: 'jpeg',
      quality: 0.98
    },
    html2canvas: {
      scale: 2,
      useCORS: true
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait'
    }
  };

  showNotification('Generando PDF...', 'info');

  try {
    await html2pdf().set(opt).from(pdfContainer).save();
    showNotification('PDF descargado correctamente', 'success');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showNotification('Error al generar el PDF', 'error');
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
  const hoy = new Date();
  const hace7Dias = new Date();

  hace7Dias.setDate(hoy.getDate() - 7);

  document.getElementById('fechaFin').value = hoy.toISOString().split('T')[0];
  document.getElementById('fechaInicio').value = hace7Dias.toISOString().split('T')[0];

  document.getElementById('aplicarFiltros')?.addEventListener('click', () => {
    actualizarGrafica();
  });

  document.getElementById('limpiarFiltros')?.addEventListener('click', limpiarFiltros);
  document.getElementById('descargarPDF')?.addEventListener('click', descargarPDF);

  resaltarMenuActivo();
  actualizarGrafica();

  console.log('Historial conectado a MySQL');
});