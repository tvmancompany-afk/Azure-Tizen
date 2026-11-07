/* Pantallas: Configuración (seguridad, subtítulos, reproductor, red, Buddy Host, diagnóstico) y Prueba de red. */
(function () {
  var Azure = window.Azure, el = Azure.el, Pant = Azure.Pantallas, U = Pant.util, D = Azure.Dialogo, A = Azure.Almacen;

  /* ---------- Seguridad: activar, cambiar, quitar (contraseña escrita dos veces, con ojo) ---------- */
  function crearClave(titulo) {
    return D.formulario(titulo, [{ et: 'Contraseña (mínimo ' + Azure.Seguridad.MIN + ' caracteres)', clave: true }, { et: 'Repítela', clave: true }], 'GUARDAR').then(function (v) {
      if (!v) return false;
      if (v[0] !== v[1]) return D.aviso('Seguridad', 'Las dos contraseñas no coinciden.').then(function () { return false; });
      if (!Azure.Seguridad.establecer(v[0])) return D.aviso('Seguridad', 'La contraseña debe tener al menos ' + Azure.Seguridad.MIN + ' caracteres.').then(function () { return false; });
      return true;
    });
  }
  function pedirActual() {
    return D.formulario('Escribe la contraseña actual', [{ et: 'Contraseña actual', clave: true }], 'CONTINUAR').then(function (v) {
      if (!v) return false;
      if (Azure.Seguridad.verificar(v[0])) return true;
      return D.aviso('Seguridad', 'Contraseña incorrecta.').then(function () { return false; });
    });
  }

  Pant.def.config = function () {
    var segEstado = el('div', { cls: 'estado' });
    function segTxt() { segEstado.textContent = Azure.Seguridad.activa() ? 'Bloqueo ACTIVADO.' : 'Bloqueo desactivado.'; }
    segTxt();
    var seg = U.plegable('Seguridad', [
      el('div', { cls: 'estado', text: 'Protege Azure con una contraseña. Se pide al abrir la app (por ejemplo, después de apagar la TV); no se vuelve a pedir al volver de otra app. Si la olvidas, hay que borrar los datos de la app.' }),
      segEstado,
      el('div', { cls: 'fila-h' },
        U.boton('ACTIVAR', function () { if (Azure.Seguridad.activa()) { D.aviso('Seguridad', 'Ya está activado. Usa CAMBIAR.'); return; } crearClave('Crear contraseña').then(segTxt); }),
        U.boton('CAMBIAR', function () { if (!Azure.Seguridad.activa()) { D.aviso('Seguridad', 'Primero actívalo.'); return; } pedirActual().then(function (ok) { if (ok) crearClave('Contraseña nueva').then(segTxt); }); }),
        U.boton('QUITAR', function () { if (!Azure.Seguridad.activa()) return; pedirActual().then(function (ok) { if (ok) { Azure.Seguridad.quitar(); segTxt(); Azure.toast('Bloqueo quitado.'); } }); }))], false);

    var subs = U.plegable('Subtítulos (estilo y posición)', [
      el('div', { cls: 'estado', text: 'En la TV los subtítulos los dibuja Azure, así que aquí se ajusta todo: tamaño, color, grosor, contorno, fondo y posición. La vista previa tiene franjas blanca, gris, azul y negra para comprobar que se lean.' }),
      Pant.util.panelEstiloSubs().el], false);

    var bMotor = U.boton('', function (b) {
      var m = A.get('motor', 'auto') === 'auto' ? 'html5' : 'auto'; A.set('motor', m); b.textContent = 'MOTOR: ' + (m === 'auto' ? 'AUTOMÁTICO (AVPlay si existe)' : 'SOLO HTML5');
    });
    bMotor.textContent = 'MOTOR: ' + (A.get('motor', 'auto') === 'auto' ? 'AUTOMÁTICO (AVPlay si existe)' : 'SOLO HTML5');
    var ua = Azure.Campo.texto('User-Agent para reproducir (opcional, AVPlay)', A.get('rep_ua', ''), { alCambiar: function (v) { A.set('rep_ua', v.trim()); } });
    var cabx = Azure.Campo.texto('Cabeceras extra (experimento, AVPlay)', A.get('rep_cab', ''), { alCambiar: function (v) { A.set('rep_cab', v.trim()); } });
    var rep = U.plegable('Reproductor', [el('div', { cls: 'estado', text: 'Motor en uso: ' + Azure.Reproductor.motor() }), bMotor, ua.el, cabx.el, el('div', { cls: 'estado', text: 'Cabeceras extra (EXPERIMENTO, solo AVPlay): se intentan colar tras el User-Agent. Formato: Referer: https://sitio/ | Origin: https://sitio' })], false);

    var bhHost = Azure.Campo.texto('Host del Buddy Host', Azure.BuddyHost.hostGuardado(), { alCambiar: function (v) { Azure.BuddyHost.guardarHost(v); } });
    var bhG = Azure.Campo.texto('Archivo para guardar (por defecto guardarT.php)', A.get('buddy_guardar', 'guardarT.php'), { alCambiar: function (v) { A.set('buddy_guardar', v.trim()); } });
    var bhL = Azure.Campo.texto('Archivo para leer (por defecto leerT.php)', A.get('buddy_leer', 'leerT.php'), { alCambiar: function (v) { A.set('buddy_leer', v.trim()); } });
    var buddy = U.plegable('Buddy Host', [
      el('div', { cls: 'estado', text: 'Sin http:// ni https:// la app prueba https y, si no conecta, http. Los archivos "T" son las copias con CORS para la TV.' }),
      bhHost.el, bhG.el, bhL.el], false);

    /* Red: proxy de respaldo (proxyT.php). Solo para listas, Xtream y subtítulos; nunca para videos. */
    var pxUrl = Azure.Campo.texto('Dirección del proxy (ej. https://tusitio.com/buddy/proxyT.php)', A.get('proxy_url', ''), { alCambiar: function (v) { A.set('proxy_url', v.trim()); } });
    var pxClave = Azure.Campo.clave('Clave del proxy (la de CLAVE_PROXY)', A.get('proxy_clave', ''), { alCambiar: function (v) { A.set('proxy_clave', v); } });
    var MODOS = { auto: 'SOLO SI FALLA LA CONEXIÓN DIRECTA', siempre: 'SIEMPRE', no: 'NO USAR' };
    var bModo = U.boton('', function (b) {
      var m = A.get('proxy_modo', 'auto'); m = m === 'auto' ? 'siempre' : (m === 'siempre' ? 'no' : 'auto'); A.set('proxy_modo', m);
      b.textContent = 'USAR PROXY: ' + MODOS[m];
    });
    bModo.textContent = 'USAR PROXY: ' + MODOS[A.get('proxy_modo', 'auto')];
    var red = U.plegable('Red (proxy de respaldo)', [
      el('div', { cls: 'estado', text: 'Si una lista o un Xtream no carga por CORS, la app lo pide a través de tu proxyT.php. Los videos nunca pasan por el proxy.' }),
      pxUrl.el, pxClave.el, bModo], false);

    function verRegistro() {
      var caja = Azure.Campo.texto('', Azure.Registro.texto(), { multilinea: true, filas: 14 });
      caja.input.classList.add('mono');
      D.abrir({ titulo: 'Registro (' + Azure.Registro.cuantas() + ' líneas)', cuerpo: caja.el, botones: [
        { t: 'ENVIAR POR BUDDY HOST', fn: function () {
          D.formulario('Enviar registro', [{ et: 'Host', valor: Azure.BuddyHost.hostGuardado() }, { et: 'Título' }, { et: 'Clave', clave: true }], 'ENVIAR').then(function (v) {
            if (!v) return; Azure.BuddyHost.guardarHost(v[0]);
            Azure.BuddyHost.guardar(v[0], v[1], v[2], Azure.Registro.texto()).then(function () { Azure.toast('Registro enviado.'); }).catch(function (e) { D.aviso('Buddy Host', Azure.Red.mensaje(e)); });
          });
        } },
        { t: 'BORRAR REGISTRO', cls: 'peligro', fn: function () { Azure.Registro.limpiar(); Azure.toast('Registro borrado.'); } },
        { t: 'CERRAR' }] });
    }
    var diag = U.plegable('Diagnóstico', [
      el('div', { cls: 'estado', text: 'Registro de errores de esta app, para pasárselo a Claude. Almacenamiento usado: ' + Math.round(A.uso() / 1024) + ' KB.' }),
      U.boton('VER REGISTRO', verRegistro), U.boton('PROBAR CAPACIDADES DE LA TV', function () { Azure.Capacidades.probar(); Azure.toast('Listo: míralo en VER REGISTRO (espera unos segundos).'); }), U.boton('PRUEBA DE RED Y REPRODUCCIÓN', function () { Pant.ir('prueba', {}, true); })], false);

    /* Reloj: hora del equipo (horas y minutos), se actualiza justo al cambiar el minuto. */
    var reloj = el('div', { cls: 'reloj' }), relojTimer = null;
    function horaTxt() {
      var d = new Date();
      try { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
      catch (e) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    }
    function tick() { reloj.textContent = horaTxt(); relojTimer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50); }

    var pantalla = el('div', { cls: 'pantalla' }, U.barra('Configuración', [U.boton('ATRÁS', function () { Pant.volver(); })]),
      el('div', { cls: 'cuerpo', style: { flexDirection: 'column', overflowY: 'auto' } }, reloj, seg, subs, rep, red, buddy, diag,
        el('div', { cls: 'estado', text: 'Azure Tizen ' + Azure.VERSION + ' (base de Azure Android ' + Azure.BASE_ANDROID + ')' })));
    return { el: pantalla, alMostrar: function () { clearTimeout(relojTimer); tick(); Azure.Foco.primero(pantalla); }, alOcultar: function () { clearTimeout(relojTimer); }, tecla: function (t) { if (t === 'atras') { Pant.volver(); return true; } return false; } };
  };

  /* ---------- Prueba de red y reproducción: para saber en la TV qué funciona (CORS, HTTP, AVPlay) ---------- */
  Pant.def.prueba = function () {
    var log = el('div', { cls: 'panel mono', style: { flex: '1', overflowY: 'auto' } });
    function say(t) { log.textContent += t + '\n'; log.scrollTop = log.scrollHeight; Azure.Registro.info('Prueba: ' + t); }
    function entorno() {
      say('Versión: ' + Azure.VERSION + ' | protocolo: ' + location.protocol + ' | contexto seguro: ' + (window.isSecureContext ? 'sí' : 'no'));
      say('AVPlay: ' + (window.webapis && webapis.avplay ? 'sí' : 'no') + ' | Tizen API: ' + (window.tizen ? 'sí' : 'no') + ' | pantalla: ' + window.innerWidth + 'x' + window.innerHeight);
      say('crypto.subtle: ' + (window.crypto && crypto.subtle ? 'sí' : 'no') + ' | fetch: ' + (window.fetch ? 'sí' : 'no') + ' | UA: ' + navigator.userAgent);
      try { if (window.webapis && webapis.productinfo) say('Modelo: ' + webapis.productinfo.getRealModel() + ' | Tizen: ' + webapis.productinfo.getVersion()); } catch (e) { say('productinfo: ' + (e && e.message)); }
    }
    var m3u = Azure.Campo.texto('Link de una lista M3U/TXT', A.get('pr_m3u', ''));
    var xh = Azure.Campo.texto('Xtream host', A.get('xt_host', '')), xu = Azure.Campo.texto('Xtream usuario', A.get('xt_user', '')), xp = Azure.Campo.clave('Xtream contraseña', A.get('xt_pass', ''));
    var vid = Azure.Campo.texto('Link de un video (mp4 o m3u8)', A.get('pr_vid', ''));
    var bh = Azure.Campo.texto('Buddy Host (host)', Azure.BuddyHost.hostGuardado()), bt = Azure.Campo.texto('Buddy Host (título)', '');
    function guardar() { A.set('pr_m3u', m3u.valor()); A.set('pr_vid', vid.valor()); }

    function pruebaM3u() {
      guardar(); var u = m3u.valor().trim(); say('--- M3U: ' + u);
      Azure.Red.pedir(u, { maxBytes: 200000 }).then(function (r) {
        say((r.viaProxy ? '(llegó por el PROXY) ' : '(directo) ') + 'Respuesta ' + r.status + ' | tipo ' + r.tipo + ' | ' + r.texto.length + ' caracteres' + (r.truncado ? ' (cortado)' : ''));
        say('Clasificación: ' + Azure.M3u.clasificar(r.texto, r.tipo) + ' | elementos leídos: ' + Azure.M3u.parse(r.texto, r.url).length);
      }).catch(function (e) { say('FALLÓ: ' + Azure.Red.mensaje(e) + ' [' + e.causa + ']'); });
    }
    function pruebaXtream() {
      say('--- Xtream: ' + xh.valor());
      Azure.Xtream.abrir(Azure.Xtream.enlaceRaiz(xh.valor(), xu.valor().trim(), xp.valor())).then(function (r) { say('Conectó: ' + r.entradas.map(function (x) { return x.title; }).join(', ')); })
        .catch(function (e) { say('FALLÓ: ' + Azure.Red.mensaje(e) + ' [' + (e.causa || '') + ']'); });
    }
    function pruebaBuddy() {
      say('--- Buddy Host: ' + bh.valor() + ' título ' + bt.valor());
      Azure.BuddyHost.leer(bh.valor(), bt.valor()).then(function (t) { say('Leyó ' + t.length + ' caracteres: ' + t.slice(0, 80).replace(/\n/g, ' ')); })
        .catch(function (e) { say('FALLÓ: ' + Azure.Red.mensaje(e) + (e.desafio ? ' [DESAFÍO ANTI-BOT]' : ' [' + (e.causa || '') + ']')); });
    }
    function pruebaProxy() {
      guardar(); var u = m3u.valor().trim(); var c = Azure.Red.proxyConfig();
      say('--- Proxy: ' + (c.url || '(sin dirección)') + ' | modo ' + c.modo + ' | clave ' + (c.clave ? 'puesta' : 'VACÍA'));
      if (!c.url || !c.clave) { say('Falta la dirección o la clave (Configuración > Red).'); return; }
      Azure.Red.directo(Azure.Red.urlProxy(u), { maxBytes: 200000 }).then(function (r) {
        if (/^ERROR_PROXY:/.test(r.texto)) { say('El proxy contestó: ' + r.texto.trim()); return; }
        say('Por proxy: respuesta ' + r.status + ' | ' + r.texto.length + ' caracteres | clasificación ' + Azure.M3u.clasificar(r.texto, r.tipo));
      }).catch(function (e) { say('FALLÓ el proxy: ' + Azure.Red.mensaje(e) + ' [' + (e.causa || '') + ']'); });
    }
    function pruebaVideo() {
      guardar(); var u = vid.valor().trim(); say('--- Video: ' + u + ' | motor: ' + Azure.Reproductor.motor());
      Pant.ir('reproductor', { lista: [{ title: 'Prueba', url: u }], indice: 0 }, true);
    }
    var izq = el('div', { cls: 'col', style: { width: '900px', overflowY: 'auto' } },
      el('div', { cls: 'panel' }, m3u.el, U.boton('PROBAR M3U', pruebaM3u), U.boton('PROBAR ESE LINK POR EL PROXY', pruebaProxy), xh.el, xu.el, xp.el, U.boton('PROBAR XTREAM', pruebaXtream),
        bh.el, bt.el, U.boton('PROBAR BUDDY HOST (LEER)', pruebaBuddy), vid.el, U.boton('PROBAR REPRODUCCIÓN', pruebaVideo)));
    var pantalla = el('div', { cls: 'pantalla' }, U.barra('Prueba de red y reproducción', [U.boton('ATRÁS', function () { Pant.volver(); })]),
      el('div', { cls: 'cuerpo' }, izq, el('div', { cls: 'col col-der' }, log)));
    return { el: pantalla, alMostrar: function () { entorno(); Azure.Foco.primero(izq); }, tecla: function (t) { if (t === 'atras') { Pant.volver(); return true; } return false; } };
  };
})();
