/* Explorador local para USB y discos conectados a la TV (API de archivos de Tizen: tizen.filesystem, permiso filesystem.read).
   Modo 'video': carpetas, videos/audios y subtítulos (tocar un video lo reproduce con la lista de la carpeta y le pone el subtítulo
   de igual nombre si existe; tocar un subtítulo lo carga). Modo 'sub': solo carpetas y subtítulos (se usa desde Subtítulos+ > DESDE USB).
   Solo funciona en la TV con un dispositivo conectado; en una PC no existe tizen.filesystem. No probado en la TV real. */
(function () {
  var Azure = window.Azure, el = Azure.el, D = Azure.Dialogo;
  var VIDEO = /\.(mp4|m4v|mkv|avi|mov|ts|m2ts|mts|mpg|mpeg|wmv|flv|webm|3gp|mp3|aac|m4a|flac|wav|ogg)$/i;
  var SUB = /\.(srt|vtt|ass|ssa)$/i;

  function fs() { return window.tizen && window.tizen.filesystem ? window.tizen.filesystem : null; }
  function msg(e) { return (e && (e.message || e.name)) || String(e); }
  function base(n) { return n.replace(/\.[^.]+$/, '').toLowerCase(); }
  function ext(n) { var m = /\.([^.]+)$/.exec(n); return m ? m[1].toLowerCase() : ''; }

  function decodificar(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    if (u8.length > 1 && u8[0] === 0xFF && u8[1] === 0xFE) return new TextDecoder('utf-16le').decode(u8).replace(/^﻿/, '');
    if (u8.length > 1 && u8[0] === 0xFE && u8[1] === 0xFF) return new TextDecoder('utf-16be').decode(u8).replace(/^﻿/, '');
    try { return new TextDecoder('utf-8', { fatal: true }).decode(u8).replace(/^﻿/, ''); }
    catch (e) { return new TextDecoder('windows-1252').decode(u8); }   // subtítulos viejos en ANSI (tildes)
  }
  function leerTexto(archivo, ok, err) {
    archivo.openStream('r', function (st) {
      try { var b = st.readBytes(archivo.fileSize); st.close(); ok(decodificar(b)); }
      catch (e) { try { st.close(); } catch (e2) {} err(e); }
    }, err);
  }
  function uri(f) { try { if (f.toURI) return f.toURI(); } catch (e) {} return 'file://' + f.fullPath; }
  function orden(a, b) { return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }); }

  /** opts: modo ('video'|'sub'), alVideo(lista, indice), alSub(texto, ext, nombre) */
  function abrir(opts) {
    opts = opts || {};
    var F = fs();
    var api, pila = [], dirActual = null, archivos = [];
    var lista = Azure.Lista.crear({ numerar: false, sinPortada: true, vacio: '', alElegir: elegir });
    lista.el.classList.add('vid'); lista.el.style.height = '800px'; lista.el.style.flex = 'none';
    var titulo = el('h2', { text: 'Explorador local' });
    var estado = el('div', { cls: 'estado', style: { fontSize: '26px' } });
    function ib(icono, fn) { var b = el('div', { cls: 'btn ib', f: true, attrs: { tabindex: '-1' } }, Azure.Iconos.crear(icono)); b.addEventListener('click', fn); return b; }
    var bSubir = ib('volver', function () { subir(); });
    var bAct = ib('recargar', function () { recargar(); });
    var bX = ib('cerrar', function () { api.cerrar(); });
    var cab = el('div', { cls: 'pleno-cab', style: { gap: '16px' } }, bSubir, titulo, bAct, bX);
    titulo.style.flex = '1'; titulo.style.whiteSpace = 'nowrap'; titulo.style.overflow = 'hidden'; titulo.style.textOverflow = 'ellipsis';
    [bSubir, bAct, bX].forEach(function (b) { b.__nav = function (dir) { if (dir === 'abj' && lista.hayFilas()) { lista.enfocar(lista.indice()); return true; } return false; }; });

    function ruta() { return dirActual ? (dirActual.fullPath || dirActual.name || '') : 'Explorador local'; }
    function pintar(items, vacio) {
      titulo.textContent = ruta();
      lista.el.querySelector('.lista-vacia').textContent = vacio || '';
      lista.poner(items, false);
      estado.textContent = '';
      bSubir.style.visibility = dirActual ? 'visible' : 'hidden';
      if (items.length) lista.enfocar(0); else Azure.Foco.poner(bAct);
    }
    function raiz() {
      pila = []; dirActual = null; archivos = [];
      if (!F) { pintar([], 'El explorador local solo funciona en la TV (con un USB o disco conectado).'); return; }
      estado.textContent = 'Buscando dispositivos…';
      F.listStorages(function (alm) {
        var ext_ = alm.filter(function (s) { return s.type === 'EXTERNAL' && (!s.state || s.state === 'MOUNTED'); });
        pintar(ext_.map(function (s) { return { title: '💾 ' + s.label, tipo: 'almacen', label: s.label }; }),
          'No se detectó ningún USB o disco conectado. Conéctalo y pulsa ↻ (recargar).');
      }, function (e) { Azure.Registro.error('Explorador listStorages', e); pintar([], 'No se pudo leer los dispositivos: ' + msg(e)); });
    }
    function entrar(dir, nuevo) {
      estado.textContent = 'Leyendo carpeta…';
      dir.listFiles(function (fs_) {
        if (nuevo) { if (dirActual) pila.push(dirActual); }
        dirActual = dir;
        var datos = fs_.map(function (f) { return { nombre: f.name, dir: !!f.isDirectory, obj: f }; });
        archivos = datos.filter(function (d) { return !d.dir; });
        var dirs = datos.filter(function (d) { return d.dir; }).sort(orden);
        var vids = opts.modo === 'sub' ? [] : datos.filter(function (d) { return !d.dir && VIDEO.test(d.nombre); }).sort(orden);
        var subs = datos.filter(function (d) { return !d.dir && SUB.test(d.nombre); }).sort(orden);
        var items = dirs.map(function (d) { return { title: '📁 ' + d.nombre, tipo: 'dir', obj: d.obj }; })
          .concat(vids.map(function (d) { return { title: '▶ ' + d.nombre, tipo: 'video', obj: d.obj, nombre: d.nombre }; }))
          .concat(subs.map(function (d) { return { title: '💬 ' + d.nombre, tipo: 'sub', obj: d.obj, nombre: d.nombre }; }));
        pintar(items, opts.modo === 'sub' ? 'No hay carpetas ni subtítulos (SRT, VTT, ASS, SSA) aquí.' : 'No hay carpetas, videos ni subtítulos aquí.');
      }, function (e) { Azure.Registro.error('Explorador listFiles', e); estado.textContent = 'No se pudo abrir la carpeta: ' + msg(e); });
    }
    function recargar() { if (dirActual) entrar(dirActual, false); else raiz(); }
    function subir() {
      if (!pila.length) { if (dirActual) raiz(); return; }
      var d = pila.pop();
      entrar(d, false);
    }
    function cargarSub(f, nombre, despues) {
      estado.textContent = 'Leyendo subtítulo…';
      leerTexto(f, function (t) {
        try {
          var n = Azure.Subtitulos.cargar(t, ext(nombre), nombre);
          if (opts.alSub) opts.alSub(n, nombre); else Azure.toast('Subtítulo cargado (' + n + ' líneas).');
          if (despues) despues();
        } catch (e) { estado.textContent = msg(e); }
      }, function (e) { Azure.Registro.error('Explorador subtítulo', e); estado.textContent = 'No se pudo leer el subtítulo: ' + msg(e); });
    }
    function elegir(it) {
      if (it.tipo === 'almacen') { estado.textContent = 'Abriendo…'; F.resolve(it.label, function (d) { entrar(d, true); }, function (e) { Azure.Registro.error('Explorador resolve', e); estado.textContent = 'No se pudo abrir ' + it.label + ': ' + msg(e); }, 'r'); return; }
      if (it.tipo === 'dir') { entrar(it.obj, true); return; }
      if (it.tipo === 'sub') { cargarSub(it.obj, it.nombre, opts.modo === 'sub' ? function () { api.cerrar(); } : null); return; }
      if (it.tipo === 'video') {
        var todos = lista.items().filter(function (x) { return x.tipo === 'video'; });
        var idx = 0; todos.forEach(function (x, k) { if (x.nombre === it.nombre) idx = k; });
        var pl = todos.map(function (x) { return { title: x.nombre.replace(/\.[^.]+$/, ''), url: uri(x.obj), logo: '' }; });
        var par = archivos.filter(function (d) { return SUB.test(d.nombre) && base(d.nombre) === base(it.nombre); })[0];
        api.cerrar();
        if (opts.alVideo) opts.alVideo(pl, idx);
        if (par) leerTexto(par.obj, function (t) { try { Azure.Subtitulos.cargar(t, ext(par.nombre), par.nombre); Azure.toast('Subtítulo cargado: ' + par.nombre); } catch (e) { Azure.Registro.aviso('Subtítulo USB: ' + msg(e)); } }, function (e) { Azure.Registro.aviso('Subtítulo USB: ' + msg(e)); });
      }
    }

    var manejador = function (t) {
      if (t === 'atras') { if (pila.length || dirActual) subir(); else api.cerrar(); return true; }
      return false;
    };
    api = D.abrir({ cuerpo: el('div', { cls: 'pleno' }, cab, lista.el, estado), botones: [], sinAtras: true, alCerrar: function () { Azure.Teclas.sacar(manejador); } });
    api.el.parentNode.classList.add('velo-pleno');
    Azure.Teclas.empujar(manejador);
    raiz();
    return api;
  }

  Azure.Explorador = { disponible: function () { return !!fs(); }, abrir: abrir, decodificar: decodificar };
})();
