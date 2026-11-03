/* Pantallas: Listas preferentes (listas con link, Xtream y entradas con sublistas), A PREFERENTES y exportar/importar. */
(function () {
  var Azure = window.Azure, el = Azure.el, Pant = Azure.Pantallas, U = Pant.util, Pref = Azure.Pref, D = Azure.Dialogo;

  /** Formulario con varios campos. campos: [{et, valor, clave, multilinea}] → Promise<[valores]|null> */
  D.formulario = function (titulo, campos, textoOk) {
    return new Promise(function (res) {
      var cs = campos.map(function (c) { return c.clave ? Azure.Campo.clave(c.et, c.valor || '') : Azure.Campo.texto(c.et, c.valor || '', { multilinea: !!c.multilinea, filas: c.filas }); });
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } });
      cs.forEach(function (c) { cuerpo.appendChild(c.el); });
      var vals = null;
      D.abrir({
        titulo: titulo, cuerpo: cuerpo,
        botones: [{ t: 'CANCELAR' }, { t: textoOk || 'ACEPTAR', cls: 'pri', fn: function () { vals = cs.map(function (c) { return c.valor(); }); } }],
        alCerrar: function () { res(vals); }
      });
    });
  };

  /** Pide las 3 contraseñas de exportar/importar. Si aún no existen, las crea. Devuelve true si se puede seguir. */
  function pedirClaves(motivo) {
    var crear = !Azure.Exportar.clavesConfiguradas();
    var tit = crear ? 'Crea tus 3 contraseñas (' + motivo + ')' : 'Escribe tus 3 contraseñas (' + motivo + ')';
    return D.formulario(tit, [{ et: 'Contraseña 1', clave: true }, { et: 'Contraseña 2', clave: true }, { et: 'Contraseña 3', clave: true }], crear ? 'GUARDAR' : 'CONTINUAR').then(function (v) {
      if (!v) return false;
      if (!v[0] || !v[1] || !v[2]) { return D.aviso('Contraseñas', 'Escribe las 3 contraseñas.').then(function () { return false; }); }
      if (crear) { Azure.Exportar.guardarClaves(v[0], v[1], v[2]); Azure.toast('Contraseñas guardadas.'); return true; }
      if (!Azure.Exportar.verificarClaves(v[0], v[1], v[2])) return D.aviso('Contraseñas', 'Las contraseñas no coinciden.').then(function () { return false; });
      return true;
    });
  }

  function importarTexto(t) {
    try {
      var r = Azure.Exportar.importar(t);
      return D.aviso('Importar', 'Importado: ' + r.listas + ' listas y ' + r.entradas + ' entradas. Los títulos iguales quedan duplicados: borra las copias si sobran.');
    } catch (e) { return D.aviso('Importar', e.message); }
  }

  function enviarABuddy(texto) {
    return D.formulario('Enviar por Buddy Host', [{ et: 'Host', valor: Azure.BuddyHost.hostGuardado() }, { et: 'Título' }, { et: 'Clave', clave: true }], 'ENVIAR').then(function (v) {
      if (!v) return;
      Azure.BuddyHost.guardarHost(v[0]);
      return Azure.BuddyHost.guardar(v[0], v[1], v[2], texto).then(function () { Azure.toast('Enviado por Buddy Host.'); })
        .catch(function (e) { Azure.Registro.error('BuddyHost enviar', e); return D.aviso('Buddy Host', Azure.Red.mensaje(e)); });
    });
  }

  function menuExportar() {
    D.menu('Exportar / importar', [
      { t: 'EXPORTAR', fn: function () {
        pedirClaves('exportar').then(function (ok) {
          if (!ok) return;
          var azure = Azure.Exportar.crearAzure(), txt = Azure.Exportar.crearTxt();
          var caja = Azure.Campo.texto('Archivo .azure (copia este texto o envíalo por Buddy Host)', azure, { multilinea: true, filas: 8 });
          D.abrir({ titulo: 'Exportar', cuerpo: caja.el, botones: [
            { t: 'VER TXT LEGIBLE', noCerrar: true, fn: function () { caja.poner(caja.valor() === azure ? txt : azure); } },
            { t: 'ENVIAR POR BUDDY HOST', fn: function () { enviarABuddy(azure); } },
            { t: 'CERRAR' }] });
        });
      } },
      { t: 'IMPORTAR', fn: function () {
        pedirClaves('importar').then(function (ok) {
          if (!ok) return;
          D.menu('Importar desde', [
            { t: 'PEGAR TEXTO .azure', fn: function () { D.formulario('Pegar texto .azure', [{ et: 'Texto', multilinea: true, filas: 8 }], 'IMPORTAR').then(function (v) { if (v) importarTexto(v[0]); }); } },
            { t: 'DESDE UN LINK', fn: function () { D.formulario('Link del archivo .azure', [{ et: 'Link http(s)' }], 'IMPORTAR').then(function (v) {
              if (!v) return;
              Azure.Red.texto(v[0].trim(), { timeout: 30000 }).then(importarTexto).catch(function (e) { D.aviso('Importar', Azure.Red.mensaje(e)); });
            }); } },
            { t: 'DESDE BUDDY HOST', fn: function () { D.formulario('Cargar de Buddy Host', [{ et: 'Host', valor: Azure.BuddyHost.hostGuardado() }, { et: 'Título' }], 'CARGAR').then(function (v) {
              if (!v) return;
              Azure.BuddyHost.guardarHost(v[0]);
              Azure.BuddyHost.leer(v[0], v[1]).then(importarTexto).catch(function (e) { Azure.Registro.error('BuddyHost leer', e); D.aviso('Buddy Host', Azure.Red.mensaje(e)); });
            }); } }
          ]);
        });
      } },
      { t: 'CAMBIAR CONTRASEÑAS', fn: function () {
        if (!Azure.Exportar.clavesConfiguradas()) { pedirClaves('crear'); return; }
        pedirClaves('actuales').then(function (ok) {
          if (!ok) return;
          D.formulario('Contraseñas nuevas', [{ et: 'Nueva 1', clave: true }, { et: 'Nueva 2', clave: true }, { et: 'Nueva 3', clave: true }], 'GUARDAR').then(function (v) {
            if (v && v[0] && v[1] && v[2]) { Azure.Exportar.guardarClaves(v[0], v[1], v[2]); Azure.toast('Contraseñas cambiadas.'); }
          });
        });
      } }
    ]);
  }

  /* ---- A PREFERENTES desde la pantalla principal ---- */
  Pant.aPreferentes = function (it) {
    var video = Pref.videoDeElemento(it);
    if (!Azure.esLinkHttp(video.url) && !Azure.Xtream.esEnlace(video.url)) { Azure.toast('Este elemento no tiene un link guardable.'); return; }
    function aEntrada() {
      var es = Pref.entradas();
      var op = es.map(function (e) { return { t: e.title, fn: function () { aDestino(e); } }; });
      op.push({ t: 'NUEVA ENTRADA…', cls: 'pri', fn: function () {
        D.formulario('Nueva entrada', [{ et: 'Título' }, { et: 'Imagen (link, opcional)' }], 'CREAR').then(function (v) {
          if (!v) return; var e = Pref.crearEntrada(v[0], v[1]); if (e) aDestino(e); else Azure.toast('Escribe un título.');
        });
      } });
      D.menu('Elige la entrada', op);
    }
    function aDestino(e) {
      var op = [{ t: 'VIDEOS SUELTOS DE LA ENTRADA', fn: function () { guardar(e.id, null); } }];
      e.sublists.forEach(function (s) { op.push({ t: 'Sublista: ' + s.title, fn: function () { guardar(e.id, s.id); } }); });
      op.push({ t: 'NUEVA SUBLISTA…', cls: 'pri', fn: function () {
        D.formulario('Nueva sublista', [{ et: 'Título' }, { et: 'Imagen (link, opcional)' }], 'CREAR').then(function (v) {
          if (!v) return; var s = Pref.agregarSublista(e.id, v[0], v[1]); if (s) guardar(e.id, s.id); else Azure.toast('Escribe un título.');
        });
      } });
      D.menu('¿Dónde dentro de "' + e.title + '"?', op);
    }
    function guardar(eid, sid) {
      var n = Pref.agregarVideos(eid, sid, [video]);
      Azure.toast(n ? 'Guardado en Preferentes.' : 'Ya estaba guardado ahí.');
    }
    var op = [];
    if (it.isList || Azure.Xtream.esEnlace(it.url)) op.push({ t: 'GUARDAR COMO LISTA CON LINK', fn: function () {
      var xt = Azure.Xtream.esEnlace(it.url) ? Azure.Xtream.parsear(it.url) : null;
      D.formulario('Guardar lista', [{ et: 'Título', valor: it.title }, { et: 'Imagen (opcional)', valor: it.logo || '' }], 'GUARDAR').then(function (v) {
        if (!v) return;
        var x = xt ? Pref.agregarLista({ title: v[0], cover: v[1], url: xt.h, type: 'xtream', user: xt.u, pass: xt.p }) : Pref.agregarLista({ title: v[0], cover: v[1], url: it.url, type: 'm3u' });
        Azure.toast(x ? 'Lista guardada.' : 'Falta el título.');
      });
    } });
    op.push({ t: 'GUARDAR EN UNA ENTRADA', fn: aEntrada });
    D.menu('A PREFERENTES: ' + it.title, op);
  };

  /* ============================== PANTALLA ============================== */
  Pant.def.preferentes = function () {
    var S = { entradaId: null, subId: null, filtro: '' }, lista, estado = el('div', { cls: 'estado' });

    function items() {
      var f = S.filtro.trim().toLowerCase(), out = [];
      if (!S.entradaId) {
        out = Pref.ordenado().map(function (x) {
          return { id: x.id, tipo: x.tipo, title: x.title, cover: x.cover, locked: x.locked, raw: x,
            etiqueta: (x.tipo === 'entrada' ? 'ENTRADA' : x.type === 'xtream' ? 'XTREAM' : 'LISTA') + (x.locked ? ' · BLOQ.' : '') };
        });
      } else {
        var e = Pref.entrada(S.entradaId);
        if (!e) return [];
        if (!S.subId) e.sublists.forEach(function (s, i) { out.push({ id: s.id, tipo: 'sublista', title: s.title, cover: s.cover, locked: s.locked, indice: i, etiqueta: 'SUBLISTA' + (s.locked ? ' · BLOQ.' : '') }); });
        var vids = S.subId ? Pref.videosDe(S.entradaId, S.subId) : e.videos;
        vids.forEach(function (v, i) { out.push({ tipo: 'video', title: v.title, cover: v.cover, url: v.url, list: v.list, indice: i, etiqueta: v.list ? 'LISTA' : '' }); });
      }
      return f ? out.filter(function (x) { return (x.title || '').toLowerCase().indexOf(f) >= 0; }) : out;
    }
    function titulo() {
      if (!S.entradaId) return 'Listas preferentes';
      var e = Pref.entrada(S.entradaId), t = e ? e.title : '';
      if (S.subId && e) { var s = e.sublists.filter(function (x) { return x.id === S.subId; })[0]; if (s) t += '  ›  ' + s.title; }
      return t;
    }
    function refrescar(conservar, enfocar) {
      lista.poner(items(), conservar);
      document.getElementById('pref-titulo').textContent = titulo();
      barraAcc();
      if (typeof enfocar === 'number') lista.enfocar(enfocar);
    }

    function elegir(it) {
      if (it.tipo === 'lista') { Pant.volver(); Pant.abrirEnlace(Pref.enlaceDeLista(it.raw), it.title); return; }
      if (it.tipo === 'entrada') { S.entradaId = it.id; S.subId = null; refrescar(false); return; }
      if (it.tipo === 'sublista') { S.subId = it.id; refrescar(false); return; }
      if (it.list) { Pant.volver(); Pant.abrirEnlace(it.url, it.title); return; }
      var vids = items().filter(function (x) { return x.tipo === 'video' && !x.list; });
      Pant.reproducir(vids.map(function (v) { return { title: v.title, url: v.url, logo: v.cover }; }), Math.max(0, vids.indexOf(it)));
    }

    function acciones(it) {
      var op = [], pos = lista.indice();
      function mover(d) {
        if (it.tipo === 'lista' || it.tipo === 'entrada') Pref.mover(it.id, d);
        else if (it.tipo === 'sublista') Pref.moverSublista(S.entradaId, it.indice, d);
        else Pref.moverVideo(S.entradaId, S.subId, it.indice, d);
        refrescar(true, Math.max(0, pos + d));
      }
      if (it.tipo !== 'video') op.push({ t: it.locked ? 'QUITAR CANDADO' : 'PONER CANDADO', fn: function () { Pref.candado(it.id); refrescar(true); } });
      if (!S.filtro) { op.push({ t: 'SUBIR', fn: function () { mover(-1); } }); op.push({ t: 'BAJAR', fn: function () { mover(1); } }); }
      if ((it.tipo === 'lista' || it.tipo === 'entrada') && !it.locked) op.push({ t: 'EDITAR', fn: function () { editar(it); } });
      op.push({ t: 'BORRAR', cls: 'peligro', fn: function () {
        D.confirmar('Borrar', '¿Borrar "' + it.title + '"?', 'BORRAR').then(function (si) {
          if (!si) return;
          if (it.tipo === 'lista') Pref.borrarLista(it.id); else if (it.tipo === 'entrada') Pref.borrarEntrada(it.id);
          else if (it.tipo === 'sublista') Pref.borrarSublista(S.entradaId, it.id); else Pref.borrarVideo(S.entradaId, S.subId, it.indice);
          refrescar(true);
        });
      } });
      D.menu(it.title, op);
    }
    function editar(it) {
      var campos = it.tipo === 'entrada' ? [{ et: 'Título', valor: it.title }, { et: 'Imagen', valor: it.cover }]
        : it.raw.type === 'xtream' ? [{ et: 'Título', valor: it.title }, { et: 'Imagen', valor: it.cover }, { et: 'Host', valor: it.raw.url }, { et: 'Usuario', valor: it.raw.user }, { et: 'Contraseña', valor: it.raw.pass, clave: true }]
        : [{ et: 'Título', valor: it.title }, { et: 'Imagen', valor: it.cover }, { et: 'Link', valor: it.raw.url }];
      D.formulario('Editar', campos, 'GUARDAR').then(function (v) {
        if (!v) return;
        if (it.tipo === 'entrada') Pref.editarEntrada(it.id, { title: v[0], cover: v[1] });
        else Pref.editarLista(it.id, it.raw.type === 'xtream' ? { title: v[0].trim(), cover: v[1].trim(), url: Azure.Xtream.normalizarHost(v[2]), user: v[3].trim(), pass: v[4] } : { title: v[0].trim(), cover: v[1].trim(), url: v[2].trim() });
        refrescar(true);
      });
    }

    /* creación */
    function crearLista(xtream) {
      var campos = xtream ? [{ et: 'Título' }, { et: 'Imagen (opcional)' }, { et: 'Host', valor: 'http://' }, { et: 'Usuario' }, { et: 'Contraseña', clave: true }] : [{ et: 'Título' }, { et: 'Imagen (opcional)' }, { et: 'Link (http o https)' }];
      D.formulario(xtream ? 'Crear lista Xtream' : 'Crear lista con link', campos, 'CREAR').then(function (v) {
        if (!v) return;
        var x = xtream ? Pref.agregarLista({ title: v[0], cover: v[1], url: Azure.Xtream.normalizarHost(v[2]), type: 'xtream', user: v[3], pass: v[4] })
          : (Azure.esLinkHttp(v[2]) ? Pref.agregarLista({ title: v[0], cover: v[1], url: v[2], type: 'm3u' }) : null);
        if (!x) { Azure.toast('Revisa el título y el link.'); return; }
        refrescar(false, Pref.ordenado().length - 1);
      });
    }
    function crearEntrada() {
      D.formulario('Crear entrada', [{ et: 'Título' }, { et: 'Imagen (opcional)' }], 'CREAR').then(function (v) {
        if (v && Pref.crearEntrada(v[0], v[1])) refrescar(false, Pref.ordenado().length - 1); else if (v) Azure.toast('Escribe un título.');
      });
    }
    function agregarSublista() {
      D.formulario('Agregar sublista', [{ et: 'Título' }, { et: 'Imagen (opcional)' }], 'AGREGAR').then(function (v) {
        if (v && Pref.agregarSublista(S.entradaId, v[0], v[1])) refrescar(true); else if (v) Azure.toast('Escribe un título.');
      });
    }
    function agregarVideo() {
      var abre = false;
      var t = Azure.Campo.texto('Título', ''), l = Azure.Campo.texto('Link (http o https)', ''), c = Azure.Campo.texto('Imagen (opcional)', '');
      var tog = U.boton('ESTE LINK ABRE OTRA LISTA: NO', function (b) { abre = !abre; b.textContent = 'ESTE LINK ABRE OTRA LISTA: ' + (abre ? 'SÍ' : 'NO'); });
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, t.el, l.el, c.el, tog);
      D.abrir({ titulo: 'Agregar video', cuerpo: cuerpo, botones: [{ t: 'CANCELAR' }, { t: 'AGREGAR', cls: 'pri', fn: function () {
        if (!Azure.esLinkHttp(l.valor())) { Azure.toast('El link debe empezar por http:// o https://'); return; }
        var n = Pref.agregarVideos(S.entradaId, S.subId, [{ title: t.valor(), url: l.valor(), cover: c.valor(), list: abre }]);
        Azure.toast(n ? 'Agregado.' : 'Ese link ya estaba.'); refrescar(true);
      } }] });
    }

    var buscar = Azure.Campo.texto('Buscar en esta lista', '', { alCambiar: function (v) { S.filtro = v; refrescar(false); } });
    lista = Azure.Lista.crear({ pref: true, numerar: false, vacio: 'Aquí aparecerán tus listas y entradas.\nCrea una con los botones de arriba.',
      alElegir: elegir, alLargo: acciones, alDer: acciones, etiqueta: function (it) { return it.etiqueta; } });

    var acc = el('div', { cls: 'fila-h', style: { flexWrap: 'wrap' } });
    function barraAcc() {
      acc.innerHTML = '';
      if (!S.entradaId) {
        acc.appendChild(U.boton('CREAR', function () { crearLista(false); })); acc.appendChild(U.boton('CREAR XTREAM', function () { crearLista(true); }));
        acc.appendChild(U.boton('CREAR ENTRADA', crearEntrada)); acc.appendChild(U.boton('EXPORTAR / IMPORTAR', menuExportar));
      } else {
        if (!S.subId) acc.appendChild(U.boton('AGREGAR SUBLISTA', agregarSublista));
        acc.appendChild(U.boton('AGREGAR VIDEO', agregarVideo));
      }
      acc.appendChild(U.boton('ATRÁS', atras));
    }
    function atras() {
      if (S.subId) { S.subId = null; refrescar(false); }
      else if (S.entradaId) { S.entradaId = null; refrescar(false); }
      else Pant.volver();
    }

    var pantalla = el('div', { cls: 'pantalla' },
      U.barra('Preferentes', []),
      el('div', { cls: 'cuerpo', style: { flexDirection: 'column', gap: '16px' } },
        el('div', { cls: 'lista-info', attrs: { id: 'pref-titulo' }, text: 'Listas preferentes', style: { fontSize: '30px', color: 'var(--azul-claro)' } }),
        acc, buscar.el, lista.el, estado,
        el('div', { cls: 'estado', text: 'Mantén OK, → o el botón amarillo sobre un elemento para candado, subir, bajar, editar y borrar.' })));
    return {
      el: pantalla,
      alMostrar: function () { refrescar(false); if (lista.hayFilas()) lista.enfocar(0); },
      tecla: function (t) { if (t === 'atras') { atras(); return true; } return false; }
    };
  };
})();
