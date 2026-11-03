/* Interfaz común: lista virtual. Solo existen en pantalla las filas visibles (unas 8 a 10), por eso aguanta
   miles de títulos sin trabarse. Las portadas se piden solo para las filas visibles. */
(function () {
  var Azure = window.Azure, el = Azure.el;
  var PORTADA = 'assets/portada_default.png';
  var SEP = 8, MARGEN = 10;

  Azure.Lista = {
    /**
     * cfg: alto (84), numerar (true), vacio (texto), alElegir(item,i), alLargo(item,i), alDer(item,i),
     *      activo(item,i) -> bool (fila que suena), etiqueta(item) -> texto corto a la derecha, pref (filas de 96)
     */
    crear: function (cfg) {
      cfg = cfg || {};
      var alto = cfg.alto || (cfg.pref ? 96 : 84), paso = alto + SEP;
      var raiz = el('div', { cls: 'lista' + (cfg.pref ? ' pref' : '') + (cfg.sinPortada ? ' sinport' : '') });
      var vacio = el('div', { cls: 'lista-vacia', text: cfg.vacio || 'Sin elementos.' });
      raiz.appendChild(vacio);
      var items = [], top = 0, sel = 0, cap = 8, pool = [];

      function capacidad() {
        var h = raiz.clientHeight;
        cap = h > 0 ? Math.max(1, Math.floor((h - MARGEN * 2 + SEP) / paso)) : 8;
      }

      function asegurarPool() {
        while (pool.length < cap + 1) {
          var f = el('div', { cls: 'fila', f: true, attrs: { tabindex: '-1' } });
          f.style.height = alto + 'px';
          var img = null;
          if (!cfg.sinPortada) { img = el('img'); img.onerror = function () { if (this.getAttribute('data-def') !== '1') { this.setAttribute('data-def', '1'); this.src = PORTADA; } }; }
          var t = el('div', { cls: 't' }), n = el('div', { cls: 'n' });
          if (img) f.appendChild(img);
          f.appendChild(t); f.appendChild(n);
          f.__img = img; f.__t = t; f.__n = n;
          f.addEventListener('click', function () { if (this.__idx != null && items[this.__idx]) { sel = this.__idx; if (cfg.alElegir) cfg.alElegir(items[this.__idx], this.__idx); } });
          f.addEventListener('focus', function () { if (this.__idx != null) sel = this.__idx; });
          f.__largo = function () { if (this.__idx != null && items[this.__idx] && cfg.alLargo) cfg.alLargo(items[this.__idx], this.__idx); };
          f.__nav = function (dir) {
            if (dir === 'abj') { if (sel < items.length - 1) { sel++; pintar(true); } return true; }
            if (dir === 'arr') { if (sel > 0) { sel--; pintar(true); return true; } return false; }
            if (dir === 'der' && cfg.alDer && items[sel]) { cfg.alDer(items[sel], sel); return true; }
            return false;
          };
          f.__pag = function (d) { api.pagina(d); };
          raiz.appendChild(f); pool.push(f);
        }
      }

      function pintar(enfocar) {
        capacidad(); asegurarPool();
        if (sel < 0) sel = 0;
        if (sel > items.length - 1) sel = Math.max(0, items.length - 1);
        if (sel < top) top = sel;
        if (sel >= top + cap) top = sel - cap + 1;
        if (top < 0) top = 0;
        vacio.style.display = items.length ? 'none' : 'flex';
        var foco = null;
        for (var k = 0; k < pool.length; k++) {
          var f = pool[k], idx = top + k, it = items[idx];
          if (!it || k >= cap) { f.style.display = 'none'; f.__idx = null; continue; }
          f.style.display = 'flex';
          f.style.top = (MARGEN + k * paso) + 'px';
          f.__idx = idx;
          var tit = (it.title || it.name || 'Video');
          f.__t.textContent = cfg.numerar === false ? tit : (idx + 1) + ' - ' + tit;
          var cover = it.cover || it.logo || PORTADA;
          if (f.__img && f.__img.getAttribute('data-src') !== cover) { f.__img.removeAttribute('data-def'); f.__img.setAttribute('data-src', cover); f.__img.src = cover; }
          var et = cfg.etiqueta ? cfg.etiqueta(it) : (it.isList ? 'LISTA' : '');
          f.__n.textContent = et || '';
          f.classList.toggle('activa', !!(cfg.activo && cfg.activo(it, idx)));
          if (idx === sel) foco = f;
        }
        if (enfocar && foco) Azure.Foco.poner(foco);
      }

      var api = {
        el: raiz,
        /** Reemplaza los elementos. conservar = mantiene la posición si cabe. */
        poner: function (lista, conservar) {
          items = lista || [];
          var teniaFoco = raiz.contains(document.activeElement);
          if (!conservar) { top = 0; sel = 0; }
          // Si el foco estaba en una fila, sigue en la fila que corresponde (no se queda en una fila reciclada)
          pintar(teniaFoco && items.length > 0);
        },
        items: function () { return items; },
        indice: function () { return sel; },
        actual: function () { return items[sel]; },
        refrescar: function () { pintar(false); },
        /** Enfoca la fila i. Si se da `antes`, deja esa cantidad de filas visibles por encima (como el selector de Android: título actual - 3). */
        enfocar: function (i, antes) { if (typeof i === 'number') sel = i; if (typeof antes === 'number') top = Math.max(0, sel - antes); pintar(true); },
        pagina: function (d) { if (!items.length) return; sel = Math.max(0, Math.min(items.length - 1, sel + d * cap)); pintar(true); },
        irAlFinal: function () { sel = Math.max(0, items.length - 1); pintar(true); },
        irAlInicio: function () { sel = 0; pintar(true); },
        /** Desplaza la ventana de filas sin mover el foco (lo usa el cursor). */
        desplazar: function (d) {
          if (!items.length) return; capacidad();
          top = Math.max(0, Math.min(Math.max(0, items.length - cap), top + d));
          if (sel < top) sel = top; if (sel > top + cap - 1) sel = top + cap - 1;
          pintar(false);
        },
        hayFilas: function () { return items.length > 0; }
      };
      raiz.__api = api;
      return api;
    }
  };
})();
