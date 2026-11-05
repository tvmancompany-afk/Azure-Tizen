/* Pantallas: Listas preferentes (listas con link, Xtream y entradas con sublistas), A PREFERENTES y exportar/importar.
   Lógica de Azure Android (PreferentesSupport.kt / EntradasSupport.kt): en TV cada fila es UNA parada del control; con → o OK
   mantenido se entra al "modo botones" de la fila (candado, borrar, subir, bajar y —solo en Tizen, que no tiene teléfono para editar— editar).
   Aquí NO actúa el anillo del cursor: Preferentes es como la ventana aparte de Android, se maneja por sectores. */
(function () {
  var Azure = window.Azure, el = Azure.el, Pant = Azure.Pantallas, U = Pant.util, Pref = Azure.Pref, D = Azure.Dialogo;
  var Ic = Azure.Iconos;

  var MSG_URL = 'Debe empezar con http:// o https://';
  function esHttp(t) { return /^https?:\/\//i.test((t || '').trim()); }
  /** Video guardable: http(s) o enlace interno xtream://. */
  function esLinkVideo(t) { return esHttp(t) || Azure.Xtream.esEnlace((t || '').trim()); }
  /** Minúsculas y sin acentos, para que "pelicula" encuentre "Película". */
  function norm(t) { return (t || '').toLowerCase().normalize ? (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : (t || '').toLowerCase(); }

  /** Casilla (☐/☑) enfocable. */
  function casilla(texto, valor) {
    var v = !!valor;
    var b = el('div', { cls: 'btn', f: true, attrs: { tabindex: '-1' }, style: { textAlign: 'left', fontSize: '24px' } });
    function pintar() { b.textContent = (v ? '☑  ' : '☐  ') + texto; }
    b.addEventListener('click', function () { v = !v; pintar(); });
    pintar();
    return { el: b, valor: function () { return v; } };
  }

  /**
   * Formulario con varios campos. campos: [{et, valor, clave, multilinea, filas, url, casilla}]
   * mensaje: texto explicativo arriba. validar(vals) → texto de error o null (el diálogo queda abierto).
   * Devuelve Promise<[valores]|null>.
   */
  D.formulario = function (titulo, campos, textoOk, mensaje, validar) {
    return new Promise(function (res) {
      var cs = campos.map(function (c) {
        if (c.casilla) return casilla(c.casilla, c.valor);
        return c.clave ? Azure.Campo.clave(c.et, c.valor || '') : Azure.Campo.texto(c.et, c.valor || '', { multilinea: !!c.multilinea, filas: c.filas });
      });
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } });
      if (mensaje) cuerpo.appendChild(el('div', { cls: 'msg', text: mensaje }));
      cs.forEach(function (c) { cuerpo.appendChild(c.el); });
      var err = el('div', { cls: 'estado err', text: '' });
      cuerpo.appendChild(err);
      var vals = null;
      D.abrir({
        titulo: titulo, cuerpo: cuerpo,
        botones: [{ t: 'CANCELAR' }, { t: textoOk || 'ACEPTAR', cls: 'pri', noCerrar: true, fn: function (cerrar) {
          var v = cs.map(function (c) { return c.valor(); }), e = null;
          campos.forEach(function (c, i) { if (!e && c.url && v[i].trim() && !(c.url === 'video' ? esLinkVideo(v[i]) : esHttp(v[i]))) e = (c.et || 'Link') + ': ' + MSG_URL; });
          if (!e && validar) e = validar(v);
          if (e) { err.textContent = e; return; }
          vals = v; cerrar();
        } }],
        alCerrar: function () { res(vals); }
      });
    });
  };

  /* ---------------- contraseñas de exportar / importar ---------------- */
  function pedirTres(titulo, explicacion, confirmar, validar) {
    return D.formulario(titulo, [{ et: 'Contraseña 1', clave: true }, { et: 'Contraseña 2', clave: true }, { et: 'Contraseña 3', clave: true }], confirmar, explicacion, function (v) {
      if (!v[0] || !v[1] || !v[2]) return 'Escribe las 3 contraseñas.';
      return validar ? validar(v) : null;
    });
  }
  /** Primera vez / cambiar: guarda 3 contraseñas nuevas. Devuelve Promise<bool>. */
  function configurarClaves(primera) {
    return pedirTres(primera ? 'Configura tus 3 contraseñas' : 'Nuevas contraseñas',
      primera ? 'Para usar Listas preferentes primero configura Exportar: escribe 3 contraseñas de texto. Son el requisito para exportar e importar. Se pierden si desinstalas la app.'
        : 'Escribe las 3 contraseñas nuevas (las tres, otra vez).', 'GUARDAR').then(function (v) {
      if (!v) return false;
      Azure.Exportar.guardarClaves(v[0], v[1], v[2]);
      Azure.toast('Contraseñas guardadas. Ya puedes exportar e importar.');
      return true;
    });
  }
  /** Pide las 3 contraseñas guardadas y, si son correctas, ejecuta la acción. */
  function protegida(accion) {
    if (!Azure.Exportar.clavesConfiguradas()) { configurarClaves(true).then(function (ok) { if (ok) accion(); }); return; }
    pedirTres('Escribe tus 3 contraseñas', 'Para exportar, importar o cambiar las contraseñas hay que escribir las 3.', 'CONTINUAR', function (v) {
      return Azure.Exportar.verificarClaves(v[0], v[1], v[2]) ? null : 'Contraseñas incorrectas.';
    }).then(function (v) { if (v) accion(); });
  }

  function importarTexto(t) {
    try {
      var r = Azure.Exportar.importar(t);
      Pant.refrescarPref && Pant.refrescarPref();
      return D.aviso('Importar', 'Importado: ' + r.listas + ' lista(s) y ' + r.entradas + ' entrada(s). Los títulos iguales quedan duplicados: borra las copias si sobran.');
    } catch (e) { return D.aviso('Importar', 'Ese archivo no es un .azure válido.'); }
  }

  function enviarABuddy(texto) {
    return D.formulario('Enviar por Buddy Host', [{ et: 'Host', valor: Azure.BuddyHost.hostGuardado() }, { et: 'Título' }, { et: 'Clave', clave: true }], 'ENVIAR').then(function (v) {
      if (!v) return;
      Azure.BuddyHost.guardarHost(v[0]);
      return Azure.BuddyHost.guardar(v[0], v[1], v[2], texto).then(function () { Azure.toast('Enviado por Buddy Host.'); })
        .catch(function (e) { Azure.Registro.error('BuddyHost enviar', e); return D.aviso('Buddy Host', Azure.Red.mensaje(e)); });
    });
  }

  function accionExportar() {
    protegida(function () {
      var azure = Azure.Exportar.crearAzure(), txt = Azure.Exportar.crearTxt();
      var caja = Azure.Campo.texto('Archivo .azure (copia este texto o envíalo por Buddy Host)', azure, { multilinea: true, filas: 8 });
      D.abrir({ titulo: 'Exportar', cuerpo: caja.el, botones: [
        { t: 'VER TXT LEGIBLE', noCerrar: true, fn: function () { caja.poner(caja.valor() === azure ? txt : azure); } },
        { t: 'ENVIAR POR BUDDY HOST', fn: function () { enviarABuddy(azure); } },
        { t: 'CERRAR' }] });
    });
  }
  function accionImportar() {
    protegida(function () {
      D.menu('Importar desde', [
        { t: 'PEGAR TEXTO .azure', fn: function () { D.formulario('Pegar texto .azure', [{ et: 'Texto', multilinea: true, filas: 8 }], 'IMPORTAR').then(function (v) { if (v) importarTexto(v[0]); }); } },
        { t: 'DESDE UN LINK', fn: function () { D.formulario('Link del archivo .azure', [{ et: 'Link http(s)', url: true }], 'IMPORTAR').then(function (v) {
          if (!v || !v[0].trim()) return;
          Azure.Red.texto(v[0].trim(), { timeout: 30000 }).then(importarTexto).catch(function (e) { D.aviso('Importar', Azure.Red.mensaje(e)); });
        }); } },
        { t: 'DESDE BUDDY HOST', fn: function () { D.formulario('Cargar de Buddy Host', [{ et: 'Host', valor: Azure.BuddyHost.hostGuardado() }, { et: 'Título' }], 'CARGAR').then(function (v) {
          if (!v) return;
          Azure.BuddyHost.guardarHost(v[0]);
          Azure.BuddyHost.leer(v[0], v[1]).then(importarTexto).catch(function (e) { Azure.Registro.error('BuddyHost leer', e); D.aviso('Buddy Host', Azure.Red.mensaje(e)); });
        }); } }
      ]);
    });
  }
  function accionCambiarClaves() { protegida(function () { configurarClaves(false); }); }

  /* ---------------- A PREFERENTES (desde la pantalla principal) ---------------- */
  /** Selector de entrada (ElegirEntradaDialog de Android): tocar = a la entrada; mantener OK = ver sus sublistas. */
  function elegirEntrada(it, video) {
    var es = Pref.entradas();
    function listo(e, subId) {
      var n = Pref.agregarVideos(e.id, subId, [video]);
      Azure.toast(n ? 'Agregado a "' + e.title + '".' : 'Ese link ya estaba en esa entrada.');
    }
    function vistaSub(e) {
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      var api;
      var b0 = el('div', { cls: 'btn pri', text: '(la entrada)', f: true, attrs: { tabindex: '-1' } });
      b0.addEventListener('click', function () { api.cerrar(); listo(e, null); }); cuerpo.appendChild(b0);
      e.sublists.forEach(function (s) {
        var b = el('div', { cls: 'btn', text: '📁 ' + s.title, f: true, attrs: { tabindex: '-1' } });
        b.addEventListener('click', function () { api.cerrar(); listo(e, s.id); }); cuerpo.appendChild(b);
      });
      api = D.abrir({ titulo: e.title, cuerpo: cuerpo, botones: [{ t: 'ATRÁS', fn: function () { vistaEntradas(); } }, { t: 'CANCELAR' }] });
    }
    function vistaEntradas() {
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      var api;
      if (!es.length) cuerpo.appendChild(el('div', { cls: 'msg', text: 'Todavía no hay entradas. Créalas con CREAR ENTRADA en Listas preferentes.' }));
      else cuerpo.appendChild(el('div', { cls: 'msg', text: 'Toca una entrada para agregarlo ahí. Mantén pulsada una para ver sus sublistas.' }));
      es.forEach(function (e) {
        var b = el('div', { cls: 'btn', text: e.title, f: true, attrs: { tabindex: '-1' } });
        b.addEventListener('click', function () { api.cerrar(); listo(e, null); });
        b.__largo = function () { api.cerrar(); vistaSub(e); };
        cuerpo.appendChild(b);
      });
      api = D.abrir({ titulo: 'Agregar "' + it.title + '" a…', cuerpo: cuerpo, botones: [{ t: 'CANCELAR' }] });
    }
    vistaEntradas();
  }

  Pant.aPreferentes = function (it) {
    var video = Pref.videoDeElemento(it);
    var xt = Azure.Xtream.esEnlace(it.url);
    if (!esLinkVideo(video.url)) { Azure.toast('Este elemento no tiene un link guardable.'); return; }
    if (it.isList || xt) {
      D.menu('A PREFERENTES: ' + it.title, [
        { t: 'GUARDAR COMO LISTA CON LINK', fn: function () {
          var p = xt ? Azure.Xtream.parsear(it.url) : null;
          D.formulario('Guardar lista', [{ et: 'Título', valor: it.title }, { et: 'Link de la portada (opcional)', valor: it.logo || '', url: true }], 'GUARDAR').then(function (v) {
            if (!v) return;
            var x = p ? Pref.agregarLista({ title: v[0], cover: v[1], url: p.h, type: 'xtream', user: p.u, pass: p.p }) : Pref.agregarLista({ title: v[0], cover: v[1], url: it.url, type: 'm3u' });
            Azure.toast(x ? 'Lista guardada.' : 'Falta el título.');
          });
        } },
        { t: 'GUARDAR EN UNA ENTRADA', fn: function () { elegirEntrada(it, video); } }
      ]);
      return;
    }
    elegirEntrada(it, video);
  };

  /* ============================== PANTALLA ============================== */
  // Dónde estabas (se conserva al cerrar y volver a abrir, o al abrir una lista y regresar).
  var NAV = { entradaId: null, subId: null, fila: 0 };

  Pant.def.preferentes = function () {
    var S = { filtro: '', busca: false }, lista, estado = el('div', { cls: 'estado' });
    // Si lo que se estaba viendo se borró, se sube de nivel
    if (NAV.entradaId) {
      var e0 = Pref.entrada(NAV.entradaId);
      if (!e0) { NAV.entradaId = null; NAV.subId = null; }
      else if (NAV.subId && !e0.sublists.some(function (s) { return s.id === NAV.subId; })) NAV.subId = null;
    }

    function items() {
      var f = norm(S.filtro.trim()), out = [];
      if (!NAV.entradaId) {
        out = Pref.ordenado().map(function (x) {
          return { id: x.id, tipo: x.tipo, title: x.title, cover: x.cover, locked: x.locked, raw: x,
            etiqueta: (x.tipo === 'entrada' ? 'ENTRADA' : x.type === 'xtream' ? 'XTREAM' : 'LISTA') };
        });
      } else {
        var e = Pref.entrada(NAV.entradaId);
        if (!e) return [];
        if (!NAV.subId) e.sublists.forEach(function (s, i) { out.push({ id: s.id, tipo: 'sublista', title: '📁 ' + s.title, nombre: s.title, cover: s.cover, locked: s.locked, indice: i }); });
        var vids = NAV.subId ? Pref.videosDe(NAV.entradaId, NAV.subId) : e.videos;
        vids.forEach(function (v, i) { out.push({ tipo: 'video', title: (v.list ? '🔗 ' : '') + (v.title || 'Sin título'), nombre: v.title, cover: v.cover, url: v.url, list: v.list, indice: i }); });
      }
      return f ? out.filter(function (x) { return norm(x.nombre || x.title).indexOf(f) >= 0; }) : out;
    }
    function tituloNivel() {
      if (!NAV.entradaId) return 'Listas preferentes';
      var e = Pref.entrada(NAV.entradaId);
      if (NAV.subId && e) { var s = e.sublists.filter(function (x) { return x.id === NAV.subId; })[0]; if (s) return s.title; }
      return e ? e.title : '';
    }
    function mensajeVacio() {
      if (S.filtro.trim()) return 'Ningún título contiene "' + S.filtro.trim() + '".';
      if (!NAV.entradaId) return 'Todavía no hay listas. Pulsa CREAR para añadir la primera.';
      return NAV.subId ? 'Esta sublista está vacía. Usa AGREGAR VIDEO.' : 'Esta entrada está vacía. Usa AGREGAR SUBLISTA o AGREGAR VIDEO.';
    }
    /** Repinta. fila/boton: deja el modo botones en esa fila (tras mover, proteger, editar…). */
    function refrescar(conservar, fila, boton) {
      var it = items();
      lista.poner(it, conservar);
      var v = lista.el.querySelector('.lista-vacia'); if (v) v.textContent = mensajeVacio();
      tit.textContent = tituloNivel();
      cabecera();
      barraAcc();
      if (typeof fila === 'number') {
        if (typeof boton === 'number') lista.modoEn(Math.max(0, Math.min(it.length - 1, fila)), boton);
        else lista.enfocar(Math.max(0, Math.min(it.length - 1, fila)));
      }
    }
    Pant.refrescarPref = function () { if (Pant.actual() && Pant.actual().nombre === 'preferentes') refrescar(true); };

    function elegir(it, idx) {
      NAV.fila = idx;
      if (it.tipo === 'lista') { Pant.volver(); Pant.abrirEnlace(Pref.enlaceDeLista(it.raw), it.title); return; }
      if (it.tipo === 'entrada') { NAV.entradaId = it.id; NAV.subId = null; nivelNuevo(); return; }
      if (it.tipo === 'sublista') { NAV.subId = it.id; nivelNuevo(); return; }
      if (it.list) { Pant.volver(); Pant.abrirEnlace(it.url, it.nombre); return; }
      // Los elementos se regeneran en cada items(): se busca por su posición (indice) y no por referencia (antes siempre arrancaba en el 1.º).
      var vids = items().filter(function (x) { return x.tipo === 'video' && !x.list; });
      var pos = 0; vids.forEach(function (x, k) { if (x.indice === it.indice) pos = k; });
      // Como Android: la pantalla se cierra (conserva dónde estabas) y suena en la ventanita de la pantalla principal; pantalla completa con su botón.
      var lst = vids.map(function (v) { return { title: v.nombre, url: v.url, logo: v.cover }; });
      Pant.volver(); Pant.reproducirMini(lst, pos);
    }
    function nivelNuevo() { S.filtro = ''; S.busca = false; buscar.poner(''); buscarCaja.style.display = 'none'; NAV.fila = 0; refrescar(false); }

    /* ----- botones de cada fila ----- */
    function botones(it, idx) {
      var b = [], k = 0;
      function mover(d) {
        if (it.tipo === 'lista' || it.tipo === 'entrada') Pref.mover(it.id, d);
        else if (it.tipo === 'sublista') Pref.moverSublista(NAV.entradaId, it.indice, d);
        else Pref.moverVideo(NAV.entradaId, NAV.subId, it.indice, d);
        var n = items().length, nuevo = Math.max(0, Math.min(n - 1, idx + d));
        refrescar(true, nuevo, posBoton(it, d < 0 ? 'subir' : 'bajar'));   // el foco sigue en el mismo botón
      }
      var conCandado = it.tipo !== 'video';
      if (conCandado) b.push({ ic: 'candado', t: it.locked ? 'Protegida' : 'Proteger', cls: it.locked ? 'bloq' : 'rojo-ic', fn: function () { if (!it.locked) proteger(it, idx); } });
      b.push({ ic: 'papelera', t: 'Borrar', fn: function () { borrar(it, idx); } });
      if (!S.filtro.trim()) {
        b.push({ ic: 'subir', t: 'Subir', fn: function () { mover(-1); } });
        b.push({ ic: 'bajar', t: 'Bajar', fn: function () { mover(1); } });
      }
      if (!it.locked) b.push({ ic: 'editar', t: 'Editar', fn: function () { editar(it, idx); } });
      b.forEach(function (x, i) { x.i = i; });
      return b;
    }
    // posición de los botones subir/bajar en la fila (el foco los sigue al mover)
    function posBoton(it, nombre) {
      var n = 0; if (it.tipo !== 'video') n++;      // candado
      n++;                                         // borrar
      return nombre === 'subir' ? n : n + 1;
    }

    function proteger(it, idx) {
      var que = it.tipo === 'entrada' ? 'entrada' : it.tipo === 'sublista' ? 'sublista' : 'lista';
      var cuerpo = it.tipo === 'entrada' ? 'Ya no se podrá editar su título ni su portada. Se podrá seguir borrando, y agregar o quitar cosas dentro de ella.'
        : it.tipo === 'sublista' ? 'Ya no se podrá editar su título ni su portada. Se podrá seguir borrando, y agregar o quitar videos dentro de ella.'
          : 'Una vez protegida ya no se podrá editar. Para cambiarla tendrás que borrarla y volver a subir el link.';
      D.confirmar('¿Desea proteger la ' + que + '?', '"' + (it.nombre || it.title) + '"\n\n' + cuerpo, 'PROTEGER').then(function (si) {
        if (si) Pref.candado(it.id);
        refrescar(true, idx, 0);
      });
    }
    function borrar(it, idx) {
      var tit = it.tipo === 'entrada' ? '¿Borrar esta entrada?' : it.tipo === 'sublista' ? '¿Borrar esta sublista?' : it.tipo === 'video' ? '¿Borrar este video?' : '¿Borrar esta lista?';
      var msg = it.tipo === 'entrada' ? '"' + it.title + '"\n\nSe borran también sus sublistas y videos.'
        : it.tipo === 'sublista' ? '"' + it.nombre + '"\n\nSe borran también sus videos.' : (it.nombre || it.title);
      D.confirmar(tit, msg, 'BORRAR').then(function (si) {
        if (si) {
          if (it.tipo === 'lista') Pref.borrarLista(it.id); else if (it.tipo === 'entrada') Pref.borrarEntrada(it.id);
          else if (it.tipo === 'sublista') Pref.borrarSublista(NAV.entradaId, it.id); else Pref.borrarVideo(NAV.entradaId, NAV.subId, it.indice);
          lista.salirModo(false);
          refrescar(true, idx);
        } else refrescar(true, idx, 1);
      });
    }
    function editar(it, idx) {
      var fin = function () { refrescar(true, idx, 99); };
      if (it.tipo === 'entrada' || it.tipo === 'sublista') {
        D.formulario(it.tipo === 'entrada' ? 'Editar entrada' : 'Editar sublista', [{ et: 'Título', valor: it.nombre || it.title }, { et: 'Link de la portada (opcional)', valor: it.cover, url: true }], 'GUARDAR',
          null, function (v) { return v[0].trim() ? null : 'Escribe un título.'; }).then(function (v) {
          if (v) { if (it.tipo === 'entrada') Pref.editarEntrada(it.id, { title: v[0], cover: v[1] }); else Pref.editarSublista(NAV.entradaId, it.id, { title: v[0], cover: v[1] }); }
          fin(v);
        });
      } else if (it.tipo === 'video') {
        D.formulario('Editar video', [{ et: 'Título', valor: it.nombre }, { et: 'Link del video o stream', valor: it.url, url: 'video' }, { et: 'Link de la portada (opcional)', valor: it.cover, url: true },
          { casilla: 'Este link abre otra lista de links (no se reproduce)', valor: !!it.list }], 'GUARDAR', null,
          function (v) { return esLinkVideo(v[1]) ? null : 'Link del video o stream: ' + MSG_URL; }).then(function (v) {
          if (v) Pref.editarVideo(NAV.entradaId, NAV.subId, it.indice, { title: v[0], url: v[1], cover: v[2], list: v[3] });
          fin(v);
        });
      } else {
        var x = it.raw.type === 'xtream';
        var campos = x ? [{ et: 'Título', valor: it.title }, { et: 'Link de la portada (opcional)', valor: it.cover, url: true }, { et: 'Usuario', valor: it.raw.user }, { et: 'Contraseña', valor: it.raw.pass, clave: true }, { et: 'Link del host (ej. http://host:puerto)', valor: it.raw.url, url: true }]
          : [{ et: 'Título', valor: it.title }, { et: 'Link de la portada (opcional)', valor: it.cover, url: true }, { et: 'Link del repositorio o lista M3U', valor: it.raw.url, url: true }];
        D.formulario(x ? 'Editar Xtream' : 'Editar lista', campos, 'GUARDAR', null, function (v) {
          if (!v[0].trim()) return 'Escribe un título.';
          if (!esHttp(v[x ? 4 : 2]) && !(x && v[4].trim())) return 'Falta el link.';
          return null;
        }).then(function (v) {
          if (v) Pref.editarLista(it.id, x ? { title: v[0].trim(), cover: v[1].trim(), user: v[2].trim(), pass: v[3], url: Azure.Xtream.normalizarHost(v[4]) } : { title: v[0].trim(), cover: v[1].trim(), url: v[2].trim() });
          fin(v);
        });
      }
    }

    /* ----- creación ----- */
    function crearLista(xtream) {
      var campos = xtream ? [{ et: 'Título' }, { et: 'Link de la portada (opcional)', url: true }, { et: 'Usuario' }, { et: 'Contraseña', clave: true }, { et: 'Link del host (ej. http://host:puerto)', valor: 'http://', url: true }]
        : [{ et: 'Título' }, { et: 'Link de la portada (opcional)', url: true }, { et: 'Link del repositorio o lista M3U', url: true }];
      D.formulario(xtream ? 'Crear Xtream' : 'Crear lista', campos, 'GUARDAR', null, function (v) {
        if (!v[0].trim()) return 'Escribe un título.';
        if (xtream && (!v[2].trim() || !v[3])) return 'Falta el usuario o la contraseña.';
        if (!esHttp(v[xtream ? 4 : 2])) return 'Falta el link: ' + MSG_URL;
        return null;
      }).then(function (v) {
        if (!v) return;
        var x = xtream ? Pref.agregarLista({ title: v[0], cover: v[1], url: Azure.Xtream.normalizarHost(v[4]), type: 'xtream', user: v[2], pass: v[3] })
          : Pref.agregarLista({ title: v[0], cover: v[1], url: v[2], type: 'm3u' });
        if (!x) { Azure.toast('Revisa el título y el link.'); return; }
        refrescar(true, Pref.ordenado().length - 1);
      });
    }
    function crearEntrada() {
      D.formulario('Crear entrada', [{ et: 'Título' }, { et: 'Link de la portada (opcional)', url: true }], 'CREAR', null, function (v) { return v[0].trim() ? null : 'Escribe un título.'; }).then(function (v) {
        if (v && Pref.crearEntrada(v[0], v[1])) refrescar(true, Pref.ordenado().length - 1);
      });
    }
    function agregarSublista() {
      D.formulario('Agregar sublista', [{ et: 'Título' }, { et: 'Link de la portada (opcional)', url: true }], 'AGREGAR', null, function (v) { return v[0].trim() ? null : 'Escribe un título.'; }).then(function (v) {
        if (v && Pref.agregarSublista(NAV.entradaId, v[0], v[1])) refrescar(true, items().length - 1);
      });
    }
    function agregarVideo() {
      D.formulario(NAV.subId ? 'Agregar video a la sublista' : 'Agregar video a la entrada',
        [{ et: 'Título' }, { et: 'Link del video o stream', url: 'video' }, { et: 'Link de la portada (opcional)', url: true }, { casilla: 'Este link abre otra lista de links (no se reproduce)', valor: false }], 'AGREGAR', null,
        function (v) { return esLinkVideo(v[1]) ? null : 'Link del video o stream: ' + MSG_URL; }).then(function (v) {
        if (!v) return;
        var n = Pref.agregarVideos(NAV.entradaId, NAV.subId, [{ title: v[0], url: v[1], cover: v[2], list: v[3] }]);
        Azure.toast(n ? 'Agregado.' : 'Ese link ya estaba.');
        refrescar(true, items().length - 1);
      });
    }

    /* ----- cabecera: ✕ / ← , título, lupa ----- */
    var tit = el('h1', { text: 'Listas preferentes' });
    var bVolver = el('div', { cls: 'btn ib', f: true, attrs: { tabindex: '-1', 'aria-label': 'Volver' } }, Ic.crear('volver'));
    var bCerrar = el('div', { cls: 'btn ib', f: true, attrs: { tabindex: '-1', 'aria-label': 'Cerrar' } }, Ic.crear('cerrar'));
    var bLupa = el('div', { cls: 'btn ib', f: true, attrs: { tabindex: '-1', 'aria-label': 'Buscar' } }, Ic.crear('lupa'));
    var bCerrarRaiz = el('div', { cls: 'btn ib', f: true, attrs: { tabindex: '-1', 'aria-label': 'Cerrar' } }, Ic.crear('cerrar'));
    bVolver.addEventListener('click', function () { subir(); });
    bCerrar.addEventListener('click', function () { cerrar(); });
    bCerrarRaiz.addEventListener('click', function () { cerrar(); });
    bLupa.addEventListener('click', function () {
      S.busca = !S.busca; buscarCaja.style.display = S.busca ? '' : 'none';
      if (S.busca) Azure.Foco.poner(buscar.input); else { S.filtro = ''; buscar.poner(''); refrescar(false); Azure.Foco.poner(bLupa); }
    });
    // Android TV: ← en la lupa vuelve a la fila donde estabas; ← en una fila lleva al botón de arriba a la izquierda
    bLupa.__nav = function (dir) { if (dir === 'izq' && lista.hayFilas()) { lista.enfocarUltima(); return true; } return false; };
    var cab = el('div', { cls: 'pref-cab' }, el('img', { attrs: { src: 'assets/logo_azure.png', alt: '' }, style: { height: '72px', width: '72px', borderRadius: '16px' } }), bVolver, bCerrarRaiz, tit, bLupa, bCerrar);
    function cabecera() {
      var anidado = !!NAV.entradaId;
      bVolver.style.display = anidado ? '' : 'none'; bLupa.style.display = anidado ? '' : 'none'; bCerrar.style.display = anidado ? '' : 'none';
      bCerrarRaiz.style.display = anidado ? 'none' : '';
    }
    function primerBoton() { return NAV.entradaId ? bVolver : bCerrarRaiz; }
    function subir() { if (NAV.subId) { NAV.subId = null; } else NAV.entradaId = null; nivelNuevo(); Azure.Foco.poner(primerBoton()); }
    function cerrar() { Pant.volver(); }
    function atras() {
      if (lista.modo() >= 0) { lista.salirModo(true); return; }
      if (S.busca && S.filtro) { S.filtro = ''; buscar.poner(''); refrescar(false); return; }
      if (NAV.entradaId) subir(); else cerrar();
    }

    var buscar = Azure.Campo.texto('Buscar en esta lista', '', { alCambiar: function (v) { S.filtro = v; refrescar(false); } });
    var buscarCaja = el('div', { style: { display: 'none' } }, buscar.el);
    lista = Azure.Lista.crear({ pref: true, numerar: false, vacio: 'Todavía no hay listas. Pulsa CREAR para añadir la primera.',
      alElegir: elegir, botones: botones, etiqueta: function (it) { return it.etiqueta || ''; },
      alIzq: function () { Azure.Foco.poner(primerBoton()); return true; } });

    var acc = el('div', { cls: 'fila-h', style: { flexWrap: 'wrap' } });
    function barraAcc() {
      acc.innerHTML = '';
      if (!NAV.entradaId) {
        acc.appendChild(U.boton('CREAR', function () { crearLista(false); })); acc.appendChild(U.boton('CREAR XTREAM', function () { crearLista(true); }));
        acc.appendChild(U.boton('CREAR ENTRADA', crearEntrada));
      } else {
        if (!NAV.subId) acc.appendChild(U.boton('AGREGAR SUBLISTA', agregarSublista));
        acc.appendChild(U.boton('AGREGAR VIDEO', agregarVideo));
      }
    }

    /* ----- pestaña inferior "Exportar" (cerrada por defecto, solo en el nivel de arriba) ----- */
    var expAbierto = false, expTab = el('div', { cls: 'exp-tab', f: true, attrs: { tabindex: '-1' } }, el('span', { text: 'Exportar' }), el('span', { text: '▼' }));
    var expCuerpo = el('div', { cls: 'fila-h', style: { display: 'none', flexWrap: 'wrap' } },
      U.boton('EXPORTAR', accionExportar), U.boton('IMPORTAR', accionImportar), U.boton('CAMBIAR CONTRASEÑAS', accionCambiarClaves));
    expTab.addEventListener('click', function () { expAbierto = !expAbierto; expCuerpo.style.display = expAbierto ? '' : 'none'; expTab.lastChild.textContent = expAbierto ? '▲' : '▼'; });
    var expCaja = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, expTab, expCuerpo);
    var refrescarBase = refrescar;
    refrescar = function () { refrescarBase.apply(null, arguments); expCaja.style.display = NAV.entradaId ? 'none' : ''; };

    var pantalla = el('div', { cls: 'pantalla' }, cab,
      el('div', { cls: 'cuerpo', style: { flexDirection: 'column', gap: '14px' } }, acc, buscarCaja, lista.el, estado, expCaja));
    return {
      el: pantalla,
      sinAnillo: true,
      alMostrar: function () {
        refrescar(false);
        if (NAV.fila > 0 && lista.hayFilas()) lista.enfocar(Math.min(NAV.fila, lista.items().length - 1)); else Azure.Foco.poner(primerBoton());
        if (!Azure.Exportar.clavesConfiguradas()) {
          configurarClaves(true).then(function (ok) { if (!ok) Pant.volver(); });
        }
      },
      tecla: function (t) { if (t === 'atras') { atras(); return true; } return false; }
    };
  };
})();
