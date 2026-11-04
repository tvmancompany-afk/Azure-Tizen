/* Pantallas: enrutador, pantalla principal y bloqueo. Las otras pantallas están en pantallas_*.js */
(function () {
  var Azure = window.Azure, el = Azure.el, A = Azure.Almacen;
  var actual = null, historial = [], manejadorActual = null;
  var Pant = Azure.Pantallas = { def: {} };

  function montar(nombre, params) {
    if (actual && actual.alOcultar) actual.alOcultar(nombre);
    if (manejadorActual) Azure.Teclas.sacar(manejadorActual);
    var app = document.getElementById('app');
    app.innerHTML = '';
    document.body.classList.toggle('reproduciendo', nombre === 'reproductor');
    var p = Pant.def[nombre](params || {});
    actual = p; actual.nombre = nombre;
    app.appendChild(p.el);
    manejadorActual = function (tecla, ev, extra) { return p.tecla ? p.tecla(tecla, ev, extra) : false; };
    Azure.Teclas.empujar(manejadorActual);
    if (p.alMostrar) p.alMostrar();
    if (!Azure.Foco.actual()) Azure.Foco.primero(app);
  }

  /** Va a una pantalla. Si recordar, Atrás vuelve a la anterior. */
  Pant.ir = function (nombre, params, recordar) {
    if (recordar && actual) historial.push({ nombre: actual.nombre, params: actual.params });
    montar(nombre, params);
    actual.params = params;
  };
  Pant.volver = function () {
    var h = historial.pop();
    if (h) { montar(h.nombre, h.params); actual.params = h.params; return true; }
    return false;
  };
  Pant.actual = function () { return actual; };
  Pant.aviso = function (texto, clase) { var e = document.querySelector('.estado-global'); if (e) { e.textContent = texto; e.className = 'estado estado-global ' + (clase || ''); } };

  function barra(titulo, botones) {
    var b = el('div', { cls: 'barra' }, el('img', { attrs: { src: 'assets/logo_azure.png', alt: '' } }), el('h1', { text: titulo }));
    (botones || []).forEach(function (x) { b.appendChild(x); });
    return b;
  }
  function boton(texto, fn, cls) {
    var b = el('div', { cls: 'btn' + (cls ? ' ' + cls : ''), text: texto, f: true, attrs: { tabindex: '-1' } });
    b.addEventListener('click', function () { fn(b); });
    return b;
  }
  function plegable(titulo, hijos, abierto) {
    var cab = el('div', { cls: 'cab', f: true, attrs: { tabindex: '-1' } }, el('span', { text: abierto ? '▾' : '▸' }), el('span', { text: titulo }));
    var cont = el('div', { cls: 'cont' });
    hijos.forEach(function (h) { cont.appendChild(h); });
    var raiz = el('div', { cls: 'panel plegable' + (abierto ? ' abierto' : '') }, cab, cont);
    cab.addEventListener('click', function () {
      var ab = raiz.classList.toggle('abierto');
      cab.firstChild.textContent = ab ? '▾' : '▸';
    });
    return raiz;
  }
  Pant.util = { barra: barra, boton: boton, plegable: plegable };

  /* ============================== PRINCIPAL ============================== */
  var P = { pila: [], filtro: '', reproducibles: [] };

  function estadoTxt(t, clase) { var e = document.getElementById('estado-principal'); if (e) { e.textContent = t; e.className = 'estado ' + (clase || ''); } }

  function mostrarEntradas(entradas, titulo, url) {
    P.pila.push({ titulo: titulo || 'Lista', entradas: entradas, url: url });
    P.filtro = '';
    refrescarLista(false);
  }

  function visibles() {
    var cima = P.pila[P.pila.length - 1];
    if (!cima) return [];
    var f = P.filtro.trim().toLowerCase();
    return f ? cima.entradas.filter(function (x) { return (x.title || '').toLowerCase().indexOf(f) >= 0; }) : cima.entradas;
  }

  function refrescarLista(conservar) {
    if (!P.lista) return;
    var v = visibles();
    P.lista.poner(v, conservar);
    var cima = P.pila[P.pila.length - 1];
    var info = document.getElementById('info-elementos');
    if (info) info.textContent = cima ? ('Elementos (' + v.length + (P.filtro ? ' de ' + cima.entradas.length : '') + ')  ·  ' + cima.titulo) : 'Elementos (0)';
    var at = document.getElementById('btn-atras-lista');
    if (at) at.setAttribute('data-off', P.pila.length > 1 ? '0' : '1'), at.classList.toggle('off', P.pila.length <= 1);
  }

  /** Abre un enlace: lista M3U/TXT, índice HTML, Xtream o video directo. */
  function abrirEnlace(url, titulo) {
    url = (url || '').trim();
    if (!Azure.esLinkHttp(url) && !Azure.Xtream.esEnlace(url)) { estadoTxt('Escribe un link que empiece por http:// o https://', 'error'); return; }
    estadoTxt('Cargando…');
    var p;
    if (Azure.Xtream.esEnlace(url)) p = Azure.Xtream.abrir(url).then(function (r) { return { tipo: 'playlist', entradas: r.entradas }; });
    else p = Azure.M3u.cargarUrl(url);
    p.then(function (r) {
      if (r.tipo === 'direct') {
        estadoTxt('Video directo.', 'ok');
        reproducirMini([{ title: titulo || url.split('/').pop() || 'Video', url: url }], 0);
        return;
      }
      if (!r.entradas.length) { estadoTxt('La lista está vacía.', 'error'); return; }
      mostrarEntradas(r.entradas, titulo || url.split('/').pop() || 'Lista', url);
      estadoTxt('Lista cargada (' + r.entradas.length + ' elementos)' + (r.truncado ? '. Era muy grande y se leyeron solo los primeros 2 MB' : '') + '.', r.truncado ? 'error' : 'ok');
      Azure.Foco.poner(P.lista.el.querySelector('.fila'));
    }).catch(function (e) {
      Azure.Registro.error('Abrir ' + url, e);
      estadoTxt(Azure.Red.mensaje(e), 'error');
    });
  }
  Pant.abrirEnlace = abrirEnlace;

  function reproducir(lista, indice) {
    Pant.ir('reproductor', { lista: lista, indice: indice }, true);
  }
  Pant.reproducir = reproducir;

  /** Reproduce dentro de la ventanita de la pantalla principal (como Azure Android). La pantalla completa se pide con su botón. */
  function reproducirMini(lista, indice) {
    if (!P.mini) { reproducir(lista, indice); return; }
    Azure.Reproductor.ponerRect(P.mini.rectCaja());
    Azure.Reproductor.abrir(lista, indice);
  }
  Pant.reproducirMini = reproducirMini;

  function elegirElemento(it) {
    if (it.isList || Azure.Xtream.esEnlace(it.url)) { abrirEnlace(it.url, it.title); return; }
    if (it.isRemoteCandidate) { abrirEnlace(it.url, it.title); return; }
    var lista = visibles().filter(function (x) { return !x.isList && !x.isRemoteCandidate && !Azure.Xtream.esEnlace(x.url); });
    reproducirMini(lista, Math.max(0, lista.indexOf(it)));
  }

  function textoPegado(texto) {
    var entradas = Azure.M3u.parse(texto, '');
    if (!entradas.length) { estadoTxt('No se encontraron enlaces.', 'error'); return; }
    mostrarEntradas(entradas, 'Texto pegado', '');
    estadoTxt('Lista cargada (' + entradas.length + ' elementos).', 'ok');
  }
  Pant.cargarTexto = textoPegado;

  Pant.def.principal = function () {
    var campoUrl = Azure.Campo.texto('URL directa o lista M3U/TXT', A.get('last_url', ''), { placeholder: 'https://…' });
    var estadoPrincipal = el('div', { cls: 'estado', attrs: { id: 'estado-principal' } });
    var panelFuente = plegable('Fuente', [campoUrl.el,
      el('div', { cls: 'fila-h' },
        boton('ABRIR', function () { A.set('last_url', campoUrl.valor()); abrirEnlace(campoUrl.valor()); }, 'pri'),
        boton('LIMPIAR', function () { campoUrl.poner(''); A.set('last_url', ''); estadoTxt('', ''); }))], false);

    /* Texto pegado (igual que Azure Android): hasta 20 000 caracteres se muestra completo, editable y se recuerda entre aperturas.
       Más grande NO se muestra entero ni se guarda (un cuadro gigante hacía caer la app): el cuadro enseña una vista previa de solo lectura
       y el texto completo se conserva en memoria para LEER TEXTO y para GUARDAR del Buddy Host. */
    var LIM_TEXTO = Azure.TEXTO_PEGADO_LIMITE = 20000;
    var textoGrande = null, guardarT = null;
    var cajaTexto = Azure.Campo.texto('', '', { multilinea: true, filas: 4, placeholder: 'Pega aquí una lista M3U o TXT' });
    var avisoGrande = el('div', { cls: 'estado' });
    function ponerTexto(t) {
      t = t == null ? '' : String(t);
      if (t.length > LIM_TEXTO) {
        textoGrande = t;
        cajaTexto.poner(t.slice(0, 2000)); cajaTexto.input.readOnly = true;
        avisoGrande.textContent = 'Texto largo: vista previa (' + t.length + ' caracteres). Se lee completo con LEER TEXTO.';
        A.del('texto_pegado');
      } else {
        textoGrande = null; cajaTexto.poner(t); cajaTexto.input.readOnly = false; avisoGrande.textContent = '';
        A.set('texto_pegado', t);
      }
    }
    function textoActual() { return textoGrande != null ? textoGrande : cajaTexto.valor(); }
    cajaTexto.input.addEventListener('input', function () {
      if (textoGrande != null) return;
      var v = cajaTexto.valor();
      if (v.length > LIM_TEXTO) { ponerTexto(v); return; }
      clearTimeout(guardarT); guardarT = setTimeout(function () { A.set('texto_pegado', cajaTexto.valor()); }, 400);
    });
    ponerTexto(A.get('texto_pegado', ''));
    var panelTexto = plegable('Pegar M3U/TXT', [cajaTexto.el, avisoGrande,
      el('div', { cls: 'fila-h' },
        boton('LEER TEXTO', function () { textoPegado(textoActual()); }, 'pri'),
        boton('LIMPIAR TEXTO', function () { ponerTexto(''); estadoTxt('Texto limpiado.', 'ok'); }))], false);

    var bhHost = Azure.Campo.texto('URL del host', Azure.BuddyHost.hostGuardado(), { placeholder: 'tusitio.com' });
    var bhTitulo = Azure.Campo.texto('Título', '');
    var bhClave = Azure.Campo.clave('Contraseña', '');
    var bhEstado = el('div', { cls: 'estado' });
    function bhMsg(t, c) { bhEstado.textContent = t; bhEstado.className = 'estado ' + (c || ''); }
    var panelBuddy = plegable('Buddy Host', [bhHost.el, bhTitulo.el, bhClave.el,
      el('div', { cls: 'fila-h' },
        boton('GUARDAR', function () {
          Azure.BuddyHost.guardarHost(bhHost.valor()); bhMsg('Guardando…');
          Azure.BuddyHost.guardar(bhHost.valor(), bhTitulo.valor(), bhClave.valor(), textoActual()).then(function () { bhMsg('Guardado.', 'ok'); })
            .catch(function (e) { Azure.Registro.error('BuddyHost guardar', e); bhMsg(Azure.Red.mensaje(e), 'error'); });
        }),
        boton('CARGAR', function () {
          Azure.BuddyHost.guardarHost(bhHost.valor()); bhMsg('Cargando…');
          Azure.BuddyHost.leer(bhHost.valor(), bhTitulo.valor()).then(function (t) {
            ponerTexto(t); bhMsg('Cargado (' + t.length + ' caracteres).', 'ok'); textoPegado(t);
          }).catch(function (e) { Azure.Registro.error('BuddyHost leer', e); bhMsg(Azure.Red.mensaje(e), 'error'); });
        }, 'pri')), bhEstado], false);

    var xHost = Azure.Campo.texto('Link del host (ej. http://host:puerto)', A.get('xt_host', ''), { placeholder: 'http://servidor:puerto' });
    var xUser = Azure.Campo.texto('Usuario', A.get('xt_user', ''));
    var xPass = Azure.Campo.clave('Contraseña', A.get('xt_pass', ''));
    function xGuardarUltimo() { A.set('xt_host', xHost.valor()); A.set('xt_user', xUser.valor()); A.set('xt_pass', xPass.valor()); }
    /** Cuentas Xtream guardadas: tocar abre; 🗑 borra (con confirmación). */
    function cuentasXtream(foco) {
      var l = A.get('xt_cuentas', []);
      var cuerpo = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      var api;
      l.forEach(function (c, i) {
        var b = boton('Xstream ' + (i + 1) + '  (' + c.user + ' @ ' + c.host.replace(/^https?:\/\//, '') + ')', function () { api.cerrar(); abrirEnlace(Azure.Xtream.enlaceRaiz(c.host, c.user, c.pass), 'Xstream ' + (i + 1)); });
        var x = el('div', { cls: 'btn ib', f: true, attrs: { tabindex: '-1', 'aria-label': 'Borrar' } }, Azure.Iconos.crear('papelera'));
        x.addEventListener('click', function () {
          api.cerrar();
          Azure.Dialogo.confirmar('¿Borrar esta cuenta?', 'Xstream ' + (i + 1) + '\n' + c.user + ' @ ' + c.host.replace(/^https?:\/\//, ''), 'BORRAR').then(function (si) {
            if (si) { var q = A.get('xt_cuentas', []); q.splice(i, 1); A.set('xt_cuentas', q); estadoTxt('Cuenta borrada.', 'ok'); }
            if (A.get('xt_cuentas', []).length) cuentasXtream();
          });
        });
        cuerpo.appendChild(el('div', { cls: 'cuenta-fila' }, b, x));
      });
      api = Azure.Dialogo.abrir({ titulo: 'Cuentas Xtream', cuerpo: cuerpo, botones: [{ t: 'CERRAR' }] });
    }
    var panelXtream = plegable('Xtream', [xHost.el, xUser.el, xPass.el,
      el('div', { cls: 'fila-h' },
        boton('CONECTAR', function () { xGuardarUltimo(); abrirEnlace(Azure.Xtream.enlaceRaiz(xHost.valor(), xUser.valor().trim(), xPass.valor()), 'Xtream'); }, 'pri'),
        boton('LISTAS', function () {
          var l = A.get('xt_cuentas', []);
          if (!l.length) { Azure.Dialogo.aviso('Xtream', 'No hay cuentas guardadas.'); return; }
          cuentasXtream();
        })),
        boton('GUARDAR', function () {
          var h = Azure.Xtream.normalizarHost(xHost.valor());
          if (!h || !xUser.valor().trim()) { estadoTxt('Completa host y usuario.', 'error'); return; }
          var l = A.get('xt_cuentas', []); l.push({ host: h, user: xUser.valor().trim(), pass: xPass.valor() }); A.set('xt_cuentas', l);
          estadoTxt('Cuenta guardada (Xstream ' + l.length + ').', 'ok');
        })], false);

    /* Rentry: solo CARGAR (como Android: solo se toman las entradas (Título|URL)) */
    var rLink = Azure.Campo.texto('Link de Rentry (rentry.co/xxxx o solo xxxx)', A.get('rentry_link', ''));
    var rEstado = el('div', { cls: 'estado' });
    function rMsg(t, c) { rEstado.textContent = t; rEstado.className = 'estado ' + (c || ''); }
    var panelRentry = plegable('Rentry', [
      el('div', { cls: 'estado', text: 'En Rentry, cada entrada va como (Título|URL), entre paréntesis. Solo se toma eso; el resto de la página (menú, avisos, etc.) se ignora.' }),
      rLink.el,
      el('div', { cls: 'fila-h' }, boton('CARGAR', function () {
        var i = Azure.Rentry.id(rLink.valor());
        if (!i) { rMsg('Completá el link.', 'error'); return; }
        A.set('rentry_link', rLink.valor().trim()); rMsg('Cargando...', '');
        Azure.Rentry.leer(i).then(function (r) {
          var limpio = Azure.Rentry.extraerEntradas(r.texto);
          if (!limpio) { rMsg('No se encontró ninguna entrada con el formato (Título|URL) en esa página.', 'error'); return; }
          ponerTexto(limpio); textoPegado(limpio); rMsg('Cargado desde rentry.co/' + r.id + '.', 'ok');
        }).catch(function (e) { Azure.Registro.error('Rentry', e); rMsg(Azure.Red.mensaje(e), 'error'); });
      }, 'pri')), rEstado], false);

    /* Explorador local: USB / disco conectado a la TV */
    var panelExplorador = plegable('Explorador local', [
      el('div', { cls: 'estado', text: 'Videos y subtítulos de un USB o disco conectado a la TV. Un video con un subtítulo del mismo nombre en la carpeta lo carga solo.' }),
      el('div', { cls: 'fila-h' }, boton('ABRIR EXPLORADOR', function () {
        Azure.Explorador.abrir({ modo: 'video', alVideo: function (lista, idx) { reproducirMini(lista, idx); } });
      }, 'pri'))], false);

    /* Ventanita del reproductor (como Azure Android): arriba y fija; los paneles se desplazan debajo. */
    var mini = Pant.crearMini({
      alEstado: function (e, m) {
        if (e === 'reproduciendo' && P.ultEstado !== 'reproduciendo') estadoTxt('Video activado.', 'ok');
        if (e === 'error') estadoTxt('Error: ' + m, 'error');
        P.ultEstado = e;
      }
    });
    P.mini = mini;
    mini.rectCaja = function () { var r = mini.caja.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    var scrollIzq = el('div', { cls: 'izq-scroll' }, panelFuente, panelTexto, panelBuddy, panelXtream, panelRentry, panelExplorador);
    var colIzq = el('div', { cls: 'col col-izq' }, mini.el, estadoPrincipal, scrollIzq);

    var buscar = Azure.Campo.texto('Buscar', '', { placeholder: 'Buscar título en la lista cargada', alCambiar: function (v) { P.filtro = v; refrescarLista(false); } });
    P.lista = Azure.Lista.crear({
      vacio: 'Abre una fuente, pega un texto o entra a Preferentes.',
      alElegir: elegirElemento,
      alLargo: menuElemento, alDer: null
    });
    var barraLista = el('div', { cls: 'fila-h' },
      el('div', { cls: 'lista-info', attrs: { id: 'info-elementos' }, text: 'Elementos (0)', style: { flex: '1' } }),
      boton('ATRÁS', function () { if (P.pila.length > 1) { P.pila.pop(); P.filtro = ''; refrescarLista(false); } }, 'chico'),
      boton('INICIO', function () { P.lista.irAlInicio(); }, 'chico'),
      boton('FIN', function () { P.lista.irAlFinal(); }, 'chico'));
    barraLista.lastChild.classList.add('fijo'); barraLista.children[1].classList.add('fijo'); barraLista.children[2].classList.add('fijo');
    barraLista.children[1].id = 'btn-atras-lista';
    var panelBuscar = plegable('Buscar', [buscar.el], false);
    var colDer = el('div', { cls: 'col col-der' }, panelBuscar, barraLista, P.lista.el,
      el('div', { cls: 'estado', text: 'Mantén OK (o botón amarillo) sobre un elemento para más opciones.' }));

    /* "C": activa/apaga el cursor (anillo libre) como en Azure Android. La tecla azul hace lo mismo desde cualquier pantalla. */
    var btnCursor = boton('C', function () { Azure.Cursor.alternar(); }, 'chico');
    btnCursor.classList.toggle('cur-on', Azure.Cursor.activo());
    Pant.alCursor = function (v) { btnCursor.classList.toggle('cur-on', v); };
    var fondo = el('div', { cls: 'fondo' });
    var pantalla = el('div', { cls: 'pantalla principal' }, fondo,
      barra('Azure', [btnCursor, boton('LISTAS', function () { Pant.ir('preferentes', {}, true); }), boton('CONFIGURACIÓN', function () { Pant.ir('config', {}, true); })]),
      el('div', { cls: 'cuerpo' }, colIzq, colDer));

    return {
      el: pantalla,
      alMostrar: function () {
        refrescarLista(true);
        /* Agujero en el fondo donde se ve el video (AVPlay/<video> se dibujan detrás de la página). */
        var r = mini.rectCaja();
        fondo.style.clipPath = 'polygon(evenodd, 0 0, 1920px 0, 1920px 1080px, 0 1080px, 0 0, ' + r.x + 'px ' + r.y + 'px, ' + r.x + 'px ' + (r.y + r.h) + 'px, ' + (r.x + r.w) + 'px ' + (r.y + r.h) + 'px, ' + (r.x + r.w) + 'px ' + r.y + 'px, ' + r.x + 'px ' + r.y + 'px)';
        if (Azure.Reproductor.estaAbierto()) { Azure.Reproductor.ponerRect(r); }
        mini.sincronizar();
        if (P.lista.hayFilas()) Azure.Foco.poner(P.lista.el.querySelector('.fila'));
      },
      alOcultar: function (siguiente) {
        mini.alOcultar();
        P.mini = null;
        // Al ir a pantalla completa el video sigue; a cualquier otra pantalla (Listas, Configuración) se detiene.
        if (siguiente !== 'reproductor' && Azure.Reproductor.estaAbierto()) Azure.Reproductor.cerrar();
      },
      tecla: function (t) {
        if (!Azure.Dialogo.hayAbierto() && Azure.Reproductor.estaAbierto()) {
          var Rp = Azure.Reproductor;
          if (t === 'playpausa') { Rp.alternarPausa(); return true; }
          if (t === 'play') { Rp.reanudar(); return true; }
          if (t === 'pausa') { Rp.pausar(); return true; }
          if (t === 'stop') { Rp.cerrar(); mini.sincronizar(); estadoTxt('Reproductor detenido.', ''); return true; }
          if (t === 'ff') { Rp.saltar(30000); return true; }
          if (t === 'rw') { Rp.saltar(-30000); return true; }
        }
        if (t === 'atras') {
          if (P.pila.length > 1) { P.pila.pop(); P.filtro = ''; refrescarLista(false); return true; }
          return false; // en la pantalla principal Atrás sale de la app (lo resuelve app.js)
        }
        return false;
      }
    };
  };

  function menuElemento(it) {
    var esLista = it.isList || it.isRemoteCandidate || Azure.Xtream.esEnlace(it.url);
    Azure.Dialogo.abrir({
      titulo: it.title,
      mensaje: esLista ? 'Esta carpeta o lista se abre al pulsarla. Puedes guardar su link en una entrada de Preferentes.'
        : 'Este elemento se está tratando como video. Si en realidad es otra lista de enlaces, podés abrirlo así.',
      botones: [
        { t: 'A PREFERENTES', fn: function () { Pant.aPreferentes(it); } },
        { t: 'ABRIR COMO LISTA', fn: function () { abrirEnlace(it.url, it.title); } },
        { t: 'CANCELAR' }
      ]
    });
  }

  /* ============================== BLOQUEO ============================== */
  Pant.def.bloqueo = function () {
    var campo = Azure.Campo.clave('Contraseña', '');
    var msg = el('div', { cls: 'estado error' });
    function probar() {
      if (Azure.Seguridad.verificar(campo.valor())) { Azure.Seguridad.desbloquear(); Pant.ir('principal'); }
      else { msg.textContent = 'Contraseña incorrecta.'; campo.poner(''); }
    }
    var caja = el('div', { cls: 'panel', style: { width: '900px', margin: 'auto' } },
      el('img', { attrs: { src: 'assets/logo_azure.png' }, style: { width: '160px', height: '160px', alignSelf: 'center', borderRadius: '32px' } }),
      el('h2', { text: 'Azure bloqueado', style: { textAlign: 'center' } }), campo.el, msg, boton('DESBLOQUEAR', probar, 'pri'));
    return { el: el('div', { cls: 'pantalla' }, caja), alMostrar: function () { Azure.Foco.poner(campo.input); }, tecla: function (t) { return t === 'atras'; } };
  };
})();
