/* Control remoto: traduce teclas de Tizen (y del teclado, para probar en una PC) a nombres simples.
   Los manejadores se apilan: el de arriba (un diálogo, por ejemplo) decide primero. */
(function () {
  var Azure = window.Azure;

  // Códigos de tecla de Samsung Tizen TV (documentación de Samsung). 10009 = Atrás.
  var POR_CODIGO = {
    37: 'izq', 38: 'arr', 39: 'der', 40: 'abj', 13: 'ok', 10009: 'atras',
    415: 'play', 19: 'pausa', 10252: 'playpausa', 413: 'stop', 417: 'ff', 412: 'rw',
    403: 'rojo', 404: 'verde', 405: 'amarillo', 406: 'azul', 427: 'chmas', 428: 'chmenos',
    // Solo para probar en un navegador de PC
    27: 'atras', 33: 'chmas', 34: 'chmenos', 112: 'rojo', 113: 'verde', 114: 'amarillo', 115: 'azul'
  };
  var A_REGISTRAR = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind',
    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'ChannelUp', 'ChannelDown'];

  var pila = [];
  var LARGA_MS = 700;
  var okTimer = null, okLargoDisparado = false, okAbajo = false;

  function enCampo(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'); }

  function despachar(nombre, ev, extra) {
    if (Azure.Cursor && Azure.Cursor.manejar(nombre, ev, extra || {})) return true;
    for (var i = pila.length - 1; i >= 0; i--) {
      var r;
      try { r = pila[i](nombre, ev, extra || {}); }
      catch (e) { Azure.Registro.error('Error en manejador de tecla ' + nombre, e); r = true; }
      if (r === true) return true;
    }
    return false;
  }

  Azure.Teclas = {
    LARGA_MS: LARGA_MS,
    empujar: function (fn) { pila.push(fn); },
    sacar: function (fn) { var i = pila.lastIndexOf(fn); if (i >= 0) pila.splice(i, 1); },

    /** Pide a Tizen las teclas que no entrega por defecto (reproducción, colores, canal). */
    registrar: function () {
      try {
        if (window.tizen && tizen.tvinputdevice) {
          A_REGISTRAR.forEach(function (n) {
            try { tizen.tvinputdevice.registerKey(n); } catch (e) { Azure.Registro.aviso('registerKey ' + n + ': ' + (e && e.message)); }
          });
          Azure.Registro.info('Teclas de Tizen registradas.');
        }
      } catch (e) { Azure.Registro.aviso('tvinputdevice no disponible: ' + (e && e.message)); }
    },

    iniciar: function () {
      Azure.Teclas.registrar();
      document.addEventListener('keydown', function (ev) {
        var t = ev.target, campo = enCampo(t);
        var nombre = POR_CODIGO[ev.keyCode];
        // En una PC: Retroceso = Atrás solo fuera de campos de texto
        if (!nombre && ev.keyCode === 8 && !campo) nombre = 'atras';
        if (!nombre) return;

        if (nombre === 'ok') {
          // Dentro de un campo, OK abre el teclado: no se toca
          if (campo) return;
          ev.preventDefault();
          if (ev.repeat) return;
          okAbajo = true; okLargoDisparado = false;
          clearTimeout(okTimer);
          okTimer = setTimeout(function () {
            if (okAbajo) { okLargoDisparado = true; despachar('okLargo', ev); }
          }, LARGA_MS);
          return;
        }
        var consumido = despachar(nombre, ev, { campo: campo });
        if (consumido) ev.preventDefault();
      }, true);

      document.addEventListener('keyup', function (ev) {
        if (POR_CODIGO[ev.keyCode] !== 'ok') return;
        if (enCampo(ev.target)) return;
        ev.preventDefault();
        clearTimeout(okTimer);
        var eraLarga = okLargoDisparado;
        okAbajo = false; okLargoDisparado = false;
        if (!eraLarga) despachar('ok', ev);
      }, true);
    }
  };
})();
