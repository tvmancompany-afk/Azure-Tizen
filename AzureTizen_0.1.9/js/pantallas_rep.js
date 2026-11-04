/* Pantalla: reproductor a pantalla completa. Imita la barra de Media3 de Azure Android (capturas del usuario, 2026-11-02):
   título arriba (abre "Elegir video"), controles al centro (anterior, -5 s, play, +15 s, siguiente), barra de tiempo con adelantar,
   tiempos y grupos ▸ (imagen, 4:3, recargar) y » (subtítulos+, recarga automática+) abajo a la izquierda,
   aleatorio, repetir, CC, ajustes (velocidad y audio) y lista abajo a la derecha. Sin candado, PiP, gestos, volumen ni brillo (decisión del usuario). */
(function () {
  var Azure = window.Azure, el = Azure.el, Pant = Azure.Pantallas, U = Pant.util, R = Azure.Reproductor, D = Azure.Dialogo, S = Azure.Subtitulos, I = Azure.Iconos;
  var VELOCIDADES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  var IDIOMAS = { spa: 'Español', es: 'Español', eng: 'Inglés', en: 'Inglés', jpn: 'Japonés', ja: 'Japonés', por: 'Portugués', pt: 'Portugués', fra: 'Francés', fre: 'Francés', fr: 'Francés',
    deu: 'Alemán', ger: 'Alemán', de: 'Alemán', ita: 'Italiano', it: 'Italiano', kor: 'Coreano', ko: 'Coreano', zho: 'Chino', chi: 'Chino', zh: 'Chino', rus: 'Ruso', ru: 'Ruso', und: 'Sin idioma' };

  function detectarExt(t) {
    if (/\[Script Info\]|^\s*Dialogue:/im.test(t)) return 'ass';
    if (/^\s*WEBVTT/i.test(t)) return 'vtt';
    return 'srt';
  }
  function nombreIdioma(c) { c = String(c || '').toLowerCase(); return IDIOMAS[c] || (c ? c.toUpperCase() : ''); }
  function nombreCanales(n) { n = String(n || ''); return n === '1' ? 'Mono' : n === '2' ? 'Estéreo' : n === '6' ? '5.1' : n === '8' ? '7.1' : ''; }
  function etiquetaVel(v) { return v === 1 ? 'Normal' : String(v).replace('.', ',') + 'x'; }

  /** Botón de icono (circular al enfocar, como tvFocusHighlight de Android). */
  function ib(icono, fn, cls) {
    var b = el('div', { cls: 'ib' + (cls ? ' ' + cls : ''), f: true, attrs: { tabindex: '-1' } });
    if (icono) b.appendChild(I.crear(icono));
    b.addEventListener('click', function () { fn(b); });
    return b;
  }
  function ibTexto(texto, fn, cls) {
    var b = el('div', { cls: 'ib txt' + (cls ? ' ' + cls : ''), f: true, attrs: { tabindex: '-1' }, text: texto });
    b.addEventListener('click', function () { fn(b); });
    return b;
  }

  /** Panel flotante (abajo a la derecha) o a pantalla completa, sobre el reproductor. Atrás lo cierra. */
  function abrirPanel(cuerpo, clase) {
    var api = D.abrir({ cuerpo: cuerpo, botones: [] });
    api.el.parentNode.classList.add(clase);
    return api;
  }
  /** Filas [{icono, t, sub, check, fn}] */
  function filas(lista, api) {
    var c = el('div', { cls: 'fl-lista' });
    lista.forEach(function (f) {
      var fila = el('div', { cls: 'fl-fila', f: true, attrs: { tabindex: '-1' } });
      var ico = el('div', { cls: 'fl-ico' });
      if (f.icono) ico.appendChild(I.crear(f.icono)); else if (f.check) ico.appendChild(I.crear('check'));
      fila.appendChild(ico);
      var tx = el('div', { cls: 'fl-tx' }, el('div', { cls: 'fl-t', text: f.t }));
      if (f.sub) tx.appendChild(el('div', { cls: 'fl-s', text: f.sub }));
      fila.appendChild(tx);
      fila.addEventListener('click', function () { if (f.noCerrar !== true) api.cerrar(); if (f.fn) f.fn(); });
      c.appendChild(fila);
    });
    return c;
  }
  function panelFilas(lista, clase) {
    var api = { cerrar: function () { api.d.cerrar(); } };
    var cont = filas(lista, api);
    api.d = abrirPanel(cont, clase || 'velo-flot');
    return api;
  }

  /* mini = true: versión de la pantalla principal (barra básica de Media3: anterior, -5 s, play, +15 s, siguiente, barra, tiempos,
     CC, ajustes, pantalla completa y › que muestra aleatorio/repetir). Todo lo demás (▸, », título, lista) solo en pantalla completa. */
  function crearReproductor(params, mini, hooks) {
    hooks = hooks || {};
    var ocultarTimer = null, cartelTimer = null, visible = true, cerrando = false, g1 = false, g2 = false;
    var pend = null, pendTimer = null, repSeek = 0, ultSeek = 0;
    var btn = {};

    /* ---------- piezas ---------- */
    var cue = el('div', { cls: 'sub-cue' });
    var scrim = el('div', { cls: 'rep-scrim' });
    var msg = el('div', { cls: 'rep-msg' });
    var errorEl = el('div', { cls: 'rep-error' });
    var cartelEl = el('div', { cls: 'rep-cartel' });
    var tituloTxt = el('span', { text: '' });
    var titulo = el('div', { cls: 'rep-titulo', f: true, attrs: { tabindex: '-1' } }, tituloTxt);
    titulo.addEventListener('click', function () { elegirVideo(); });

    btn.ant = ib('anterior', function () { R.anterior(); }, 'g');
    btn.m5 = ib('atras5', function () { R.saltar(-5000); }, 'g');
    btn.pausa = ib('play', function () { R.alternarPausa(); }, 'play');
    btn.p15 = ib('adelante15', function () { R.saltar(15000); }, 'g');
    btn.sig = ib('siguiente', function () { R.siguiente(); }, 'g');
    var centro = el('div', { cls: 'rep-centro' }, btn.ant, btn.m5, btn.pausa, btn.p15, btn.sig);

    var prog = el('div', { cls: 'rep-prog' }), thumb = el('div', { cls: 'rep-thumb' });
    var seek = el('div', { cls: 'rep-seek', f: true, attrs: { tabindex: '-1' } }, el('div', { cls: 'rep-pista' }, prog, thumb));
    seek.addEventListener('click', function () { R.alternarPausa(); });
    seek.__nav = function (dir) {
      if (dir === 'izq') { moverSeek(-1); return true; }
      if (dir === 'der') { moverSeek(1); return true; }
      return false;
    };

    var tAct = el('span', { cls: 'a', text: '0:00' }), tSep = el('span', { cls: 'sep', text: ' · ' }), tTot = el('span', { cls: 'b', text: '' });
    var tiempos = el('div', { cls: 'rep-t' }, tAct, tSep, tTot);

    btn.g1 = ibTexto('▸', function () { g1 = !g1; grupos(); }, 'glifo');
    btn.redim = ib('redim', function () {
      var n = R.ciclarRedim(); cartel(n); textos();
    });
    btn.f43 = ibTexto('4:3', function () { var v = R.alternar43(); cartel(v ? 'Formato 4:3.' : 'Pantalla completa (sin forzar formato).'); textos(); });
    btn.recargar = ib('recargar', function () { cartel('Recargando…', 1200); R.recargar(); });
    var grupo1 = el('div', { cls: 'rep-grupo' }, btn.redim, btn.f43, btn.recargar);
    btn.g2 = ibTexto('»', function () { g2 = !g2; grupos(); }, 'glifo');
    btn.subs = ib('subsMas', menuSubtitulos);
    btn.auto = ib('recargarMas', function () {
      var m = R.ciclarAuto(); textos();
      cartel(m === 1 ? 'Error: recargar solo' : m === 2 ? 'Error: siguiente en continuo/azar' : 'Error: sin automático', 2200);
    });
    btn.motor = ibTexto('AV', function () { var n = R.cambiarMotor(); cartel('Reproductor: ' + n, 2200); textos(); }, 'glifo');
    var grupo2 = el('div', { cls: 'rep-grupo' }, btn.subs, btn.auto, btn.motor);
    var izq = el('div', { cls: 'rep-izq' }, tiempos, btn.g1, grupo1, btn.g2, grupo2);

    btn.alea = ib('aleatorio', function () { R.alternarAleatorio(); textos(); });
    btn.rep = ib('repetir', function () { R.ciclarRepetir(); textos(); });
    btn.cc = ib('cc', menuTextoIncrustado);
    btn.ajustes = ib('ajustes', menuAjustes);
    btn.lista = ib('lista', function () { elegirVideo(); });
    var vivoEl = el('div', { cls: 'rep-vivo', text: 'EN VIVO' });
    var ui, pantalla, miniMas = false;
    if (!mini) {
      var der = el('div', { cls: 'rep-der' }, btn.alea, btn.rep, btn.cc, btn.ajustes, btn.lista);
      ui = el('div', { cls: 'rep-ui' }, vivoEl, titulo, centro, seek, el('div', { cls: 'rep-fila' }, izq, der));
      pantalla = el('div', { cls: 'pantalla transparente' }, scrim, cue, ui, msg, errorEl, cartelEl);
    } else {
      /* Mini: solo tiempos a la izquierda; a la derecha CC, ajustes, pantalla completa y ›. El › muestra aleatorio y repetir. */
      btn.motor = ibTexto('AV', function () { var n = R.cambiarMotor(); cartel('Reproductor: ' + n, 2200); textos(); }, 'glifo');
      var grupoMas = el('div', { cls: 'rep-grupo' }, btn.alea, btn.rep, btn.motor);
      btn.pant = ib('pantalla', function () { Pant.ir('reproductor', { continuar: true, desdeMini: true }, true); });
      btn.mas = ibTexto('›', function () { miniMas = !miniMas; grupoMas.classList.toggle('abierto', miniMas); btn.mas.textContent = miniMas ? '‹' : '›'; }, 'glifo');
      var derM = el('div', { cls: 'rep-der' }, grupoMas, btn.cc, btn.ajustes, btn.pant, btn.mas);
      ui = el('div', { cls: 'rep-ui' }, vivoEl, centro, seek, el('div', { cls: 'rep-fila' }, el('div', { cls: 'rep-izq' }, tiempos), derM));
      var interior = el('div', { cls: 'mini-rep' }, scrim, cue, ui, msg, errorEl, cartelEl);
      var caja = el('div', { cls: 'mini-caja' }, interior);
      var tituloMini = el('div', { cls: 'mini-titulo', text: '' });
      pantalla = el('div', { cls: 'mini' }, tituloMini, caja);
      pantalla.__caja = caja; pantalla.__titulo = tituloMini;
    }
    S.aplicar(cue);

    /* ---------- estado visual ---------- */
    function textos() {
      var i = R.info();
      I.poner(btn.pausa, i.estado === 'pausa' ? 'play' : 'pausa');
      btn.alea.classList.toggle('off', !i.aleatorio);
      I.poner(btn.rep, i.repetir === 1 ? 'repetir1' : 'repetir'); btn.rep.classList.toggle('off', i.repetir === 0);
      btn.f43.classList.toggle('act', !!i.f43);
      if (btn.motor) btn.motor.textContent = i.usaAv ? 'AV' : 'H5';
      btn.auto.classList.remove('rojo', 'celeste'); if (i.auto === 1) btn.auto.classList.add('rojo'); if (i.auto === 2) btn.auto.classList.add('celeste');
      btn.subs.classList.toggle('act', S.hay());
      btn.cc.classList.toggle('act', i.textoPista >= 0);
      btn.g1.textContent = g1 ? '◂' : '▸'; btn.g2.textContent = g2 ? '«' : '»';
    }
    function grupos() {
      grupo1.classList.toggle('abierto', g1); grupo2.classList.toggle('abierto', g2);
      textos(); reiniciarOcultar();
    }
    function cartel(t, ms) {
      cartelEl.textContent = t; cartelEl.classList.add('ver');
      clearTimeout(cartelTimer); cartelTimer = setTimeout(function () { cartelEl.classList.remove('ver'); }, ms || 1800);
    }
    function aviso(t, ms) { msg.textContent = t; msg.style.display = 'block'; clearTimeout(aviso.t); if (ms) aviso.t = setTimeout(function () { msg.style.display = 'none'; }, ms); }

    var reiniciarOcultar = function () {
      if (mini) return;
      clearTimeout(ocultarTimer);
      if (visible) ocultarTimer = setTimeout(function () { if (!D.hayAbierto() && R.info().estado === 'reproduciendo') mostrarUi(false); }, 8000);
    };
    function mostrarUi(v) {
      if (mini) return;   // en la ventanita los controles siempre se ven
      visible = v;
      ui.classList.toggle('oculto', !v); scrim.classList.toggle('oculto', !v);
      pantalla.classList.toggle('con-ui', v);
      if (v) {
        if (!Azure.Foco.actual() || !ui.contains(Azure.Foco.actual())) Azure.Foco.poner(btn.pausa);
        reiniciarOcultar();
      } else {
        clearTimeout(ocultarTimer);
        g1 = false; g2 = false; grupo1.classList.remove('abierto'); grupo2.classList.remove('abierto'); textos();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      }
      if (Azure.Cursor) Azure.Cursor.refrescar();
    }

    /* ---------- barra de tiempo ---------- */
    function pintarSeek(pos, dur) {
      tAct.textContent = Azure.formatoTiempo(pos);
      vivoEl.style.display = R.esEnVivo() && R.info().estado !== 'detenido' ? '' : 'none';
      if (R.esEnVivo()) { tSep.style.display = 'none'; tTot.textContent = ''; prog.style.width = '100%'; thumb.style.left = '100%'; return; }
      tSep.style.display = ''; tTot.textContent = Azure.formatoTiempo(dur);
      var p = Math.max(0, Math.min(100, pos * 100 / dur));
      prog.style.width = p + '%'; thumb.style.left = p + '%';
    }
    /** Izquierda/derecha sobre la barra: 10 s por pulsación (30 s si se mantiene); el salto real se hace al dejar de pulsar. */
    function moverSeek(sig) {
      if (R.esEnVivo()) return;
      var ahora = Date.now(); repSeek = (ahora - ultSeek < 350) ? repSeek + 1 : 0; ultSeek = ahora;
      var i = R.info(), paso = repSeek > 8 ? 30000 : 10000;
      pend = Math.max(0, Math.min(i.dur - 1000, (pend == null ? i.pos : pend) + sig * paso));
      pintarSeek(pend, i.dur); reiniciarOcultar();
      clearTimeout(pendTimer);
      pendTimer = setTimeout(function () { var p = pend; pend = null; R.buscar(p); }, 450);
    }

    function salir(detener) {
      if (cerrando) return; cerrando = true;
      /* Si se llegó desde la ventanita de la pantalla principal, Atrás solo vuelve a ella y el video sigue (STOP lo detiene). */
      if (!params.desdeMini || detener) R.cerrar();
      Pant.volver() || Pant.ir('principal');
    }

    /* ---------- menús ---------- */
    function menuAjustes() {
      var i = R.info();
      var pistas = R.pistasAudio(), act = null;
      pistas.forEach(function (p) { if (p.actual) act = p; });
      var api = panelFilas([
        { icono: 'velocidad', t: 'Velocidad', sub: etiquetaVel(i.vel), noCerrar: true, fn: function () { api.cerrar(); menuVelocidad(); } },
        { icono: 'audio', t: 'Audio', sub: act ? textoPista(act, pistas.indexOf(act)) : (pistas.length ? 'Elegir' : 'No disponible'), noCerrar: true, fn: function () { api.cerrar(); menuAudio(); } }
      ], 'velo-flot');
    }
    function menuVelocidad() {
      var v = R.info().vel;
      panelFilas(VELOCIDADES.map(function (x) {
        return { t: etiquetaVel(x), check: x === v, fn: function () {
          if (R.velocidad(x)) cartel('Velocidad: ' + etiquetaVel(x));
          else cartel('El reproductor de la TV no admite esa velocidad. Prueba el motor HTML5 en Configuración.', 4500);
        } };
      }), 'velo-flot');
    }
    function textoPista(p, i) {
      var partes = [nombreIdioma(p.idioma) || ('Pista ' + (i + 1))]; var c = nombreCanales(p.canales); if (c) partes.push(c);
      return partes.join(', ');
    }
    function menuAudio() {
      var p = R.pistasAudio();
      if (!p.length) { cartel('No hay pistas de audio para elegir (o el reproductor no las expone).', 3500); return; }
      panelFilas(p.map(function (x, i) { return { t: textoPista(x, i), check: x.actual, fn: function () { R.elegirAudio(x.indice); } }; }), 'velo-flot');
    }
    function menuTextoIncrustado() {
      var p = R.pistasTexto();
      if (!p.length) { cartel('Este video no trae subtítulos incrustados (o el reproductor no los expone).', 3500); return; }
      var l = [{ t: 'Desactivados', check: R.info().textoPista < 0, fn: function () { R.elegirTexto(-1); textos(); } }];
      p.forEach(function (x, i) { l.push({ t: nombreIdioma(x.idioma) || ('Subtítulo ' + (i + 1)), check: x.actual, fn: function () { R.elegirTexto(x.indice); textos(); } }); });
      panelFilas(l, 'velo-flot');
    }

    function elegirVideo() {
      var api;
      var lista = Azure.Lista.crear({ numerar: true, sinPortada: true, alElegir: function (it, i) { api.cerrar(); R.ir(i); }, activo: function (it, i) { return i === R.info().idx; } });
      lista.el.classList.add('vid'); lista.el.style.height = '880px'; lista.el.style.flex = 'none';
      var x = ib('cerrar', function () { api.cerrar(); });
      x.__nav = function (dir) { if (dir === 'izq' || dir === 'abj') { lista.enfocar(lista.indice()); return true; } return false; };   // vuelve a la fila donde estabas, no a la primera
      var cab = el('div', { cls: 'pleno-cab' }, el('h2', { text: 'Elegir video' }), x);
      api = D.abrir({ cuerpo: el('div', { cls: 'pleno' }, cab, lista.el), botones: [] });
      api.el.parentNode.classList.add('velo-pleno');
      lista.poner(R.info().lista); lista.enfocar(R.info().idx, 3);   // abre en el título actual (con 3 filas arriba), no al inicio
    }

    /** Subtítulos+ : cargar por link, pegando texto, desde Buddy Host o de los almacenados; ajuste de tiempo, estilo y posición. */
    function menuSubtitulos() {
      var info = el('div', { cls: 'msg' });
      function actualizar() {
        info.textContent = (S.hay() ? 'Subtítulo: ' + S.nombre() : 'Sin subtítulo cargado.') + '\nAjuste de tiempo: ' + (S.offset() / 1000).toFixed(1) + ' s   ·   Posición: ' + ['abajo', 'arriba', 'pegado abajo', '', 'pegado arriba'][S.posicion()];
        S.aplicar(cue); textos();
      }
      actualizar();
      var aj = function (d) { return function () { S.ajustar(d); actualizar(); }; };
      function cargado(n, de) { aviso('Subtítulo cargado (' + n + ' líneas).', 2500); textos(); }
      D.abrir({ titulo: 'Subtítulos', cuerpo: info, botones: [
        { t: 'DESDE LINK', fn: function () { D.formulario('Link del subtítulo (SRT, VTT, ASS o SSA)', [{ et: 'Link' }], 'CARGAR').then(function (v) {
          if (!v) return; aviso('Cargando subtítulo…');
          S.desdeUrl(v[0].trim()).then(cargado).catch(function (e) { Azure.Registro.error('Subtítulo', e); aviso(Azure.Red.mensaje(e), 4000); });
        }); } },
        { t: 'PEGAR TEXTO', fn: function () { D.formulario('Pega el subtítulo', [{ et: 'Texto del subtítulo', multilinea: true, filas: 8 }], 'CARGAR').then(function (v) {
          if (!v) return;
          try { cargado(S.cargar(v[0], detectarExt(v[0]), 'pegado.' + detectarExt(v[0]))); } catch (e) { aviso(e.message, 4000); }
        }); } },
        { t: 'DESDE BUDDY HOST', fn: function () { D.formulario('Subtítulo desde Buddy Host', [{ et: 'Host', valor: Azure.BuddyHost.hostGuardado() }, { et: 'Título (sin extensión)' }], 'CARGAR').then(function (v) {
          if (!v) return; Azure.BuddyHost.guardarHost(v[0]); aviso('Cargando subtítulo…');
          Azure.BuddyHost.leer(v[0], v[1]).then(function (t) { var ext = detectarExt(t); cargado(S.cargar(t, ext, v[1] + '.' + ext)); })
            .catch(function (e) { Azure.Registro.error('Subtítulo Buddy', e); aviso(Azure.Red.mensaje(e), 4500); });
        }); } },
        { t: 'DESDE USB', fn: function () { Azure.Explorador.abrir({ modo: 'sub', alSub: function (n, nombre) { aviso('Subtítulo cargado (' + n + ' líneas).', 2500); S.aplicar(cue); textos(); } }); } },
        { t: 'ALMACENADOS', fn: function () { menuAlmacenados(); } },
        { t: 'GUARDAR', fn: function () { try { aviso('Guardado en almacenados: ' + S.guardarActual(), 2500); } catch (e) { aviso(e.message, 4000); } } },
        { t: 'ESTILO', fn: function () { Pant.util.dialogoEstiloSubs(function () { S.aplicar(cue); }); } },
        { t: 'QUITAR', fn: function () { S.quitar(); cue.textContent = ''; textos(); aviso('Subtítulo quitado.', 2000); } },
        { t: '−1 s', noCerrar: true, fn: aj(-1000) }, { t: '−0,1', noCerrar: true, fn: aj(-100) }, { t: '0', noCerrar: true, fn: aj(0) },
        { t: '+0,1', noCerrar: true, fn: aj(100) }, { t: '+1 s', noCerrar: true, fn: aj(1000) },
        { t: 'POSICIÓN', noCerrar: true, fn: function () { S.ciclarPosicion(); actualizar(); } },
        { t: 'CERRAR' }] });
    }
    function menuAlmacenados() {
      var g = S.guardados();
      if (!g.length) { D.aviso('Almacenados', 'No hay subtítulos guardados. Carga uno y usa GUARDAR.'); return; }
      D.menu('Subtítulos almacenados', g.map(function (x, i) {
        return { t: x.n, fn: function () {
          D.menu(x.n, [
            { t: 'CARGAR', fn: function () { try { var n = S.cargarGuardado(i); aviso('Subtítulo cargado (' + n + ' líneas).', 2500); textos(); } catch (e) { aviso(e.message, 4000); } } },
            { t: 'BORRAR', cls: 'peligro', fn: function () { S.borrarGuardado(i); aviso('Borrado.', 1500); } }]);
        } };
      }));
    }

    /* ---------- motor ---------- */
    R.iniciar({
      alEstado: function (e, m) {
        textos(); if (mini) { pantalla.__caja.classList.toggle('vivo', e === 'cargando' || e === 'reproduciendo' || e === 'pausa'); if (hooks.alEstado) hooks.alEstado(e, m); }
        if (e === 'cargando') { errorEl.style.display = 'none'; aviso(m || 'Cargando…'); }
        else if (e === 'error') { msg.style.display = 'none'; errorEl.textContent = 'Error: ' + m; errorEl.style.display = 'block'; mostrarUi(true); }
        else if (e === 'detenido' && m) { aviso(m, 3000); mostrarUi(true); }
        else { msg.style.display = 'none'; errorEl.style.display = 'none'; }
      },
      alTiempo: function (pos, dur) { if (pend == null) pintarSeek(pos, dur); },
      alSubtitulo: function (t) { if (cue.textContent !== t) { cue.textContent = t; S.aplicar(cue); } },
      alItem: function (it, i) { tituloTxt.textContent = it.title || 'Video'; if (mini) { pantalla.__titulo.textContent = 'Reproduciendo: ' + (it.title || 'Video'); if (hooks.alItem) hooks.alItem(it, i); } }
    });

    if (mini) {
      return {
        el: pantalla,
        caja: pantalla.__caja,
        /** Rellena la ventanita con lo que ya esté sonando (al volver de pantalla completa) y avisa del área de video. */
        sincronizar: function () {
          var i = R.info();
          textos();
          if (R.estaAbierto() && i.lista.length) {
            var it = i.lista[i.idx] || {};
            tituloTxt.textContent = it.title || 'Video'; pantalla.__titulo.textContent = 'Reproduciendo: ' + (it.title || 'Video');
            pintarSeek(i.pos, i.dur);
          }
          pantalla.__caja.classList.toggle('vivo', R.estaAbierto() && (i.estado === 'cargando' || i.estado === 'reproduciendo' || i.estado === 'pausa'));
        },
        alOcultar: function () { clearTimeout(cartelTimer); clearTimeout(pendTimer); }
      };
    }

    return {
      el: pantalla,
      /** Toque/clic del cursor sobre el video (no sobre un botón): muestra u oculta los controles. */
      actividad: function () { if (visible) reiniciarOcultar(); },
      toque: function () { if (!D.hayAbierto()) mostrarUi(!visible); },
      alMostrar: function () {
        textos(); mostrarUi(true);
        if (params.continuar && R.estaAbierto()) {
          R.ponerRect(null);
          var i = R.info(), it = i.lista[i.idx] || {};
          tituloTxt.textContent = it.title || 'Video'; pintarSeek(i.pos, i.dur);
        } else { R.ponerRect(null); R.abrir(params.lista, params.indice); }
      },
      alOcultar: function () { clearTimeout(ocultarTimer); clearTimeout(pendTimer); if (!cerrando) { cerrando = true; R.cerrar(); } },
      tecla: function (t) {
        if (D.hayAbierto()) return false;
        if (t === 'playpausa') { R.alternarPausa(); return true; }
        if (t === 'play') { R.reanudar(); return true; }
        if (t === 'pausa') { R.pausar(); return true; }
        if (t === 'stop') { salir(true); return true; }
        if (t === 'ff') { R.saltar(30000); aviso('+30 s', 800); return true; }
        if (t === 'rw') { R.saltar(-30000); aviso('−30 s', 800); return true; }
        if (!visible) {
          if (t === 'izq') { R.saltar(-10000); aviso('−10 s', 800); return true; }
          if (t === 'der') { R.saltar(10000); aviso('+10 s', 800); return true; }
          if (t === 'chmas') { R.anterior(); return true; }
          if (t === 'chmenos') { R.siguiente(); return true; }
          if (t === 'atras') { salir(); return true; }
          mostrarUi(true); return true; // arriba, abajo, OK: muestran los controles
        }
        if (t === 'atras') { mostrarUi(false); return true; }
        reiniciarOcultar();
        return false;
      }
    };
  }
  Pant.def.reproductor = function (params) { return crearReproductor(params, false); };
  Pant.crearMini = function (hooks) { return crearReproductor({}, true, hooks); };
})();
