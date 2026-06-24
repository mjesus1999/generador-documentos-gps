(function () {
  'use strict';

  const STORAGE_KEY = 'gps_doc_correlativo_v2';
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

  let libsPdfCargadas = false;

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
    return 'Chincha, ' + hoy.getDate() + ' de ' + MESES[hoy.getMonth()] + ' del ' + hoy.getFullYear();
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
    Object.entries(BINDINGS).forEach(function (entry) {
      const input = document.querySelector('[data-bind="' + entry[0] + '"]');
      const preview = document.getElementById(entry[1]);
      if (input && preview) {
        preview.textContent = input.value.trim();
      }
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
    if (fechaEl) fechaEl.textContent = formatearFecha();
  }

  function inicializarFormulario() {
    document.querySelectorAll('[data-bind]').forEach(function (input) {
      input.addEventListener('input', actualizarVistaPrevia);
      input.addEventListener('change', actualizarVistaPrevia);
    });
    actualizarVistaPrevia();
  }

  function crearNombreArchivo(correlativo) {
    const cliente = document.getElementById('prev-cliente-nombre');
    const nombreCliente = cliente ? sanitizarNombreArchivo(cliente.textContent.trim()) : '';
    let nombre = 'documento-gps-' + correlativo;
    if (nombreCliente) nombre += '-' + nombreCliente;
    return nombre + '.pdf';
  }

  function cargarScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('No se pudo cargar: ' + src)); };
      document.body.appendChild(script);
    });
  }

  function cargarLibreriasPdf() {
    if (libsPdfCargadas && typeof html2canvas !== 'undefined' && window.jspdf) {
      return Promise.resolve();
    }
    return cargarScript('libs/html2canvas.min.js')
      .then(function () { return cargarScript('libs/jspdf.umd.min.js'); })
      .then(function () {
        libsPdfCargadas = true;
      });
  }

  function esperarImagenes(contenedor) {
    return Promise.all(Array.from(contenedor.querySelectorAll('img')).map(function (img) {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
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

    return cargarLibreriasPdf()
      .then(function () { return esperarImagenes(elemento); })
      .then(function () {
        return html2canvas(elemento, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });
      })
      .then(function (canvas) {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const PDF = window.jspdf.jsPDF;
        const pdf = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
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
            guardarCorrelativo(correlativo + 1);
            actualizarCorrelativoDisplay(correlativo + 1);
          } else {
            btn.disabled = true;
          }
        })
        .catch(function (error) {
          console.error('Error PDF:', error);
          alert('No se pudo generar el PDF. Recarga con Ctrl+F5 e intenta de nuevo.');
        })
        .finally(function () {
          if (obtenerCorrelativo() < CORRELATIVO_MAX) btn.disabled = false;
          btn.textContent = textoOriginal;
        });
    });
  }

  function resetearCorrelativo() {
    guardarCorrelativo(CORRELATIVO_INICIAL);
    actualizarCorrelativoDisplay(CORRELATIVO_INICIAL);
    const btnGen = document.getElementById('btn-generar');
    if (btnGen) btnGen.disabled = false;
  }

  function inicializarBotonReset() {
    const btn = document.getElementById('btn-reset-correlativo');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (confirm('¿Resetear el correlativo a Documento N° 15?')) {
        resetearCorrelativo();
      }
    });
  }

  function inicializarBotonImprimir() {
    const btn = document.getElementById('btn-imprimir');
    if (!btn) return;

    btn.addEventListener('click', function () {
      actualizarCorrelativoDisplay(obtenerCorrelativo());
      window.print();
    });
  }

  function ajustarEscalaVistaPrevia() {
    const doc = document.getElementById('documento');
    const wrap = document.querySelector('.preview-scale-wrap');
    if (!doc || !wrap) return;

    if (window.innerWidth > 900) {
      doc.style.transform = '';
      wrap.style.height = '';
      return;
    }

    doc.style.transform = '';
    const anchoDoc = doc.offsetWidth;
    const anchoDisp = wrap.clientWidth;
    if (!anchoDoc || !anchoDisp) return;

    const escala = Math.min(1, anchoDisp / anchoDoc);
    doc.style.transform = 'scale(' + escala + ')';
    doc.style.transformOrigin = 'top center';
    wrap.style.height = Math.ceil(doc.offsetHeight * escala) + 'px';
  }

  function inicializarVistaResponsive() {
    ajustarEscalaVistaPrevia();
    window.addEventListener('resize', ajustarEscalaVistaPrevia);
    window.addEventListener('orientationchange', function () {
      setTimeout(ajustarEscalaVistaPrevia, 150);
    });
  }

  function init() {
    const correlativo = obtenerCorrelativo();
    inicializarFecha();
    actualizarCorrelativoDisplay(correlativo);
    inicializarFormulario();
    inicializarBotonGenerar();
    inicializarBotonImprimir();
    inicializarBotonReset();
    inicializarVistaResponsive();

    if (correlativo >= CORRELATIVO_MAX) {
      const btnGen = document.getElementById('btn-generar');
      if (btnGen) btnGen.disabled = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
