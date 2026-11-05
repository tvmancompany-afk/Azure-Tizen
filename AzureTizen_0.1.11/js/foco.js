/* Navegación con las flechas del control: busca el siguiente elemento enfocable [data-f] en esa dirección.
   Los elementos pueden definir __nav(dir) (lo usa la lista virtual) y __largo() (mantener OK o botón amarillo). */
(function () {
  var Azure = window.Azure;
  var raices = [];
  var ultimoPorRaiz = [];

  function raizActual() { return raices.length ? raices[raices.length - 1] : document.getElementById('app'); }

  function visible(e) {
    if (!e || e.disabled) return false;
    if (e.getAttribute('data-off') === '1') return false;
    var r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && e.offsetParent !== null;
  }

  function elegibles(raiz) {
    var l = (raiz || raizActual()).querySelectorAll('[data-f]'), out = [];
    for (var i = 0; i < l.length; i++) if (visible(l[i])) out.push(l[i]);
    return out;
  }

  function centro(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function vecino(cur, dir, lista) {
    var rc = cur.getBoundingClientRect(), c = centro(rc), mejor = null, mejorPuntos = Infinity;
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i];
      if (e === cur) continue;
      var r = e.getBoundingClientRect(), p = centro(r), dx = p.x - c.x, dy = p.y - c.y, prim, sec;
      if (dir === 'der') { if (dx <= 4) continue; prim = dx; sec = Math.abs(dy); }
      else if (dir === 'izq') { if (dx >= -4) continue; prim = -dx; sec = Math.abs(dy); }
      else if (dir === 'abj') { if (dy <= 4) continue; prim = dy; sec = Math.abs(dx); }
      else { if (dy >= -4) continue; prim = -dy; sec = Math.abs(dx); }
      // Prefiere el que está alineado; penaliza el desvío lateral
      var solape = (dir === 'der' || dir === 'izq')
        ? Math.min(rc.bottom, r.bottom) - Math.max(rc.top, r.top)
        : Math.min(rc.right, r.right) - Math.max(rc.left, r.left);
      var puntos = prim + sec * 2.2 - (solape > 0 ? 80 : 0);
      if (puntos < mejorPuntos) { mejorPuntos = puntos; mejor = e; }
    }
    return mejor;
  }

  var Foco = Azure.Foco = {
    raiz: raizActual,
    empujarRaiz: function (el) {
      ultimoPorRaiz.push(document.activeElement);
      raices.push(el);
    },
    sacarRaiz: function (el) {
      var i = raices.lastIndexOf(el);
      if (i >= 0) raices.splice(i, 1);
      var prev = ultimoPorRaiz.pop();
      if (prev && document.body.contains(prev) && visible(prev)) Foco.poner(prev);
    },
    actual: function () {
      var a = document.activeElement;
      return a && a.getAttribute && a.getAttribute('data-f') ? a : null;
    },
    poner: function (el) {
      if (!el) return false;
      try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') el.classList.add('foco');
      var a = document.querySelectorAll('.foco');
      for (var i = 0; i < a.length; i++) if (a[i] !== el) a[i].classList.remove('foco');
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
      return true;
    },
    primero: function (raiz) {
      var l = elegibles(raiz);
      return l.length ? Foco.poner(l[0]) : false;
    },
    elegibles: elegibles,
    mover: function (dir) {
      var cur = Foco.actual(), lista = elegibles();
      if (!cur || !lista.length || lista.indexOf(cur) < 0) { if (lista.length) Foco.poner(lista[0]); return; }
      if (cur.__nav && cur.__nav(dir) === true) return;
      var v = vecino(cur, dir, lista);
      if (v) Foco.poner(v);
    }
  };

  // Manejador base: flechas, OK y largo. Lo ponen primero en la pila; las pantallas y diálogos van encima.
  Azure.Foco.manejadorBase = function (tecla, ev, extra) {
    var cur = Foco.actual();
    if (tecla === 'izq' || tecla === 'der' || tecla === 'arr' || tecla === 'abj') {
      var t = ev.target;
      if (extra.campo) {
        // En un campo de texto: las flechas arriba/abajo navegan; izq/der solo si el cursor está en el borde
        var pos = t.selectionStart, fin = (t.value || '').length;
        if (tecla === 'izq' && pos > 0) return false;
        if (tecla === 'der' && pos < fin) return false;
        if (t.tagName === 'TEXTAREA' && (tecla === 'arr' || tecla === 'abj')) {
          if (tecla === 'arr' && t.value.slice(0, pos).indexOf('\n') >= 0) return false;
          if (tecla === 'abj' && t.value.slice(pos).indexOf('\n') >= 0) return false;
        }
      }
      Foco.mover(tecla);
      return true;
    }
    if (tecla === 'ok') {
      if (cur) { cur.click(); return true; }
      return false;
    }
    if (tecla === 'chmas' || tecla === 'chmenos') {
      if (cur && cur.__pag) { cur.__pag(tecla === 'chmas' ? -1 : 1); return true; }
      return false;
    }
    if (tecla === 'okLargo' || tecla === 'amarillo') {
      if (cur && cur.__largo) { cur.__largo(); return true; }
      return false;
    }
    return false;
  };
})();
