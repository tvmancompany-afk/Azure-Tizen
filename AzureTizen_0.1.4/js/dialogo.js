/* Interfaz común: diálogos apilados. Mientras hay uno abierto, el foco y el botón Atrás son suyos. */
(function () {
  var Azure = window.Azure, el = Azure.el;
  var capa = function () { return document.getElementById('capa-dialogos'); };

  var Dialogo = Azure.Dialogo = {
    /**
     * cfg: titulo, mensaje, cuerpo (elemento), botones [{t, fn(cerrar), cls, noCerrar}], sinAtras (true = Atrás no cierra),
     * alCerrar(), foco ('botones' para empezar en el primer botón)
     */
    abrir: function (cfg) {
      var velo = el('div', { cls: 'velo' });
      var d = el('div', { cls: 'dialogo' });
      if (cfg.titulo) d.appendChild(el('h3', { text: cfg.titulo }));
      if (cfg.mensaje) d.appendChild(el('div', { cls: 'msg', text: cfg.mensaje }));
      if (cfg.cuerpo) { var c = el('div', { cls: 'cuerpo-d' }); c.appendChild(cfg.cuerpo); d.appendChild(c); }
      var acc = el('div', { cls: 'acciones' });
      var cerrado = false;
      var api = {
        el: d,
        cerrar: function () {
          if (cerrado) return; cerrado = true;
          Azure.Teclas.sacar(manejador);
          if (velo.parentNode) velo.parentNode.removeChild(velo);
          Azure.Foco.sacarRaiz(velo);
          // Asíncrono: así el fn del botón (que guarda lo escrito) corre ANTES de resolver la promesa del diálogo
          if (cfg.alCerrar) setTimeout(cfg.alCerrar, 0);
        }
      };
      (cfg.botones || []).forEach(function (b) {
        var btn = el('div', { cls: 'btn' + (b.cls ? ' ' + b.cls : ''), text: b.t, f: true, attrs: { tabindex: '-1' } });
        btn.addEventListener('click', function () {
          if (!b.noCerrar) api.cerrar();
          if (b.fn) b.fn(api.cerrar);
        });
        acc.appendChild(btn);
      });
      d.appendChild(acc);
      velo.appendChild(d);

      var manejador = function (tecla) {
        if (tecla === 'atras') { if (!cfg.sinAtras) api.cerrar(); return true; }
        if (tecla === 'ok' || tecla === 'okLargo' || tecla === 'amarillo' || tecla === 'izq' || tecla === 'der' || tecla === 'arr' || tecla === 'abj') {
          return false; // lo resuelve el manejador base de foco
        }
        return true; // el resto de teclas no pasa a la pantalla de abajo
      };
      Azure.Teclas.empujar(manejador);
      capa().appendChild(velo);
      Azure.Foco.empujarRaiz(velo);
      var objetivo = null;
      if (cfg.foco === 'botones') objetivo = acc.querySelector('[data-f]');
      if (!objetivo) objetivo = d.querySelector('[data-f]');
      if (objetivo) Azure.Foco.poner(objetivo);
      return api;
    },

    aviso: function (titulo, mensaje) {
      return new Promise(function (res) {
        Dialogo.abrir({ titulo: titulo, mensaje: mensaje, botones: [{ t: 'CERRAR' }], alCerrar: res, foco: 'botones' });
      });
    },

    confirmar: function (titulo, mensaje, textoSi) {
      return new Promise(function (res) {
        var resp = false;
        Dialogo.abrir({
          titulo: titulo, mensaje: mensaje, foco: 'botones',
          botones: [{ t: 'CANCELAR' }, { t: textoSi || 'ACEPTAR', cls: 'pri', fn: function () { resp = true; } }],
          alCerrar: function () { res(resp); }
        });
      });
    },

    /** Pide un texto. opts: clave (con ojo), multilinea, placeholder. Devuelve texto o null si cancela. */
    pedir: function (titulo, etiqueta, valor, opts) {
      opts = opts || {};
      return new Promise(function (res) {
        var campo = opts.clave ? Azure.Campo.clave(etiqueta, valor || '') : Azure.Campo.texto(etiqueta, valor || '', opts);
        var resp = null;
        Dialogo.abrir({
          titulo: titulo, cuerpo: campo.el,
          botones: [{ t: 'CANCELAR' }, { t: 'ACEPTAR', cls: 'pri', fn: function () { resp = campo.valor(); } }],
          alCerrar: function () { res(resp); }
        });
      });
    },

    /** Menú de opciones: [{t, fn, cls}] */
    menu: function (titulo, opciones) {
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      var api;
      opciones.forEach(function (o) {
        var b = el('div', { cls: 'btn' + (o.cls ? ' ' + o.cls : ''), text: o.t, f: true, attrs: { tabindex: '-1' } });
        b.addEventListener('click', function () { api.cerrar(); if (o.fn) o.fn(); });
        cuerpo.appendChild(b);
      });
      api = Dialogo.abrir({ titulo: titulo, cuerpo: cuerpo, botones: [{ t: 'CERRAR' }] });
      return api;
    },

    hayAbierto: function () { return capa().children.length > 0; }
  };
})();
