/* Núcleo: registro de errores y eventos. Se ve en Configuración > Diagnóstico y se puede copiar o mandar por Buddy Host. */
(function () {
  var Azure = window.Azure;
  var MAX = 400, lineas = [], guardarTimer = null, CLAVE = 'azure.registro';

  try { var previo = window.localStorage.getItem(CLAVE); if (previo) lineas = JSON.parse(previo); } catch (e) { lineas = []; }
  if (!Array.isArray(lineas)) lineas = [];

  function ahora() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function persistir() {
    clearTimeout(guardarTimer);
    guardarTimer = setTimeout(function () {
      try { window.localStorage.setItem(CLAVE, JSON.stringify(lineas)); } catch (e) { /* sin espacio: se sigue en memoria */ }
    }, 800);
  }

  var Registro = Azure.Registro = {
    log: function (nivel, msg) {
      var l = ahora() + ' [' + nivel + '] ' + String(msg);
      lineas.push(l);
      if (lineas.length > MAX) lineas.splice(0, lineas.length - MAX);
      persistir();
      try { console.log(l); } catch (e) {}
    },
    info: function (m) { Registro.log('info', m); },
    aviso: function (m) { Registro.log('aviso', m); },
    error: function (m, err) {
      var extra = '';
      if (err) extra = ' | ' + (err.stack || err.message || err);
      Registro.log('ERROR', m + extra);
    },
    texto: function () {
      var cab = 'Azure Tizen ' + Azure.VERSION + ' (base de Azure Android ' + Azure.BASE_ANDROID + ')\n' +
        'UA: ' + navigator.userAgent + '\n' +
        'AVPlay: ' + (window.webapis && window.webapis.avplay ? 'sí' : 'no') + '\n' +
        'Tizen API: ' + (window.tizen ? 'sí' : 'no') + '\n---\n';
      return cab + lineas.join('\n');
    },
    limpiar: function () { lineas = []; persistir(); },
    cuantas: function () { return lineas.length; }
  };

  window.addEventListener('error', function (ev) {
    Registro.error('Error no controlado: ' + ev.message + ' (' + ev.filename + ':' + ev.lineno + ')', ev.error);
  });
  window.addEventListener('unhandledrejection', function (ev) {
    Registro.error('Promesa rechazada', ev.reason);
  });
})();
