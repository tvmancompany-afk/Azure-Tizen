/* Núcleo: TODA la red de la app pasa por aquí. Si CORS, HTTP en claro o cabeceras dan problemas en la TV,
   se corrige en este archivo y no en cada pantalla. */
(function () {
  var Azure = window.Azure;

  function decodificar(buf) {
    var bytes = new Uint8Array(buf), txt;
    try { txt = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch (e) {
      try { txt = new TextDecoder('iso-8859-1').decode(bytes); } catch (e2) { txt = ''; }
    }
    if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
    return txt;
  }

  /* Oculta contraseñas y la clave del proxy en lo que se escribe al registro. */
  function oculta(url) {
    return String(url).replace(/(password|clave|pass)=([^&]*)/gi, '$1=***').replace(/([?&])k=([^&]*)/g, '$1k=***');
  }

  function RedError(causa, msg, extra) {
    var e = new Error(msg);
    e.causa = causa; e.extra = extra || '';
    return e;
  }

  Azure.Red = {
    /**
     * opts: metodo ('GET'), cuerpo (string), tipoCuerpo, cabeceras{}, timeout (ms, 20000), maxBytes (0 = sin tope)
     * Devuelve {ok, status, texto, tipo, url, truncado, largo}. Lanza RedError (causa 'red' o 'tiempo') si no hay respuesta.
     */
    directo: function (url, opts) {
      opts = opts || {};
      var metodo = opts.metodo || 'GET';
      var timeout = opts.timeout || 20000;
      var cab = {};
      if (opts.cabeceras) for (var k in opts.cabeceras) cab[k] = opts.cabeceras[k];
      if (opts.cuerpo != null) cab['Content-Type'] = opts.tipoCuerpo || 'application/x-www-form-urlencoded; charset=UTF-8';
      var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var venció = false;
      var timer = setTimeout(function () { venció = true; if (ctl) ctl.abort(); }, timeout);
      Azure.Registro.info('Red ' + metodo + ' ' + oculta(url));

      var p = fetch(url, {
        method: metodo, headers: cab, body: opts.cuerpo != null ? opts.cuerpo : undefined,
        signal: ctl ? ctl.signal : undefined, redirect: 'follow', credentials: 'omit'
      }).then(function (resp) {
        var tipo = resp.headers.get('content-type') || '';
        var largo = parseInt(resp.headers.get('content-length') || '-1', 10);
        var max = opts.maxBytes || 0;
        if (max && resp.body && resp.body.getReader) {
          var reader = resp.body.getReader(), partes = [], total = 0, truncado = false;
          var leer = function () {
            return reader.read().then(function (r) {
              if (r.done) return;
              partes.push(r.value); total += r.value.length;
              if (total >= max) { truncado = true; try { reader.cancel(); } catch (e) {} return; }
              return leer();
            });
          };
          return leer().then(function () {
            var all = new Uint8Array(total), o = 0;
            partes.forEach(function (c) { all.set(c, o); o += c.length; });
            return { ok: resp.ok, status: resp.status, texto: decodificar(all.buffer), tipo: tipo, url: resp.url || url, truncado: truncado, largo: largo };
          });
        }
        return resp.arrayBuffer().then(function (buf) {
          return { ok: resp.ok, status: resp.status, texto: decodificar(buf), tipo: tipo, url: resp.url || url, truncado: false, largo: largo };
        });
      }).then(function (r) { clearTimeout(timer); return r; },
        function (err) {
          clearTimeout(timer);
          if (venció) throw RedError('tiempo', 'La petición tardó demasiado (' + Math.round(timeout / 1000) + ' s).', oculta(url));
          Azure.Registro.aviso('Red falló: ' + oculta(url) + ' | ' + (err && err.message));
          throw RedError('red', 'No se pudo conectar. Puede ser CORS, HTTP bloqueado, el servidor caído o sin red.', oculta(url));
        });
      return p;
    },

    /* ---------- Proxy de respaldo (proxyT.php en el hosting del usuario) ----------
       modo 'auto' (por defecto): solo si la petición directa falla por red/CORS; 'siempre'; 'no'.
       Solo para GET de datos (listas, Xtream, subtítulos). Los videos y el Buddy Host no pasan por aquí. */
    proxyConfig: function () {
      return { url: String(Azure.Almacen.get('proxy_url', '') || '').trim(), clave: Azure.Almacen.get('proxy_clave', ''), modo: Azure.Almacen.get('proxy_modo', 'auto') };
    },
    proxyActivo: function () { var c = Azure.Red.proxyConfig(); return !!(c.url && c.clave && c.modo !== 'no'); },
    urlProxy: function (url) {
      var c = Azure.Red.proxyConfig();
      return c.url + (c.url.indexOf('?') < 0 ? '?' : '&') + 'k=' + encodeURIComponent(c.clave) + '&u=' + encodeURIComponent(url);
    },

    /**
     * Igual que directo(), con respaldo por proxy cuando corresponde. Devuelve además `viaProxy` (true/false).
     * opts.sinProxy = true para no usarlo nunca (Buddy Host, el propio proxy).
     */
    pedir: function (url, opts) {
      opts = opts || {};
      var metodo = opts.metodo || 'GET';
      var puede = metodo === 'GET' && !opts.sinProxy && /^https?:\/\//i.test(url) && Azure.Red.proxyActivo();
      function porProxy(errOriginal) {
        return Azure.Red.directo(Azure.Red.urlProxy(url), opts).then(function (r) {
          if (/^ERROR_PROXY:/.test(r.texto)) {
            var m = r.texto.replace(/^ERROR_PROXY:\s*/, '').trim();
            Azure.Registro.aviso('Proxy: ' + m);
            throw RedError('proxy', 'El proxy respondió: ' + m, url);
          }
          r.viaProxy = true; r.url = url;
          return r;
        }, function (e2) {
          Azure.Registro.aviso('Proxy no disponible: ' + (e2 && e2.message));
          if (errOriginal) { errOriginal.message += ' (el proxy tampoco respondió)'; throw errOriginal; }
          throw RedError('proxy', 'No se pudo conectar con el proxy. Revisa su dirección en Configuración > Red.', url);
        });
      }
      if (puede && Azure.Red.proxyConfig().modo === 'siempre') return porProxy(null);
      return Azure.Red.directo(url, opts).then(function (r) { r.viaProxy = false; return r; }, function (e) {
        if (puede && e && e.causa === 'red') { Azure.Registro.info('Directo falló; reintento por proxy: ' + url); return porProxy(e); }
        throw e;
      });
    },

    /** Atajo: devuelve el texto o lanza error si el código HTTP no es 2xx/3xx. */
    texto: function (url, opts) {
      return Azure.Red.pedir(url, opts).then(function (r) {
        if (!(r.status >= 200 && r.status < 400)) throw RedError('http', 'El servidor respondió ' + r.status + '.', url);
        return r.texto;
      });
    },

    json: function (url, opts) {
      return Azure.Red.texto(url, opts).then(function (t) {
        try { return JSON.parse(t); } catch (e) { throw RedError('http', 'La respuesta no es JSON válido.', url); }
      });
    },

    /** true si el texto parece el desafío anti-bot de ciertos hostings (cookie __test por JavaScript). */
    esDesafio: function (texto) {
      return /aes\.js|slowAES|document\.cookie\s*=\s*"__test/i.test(texto || '');
    },

    mensaje: function (e) { return (e && e.message) ? e.message : String(e); }
  };
})();
