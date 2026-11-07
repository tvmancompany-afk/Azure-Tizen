const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file:///home/claude/AzureTizen/index.html');
  await p.waitForTimeout(400);
  ok('arranca y muestra principal', await p.evaluate(() => document.querySelector('.barra h1').textContent) === 'Azure');

  // ---- unidades ----
  const u = await p.evaluate(async () => {
    const A = window.Azure, o = {};
    o.sha = A.sha256('abc');
    o.sha2 = A.sha256('á' + 'x'.repeat(200));
    o.m3u = A.M3u.parse('#EXTM3U\n#EXTINF:-1 tvg-logo="http://a/l.png",Uno, con coma\nhttp://a/1.mp4\nTítulo | http://a/2.m3u\nhttp://a/3.txt\nrel/4.mp4', 'http://base/dir/x.m3u');
    o.html = A.M3u.parseHtml('<a href="a.m3u">Lista A</a><a href="javascript:x">no</a><a href="v.mp4"><b>Vid</b> 1</a><a href="a.m3u">dup</a>', 'http://h/p/');
    o.cls = [A.M3u.clasificar('#EXTM3U\n#EXT-X-TARGETDURATION:5', ''), A.M3u.clasificar('<html></html>', 'text/html'), A.M3u.clasificar('#EXTM3U\n#EXTINF:-1,a\nhttp://x', ''), A.M3u.clasificar('binario', '')];
    o.hls = [A.M3u.esHls('http://a/live/index.m3u8'), A.M3u.esHls('http://a/hls1/x.txt'), A.M3u.esHls('http://a/video.mp4')];
    o.xt = [A.Xtream.normalizarHost('srv:8080/player_api.php?x'), A.Xtream.parsear(A.Xtream.enlace('live_streams', 'http://h', 'u s', 'p&q', '9'))];
    A.Subtitulos.cargar('1\n00:00:01,000 --> 00:00:03,000\nHola <i>mundo</i>\n\n2\n00:00:04,500 --> 00:00:06,000\nDos', 'srt', 'a.srt');
    o.sub = [A.Subtitulos.en(500), A.Subtitulos.en(1500), A.Subtitulos.en(3500), A.Subtitulos.en(5000)];
    A.Subtitulos.ajustar(1000); o.subAj = [A.Subtitulos.en(1500), A.Subtitulos.en(2500)]; A.Subtitulos.ajustar(0);
    A.Subtitulos.cargar('[Script Info]\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,Hola, {\\i1}ass{\\i0}\\Nlinea2', 'ass', 'a.ass');
    o.ass = A.Subtitulos.en(1200);
    A.Subtitulos.cargar('WEBVTT\n\n00:01.000 --> 00:02.000 align:start\nVTT ok', 'vtt', 'a.vtt'); o.vtt = A.Subtitulos.en(1500);
    return o;
  });
  ok('sha256("abc")', u.sha === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', u.sha);
  ok('sha256 largo utf8 (64 hex)', /^[0-9a-f]{64}$/.test(u.sha2), u.sha2);
  ok('m3u: 4 entradas', u.m3u.length === 4, JSON.stringify(u.m3u));
  ok('m3u: título con coma y logo', u.m3u[0].title === 'Uno, con coma' && u.m3u[0].logo === 'http://a/l.png', JSON.stringify(u.m3u[0]));
  ok('m3u: "Título | URL" y lista', u.m3u[1].title === 'Título' && u.m3u[1].isList && u.m3u[2].isList && !u.m3u[0].isList, JSON.stringify(u.m3u));
  ok('m3u: URL relativa resuelta', u.m3u[3].url === 'http://base/dir/rel/4.mp4', u.m3u[3].url);
  ok('html: 2 enlaces, sin duplicado ni javascript', u.html.length === 2 && u.html[0].isList && u.html[1].title === 'Vid 1' && u.html[1].isRemoteCandidate, JSON.stringify(u.html));
  ok('clasificar', JSON.stringify(u.cls) === '["direct","html","playlist","direct"]', JSON.stringify(u.cls));
  ok('esHls', JSON.stringify(u.hls) === '[true,true,false]', JSON.stringify(u.hls));
  ok('xtream host y enlace', u.xt[0] === 'http://srv:8080' && u.xt[1].u === 'u s' && u.xt[1].p === 'p&q' && u.xt[1].a === '9', JSON.stringify(u.xt));
  ok('subtítulos SRT', JSON.stringify(u.sub) === '["","Hola mundo","","Dos"]', JSON.stringify(u.sub));
  ok('subtítulos ajuste +1 s', u.subAj[0] === '' && u.subAj[1] === 'Hola mundo', JSON.stringify(u.subAj));
  ok('subtítulos ASS', u.ass === 'Hola, ass\nlinea2', JSON.stringify(u.ass));
  ok('subtítulos VTT', u.vtt === 'VTT ok', u.vtt);

  // ---- red / CORS / Xtream / Buddy ----
  const r = await p.evaluate(async () => {
    const A = window.Azure, o = {};
    try { await A.Red.pedir('http://127.0.0.1:8765/sin_cors.txt'); o.sinCors = 'no falló'; } catch (e) { o.sinCors = e.causa + ' | ' + e.message; }
    try { await A.Red.pedir('http://127.0.0.1:1/x', { timeout: 3000 }); } catch (e) { o.caido = e.causa; }
    o.conCors = (await A.Red.pedir('http://127.0.0.1:8765/sub.srt')).status;
    try { const x = await A.Xtream.abrir(A.Xtream.enlaceRaiz('127.0.0.1:8765', 'u', 'mal')); o.malClave = 'no falló'; } catch (e) { o.malClave = e.message; }
    const raiz = await A.Xtream.abrir(A.Xtream.enlaceRaiz('127.0.0.1:8765', 'u', 'bien'));
    o.raiz = raiz.entradas.map(x => x.title).join(',');
    const cats = await A.Xtream.abrir(raiz.entradas[0].url); o.cats = cats.entradas.map(x => x.title).join(',');
    const st = await A.Xtream.abrir(cats.entradas[0].url); o.live = st.entradas[0].url;
    const info = await A.Xtream.abrir(A.Xtream.enlace('series_info', 'http://127.0.0.1:8765', 'u', 'bien', '5')); o.eps = info.entradas.map(x => x.title + '|' + x.url.split('/').pop() + '|' + x.logo).join(' ; ');
    o.desafio = A.Red.esDesafio((await A.Red.pedir('http://127.0.0.1:8765/desafio.php')).texto);
    A.Almacen.set('buddy_guardar', 'guardar.php'); A.Almacen.set('buddy_leer', 'leer.php'); // el servidor falso usa los nombres originales
    o.buddyGuardar = await A.BuddyHost.guardar('http://127.0.0.1:8765', 'tit', 'clv', 'texto ñ');
    o.buddyLeer = (await A.BuddyHost.leer('http://127.0.0.1:8765', 'ok')).slice(0, 7);
    try { await A.BuddyHost.leer('http://127.0.0.1:8765', 'no'); o.buddyErr = 'no falló'; } catch (e) { o.buddyErr = e.message; }
    A.Almacen.set('buddy_guardar', 'guardarT.php'); A.Almacen.set('buddy_leer', 'leerT.php');
    const nh = A.BuddyHost.normalizarHost; o.host = [nh('misitio.com'), nh('http://x.com/a'), A.BuddyHost.variantes('misitio.com').join(' '), A.BuddyHost.variantes('http://x.com').join(' ')];
    return o;
  });
  ok('Red: sin CORS falla con causa "red"', /^red \|/.test(r.sinCors), r.sinCors);
  ok('Red: servidor caído', r.caido === 'red', r.caido);
  ok('Red: con CORS ok', r.conCors === 200, r.conCors);
  ok('Xtream: clave mala', r.malClave === 'Usuario o contraseña incorrectos.', r.malClave);
  ok('Xtream: raíz y categorías', r.raiz === 'En vivo,Películas,Series' && r.cats === 'Noticias', r.raiz + ' / ' + r.cats);
  ok('Xtream: URL de canal', r.live === 'http://127.0.0.1:8765/live/u/bien/77.m3u8', r.live);
  ok('Xtream: episodios ordenados', r.eps === 'T1 · E2 - A|11.mp4|c.png ; T2 · E1 - B|21.mkv|c.png', r.eps);
  ok('Detecta desafío anti-bot', r.desafio === true, r.desafio);
  ok('Buddy guardar OK / leer / error', r.buddyGuardar === true && r.buddyLeer === '#EXTM3U' && /ERROR/.test(r.buddyErr), JSON.stringify([r.buddyGuardar, r.buddyLeer, r.buddyErr]));
  ok('Buddy host: respeta http, prueba https y luego http', r.host[0] === 'https://misitio.com/' && r.host[1] === 'http://x.com/a/' && r.host[2] === 'https://misitio.com/ http://misitio.com/' && r.host[3] === 'http://x.com/', JSON.stringify(r.host));

  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.length ? '\n' + errs.join('\n') : 'ninguno');
  await b.close();
})();
