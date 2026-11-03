/* Datos: listas M3U/TXT, índices HTML y clasificación de lo que devuelve una URL.
   Reglas copiadas de Azure Android (parseM3u, parseHtmlLinks, fetchRemote). */
(function () {
  var Azure = window.Azure;
  var MEDIA = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'mp3', 'aac', 'm4a', 'm4v', 'ts', 'm3u8'];

  function ruta(url) { return String(url || '').split('#')[0].split('?')[0].toLowerCase(); }
  function extension(url) { var r = ruta(url), i = r.lastIndexOf('.'); return i >= 0 && i > r.lastIndexOf('/') ? r.slice(i + 1) : ''; }
  function esLista(url) { var e = extension(url); return e === 'm3u' || e === 'txt'; }
  function resolver(u, base) {
    if (/^https?:\/\//i.test(u)) return u;
    if (!base) return u;
    try { return new URL(u, base).href; } catch (e) { return u; }
  }
  function limpiarHtml(s) {
    return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  }

  var M3u = Azure.M3u = {
    extension: extension,
    esLista: esLista,
    esMedia: function (url) { return MEDIA.indexOf(extension(url)) >= 0; },

    /** true si la URL debe tratarse como HLS aunque la extensión no lo diga. */
    esHls: function (url) {
      var r = ruta(url);
      if (/\.m3u8?$/.test(r)) return true;
      return /(^|[\/_.\-])(hls\d*|m3u8|index-v\d+)($|[\/_.\-])/.test(r);
    },
    esDash: function (url) { return /\.mpd$/.test(ruta(url)); },

    /** Texto M3U/TXT → [{title,url,isList,isRemoteCandidate,logo}] */
    parse: function (texto, baseUrl) {
      var out = [], titulo = 'Video', logo = null;
      var lineas = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
      for (var i = 0; i < lineas.length; i++) {
        var l = lineas[i].trim();
        if (!l) continue;
        if (/^#EXTINF/i.test(l)) {
          var c = l.indexOf(',');
          titulo = c >= 0 && l.slice(c + 1).trim() ? l.slice(c + 1).trim() : 'Video';
          var m = /tvg-logo\s*=\s*"([^"]*)"/i.exec(l);
          logo = m && m[1].trim() ? m[1].trim() : null;
          continue;
        }
        if (l.charAt(0) === '#') continue;
        var url = l, tit = titulo;
        var barra = l.lastIndexOf('|');
        if (barra > 0) {
          var despues = l.slice(barra + 1).trim(), antes = l.slice(0, barra).trim();
          if (/^https?:\/\//i.test(despues) && antes) { tit = antes; url = despues; }
        }
        url = resolver(url, baseUrl);
        out.push({ title: tit, url: url, isList: esLista(url), isRemoteCandidate: false, logo: logo });
        titulo = 'Video'; logo = null;
      }
      return out;
    },

    /** HTML con enlaces → entradas. Los .m3u/.txt son listas; el resto, candidatos a revisar al abrirlos. */
    parseHtml: function (html, baseUrl) {
      var out = [], vistos = {}, re = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, m;
      while ((m = re.exec(html || '')) !== null) {
        var href = m[1].trim();
        if (!href || /^(javascript:|mailto:|#)/i.test(href)) continue;
        var url = resolver(href, baseUrl);
        if (vistos[url]) continue;
        vistos[url] = true;
        var tit = limpiarHtml(m[2]);
        if (!tit) { var seg = ruta(url).split('/').filter(Boolean).pop(); tit = seg || url; }
        var lista = esLista(url);
        out.push({ title: tit, url: url, isList: lista, isRemoteCandidate: !lista, logo: null });
      }
      return out;
    },

    /** Qué es lo que devolvió una URL: 'direct' | 'html' | 'playlist' */
    clasificar: function (texto, tipo) {
      var cab = (texto || '').slice(0, 4000);
      if (/#EXT-X-TARGETDURATION|#EXT-X-MEDIA-SEQUENCE|#EXT-X-STREAM-INF/i.test(cab)) return 'direct';
      var tipoMin = (tipo || '').toLowerCase();
      if (tipoMin.indexOf('html') >= 0 || /<html|<!doctype html/i.test(cab) || /<a\s[^>]*href/i.test(cab)) return 'html';
      if (/#EXTM3U|#EXTINF/i.test(cab) || /^\s*https?:\/\//im.test(texto || '')) return 'playlist';
      return 'direct';
    },

    /**
     * Abre una URL: decide qué es y devuelve {tipo, entradas} o {tipo:'direct'}.
     * Lee como máximo 2 MB (si es mayor, la lista queda truncada y se avisa).
     */
    cargarUrl: function (url) {
      if (M3u.esMedia(url) && !/\.m3u8?$/.test(ruta(url))) return Promise.resolve({ tipo: 'direct' });
      if (/\.m3u8$/.test(ruta(url))) return Promise.resolve({ tipo: 'direct' });
      return Azure.Red.pedir(url, { maxBytes: 2 * 1024 * 1024 }).then(function (r) {
        if (!(r.status >= 200 && r.status < 400)) throw new Error('El servidor respondió ' + r.status + '.');
        var base = r.url || url;
        var tipo = M3u.clasificar(r.texto, r.tipo);
        if (tipo === 'html') return { tipo: 'html', entradas: M3u.parseHtml(r.texto, base), truncado: r.truncado };
        if (tipo === 'playlist') return { tipo: 'playlist', entradas: M3u.parse(r.texto, base), truncado: r.truncado };
        return { tipo: 'direct' };
      });
    }
  };
})();
