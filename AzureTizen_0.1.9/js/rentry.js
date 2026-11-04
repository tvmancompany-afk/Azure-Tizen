/* Rentry (solo CARGAR, sin guardar), igual que RentrySupport.kt de Azure Android:
   1) intenta /api/raw/<id>; 2) si falla, pide la página pública y saca su texto;
   3) del texto SOLO se toman las entradas con el formato (Título|URL) entre paréntesis (se ignoran menú, avisos, metadatos…).
   Riesgo en la TV: CORS / anti-bot de Rentry. No probado aquí. */
(function () {
  var Azure = window.Azure;

  function id(entrada) {
    var v = (entrada || '').trim();
    if (!v) return v;
    v = v.split('?')[0].split('#')[0].replace(/\/$/, '');
    var m = /rentry\.(co|org)\//i.exec(v);
    if (m) v = v.slice(m.index + m[0].length);
    return v.slice(v.lastIndexOf('/') + 1).trim();
  }

  /** Texto de la página pública de Rentry (best effort, como Android). */
  function extraerContenido(html) {
    var w = html || '';
    var c = /<div[^>]+id=["']text["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]+class=["'][^"']*ajax[^"']*)/i.exec(w) || /<div[^>]+id=["']text["'][^>]*>([\s\S]*)/i.exec(w);
    if (c) w = c[1];
    w = w.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return w.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l; }).join('\n');
  }

  /** Solo (Título|URL). Devuelve un M3U armado, o '' si no hay ninguna. */
  function extraerEntradas(raw) {
    var re = /\(\s*([^|()]+?)\s*\|\s*(https?:\/\/[^()\s]+)\s*\)/g, m, out = '#EXTM3U\n', n = 0;
    while ((m = re.exec(raw || '')) !== null) {
      var t = m[1].trim(), u = m[2].trim();
      if (!t || !u) continue;
      out += '#EXTINF:-1 ,' + t + '\n' + u + '\n'; n++;
    }
    return n ? out : '';
  }

  function dePaginaPublica(i) {
    return Azure.Red.texto('https://rentry.co/' + encodeURIComponent(i), { timeout: 20000 }).then(function (html) {
      var t = extraerContenido(html);
      if (!t) throw new Error('La página existe pero no se pudo leer su contenido (¿cambió el formato de Rentry?).');
      return t;
    });
  }

  /** Devuelve Promise<{texto, id}>; rechaza con Error de mensaje legible. */
  function leer(entrada) {
    var i = id(entrada);
    if (!i) return Promise.reject(new Error('Falta el link o id de la entrada.'));
    return Azure.Red.texto('https://rentry.co/api/raw/' + encodeURIComponent(i), { timeout: 20000 }).then(function (t) {
      var j = JSON.parse(t), c = j && j.content, txt = j && String(j.status) === '200' ? (typeof c === 'string' ? c : (c && c.text) || '') : '';
      if (!txt || !txt.trim()) throw new Error('sin api');
      return { texto: txt, id: i };
    }).catch(function () {
      return dePaginaPublica(i).then(function (t) { return { texto: t, id: i }; });
    });
  }

  Azure.Rentry = { id: id, extraerContenido: extraerContenido, extraerEntradas: extraerEntradas, leer: leer };
})();
