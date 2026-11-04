/* Datos: exportar/importar el archivo .azure (JSON) y el .txt legible. En la TV no hay carpeta Descargas:
   el texto se muestra para copiarlo o se manda por Buddy Host; se importa pegando el texto o desde una URL.
   Las 3 contraseñas son un requisito (no cifran el archivo), igual que en Android. */
(function () {
  var Azure = window.Azure, A = Azure.Almacen;
  var LIMITE = 20 * 1024 * 1024;

  function hash3(sal, a, b, c) { return Azure.sha256(sal + '\0' + a + '\0' + b + '\0' + c); }
  function videoJson(v) {
    var o = { title: v.title, url: v.url, cover: v.cover || '' };
    if (v.list) o.list = true;
    return o;
  }
  function videoDeJson(j) {
    if (!j || typeof j.url !== 'string' || !j.url.trim()) return null;
    var o = { title: String(j.title || '').trim() || 'Video', url: j.url.trim(), cover: String(j.cover || '').trim() };
    if (j.list === true) o.list = true;
    return o;
  }
  function listaDeVideos(a) { return (Array.isArray(a) ? a : []).map(videoDeJson).filter(Boolean); }

  var Exportar = Azure.Exportar = {
    clavesConfiguradas: function () { return !!A.get('exp_hash', ''); },
    guardarClaves: function (a, b, c) {
      if (!a || !b || !c) return false;
      var sal = Azure.saltAleatoria();
      A.set('exp_sal', sal); A.set('exp_hash', hash3(sal, a, b, c));
      return true;
    },
    verificarClaves: function (a, b, c) {
      var h = A.get('exp_hash', '');
      return !!h && hash3(A.get('exp_sal', ''), a || '', b || '', c || '') === h;
    },

    /** Texto JSON del archivo .azure con todo lo de Preferentes. */
    crearAzure: function () {
      var listas = Azure.Pref.listas().map(function (x) {
        return { title: x.title, cover: x.cover || '', url: x.url, type: x.type, user: x.user || '', pass: x.pass || '' };
      });
      var entradas = Azure.Pref.entradas().map(function (e) {
        return { title: e.title, cover: e.cover || '', videos: e.videos.map(videoJson),
          sublists: e.sublists.map(function (s) { return { title: s.title, cover: s.cover || '', videos: s.videos.map(videoJson) }; }) };
      });
      return JSON.stringify({ azure: 1, listas: listas, entradas: entradas });
    },

    /** Texto legible (solo para leer; no se importa). */
    crearTxt: function () {
      var out = [];
      Azure.Pref.listas().forEach(function (x) {
        out.push('[LISTA] ' + x.title); if (x.cover) out.push('Imagen: ' + x.cover);
        out.push('Link: ' + (x.type === 'xtream' ? x.url + '  (usuario ' + x.user + ')' : x.url)); out.push('');
      });
      function vids(a) {
        a.forEach(function (v) {
          out.push('  - ' + v.title + (v.list ? ' (lista de links)' : ''));
          out.push('    Link: ' + v.url); if (v.cover) out.push('    Imagen: ' + v.cover);
        });
      }
      Azure.Pref.entradas().forEach(function (e) {
        out.push('[ENTRADA] ' + e.title); if (e.cover) out.push('Imagen: ' + e.cover);
        vids(e.videos);
        e.sublists.forEach(function (s) { out.push(' [SUBLISTA] ' + s.title); if (s.cover) out.push(' Imagen: ' + s.cover); vids(s.videos); });
        out.push('');
      });
      return out.join('\n');
    },

    /** Importa un texto .azure. Devuelve {listas, entradas} o lanza Error con el motivo. */
    importar: function (texto) {
      if (!texto || !texto.trim()) throw new Error('No hay texto para importar.');
      if (texto.length > LIMITE) throw new Error('El archivo es demasiado grande (máximo 20 MB).');
      var j;
      try { j = JSON.parse(texto); } catch (e) { throw new Error('El texto no es un archivo .azure válido.'); }
      if (!j || !(Number(j.azure) >= 1)) throw new Error('No parece un archivo .azure (falta la marca "azure").');
      var listas = (Array.isArray(j.listas) ? j.listas : []).map(function (x) {
        var t = String((x && x.title) || '').trim(), u = String((x && x.url) || '').trim();
        if (!t || !u) return null;
        return { title: t, cover: String(x.cover || '').trim(), url: u, type: x.type === 'xtream' ? 'xtream' : 'm3u', user: String(x.user || ''), pass: String(x.pass || '') };
      }).filter(Boolean);
      var entradas = (Array.isArray(j.entradas) ? j.entradas : []).map(function (e) {
        var t = String((e && e.title) || '').trim(); if (!t) return null;
        return { title: t, cover: String(e.cover || '').trim(), videos: listaDeVideos(e.videos),
          sublists: (Array.isArray(e.sublists) ? e.sublists : []).map(function (s) {
            var st = String((s && s.title) || '').trim(); if (!st) return null;
            return { title: st, cover: String(s.cover || '').trim(), videos: listaDeVideos(s.videos) };
          }).filter(Boolean) };
      }).filter(Boolean);
      Azure.Pref.agregarImportado(listas, entradas);
      return { listas: listas.length, entradas: entradas.length };
    }
  };
})();
