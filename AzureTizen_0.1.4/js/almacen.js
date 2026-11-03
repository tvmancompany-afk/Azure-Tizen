/* Núcleo: almacenamiento (localStorage con respaldo en memoria). Datos pequeños: configuración, listas y entradas.
   Los textos grandes (listas M3U cargadas) NO se guardan aquí. */
(function () {
  var Azure = window.Azure;
  var PREF = 'azure.';
  var memoria = {};
  var usaMemoria = false;

  function ls() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  Azure.Almacen = {
    get: function (clave, defecto) {
      var raw = null;
      try { var s = ls(); raw = s ? s.getItem(PREF + clave) : null; } catch (e) { raw = null; }
      if (raw == null && usaMemoria) raw = memoria[clave] != null ? memoria[clave] : null;
      if (raw == null) return defecto;
      try { return JSON.parse(raw); } catch (e) { return defecto; }
    },
    set: function (clave, valor) {
      var txt = JSON.stringify(valor);
      try {
        var s = ls();
        if (!s) throw new Error('sin localStorage');
        s.setItem(PREF + clave, txt);
        return true;
      } catch (e) {
        usaMemoria = true;
        memoria[clave] = txt;
        Azure.Registro.aviso('Almacén: no se pudo guardar "' + clave + '" en disco (' + (e && e.name) + '); queda solo en memoria hasta cerrar la app.');
        return false;
      }
    },
    del: function (clave) {
      try { var s = ls(); if (s) s.removeItem(PREF + clave); } catch (e) {}
      delete memoria[clave];
    },
    /** Bytes aproximados que ocupa lo de Azure (para el diagnóstico). */
    uso: function () {
      var n = 0;
      try {
        var s = ls();
        if (s) for (var i = 0; i < s.length; i++) {
          var k = s.key(i);
          if (k && k.indexOf(PREF) === 0) n += k.length + (s.getItem(k) || '').length;
        }
      } catch (e) {}
      return n * 2;
    }
  };
})();
