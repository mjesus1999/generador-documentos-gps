(function () {
  'use strict';

  const STORAGE_KEY = 'gps_doc_correlativo';
  const CORRELATIVO_INICIAL = 15;
  const CORRELATIVO_MAX = 1500;

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const BINDINGS = {
    clienteNombre: 'prev-cliente-nombre',
    clienteCelular: 'prev-cliente-celular',
    clienteUbicacion: 'prev-cliente-ubicacion',
    vehiculoUnidad: 'prev-vehiculo-unidad',
    vehiculoMarca: 'prev-vehiculo-marca',
    vehiculoModelo: 'prev-vehiculo-modelo',
    vehiculoChasis: 'prev-vehiculo-chasis',
    vehiculoColor: 'prev-vehiculo-color',
    vehiculoPlaca: 'prev-vehiculo-placa',
    vehiculoChip: 'prev-vehiculo-chip',
    vehiculoImei: 'prev-vehiculo-imei',
    appUsuario: 'prev-app-usuario',
    appContrasena: 'prev-app-contrasena'
  };

  function obtenerCorrelativo() {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === null) {
      return CORRELATIVO_INICIAL;
    }
    const numero = parseInt(guardado, 10);
    if (isNaN(numero) || numero < CORRELATIVO_INICIAL) {
      return CORRELATIVO_INICIAL;
    }
    return Math.min(numero, CORRELATIVO_MAX);
  }

  function guardarCorrelativo(numero) {
    localStorage.setItem(STORAGE_KEY, String(numero));
  }

  function formatearFecha() {
    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = MESES[hoy.getMonth()];
    const anio = hoy.getFullYear();
    return `Chincha, ${dia} de ${mes} del ${anio}`;
  }

  function actualizarVistaPrevia() {
    Object.entries(BINDINGS).forEach(function ([bindKey, previewId]) {
      const input = document.querySelector('[data-bind="' + bindKey + '"]');
      const preview = document.getElementById(previewId);
      if (!input || !preview) return;

      preview.textContent = input.value.trim();
    });
  }

  function actualizarCorrelativoDisplay(numero) {
    const display = document.getElementById('correlativo-display');
    const preview = document.getElementById('prev-correlativo');
    if (display) display.textContent = numero;
    if (preview) preview.textContent = 'Documento N° ' + numero;
  }

  function inicializarFecha() {
    const fechaEl = document.getElementById('doc-fecha');
    if (fechaEl) {
      fechaEl.textContent = formatearFecha();
    }
  }

  function inicializarFormulario() {
    const inputs = document.querySelectorAll('[data-bind]');
    inputs.forEach(function (input) {
      input.addEventListener('input', actualizarVistaPrevia);
      input.addEventListener('change', actualizarVistaPrevia);
    });
    actualizarVistaPrevia();
  }

  function inicializarBotonGenerar() {
    const btn = document.getElementById('btn-generar');
    if (!btn) return;

    btn.addEventListener('click', function () {
      let correlativo = obtenerCorrelativo();

      if (correlativo >= CORRELATIVO_MAX) {
        alert('Se ha alcanzado el número máximo de documentos (' + CORRELATIVO_MAX + ').');
        btn.disabled = true;
        return;
      }

      actualizarCorrelativoDisplay(correlativo);

      window.print();

      if (correlativo < CORRELATIVO_MAX) {
        correlativo += 1;
        guardarCorrelativo(correlativo);
        actualizarCorrelativoDisplay(correlativo);
      } else {
        btn.disabled = true;
      }
    });
  }

  function init() {
    const correlativo = obtenerCorrelativo();
    inicializarFecha();
    actualizarCorrelativoDisplay(correlativo);
    inicializarFormulario();
    inicializarBotonGenerar();

    if (correlativo >= CORRELATIVO_MAX) {
      const btn = document.getElementById('btn-generar');
      if (btn) btn.disabled = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
