/* Núcleo: utilidades. Estilo conservador (sin ?. ni ??) para que corra también en Tizen 6. */
(function () {
  var Azure = window.Azure = window.Azure || {};
  Azure.VERSION = '0.1.15';
  Azure.BASE_ANDROID = '0.1.15';

  Azure.$ = function (sel, raiz) { return (raiz || document).querySelector(sel); };

  /** Crea un elemento. props: cls, text, html(no usar con datos externos), attrs{}, style{}, on{}, f(true = enfocable con el control). */
  Azure.el = function (tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    if (props.cls) e.className = props.cls;
    if (props.text != null) e.textContent = props.text;
    if (props.attrs) for (var k in props.attrs) e.setAttribute(k, props.attrs[k]);
    if (props.style) for (var s in props.style) e.style[s] = props.style[s];
    if (props.on) for (var ev in props.on) e.addEventListener(ev, props.on[ev]);
    if (props.f) { e.setAttribute('data-f', '1'); }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  };

  Azure.uid = function () {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  };

  var toastTimer = null;
  Azure.toast = function (msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'ver';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, ms || 2600);
  };

  Azure.formatoTiempo = function (ms) {
    if (!(ms > 0)) ms = 0;
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    s = s % 60;
    var dos = function (n) { return (n < 10 ? '0' : '') + n; };
    return (h > 0 ? h + ':' + dos(m) : m) + ':' + dos(s);
  };

  Azure.esLinkHttp = function (u) { return /^https?:\/\//i.test((u || '').trim()); };

  /** Mueve el elemento i de un arreglo delta posiciones; devuelve copia. */
  Azure.mover = function (arr, i, delta) {
    var j = i + delta;
    if (i < 0 || i >= arr.length || j < 0 || j >= arr.length) return arr.slice();
    var c = arr.slice(), x = c[i]; c[i] = c[j]; c[j] = x;
    return c;
  };

  /* ---- SHA-256 en JS puro (respaldo si crypto.subtle no está en file://) ---- */
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];

  function utf8(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
        var d = str.charCodeAt(i + 1);
        if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  Azure.sha256js = function (str) {
    var bytes = utf8(str), l = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor((l * 8) / 4294967296), lo = (l * 8) >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
               (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var w = new Array(64);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var off = 0; off < bytes.length; off += 64) {
      var t;
      for (t = 0; t < 16; t++) w[t] = (bytes[off+t*4] << 24) | (bytes[off+t*4+1] << 16) | (bytes[off+t*4+2] << 8) | bytes[off+t*4+3];
      for (t = 16; t < 64; t++) {
        var s0 = rr(w[t-15],7) ^ rr(w[t-15],18) ^ (w[t-15] >>> 3);
        var s1 = rr(w[t-2],17) ^ rr(w[t-2],19) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
      }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25), ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        var S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22), mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h=g; g=f; f=e; e=(d + t1) | 0; d=c; c=b; b=a; a=(t1 + t2) | 0;
      }
      H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  };

  /** SHA-256 hex. Usa el código propio siempre: es corto y evita depender de crypto.subtle. */
  Azure.sha256 = function (str) { return Azure.sha256js(str); };

  Azure.saltAleatoria = function () {
    var a = new Uint8Array(16), s = '';
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < a.length; j++) s += ('0' + a[j].toString(16)).slice(-2);
    return s;
  };
})();
