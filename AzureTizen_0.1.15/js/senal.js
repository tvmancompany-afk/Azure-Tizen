/* Indicador de red (arriba a la izquierda, junto al botón "C"): tipo de conexión y calidad estimada.
   OJO: una app web de Tizen NO puede leer la intensidad real del Wi-Fi (RSSI). Esto es una ESTIMACIÓN del navegador de la TV
   (navigator.connection: latencia "rtt" y velocidad "downlink" medidas con el tráfico reciente) y el tipo de conexión (webapis.network).
   Además cuenta los "cortes" del video (cuando se queda cargando) y los anota en el registro con esos datos, para saber cuánta culpa tiene la red. */
(function () {
  var Azure = window.Azure, el = Azure.el;
  var cortes = [];          // marcas de tiempo (ms) de cada corte
  var VENTANA = 5 * 60 * 1000;
  var raiz = null, txt = null, timer = null;

  function tipoRed() {
    try {
      if (window.webapis && webapis.network && webapis.network.getActiveConnectionType) {
        var t = webapis.network.getActiveConnectionType();
        return { 0: 'Sin red', 1: 'Wi-Fi', 2: 'Móvil', 3: 'Cable', 4: 'Wi-Fi' }[t] || '';
      }
    } catch (e) {}
    return '';
  }
  function medidas() {
    var c = navigator.connection || navigator.webkitConnection;
    // rtt 0 = el navegador aún no midió (no es "cero latencia"): se trata como sin dato
    return c ? { rtt: c.rtt > 0 ? c.rtt : null, down: c.rtt > 0 ? c.downlink : null, tipo: c.effectiveType || '' } : null;
  }
  /** 0..3 arcos según latencia y velocidad estimadas. -1 = sin datos. */
  function nivel(m) {
    if (!m || (m.rtt == null && m.down == null)) return -1;
    var n = 3;
    if (m.rtt >= 150 || m.down < 2) n = 2;
    if (m.rtt >= 300 || m.down < 1) n = 1;
    if (m.rtt >= 600 || m.down < 0.4) n = 0;
    return n;
  }
  function limpiarCortes() { var t = Date.now(); while (cortes.length && t - cortes[0] > VENTANA) cortes.shift(); }

  function pintar() {
    if (!raiz) return;
    var tr = tipoRed(), m = medidas(), n = nivel(m);
    if (tr === 'Sin red') n = 0;
    limpiarCortes();
    raiz.setAttribute('data-n', String(n));
    var partes = [];
    if (tr) partes.push(tr);
    if (m && m.rtt != null) partes.push(m.rtt + ' ms');
    if (cortes.length) partes.push(cortes.length + (cortes.length === 1 ? ' corte' : ' cortes'));
    txt.textContent = partes.join(' · ');
    raiz.classList.toggle('mala', cortes.length >= 3);
  }

  Azure.Senal = {
    /** Elemento del indicador (no enfocable). */
    crear: function () {
      raiz = el('div', { cls: 'senal', attrs: { 'data-n': '-1' } });
      raiz.appendChild(Azure.Iconos.crear('wifi'));
      txt = el('div', { cls: 'senal-txt' });
      raiz.appendChild(txt);
      pintar(); clearInterval(timer); timer = setInterval(pintar, 5000);
      var c = navigator.connection; if (c && c.addEventListener) c.addEventListener('change', pintar);
      return raiz;
    },
    /** El reproductor avisa cuando el video se queda cargando en plena reproducción. */
    corte: function () {
      cortes.push(Date.now());
      var m = medidas() || {};
      Azure.Registro.info('Corte de video #' + cortes.length + ' (últ. 5 min) | red: ' + (tipoRed() || '?') + ' | rtt ' + m.rtt + ' ms | bajada ' + m.down + ' Mb/s | ' + (m.tipo || ''));
      pintar();
    },
    cortes: function () { limpiarCortes(); return cortes.length; },
    refrescar: pintar
  };
})();
