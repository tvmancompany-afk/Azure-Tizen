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
      var items = [], top = 0, sel = 0, cap = 8, pool = [], modo = -1;

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
          var bots = el('div', { cls: 'bots' }); f.appendChild(bots); f.__bots = bots; f.__bs = [];
          f.__img = img; f.__t = t; f.__n = n;
          f.addEventListener('click', function () { if (this.__idx != null && items[this.__idx]) { sel = this.__idx; if (cfg.alElegir) cfg.alElegir(items[this.__idx], this.__idx); } });
          f.addEventListener('focus', function () { if (this.__idx != null) sel = this.__idx; });
          f.__largo = function () {
            if (this.__idx == null || !items[this.__idx]) return;
            if (cfg.botones) { sel = this.__idx; api.entrarModo(); return; }
            if (cfg.alLargo) cfg.alLargo(items[this.__idx], this.__idx);
          };
          f.__nav = function (dir) {
            if (dir === 'abj') { if (sel < items.length - 1) { sel++; pintar(true); } return true; }
            if (dir === 'arr') { if (sel > 0) { sel--; pintar(true); return true; } return false; }
            if (dir === 'der' && cfg.botones && items[sel]) { return api.entrarModo(); }
            if (dir === 'der' && cfg.alDer && items[sel]) { cfg.alDer(items[sel], sel); return true; }
            if (dir === 'izq' && cfg.alIzq) { return cfg.alIzq(items[sel], sel) !== false; }
            return false;
          };
          f.__pag = function (d) { api.pagina(d); };
          raiz.appendChild(f); pool.push(f);
        }
      }

      function armarBotones(f, it, idx) {
        if (idx !== modo || !cfg.botones) { if (f.__bs.length) { f.__bots.innerHTML = ''; f.__bs = []; } return; }
        if (f.__bs.length && f.__bs.__idx === idx && f.__bs.__it === it) return;
        f.__bots.innerHTML = ''; f.__bs = []; f.__bs.__idx = idx; f.__bs.__it = it;
        var defs = cfg.botones(it, idx) || [];
        defs.forEach(function (d, k) {
          var b = el('div', { cls: 'rb' + (d.cls ? ' ' + d.cls : ''), f: true, attrs: { tabindex: '-1', 'aria-label': d.t || '' } });
          if (d.ic) b.appendChild(Azure.Iconos.crear(d.ic)); else b.textContent = d.t;
          b.addEventListener('click', function (ev) { ev.stopPropagation(); modoK = k; if (d.fn) d.fn(idx, k); });
          b.__nav = function (dir) {
            if (dir === 'izq') { if (k > 0) Azure.Foco.poner(f.__bs[k - 1]); else api.salirModo(true); return true; }
            if (dir === 'der') { if (k < f.__bs.length - 1) Azure.Foco.poner(f.__bs[k + 1]); return true; }
            api.salirModo(false);
            if (dir === 'abj' && idx < items.length - 1) sel = idx + 1;
            else if (dir === 'arr' && idx > 0) sel = idx - 1;
            else sel = idx;
            pintar(true);
            return true;
          };
          f.__bots.appendChild(b); f.__bs.push(b);
        });
      }
      var modoK = 0;

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
          f.__n.style.display = idx === modo ? 'none' : '';
          armarBotones(f, it, idx);
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
        hayFilas: function () { return items.length > 0; },
        modo: function () { return modo; },
        /** Entra al modo botones de la fila seleccionada (como Android en TV). */
        entrarModo: function () { return api.modoEn(sel, 0); },
        /** Modo botones en la fila i con el foco en el botón k. */
        modoEn: function (i, k) {
          if (!cfg.botones || !items[i]) return false;
          sel = i; modo = i; modoK = k || 0; pintar(false);
          for (var q = 0; q < pool.length; q++) if (pool[q].__idx === i && pool[q].__bs.length) {
            Azure.Foco.poner(pool[q].__bs[Math.min(modoK, pool[q].__bs.length - 1)]); return true;
          }
          return false;
        },
        salirModo: function (devolver) { if (modo < 0) return; modo = -1; pintar(!!devolver); },
        /** Foco a la última fila donde se estuvo. */
        enfocarUltima: function () { pintar(true); }
      };
      raiz.__api = api;
      return api;
    }
  };
})();
