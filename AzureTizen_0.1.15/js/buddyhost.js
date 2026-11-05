/* Buddy Host: guarda y carga texto en el hosting del usuario (guardar.php / leer.php), igual que Azure Android.
   Desde una web hay dos obstáculos posibles: CORS (el PHP debe enviar Access-Control-Allow-Origin) y el desafío
   anti-bot del hosting (cookie __test), que una web no puede resolver sola. Aquí solo se detectan y se explican. */
(function () {
  var Azure = window.Azure, enc = encodeURIComponent;

  /* Respeta http:// o https:// si el usuario lo escribió; si no escribió ninguno, la base es https:// y
     variantes() agrega http:// como segundo intento (algunos hostings gratuitos fallan con https en el POST). */
  function normalizarHost(h) {
    h = String(h || '').trim();
    if (!h) return '';
    if (!/^https?:\/\//i.test(h)) h = 'https://' + h;
    if (h.charAt(h.length - 1) !== '/') h += '/';
    return h;
  }
  function variantes(h) {
    h = String(h || '').trim();
    if (!h) return [];
    var base = normalizarHost(h);
    if (/^https?:\/\//i.test(h)) return [base];
    return [base, base.replace(/^https:/i, 'http:')];
  }

  function errorDesafio() {
    var e = new Error('El hosting respondió con su verificación anti-bot (cookie __test) en vez de la respuesta del PHP. ' +
      'Una app web no puede resolverla. Hay que desactivarla para guardar.php y leer.php, o usar un hosting sin ella.');
    e.desafio = true;
    return e;
  }

  function archivo(clave, defecto) {
    var v = String(Azure.Almacen.get(clave, defecto) || '').trim().replace(/^\/+/, '');
    return v || defecto;
  }

  /* Prueba cada variante del host en orden; pasa a la siguiente solo si no hubo conexión (causa 'red'). */
  function conVariantes(host, hacer) {
    var bases = variantes(host);
    if (!bases.length) return Promise.reject(new Error('Escribe el host del Buddy Host.'));
    var i = 0;
    function siguiente() {
      return hacer(bases[i]).catch(function (e) {
        if (e && e.causa === 'red' && i < bases.length - 1) { i++; Azure.Registro.info('Buddy Host: reintento con ' + bases[i]); return siguiente(); }
        if (e && e.causa === 'red') e.message += (bases.length > 1 ? ' Probé https y http.' : '') + ' Si el servidor está bien, falta CORS: sube guardarT.php y leerT.php (o revisa los nombres en Configuración > Buddy Host).';
        throw e;
      });
    }
    return siguiente();
  }

  var BuddyHost = Azure.BuddyHost = {
    normalizarHost: normalizarHost,
    variantes: variantes,
    archivoGuardar: function () { return archivo('buddy_guardar', 'guardarT.php'); },
    archivoLeer: function () { return archivo('buddy_leer', 'leerT.php'); },
    hostGuardado: function () { return Azure.Almacen.get('buddy_host_url', ''); },
    guardarHost: function (h) { Azure.Almacen.set('buddy_host_url', String(h || '').trim()); },

    /** POST guardar (titulo, clave, texto). Devuelve true si el servidor contesta OK. */
    guardar: function (host, titulo, clave, texto) {
      if (!String(host || '').trim()) return Promise.reject(new Error('Escribe el host del Buddy Host.'));
      if (!titulo || !clave) return Promise.reject(new Error('Escribe título y clave.'));
      var cuerpo = 'titulo=' + enc(titulo) + '&clave=' + enc(clave) + '&texto=' + enc(texto || '');
      return conVariantes(host, function (base) {
        return Azure.Red.pedir(base + BuddyHost.archivoGuardar(), { metodo: 'POST', cuerpo: cuerpo, timeout: 15000, sinProxy: true }).then(function (r) {
          if (Azure.Red.esDesafio(r.texto)) throw errorDesafio();
          if (!r.ok) throw new Error('El servidor respondió ' + r.status + (r.texto ? ': ' + r.texto.trim().slice(0, 200) : '.'));
          var t = r.texto.trim();
          if (t === 'OK') return true;
          throw new Error(t ? 'El servidor respondió: ' + t.slice(0, 200) : 'Respuesta vacía del servidor.');
        });
      });
    },

    /** GET leer?titulo= → texto guardado. */
    leer: function (host, titulo) {
      if (!String(host || '').trim()) return Promise.reject(new Error('Escribe el host del Buddy Host.'));
      if (!titulo) return Promise.reject(new Error('Escribe el título.'));
      return conVariantes(host, function (base) {
        return Azure.Red.pedir(base + BuddyHost.archivoLeer() + '?titulo=' + enc(titulo), { timeout: 15000, sinProxy: true }).then(function (r) {
          if (Azure.Red.esDesafio(r.texto)) throw errorDesafio();
          if (/^\s*ERROR/i.test(r.texto)) throw new Error(r.texto.trim().slice(0, 200));
          if (!r.ok) throw new Error('El servidor respondió ' + r.status + '.');
          return r.texto;
        });
      });
    }
  };
})();
