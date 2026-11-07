/* Datos: Listas preferentes (listas con link, listas Xtream y entradas con sublistas).
   Esquemas igual que Azure Android 0.1.14. El orden de listas y entradas es unificado (arreglo de ids). */
(function () {
  var Azure = window.Azure, A = Azure.Almacen;

  function listas() { return A.get('pref_listas', []); }
  function entradas() { return A.get('pref_entradas', []); }
  function orden() { return A.get('pref_orden', []); }
  function guardarListas(l) { return A.set('pref_listas', l); }
  function guardarEntradas(e) { return A.set('pref_entradas', e); }
  function guardarOrden(o) { return A.set('pref_orden', o); }

  /** Link válido para un video guardado: http(s) o un enlace interno xtream:// (carpeta de una cuenta Xtream; se abre como lista). */
  function linkValido(u) { return Azure.esLinkHttp(u) || (Azure.Xtream && Azure.Xtream.esEnlace(u)); }

  function mismoUrl(a, b) { return (a || '').trim() === (b || '').trim(); }

  function videoLimpio(v) {
    var o = { title: (v.title || '').trim() || 'Video', url: (v.url || '').trim(), cover: (v.cover || v.logo || '').trim() };
    if (v.isList || v.list) o.list = true;
    return o;
  }

  var Pref = Azure.Pref = {
    listas: listas, entradas: entradas, linkValido: linkValido,

    /** Primera pantalla: listas y entradas en el orden guardado; lo no ordenado va al final. */
    ordenado: function () {
      var ls = listas().map(function (x) { var c = {}; for (var k in x) c[k] = x[k]; c.tipo = 'lista'; return c; });
      var es = entradas().map(function (x) { var c = {}; for (var k in x) c[k] = x[k]; c.tipo = 'entrada'; return c; });
      var todo = ls.concat(es), por = {};
      todo.forEach(function (x) { por[x.id] = x; });
      var out = [], usados = {};
      orden().forEach(function (id) { if (por[id] && !usados[id]) { out.push(por[id]); usados[id] = true; } });
      todo.forEach(function (x) { if (!usados[x.id]) out.push(x); });
      return out;
    },

    /** Mueve una lista o entrada de la primera pantalla (delta -1 sube, +1 baja). */
    mover: function (id, delta) {
      var ids = Pref.ordenado().map(function (x) { return x.id; });
      var i = ids.indexOf(id);
      if (i < 0) return;
      guardarOrden(Azure.mover(ids, i, delta));
    },

    /* ---- listas con link ---- */
    agregarLista: function (d) {
      var tipo = d.type === 'xtream' ? 'xtream' : 'm3u';
      var x = { id: Azure.uid(), title: (d.title || '').trim(), cover: (d.cover || '').trim(), url: (d.url || '').trim(),
        locked: false, type: tipo, user: tipo === 'xtream' ? (d.user || '').trim() : '', pass: tipo === 'xtream' ? (d.pass || '') : '' };
      if (!x.title || !x.url) return null;
      var l = listas(); l.push(x); guardarListas(l);
      return x;
    },
    editarLista: function (id, d) {
      var l = listas();
      for (var i = 0; i < l.length; i++) if (l[i].id === id) {
        if (l[i].locked) return false;
        ['title', 'cover', 'url', 'user', 'pass'].forEach(function (k) { if (d[k] != null) l[i][k] = d[k]; });
        guardarListas(l); return true;
      }
      return false;
    },
    borrarLista: function (id) { guardarListas(listas().filter(function (x) { return x.id !== id; })); },
    enlaceDeLista: function (x) {
      return x.type === 'xtream' ? Azure.Xtream.enlaceRaiz(x.url, x.user, x.pass) : x.url;
    },

    /* ---- entradas ---- */
    crearEntrada: function (title, cover) {
      title = (title || '').trim(); if (!title) return null;
      var e = { id: Azure.uid(), title: title, cover: (cover || '').trim(), locked: false, videos: [], sublists: [] };
      var l = entradas(); l.push(e); guardarEntradas(l);
      return e;
    },
    entrada: function (id) { var l = entradas(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; },
    editarEntrada: function (id, d) {
      var l = entradas();
      for (var i = 0; i < l.length; i++) if (l[i].id === id) {
        if (l[i].locked) return false;
        if (d.title != null && d.title.trim()) l[i].title = d.title.trim();
        if (d.cover != null) l[i].cover = d.cover.trim();
        guardarEntradas(l); return true;
      }
      return false;
    },
    borrarEntrada: function (id) { guardarEntradas(entradas().filter(function (x) { return x.id !== id; })); },

    /** Cambia el candado de una lista, entrada o sublista (por id). El candado solo oculta editar. */
    candado: function (id) {
      var ls = listas(), es = entradas(), hecho = false;
      ls.forEach(function (x) { if (x.id === id) { x.locked = !x.locked; hecho = true; } });
      es.forEach(function (e) {
        if (e.id === id) { e.locked = !e.locked; hecho = true; }
        (e.sublists || []).forEach(function (s) { if (s.id === id) { s.locked = !s.locked; hecho = true; } });
      });
      if (hecho) { guardarListas(ls); guardarEntradas(es); }
      return hecho;
    },

    agregarSublista: function (entradaId, title, cover) {
      title = (title || '').trim(); if (!title) return null;
      var es = entradas();
      for (var i = 0; i < es.length; i++) if (es[i].id === entradaId) {
        var s = { id: Azure.uid(), title: title, cover: (cover || '').trim(), locked: false, videos: [] };
        es[i].sublists.push(s); guardarEntradas(es); return s;
      }
      return null;
    },
    editarSublista: function (entradaId, subId, d) {
      var es = entradas(), hecho = false;
      es.forEach(function (e) { if (e.id === entradaId) e.sublists.forEach(function (s) {
        if (s.id !== subId || s.locked) return;
        if (d.title != null && d.title.trim()) s.title = d.title.trim();
        if (d.cover != null) s.cover = d.cover.trim();
        hecho = true;
      }); });
      if (hecho) guardarEntradas(es);
      return hecho;
    },
    editarVideo: function (entradaId, subId, indice, d) {
      var es = entradas(), hecho = false;
      es.forEach(function (e) {
        if (e.id !== entradaId) return;
        var dest = e.videos;
        if (subId) e.sublists.forEach(function (s) { if (s.id === subId) dest = s.videos; });
        var v = dest[indice]; if (!v) return;
        if (d.title != null) v.title = d.title.trim() || 'Video';
        if (d.url != null && linkValido(d.url)) v.url = d.url.trim();
        if (d.cover != null) v.cover = d.cover.trim();
        if (d.list != null) { if (d.list) v.list = true; else delete v.list; }
        hecho = true;
      });
      if (hecho) guardarEntradas(es);
      return hecho;
    },
    borrarSublista: function (entradaId, subId) {
      var es = entradas();
      es.forEach(function (e) { if (e.id === entradaId) e.sublists = e.sublists.filter(function (s) { return s.id !== subId; }); });
      guardarEntradas(es);
    },

    /** Videos de una entrada (subId null) o de una sublista. */
    videosDe: function (entradaId, subId) {
      var e = Pref.entrada(entradaId); if (!e) return [];
      if (!subId) return e.videos;
      for (var i = 0; i < e.sublists.length; i++) if (e.sublists[i].id === subId) return e.sublists[i].videos;
      return [];
    },

    /** Agrega videos sin repetir URLs. Devuelve cuántos se agregaron. */
    agregarVideos: function (entradaId, subId, nuevos) {
      var es = entradas(), agregados = 0;
      es.forEach(function (e) {
        if (e.id !== entradaId) return;
        var dest = e.videos;
        if (subId) e.sublists.forEach(function (s) { if (s.id === subId) dest = s.videos; });
        nuevos.forEach(function (v) {
          var x = videoLimpio(v);
          if (!linkValido(x.url)) return;
          if (dest.some(function (d) { return mismoUrl(d.url, x.url); })) return;
          dest.push(x); agregados++;
        });
      });
      if (agregados) guardarEntradas(es);
      return agregados;
    },
    borrarVideo: function (entradaId, subId, indice) {
      var es = entradas();
      es.forEach(function (e) {
        if (e.id !== entradaId) return;
        var dest = e.videos;
        if (subId) e.sublists.forEach(function (s) { if (s.id === subId) dest = s.videos; });
        dest.splice(indice, 1);
      });
      guardarEntradas(es);
    },
    moverVideo: function (entradaId, subId, indice, delta) {
      var es = entradas();
      es.forEach(function (e) {
        if (e.id !== entradaId) return;
        if (subId) e.sublists.forEach(function (s) { if (s.id === subId) s.videos = Azure.mover(s.videos, indice, delta); });
        else e.videos = Azure.mover(e.videos, indice, delta);
      });
      guardarEntradas(es);
    },
    moverSublista: function (entradaId, indice, delta) {
      var es = entradas();
      es.forEach(function (e) { if (e.id === entradaId) e.sublists = Azure.mover(e.sublists, indice, delta); });
      guardarEntradas(es);
    },

    /** Reemplaza todo (lo usa importar) agregando al final con ids nuevos y sin candado. */
    agregarImportado: function (listasNuevas, entradasNuevas) {
      var ls = listas(), es = entradas();
      listasNuevas.forEach(function (x) {
        ls.push({ id: Azure.uid(), title: x.title, cover: x.cover || '', url: x.url, locked: false,
          type: x.type === 'xtream' ? 'xtream' : 'm3u', user: x.user || '', pass: x.pass || '' });
      });
      entradasNuevas.forEach(function (e) {
        es.push({ id: Azure.uid(), title: e.title, cover: e.cover || '', locked: false,
          videos: e.videos, sublists: e.sublists.map(function (s) { return { id: Azure.uid(), title: s.title, cover: s.cover || '', locked: false, videos: s.videos }; }) });
      });
      guardarListas(ls); guardarEntradas(es);
    },

    /** Convierte un elemento de la pantalla principal en video guardable. */
    videoDeElemento: function (it) { return videoLimpio(it); }
  };
})();
