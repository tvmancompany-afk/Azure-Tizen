/* Cursor de TV (como el "C" de Azure Android): un anillo que se mueve libre por la pantalla con las flechas y "clickea" lo que tenga
   debajo con OK. Pegado al borde de una lista (o del panel izquierdo), arriba/abajo la desplaza. En ventanas emergentes (diálogos,
   Elegir video, Ajustes, menús) el cursor NO actúa: ahí manda el movimiento por sectores (foco), igual que en Android, donde esas
   ventanas son de Android aparte y el cursor no llega a ellas.
   Por defecto está activo en la TV (window.tizen) y apagado en un navegador de PC; el botón "C" de la pantalla principal o la tecla azul lo alternan. */
(function () {
  var Azure = window.Azure, el = Azure.el, A = Azure.Almacen;
  var PASO = 28, BORDE = 70, QUIETO_MS = 4000;
  var anillo = null, x = 960, y = 540, quietoTimer = null, observador = null;
  var activo = A.get('cursor_activo', !!window.tizen);

  function hayDialogo() { return Azure.Dialogo && Azure.Dialogo.hayAbierto(); }
  function pantalla() { return Azure.Pantallas && Azure.Pantallas.actual(); }
  function reproductorSinControles() {
    var p = pantalla();
    return !!p && p.nombre === 'reproductor' && !!document.querySelector('.rep-ui.oculto');
  }
  /** ¿Debe el cursor tomar las flechas/OK ahora? */
  function sinAnillo() { var p = pantalla(); return !!p && !!p.sinAnillo; }
  function manda() { return activo && !hayDialogo() && !reproductorSinControles() && !sinAnillo(); }

  function pintar() {
    if (!anillo) return;
    anillo.style.display = (activo && !hayDialogo() && !reproductorSinControles() && !sinAnillo()) ? 'block' : 'none';
    anillo.style.left = (x - 24) + 'px'; anillo.style.top = (y - 24) + 'px';
  }
  function despertar() {
    if (!anillo) return;
    var pa = pantalla(); if (pa && pa.actividad) pa.actividad();   // el reproductor no oculta sus controles mientras se mueve el cursor
    anillo.classList.remove('quieto');
    clearTimeout(quietoTimer);
    quietoTimer = setTimeout(function () { anillo.classList.add('quieto'); }, QUIETO_MS);
  }
  function mover(dx, dy) {
    x = Math.max(0, Math.min(1919, x + dx)); y = Math.max(0, Math.min(1079, y + dy));
    pintar(); despertar();
  }
  function bajo() { return document.elementFromPoint(x, y); }

  /** Desplaza lo que haya bajo el anillo si está pegado a su borde. Devuelve true si desplazó. */
  function desplazar(dir) {
    var e = bajo(); if (!e) return false;
    var abj = dir === 'abj';
    var lista = e.closest('.lista');
    if (lista && lista.__api) {
      var r = lista.getBoundingClientRect();
      if ((abj && r.bottom - y < BORDE) || (!abj && y - r.top < BORDE)) { lista.__api.desplazar(abj ? 1 : -1); return true; }
      return false;
    }
    var sc = e.closest('.izq-scroll');
    if (sc) {
      var rs = sc.getBoundingClientRect();
      if ((abj && rs.bottom - y < BORDE) || (!abj && y - rs.top < BORDE)) { sc.scrollTop += abj ? 70 : -70; return true; }
    }
    return false;
  }

  function clic() {
    despertar();
    anillo.classList.add('pres'); setTimeout(function () { anillo.classList.remove('pres'); }, 160);
    var e = bajo(); if (!e) return;
    var seek = e.closest('.rep-seek');
    if (seek) {                       // clic sobre la barra de tiempo: salta a ese punto
      var R = Azure.Reproductor;
      if (R.estaAbierto() && !R.esEnVivo()) {
        var r = seek.querySelector('.rep-pista').getBoundingClientRect();
        R.buscar(Math.max(0, Math.min(1, (x - r.left) / r.width)) * R.info().dur);
      }
      return;
    }
    var f = e.closest('[data-f]');
    if (f) {
      if (f.tagName === 'INPUT' || f.tagName === 'TEXTAREA') { try { f.focus(); } catch (er) {} return; }
      f.click(); return;
    }
    var p = pantalla();
    if (p && p.toque) p.toque(x, y);  // toque en el video: muestra u oculta los controles
  }
  function largo() {
    despertar();
    var e = bajo(); if (!e) return;
    var f = e.closest('[data-f]');
    if (f && f.__largo) f.__largo();
  }

  Azure.Cursor = {
    activo: function () { return activo; },
    poner: function (v) {
      activo = !!v; A.set('cursor_activo', activo); pintar();
      if (activo) { despertar(); if (document.activeElement && document.activeElement.blur && !Azure.Foco.actual()) document.activeElement.blur(); }
      if (Azure.Pantallas.alCursor) Azure.Pantallas.alCursor(activo);
    },
    alternar: function () { Azure.Cursor.poner(!activo); return activo; },
    pos: function () { return { x: x, y: y }; },
    refrescar: pintar,
    /** Lo llama Teclas antes de la pila de manejadores. Devuelve true si consumió la tecla. */
    manejar: function (nombre, ev, extra) {
      if (nombre === 'azul') { Azure.Cursor.alternar(); return true; }
      if (!manda()) return false;
      if (extra && extra.campo && (nombre === 'izq' || nombre === 'der' || nombre === 'arr' || nombre === 'abj')) return false;
      switch (nombre) {
        case 'izq': mover(-PASO, 0); return true;
        case 'der': mover(PASO, 0); return true;
        case 'arr': if (!desplazar('arr')) mover(0, -PASO); else despertar(); return true;
        case 'abj': if (!desplazar('abj')) mover(0, PASO); else despertar(); return true;
        case 'ok': clic(); return true;
        case 'okLargo': case 'amarillo': largo(); return true;
        case 'chmas': case 'chmenos': {
          var e = bajo(), l = e && e.closest('.lista');
          if (l && l.__api) { l.__api.desplazar((nombre === 'chmas' ? -1 : 1) * 6); return true; }
          return false;
        }
      }
      return false;
    },
    iniciar: function () {
      anillo = el('div', { cls: 'cursor-anillo' });
      document.body.appendChild(anillo);
      var capa = document.getElementById('capa-dialogos');
      if (capa && window.MutationObserver) { observador = new MutationObserver(pintar); observador.observe(capa, { childList: true }); }
      var app = document.getElementById('app');
      if (app && window.MutationObserver) { new MutationObserver(pintar).observe(app, { childList: true }); }
      pintar(); despertar();
    }
  };
})();
