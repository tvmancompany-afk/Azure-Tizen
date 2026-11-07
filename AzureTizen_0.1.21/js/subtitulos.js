/* Reproductor: subtítulos externos SRT, VTT y ASS/SSA. El texto se lee y se dibuja la app misma encima del video
   (ni AVPlay ni <video> necesitan soportar el formato). Ajuste de tiempo como en Azure: -1 s, -0,1, 0, +0,1, +1 s. */
(function () {
  var Azure = window.Azure;
  var TIEMPO = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

  function ms(h, m, s, f) {
    var fr = String(f || '0'); while (fr.length < 3) fr += '0';
    return (((parseInt(h || '0', 10) * 60 + parseInt(m, 10)) * 60) + parseInt(s, 10)) * 1000 + parseInt(fr.slice(0, 3), 10);
  }
  function limpiar(t) {
    return String(t || '').replace(/\{\\[^}]*\}/g, '').replace(/<[^>]+>/g, '').replace(/\\N/g, '\n').replace(/\\n/g, '\n')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  }

  function parseSrtVtt(texto) {
    var cues = [], bloques = texto.replace(/\r\n?/g, '\n').split(/\n{2,}/);
    bloques.forEach(function (b) {
      var ls = b.split('\n'), k = -1;
      for (var i = 0; i < ls.length; i++) if (ls[i].indexOf('-->') >= 0) { k = i; break; }
      if (k < 0) return;
      var partes = ls[k].split('-->');
      var a = TIEMPO.exec(partes[0]), z = TIEMPO.exec(partes[1] || '');
      if (!a || !z) return;
      var txt = limpiar(ls.slice(k + 1).join('\n'));
      if (txt) cues.push({ s: ms(a[1], a[2], a[3], a[4]), e: ms(z[1], z[2], z[3], z[4]), t: txt });
    });
    return cues;
  }

  function parseAss(texto) {
    var cues = [], formato = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
    texto.replace(/\r\n?/g, '\n').split('\n').forEach(function (l) {
      var m = /^\s*Format:\s*(.*)$/i.exec(l);
      if (m && /start/i.test(m[1]) && /text/i.test(m[1])) { formato = m[1].split(',').map(function (x) { return x.trim().toLowerCase(); }); return; }
      m = /^\s*Dialogue:\s*(.*)$/i.exec(l);
      if (!m) return;
      var n = formato.length, p = m[1].split(','), campos = p.slice(0, n - 1);
      campos.push(p.slice(n - 1).join(','));
      var is = formato.indexOf('start'), ie = formato.indexOf('end'), it = formato.indexOf('text');
      var a = /(\d+):(\d{2}):(\d{2})[.,](\d{1,3})/.exec(campos[is] || ''), z = /(\d+):(\d{2}):(\d{2})[.,](\d{1,3})/.exec(campos[ie] || '');
      if (!a || !z) return;
      var txt = limpiar(campos[it]);
      if (txt) cues.push({ s: ms(a[1], a[2], a[3], a[4]), e: ms(z[1], z[2], z[3], z[4]), t: txt });
    });
    return cues;
  }

  var COLORES = [
    { n: 'BLANCO', v: '#ffffff' }, { n: 'AMARILLO', v: '#ffe44d' }, { n: 'CELESTE', v: '#7cc8ff' }, { n: 'VERDE', v: '#7dff9b' },
    { n: 'NARANJA', v: '#ffa94d' }, { n: 'ROSA', v: '#ff8fc7' }, { n: 'GRIS', v: '#b0b0b0' }, { n: 'NEGRO', v: '#000000' }, { n: 'AZUL OSCURO', v: '#06121c' }
  ];
  function limitar(n, a, b) { n = Number(n); if (isNaN(n)) n = a; return Math.max(a, Math.min(b, Math.round(n))); }

  var ultimo = null;
  var cues = [], offset = 0, nombre = '', posicion = Azure.Almacen.get('sub_posicion', 0);

  var Subtitulos = Azure.Subtitulos = {
    parsear: function (texto, ext) {
      ext = String(ext || '').toLowerCase().replace('.', '');
      var c = (ext === 'ass' || ext === 'ssa') ? parseAss(texto) : parseSrtVtt(texto);
      c.sort(function (a, b) { return a.s - b.s; });
      return c;
    },
    /** Carga el texto de un subtítulo. Devuelve la cantidad de líneas o lanza Error. */
    cargar: function (texto, ext, nom) {
      if (!texto || texto.length > 5 * 1024 * 1024) throw new Error('El subtítulo está vacío o es demasiado grande.');
      if (['srt', 'vtt', 'ass', 'ssa'].indexOf(String(ext).toLowerCase().replace('.', '')) < 0) throw new Error('Formato no compatible. Usa SRT, VTT, ASS o SSA.');
      var c = Subtitulos.parsear(texto, ext);
      if (!c.length) throw new Error('No se encontraron líneas de subtítulo en ese texto.');
      cues = c; offset = 0; nombre = nom || ('subtitulo.' + ext);
      ultimo = { t: texto, e: String(ext).toLowerCase().replace('.', ''), n: nombre };
      return c.length;
    },
    desdeUrl: function (url) {
      var ext = (url.split('#')[0].split('?')[0].split('.').pop() || '').toLowerCase();
      return Azure.Red.texto(url, { timeout: 20000 }).then(function (t) { return Subtitulos.cargar(t, ext, url.split('/').pop()); });
    },
    quitar: function () { cues = []; offset = 0; nombre = ''; ultimo = null; },
    hay: function () { return cues.length > 0; },
    nombre: function () { return nombre; },
    ajustar: function (delta) { offset = delta === 0 ? 0 : offset + delta; return offset; },
    offset: function () { return offset; },
    posicion: function () { return posicion; },
    ciclarPosicion: function () {
      var orden = [0, 1, 2, 4]; posicion = orden[(orden.indexOf(posicion) + 1) % orden.length];
      Azure.Almacen.set('sub_posicion', posicion); return posicion;
    },
    ponerPosicion: function (p) { posicion = p; Azure.Almacen.set('sub_posicion', p); },

    /** Texto que toca mostrar en el instante t (ms) o ''. Búsqueda binaria sobre los cues ordenados. */
    en: function (t) {
      if (!cues.length) return '';
      var x = t - offset, lo = 0, hi = cues.length - 1, mejor = -1;
      while (lo <= hi) { var mid = (lo + hi) >> 1; if (cues[mid].s <= x) { mejor = mid; lo = mid + 1; } else hi = mid - 1; }
      for (var i = mejor; i >= 0 && i > mejor - 4; i--) if (x >= cues[i].s && x <= cues[i].e) return cues[i].t;
      return '';
    },
    /* ---------- Almacenados (equivale a ALMACENADOS de Azure Android: subtítulos guardados en la app) ---------- */
    guardados: function () { return Azure.Almacen.get('subs_guardados', []); },
    puedeGuardar: function () { return !!ultimo; },
    /** Guarda el subtítulo cargado. Lanza Error si no hay o si ya no cabe (tope ~1,5 millones de caracteres en total). */
    guardarActual: function () {
      if (!ultimo) throw new Error('No hay subtítulo cargado.');
      var l = Subtitulos.guardados().filter(function (x) { return x.n !== ultimo.n; });
      l.push({ n: ultimo.n, e: ultimo.e, t: ultimo.t });
      var total = 0; l.forEach(function (x) { total += x.t.length; });
      if (total > 1500000) throw new Error('No hay espacio para más subtítulos guardados. Borra alguno.');
      if (!Azure.Almacen.set('subs_guardados', l)) throw new Error('No se pudo guardar (memoria de la app llena).');
      return ultimo.n;
    },
    cargarGuardado: function (i) { var x = Subtitulos.guardados()[i]; if (!x) throw new Error('Ese subtítulo ya no existe.'); return Subtitulos.cargar(x.t, x.e, x.n); },
    borrarGuardado: function (i) { var l = Subtitulos.guardados(); l.splice(i, 1); Azure.Almacen.set('subs_guardados', l); },

    /* ---------- Estilo visual (tamaño, color, grosor, contorno, fondo, ajuste vertical) ----------
       En la TV los subtítulos los dibuja la app (no se usan los de Samsung), así que todo se configura aquí. */
    COLORES: COLORES,
    estiloDef: function () { return { tam: 44, color: '#ffffff', peso: 600, cColor: '#000000', cPx: 2, fondo: 0, ajuste: 0 }; },
    estiloGet: function () {
      var e = Subtitulos.estiloDef(), g = Azure.Almacen.get('sub_estilo', null);
      if (g && typeof g === 'object') for (var k in e) if (g[k] != null) e[k] = g[k];
      e.tam = limitar(e.tam, 24, 96); e.cPx = limitar(e.cPx, 0, 8); e.ajuste = limitar(e.ajuste, -400, 400);
      if ([400, 600, 800].indexOf(e.peso) < 0) e.peso = 600;
      if (e.fondo !== 0 && e.fondo !== 1 && e.fondo !== 2) e.fondo = 0;
      return e;
    },
    estiloPoner: function (clave, valor) {
      var e = Subtitulos.estiloGet(); e[clave] = valor; Azure.Almacen.set('sub_estilo', e); return Subtitulos.estiloGet();
    },
    /** Suma delta a una clave numérica (tam: paso 4; cPx: paso 1; ajuste: paso 10) respetando los límites. */
    estiloSumar: function (clave, delta) { return Subtitulos.estiloPoner(clave, Subtitulos.estiloGet()[clave] + delta)[clave]; },
    /** Pasa al color siguiente de la paleta para 'color' o 'cColor'. Devuelve el color nuevo. */
    estiloColorSiguiente: function (clave) {
      var actual = Subtitulos.estiloGet()[clave], i = 0;
      for (var j = 0; j < COLORES.length; j++) if (COLORES[j].v === actual) i = j;
      var nuevo = COLORES[(i + 1) % COLORES.length].v; Subtitulos.estiloPoner(clave, nuevo); return nuevo;
    },
    estiloCiclar: function (clave, valores) {
      var actual = Subtitulos.estiloGet()[clave], i = valores.indexOf(actual);
      var nuevo = valores[(i + 1) % valores.length]; Subtitulos.estiloPoner(clave, nuevo); return nuevo;
    },
    estiloRestablecer: function () { Azure.Almacen.set('sub_estilo', Subtitulos.estiloDef()); },
    nombreColor: function (v) { for (var j = 0; j < COLORES.length; j++) if (COLORES[j].v === v) return COLORES[j].n; return v; },

    /** Contorno con text-shadow (anillos de 16 direcciones): funciona en cualquier motor web de TV. */
    sombra: function (e) {
      e = e || Subtitulos.estiloGet();
      if (e.cPx <= 0) return 'none';
      var partes = [];
      for (var r = 1; r <= e.cPx; r++) {
        for (var i = 0; i < 16; i++) {
          var ang = i * Math.PI / 8;
          partes.push((Math.cos(ang) * r).toFixed(1) + 'px ' + (Math.sin(ang) * r).toFixed(1) + 'px 0 ' + e.cColor);
        }
      }
      partes.push('0 0 ' + (e.cPx + 3) + 'px ' + e.cColor);
      return partes.join(',');
    },
    /** Aplica tamaño, color, grosor, contorno y fondo a un elemento (sin posicionarlo). */
    aplicarVisual: function (el) {
      var e = Subtitulos.estiloGet(), st = el.style;
      st.fontSize = e.tam + 'px'; st.color = e.color; st.fontWeight = String(e.peso); st.textShadow = Subtitulos.sombra(e);
      st.background = e.fondo === 1 ? 'rgba(0,0,0,.55)' : (e.fondo === 2 ? '#000' : 'transparent');
      st.padding = e.fondo ? '4px 18px' : '0'; st.borderRadius = e.fondo ? '10px' : '0';
    },
    /** Estilo completo para el subtítulo del reproductor: visual + posición (preajuste + ajuste fino). */
    aplicar: function (el) {
      Subtitulos.aplicarVisual(el);
      var s = Subtitulos.estilo(); el.style.top = s.top; el.style.bottom = s.bottom;
    },
    /** Posición vertical: preajuste (0 abajo, 1 arriba, 2 pegado abajo, 4 pegado arriba) + ajuste fino en px (positivo = más arriba). */
    estilo: function () {
      var aj = Subtitulos.estiloGet().ajuste, s = { top: 'auto', bottom: 'auto' };
      if (posicion === 1) s.top = Math.max(0, 90 - aj) + 'px';
      else if (posicion === 4) s.top = Math.max(0, 30 - aj) + 'px';
      else if (posicion === 2) s.bottom = Math.max(0, 30 + aj) + 'px';
      else s.bottom = Math.max(0, 130 + aj) + 'px';
      return s;
    }
  };
})();
