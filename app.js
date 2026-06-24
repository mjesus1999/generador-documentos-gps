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
    return 'Chincha, ' + dia + ' de ' + mes + ' del ' + anio;
  }

  function sanitizarNombreArchivo(texto) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .toLowerCase();
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

  function crearNombreArchivo(correlativo) {
    const cliente = document.getElementById('prev-cliente-nombre');
    const nombreCliente = cliente ? sanitizarNombreArchivo(cliente.textContent.trim()) : '';
    let nombre = 'documento-gps-' + correlativo;
    if (nombreCliente) {
      nombre += '-' + nombreCliente;
    }
    return nombre + '.pdf';
  }

  function esperarImagenes(contenedor) {
    const imagenes = contenedor.querySelectorAll('img');
    return Promise.all(Array.from(imagenes).map(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }
      return new Promise(function (resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  function descargarPDF(correlativo) {
    const elemento = document.getElementById('documento');

    if (!elemento) {
      return Promise.reject(new Error('No se encontró el documento.'));
    }

    if (typeof html2canvas === 'undefined' || !window.jspdf) {
      return Promise.reject(new Error('Las librerías PDF no están disponibles.'));
    }

    return esperarImagenes(elemento).then(function () {
      return html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: elemento.offsetWidth,
        height: elemento.offsetHeight
      });
    }).then(function (canvas) {
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const jsPDF = window.jspdf.jsPDF;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(crearNombreArchivo(correlativo));
    });
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

      const textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Generando PDF...';

      descargarPDF(correlativo)
        .then(function () {
          if (correlativo < CORRELATIVO_MAX) {
            correlativo += 1;
            guardarCorrelativo(correlativo);
            actualizarCorrelativoDisplay(correlativo);
          } else {
            btn.disabled = true;
          }
        })
        .catch(function (error) {
          console.error('Error al generar PDF:', error);
          alert('No se pudo generar el PDF. Recarga la página (Ctrl+F5) e intenta de nuevo.');
        })
        .finally(function () {
          if (correlativo < CORRELATIVO_MAX) {
            btn.disabled = false;
          }
          btn.textContent = textoOriginal;
        });
    });
  }

  function inicializarBotonImprimir() {
    const btn = document.getElementById('btn-imprimir');
    if (!btn) return;

    btn.addEventListener('click', function () {
      const correlativo = obtenerCorrelativo();
      actualizarCorrelativoDisplay(correlativo);
      window.print();
    });
  }

  function init() {
    const correlativo = obtenerCorrelativo();
    inicializarFecha();
    actualizarCorrelativoDisplay(correlativo);
    inicializarFormulario();
    inicializarBotonGenerar();
    inicializarBotonImprimir();

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
