/* Reproductor: motor AVPlay (reproductor nativo de Samsung) con respaldo de <video> HTML5.
   Lista de reproducción, repetir, aleatorio, redimensionar, 4:3, recarga automática y pistas de audio.
   AVPlay dibuja en una capa nativa detrás de la página (la pantalla del reproductor debe ser transparente).
   NO PROBADO EN UNA TV: los nombres de API de AVPlay vienen de la documentación de Samsung. */
(function () {
  var Azure = window.Azure, A = Azure.Almacen;
  var video = null, timer = null, cb = {};
  var DISPLAY = ['PLAYER_DISPLAY_MODE_LETTER_BOX', 'PLAYER_DISPLAY_MODE_FULL_SCREEN', 'PLAYER_DISPLAY_MODE_CROPPED_FULL'];
  var OBJFIT = ['contain', 'fill', 'cover'];
  var NOMBRES_REDIM = ['Ajustar', 'Estirar', 'Recortar'];

  var E = {
    lista: [], idx: 0, url: '',
    repetir: A.get('rep_repetir', 0),     // 0 sigue hasta el final, 1 repite uno, 2 continuo
    aleatorio: A.get('rep_aleatorio', false),
    auto: A.get('rep_auto', 0),            // 0 apagado, 1 recarga el mismo, 2 pasa al siguiente (continuo/aleatorio)
    redim: A.get('rep_redim', 0),
    f43: A.get('rep_43', false),
    rect: null,                            // null = pantalla completa; {x,y,w,h} = ventana de la pantalla principal
    abierto: false, estado: 'detenido', pos: 0, dur: 0, intentos: 0, saltos: 0, usaAv: false,
    vel: 1,                                // velocidad de reproducción (se conserva entre videos)
    textoInc: '', textoIncHasta: 0, textoPista: -1   // subtítulo incrustado (AVPlay)
  };

  function avp() { return window.webapis && window.webapis.avplay ? window.webapis.avplay : null; }
  function motorAv() { return !!avp() && A.get('motor', 'auto') !== 'html5'; }
  function emitir(estado, msg) { E.estado = estado; if (cb.alEstado) cb.alEstado(estado, msg || ''); }

  /* Área donde se dibuja el video: toda la pantalla, o la ventanita de la pantalla principal (E.rect {x,y,w,h}). */
  function areaVideo() {
    var b = E.rect || { x: 0, y: 0, w: 1920, h: 1080 };
    if (E.f43) {
      var w = Math.min(b.w, Math.round(b.h * 4 / 3));
      return { x: b.x + Math.round((b.w - w) / 2), y: b.y, w: w, h: b.h };
    }
    return b;
  }
  function aplicarPantalla() {
    var r = areaVideo();
    if (E.usaAv) {
      var av = avp();
      try {
        av.setDisplayRect(r.x, r.y, r.w, r.h);
        av.setDisplayMethod(E.f43 ? DISPLAY[1] : DISPLAY[E.redim]);
      } catch (e) { Azure.Registro.aviso('AVPlay pantalla: ' + (e && e.message)); }
    } else if (video) {
      video.style.objectFit = OBJFIT[E.redim];
      video.style.left = r.x + 'px'; video.style.top = r.y + 'px'; video.style.width = r.w + 'px'; video.style.height = r.h + 'px';
    }
  }

  function posicionActual() {
    try {
      if (E.usaAv) return avp().getCurrentTime();
      return video ? Math.floor(video.currentTime * 1000) : 0;
    } catch (e) { return E.pos; }
  }
  function iniciarTimer() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (E.estado !== 'reproduciendo' && E.estado !== 'pausa') return;
      E.pos = posicionActual();
      if (E.pos > 3000) E.saltos = 0;
      if (cb.alTiempo) cb.alTiempo(E.pos, E.dur);
      if (cb.alSubtitulo) cb.alSubtitulo(Azure.Subtitulos.en(E.pos) || (E.textoInc && Date.now() < E.textoIncHasta ? E.textoInc : ''));
    }, 250);
  }

  function indiceSiguiente(sentido) {
    var n = E.lista.length;
    if (n <= 1) return E.idx;
    if (E.aleatorio && sentido > 0) { var r; do { r = Math.floor(Math.random() * n); } while (r === E.idx); return r; }
    return (E.idx + sentido + n) % n;
  }

  function fallo(msg) {
    Azure.Registro.error('Reproducción: ' + msg + ' | ' + E.url);
    if (E.auto === 1 && E.intentos < 5) {
      E.intentos++;
      emitir('cargando', 'Reintentando (' + E.intentos + ' de 5)…');
      var pos = E.pos;
      setTimeout(function () { if (E.abierto) abrirUrl(E.url, pos); }, 1500);
      return;
    }
    if (E.auto === 2 && (E.repetir === 2 || E.aleatorio) && E.saltos < E.lista.length) {
      E.saltos++;
      emitir('cargando', 'Falló; pasando al siguiente…');
      setTimeout(function () { if (E.abierto) R.siguiente(); }, 800);
      return;
    }
    emitir('error', msg);
  }

  function terminado() {
    if (E.repetir === 1) { R.ir(E.idx); return; }
    if (E.repetir === 2 || E.aleatorio) { R.ir(indiceSiguiente(1)); return; }
    if (E.idx < E.lista.length - 1) R.ir(E.idx + 1);
    else emitir('detenido', 'Fin de la lista.');
  }

  function cerrarMotor() {
    clearInterval(timer);
    try { if (E.usaAv) { var av = avp(); try { av.stop(); } catch (e) {} av.close(); } } catch (e) {}
    if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) {} video.style.display = 'none'; }
  }

  function abrirUrl(url, retomar) {
    cerrarMotor();
    E.url = url; E.dur = 0; E.pos = retomar || 0; E.textoInc = ''; E.textoIncHasta = 0; E.textoPista = -1;
    E.usaAv = motorAv();
    emitir('cargando');
    if (E.usaAv) abrirAv(url, retomar); else abrirHtml(url, retomar);
  }

  function abrirAv(url, retomar) {
    var av = avp();
    try {
      av.open(url);
      var ua = A.get('rep_ua', '');
      if (ua) { try { av.setStreamingProperty('USER_AGENT', ua); } catch (e) { Azure.Registro.aviso('USER_AGENT: ' + (e && e.message)); } }
      av.setListener({
        onbufferingstart: function () { emitir('cargando'); },
        onbufferingcomplete: function () { if (E.estado === 'cargando') emitir('reproduciendo'); },
        oncurrentplaytime: function (t) { E.pos = t; },
        onevent: function (tipo, datos) { Azure.Registro.info('AVPlay evento ' + tipo + ' ' + (datos || '')); },
        onerror: function (tipo) { fallo('AVPlay ' + tipo); },
        onstreamcompleted: function () { terminado(); },
        onsubtitlechange: function (dur, texto) { E.textoInc = texto || ''; E.textoIncHasta = Date.now() + (Number(dur) || 3000); }, ondrmevent: function () {}
      });
      aplicarPantalla();
      av.prepareAsync(function () {
        try { E.dur = av.getDuration(); } catch (e) { E.dur = 0; }
        var seguir = function () { try { av.play(); } catch (e) { fallo('AVPlay play: ' + (e && e.message)); return; } E.intentos = 0; emitir('reproduciendo'); iniciarTimer(); if (E.vel !== 1) R.velocidad(E.vel); };
        if (retomar > 0 && E.dur > 0) { try { av.seekTo(retomar, seguir, seguir); } catch (e) { seguir(); } } else seguir();
      }, function (e) { fallo('AVPlay prepare: ' + (e && (e.message || e.name) || e)); });
    } catch (e) { fallo('AVPlay: ' + (e && (e.message || e.name) || e)); }
  }

  function abrirHtml(url, retomar) {
    if (!video) return fallo('No hay elemento de video.');
    video.style.display = 'block';
    aplicarPantalla();
    video.onplaying = function () { E.intentos = 0; emitir('reproduciendo'); };
    video.onpause = function () { if (E.estado === 'reproduciendo') emitir('pausa'); };
    video.onwaiting = function () { emitir('cargando'); };
    video.onended = function () { terminado(); };
    video.onerror = function () { fallo('<video> error ' + (video.error ? video.error.code : '?')); };
    video.onloadedmetadata = function () {
      try { video.playbackRate = E.vel; } catch (e) {}
      E.dur = isFinite(video.duration) ? Math.floor(video.duration * 1000) : 0;
      if (retomar > 0 && E.dur > 0) try { video.currentTime = retomar / 1000; } catch (e) {}
    };
    video.src = url;
    var p = video.play();
    if (p && p.catch) p.catch(function (e) { Azure.Registro.aviso('play(): ' + (e && e.message)); });
    iniciarTimer();
  }

  var R = Azure.Reproductor = {
    nombresRedim: NOMBRES_REDIM,
    /** Cambia el área de video sin reiniciar la reproducción (null = pantalla completa). */
    ponerRect: function (r) { E.rect = r || null; aplicarPantalla(); },
    info: function () { return E; },
    iniciar: function (callbacks) { cb = callbacks || {}; video = document.getElementById('video'); },
    motor: function () { return avp() ? (motorAv() ? 'AVPlay' : 'HTML5 (forzado)') : 'HTML5 (sin AVPlay)'; },

    /** Abre una lista de entradas {title,url,logo} y reproduce la posición indice. */
    abrir: function (lista, indice) {
      E.lista = lista.slice(); E.abierto = true; E.intentos = 0; E.saltos = 0;
      R.ir(Math.max(0, Math.min(indice || 0, E.lista.length - 1)));
    },
    ir: function (i) {
      if (!E.lista.length) return;
      E.idx = (i + E.lista.length) % E.lista.length; E.intentos = 0;
      var it = E.lista[E.idx];
      if (cb.alItem) cb.alItem(it, E.idx);
      abrirUrl(it.url, 0);
    },
    siguiente: function () { R.ir(indiceSiguiente(1)); },
    anterior: function () { R.ir(E.aleatorio ? indiceSiguiente(1) : (E.idx - 1 + E.lista.length) % E.lista.length); },
    recargar: function () { var p = E.pos; if (E.url) abrirUrl(E.url, p); },

    alternarPausa: function () {
      try {
        if (E.usaAv) {
          var av = avp(), s = av.getState();
          if (s === 'PLAYING') { av.pause(); emitir('pausa'); } else if (s === 'PAUSED' || s === 'READY') { av.play(); emitir('reproduciendo'); }
        } else if (video) { if (video.paused) video.play(); else video.pause(); }
      } catch (e) { Azure.Registro.aviso('pausa: ' + (e && e.message)); }
    },
    pausar: function () { if (E.estado === 'reproduciendo') R.alternarPausa(); },
    reanudar: function () { if (E.estado === 'pausa') R.alternarPausa(); },
    esEnVivo: function () { return !(E.dur > 0) || E.dur > 86400000 * 2; },

    /** Salta a una posición (ms). No hace nada en directos. */
    buscar: function (ms) {
      if (R.esEnVivo()) return;
      ms = Math.max(0, Math.min(E.dur - 1000, ms));
      try { if (E.usaAv) avp().seekTo(ms); else if (video) video.currentTime = ms / 1000; E.pos = ms; } catch (e) { Azure.Registro.aviso('seek: ' + (e && e.message)); }
    },
    saltar: function (delta) { R.buscar(posicionActual() + delta); },

    ciclarRepetir: function () { E.repetir = (E.repetir + 1) % 3; A.set('rep_repetir', E.repetir); return E.repetir; },
    alternarAleatorio: function () { E.aleatorio = !E.aleatorio; A.set('rep_aleatorio', E.aleatorio); return E.aleatorio; },
    ciclarAuto: function () { E.auto = (E.auto + 1) % 3; A.set('rep_auto', E.auto); return E.auto; },
    ciclarRedim: function () {
      E.redim = (E.redim + 1) % 3; A.set('rep_redim', E.redim);
      if (E.redim === 2 && E.f43) { E.f43 = false; A.set('rep_43', false); } // como Azure Android: al pasar a Recortar se quita 4:3
      aplicarPantalla(); return NOMBRES_REDIM[E.redim];
    },
    alternar43: function () { E.f43 = !E.f43; A.set('rep_43', E.f43); aplicarPantalla(); return E.f43; },

    /** Pistas de audio (solo AVPlay): [{indice, idioma, canales, actual}] */
    pistasAudio: function () {
      if (!E.usaAv) return [];
      try {
        var actual = -1;
        try { (avp().getCurrentStreamInfo() || []).forEach(function (p) { if (p.type === 'AUDIO') actual = p.index; }); } catch (e) {}
        return avp().getTotalTrackInfo().filter(function (p) { return p.type === 'AUDIO'; }).map(function (p) {
          var info = {}; try { info = JSON.parse(p.extra_info) || {}; } catch (e) {}
          return { indice: p.index, idioma: info.language || '', canales: info.channels || '', actual: p.index === actual };
        });
      } catch (e) { return []; }
    },
    elegirAudio: function (indice) { try { avp().setSelectTrack('AUDIO', indice); return true; } catch (e) { Azure.Registro.aviso('audio: ' + (e && e.message)); return false; } },

    /** Subtítulos incrustados en el video (solo AVPlay): [{indice, idioma, actual}] */
    pistasTexto: function () {
      if (!E.usaAv) return [];
      try {
        return avp().getTotalTrackInfo().filter(function (p) { return p.type === 'TEXT'; }).map(function (p) {
          var info = {}; try { info = JSON.parse(p.extra_info) || {}; } catch (e) {}
          return { indice: p.index, idioma: info.track_lang || info.language || '', actual: p.index === E.textoPista };
        });
      } catch (e) { return []; }
    },
    elegirTexto: function (indice) {
      try {
        if (indice < 0) { E.textoPista = -1; E.textoInc = ''; return true; }
        try { avp().setSilentSubtitle(true); } catch (e) { Azure.Registro.aviso('setSilentSubtitle: ' + (e && e.message)); }
        avp().setSelectTrack('TEXT', indice); E.textoPista = indice; return true;
      } catch (e) { Azure.Registro.aviso('subtítulo incrustado: ' + (e && e.message)); return false; }
    },

    /** Velocidad de reproducción (0.25 a 2). Devuelve false si el motor no la admite (y vuelve a 1x). */
    velocidad: function (v) {
      try {
        if (E.usaAv) avp().setSpeed(v); else if (video) video.playbackRate = v;
        E.vel = v; return true;
      } catch (e) {
        Azure.Registro.aviso('velocidad ' + v + ': ' + (e && e.message));
        E.vel = 1; try { if (E.usaAv) avp().setSpeed(1); else if (video) video.playbackRate = 1; } catch (e2) {}
        return false;
      }
    },

    cerrar: function () { E.abierto = false; cerrarMotor(); emitir('detenido'); if (cb.alCerrar) cb.alCerrar(); },
    estaAbierto: function () { return E.abierto; }
  };
})();
