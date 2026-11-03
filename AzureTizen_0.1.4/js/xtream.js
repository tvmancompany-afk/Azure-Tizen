/* Datos: Xtream Codes (player_api.php). Navegación con seudo-enlaces internos xtream://acción?h=&u=&p=&a=
   igual que Azure Android. Las consultas pueden fallar por CORS en la TV: ver js/red.js. */
(function () {
  var Azure = window.Azure;
  var enc = encodeURIComponent;

  function normalizarHost(h) {
    h = String(h || '').trim();
    if (!h) return '';
    if (h.indexOf('://') < 0) h = 'http://' + h;
    var i = h.indexOf('/player_api.php'); if (i >= 0) h = h.slice(0, i);
    i = h.indexOf('/get.php'); if (i >= 0) h = h.slice(0, i);
    return h.replace(/\/+$/, '');
  }
  function str(v) { return v == null ? '' : String(v).trim(); }

  function enlace(accion, host, user, pass, extra) {
    return 'xtream://' + accion + '?h=' + enc(host) + '&u=' + enc(user) + '&p=' + enc(pass) + (extra ? '&a=' + enc(extra) : '');
  }
  function parsear(url) {
    var m = /^xtream:\/\/([a-z_]+)\?(.*)$/i.exec(url || '');
    if (!m) return null;
    var o = { accion: m[1], h: '', u: '', p: '', a: '' };
    m[2].split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 0) return;
      var k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (k in o) o[k] = v;
    });
    return o;
  }
  function api(host, user, pass, accion, param) {
    var url = host + '/player_api.php?username=' + enc(user) + '&password=' + enc(pass) +
      (accion ? '&action=' + accion : '') + (param || '');
    return Azure.Red.json(url, { timeout: 40000 });
  }
  function carpeta(titulo, url, logo) { return { title: titulo, url: url, isList: true, isRemoteCandidate: false, logo: logo || null }; }
  function video(titulo, url, logo) { return { title: titulo, url: url, isList: false, isRemoteCandidate: false, logo: logo || null }; }
  function arreglo(x) { return Array.isArray(x) ? x : []; }

  var Xtream = Azure.Xtream = {
    normalizarHost: normalizarHost,
    enlace: enlace,
    esEnlace: function (u) { return /^xtream:\/\//i.test(u || ''); },
    parsear: parsear,

    /** Primer enlace de una cuenta (raíz): sirve para guardar una "lista Xtream" en Preferentes. */
    enlaceRaiz: function (host, user, pass) { return enlace('root', normalizarHost(host), user, pass, ''); },

    /** Abre un enlace xtream:// → Promise<{entradas}> */
    abrir: function (url) {
      var p = parsear(url);
      if (!p) return Promise.reject(new Error('Enlace Xtream no válido.'));
      var h = p.h, u = p.u, c = p.p, a = p.a;
      switch (p.accion) {
        case 'root':
          return api(h, u, c, '', '').then(function (j) {
            var auth = j && j.user_info ? j.user_info.auth : null;
            if (!(auth === 1 || auth === '1' || auth === true)) throw new Error('Usuario o contraseña incorrectos.');
            return { entradas: [
              carpeta('En vivo', enlace('live_cats', h, u, c, '')),
              carpeta('Películas', enlace('vod_cats', h, u, c, '')),
              carpeta('Series', enlace('series_cats', h, u, c, ''))
            ] };
          });
        case 'live_cats': case 'vod_cats': case 'series_cats': {
          var acc = { live_cats: 'get_live_categories', vod_cats: 'get_vod_categories', series_cats: 'get_series_categories' }[p.accion];
          var sig = { live_cats: 'live_streams', vod_cats: 'vod_streams', series_cats: 'series_list' }[p.accion];
          return api(h, u, c, acc, '').then(function (j) {
            return { entradas: arreglo(j).map(function (x) { return carpeta(str(x.category_name) || 'Categoría', enlace(sig, h, u, c, str(x.category_id))); }) };
          });
        }
        case 'live_streams':
          return api(h, u, c, 'get_live_streams', '&category_id=' + enc(a)).then(function (j) {
            return { entradas: arreglo(j).map(function (x) {
              return video(str(x.name) || 'Canal', h + '/live/' + enc(u) + '/' + enc(c) + '/' + str(x.stream_id) + '.m3u8', str(x.stream_icon));
            }) };
          });
        case 'vod_streams':
          return api(h, u, c, 'get_vod_streams', '&category_id=' + enc(a)).then(function (j) {
            return { entradas: arreglo(j).map(function (x) {
              var ext = str(x.container_extension) || 'mp4';
              return video(str(x.name) || 'Película', h + '/movie/' + enc(u) + '/' + enc(c) + '/' + str(x.stream_id) + '.' + ext, str(x.stream_icon));
            }) };
          });
        case 'series_list':
          return api(h, u, c, 'get_series', '&category_id=' + enc(a)).then(function (j) {
            return { entradas: arreglo(j).map(function (x) {
              return carpeta(str(x.name) || 'Serie', enlace('series_info', h, u, c, str(x.series_id)), str(x.cover));
            }) };
          });
        case 'series_info':
          return api(h, u, c, 'get_series_info', '&series_id=' + enc(a)).then(function (j) {
            var eps = [], raw = j && j.episodes, portadaSerie = j && j.info ? str(j.info.cover) : '';
            if (Array.isArray(raw)) eps = raw.reduce(function (acc, x) { return acc.concat(Array.isArray(x) ? x : [x]); }, []);
            else if (raw && typeof raw === 'object') Object.keys(raw).forEach(function (k) { eps = eps.concat(arreglo(raw[k])); });
            eps.sort(function (x, y) { return (Number(x.season) - Number(y.season)) || (Number(x.episode_num) - Number(y.episode_num)); });
            return { entradas: eps.map(function (x) {
              var ext = str(x.container_extension) || 'mp4', tit = str(x.title);
              var nombre = 'T' + str(x.season) + ' · E' + str(x.episode_num) + (tit ? ' - ' + tit : '');
              if (!x.episode_num && !tit) nombre = 'Episodio';
              var img = x.info ? str(x.info.movie_image) : '';
              return video(nombre, h + '/series/' + enc(u) + '/' + enc(c) + '/' + str(x.id) + '.' + ext, img || portadaSerie);
            }) };
          });
        default:
          return Promise.reject(new Error('Acción Xtream desconocida: ' + p.accion));
      }
    }
  };
})();
