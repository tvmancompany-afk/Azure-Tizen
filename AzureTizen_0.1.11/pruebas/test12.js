// 0.1.10: reanudar al recargar y subtítulos incrustados (AVPlay simulado). Requiere servidor.py y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  await p.evaluate(() => {
    const L = window.__log = [], st = { dur: 600000, t: 0, durTarde: false, listener: null };
    window.__st = st;
    window.webapis = { avplay: {
      open: u => L.push('open ' + u), setListener: l => { st.listener = l; }, setStreamingProperty() {},
      prepareAsync: ok => setTimeout(ok, 20), getDuration: () => st.durTarde ? 0 : st.dur, getCurrentTime: () => st.t,
      seekTo: (ms, ok) => { L.push('seek ' + ms); st.t = ms; if (ok) ok(); }, play: () => L.push('play'), pause() {}, stop() {}, close: () => L.push('close'),
      setDisplayRect() {}, setDisplayMethod() {}, getState: () => 'PLAYING', setSpeed() {},
      getTotalTrackInfo: () => [{ type: 'TEXT', index: 0, extra_info: '{"track_lang":"eng"}' }, { type: 'TEXT', index: 1, extra_info: '{"track_lang":"spa"}' }, { type: 'AUDIO', index: 2, extra_info: '{"language":"spa"}' }],
      getCurrentStreamInfo: () => [{ type: 'TEXT', index: 0 }],
      setSilentSubtitle: v => L.push('silent ' + v), setSelectTrack: (t, i) => L.push('sel ' + t + i)
    } };
    Azure.Reproductor.abrir([{ title: 'v', url: 'http://x/v.mp4' }], 0);
  });
  await sleep(600);
  let l = await p.evaluate(() => window.__log.join('|'));
  ok('cada video arranca con los subtítulos nativos de la TV (silent false)', /silent false/.test(l), l);
  // reproducir hasta 125 s y recargar: debe retomar ahí
  await p.evaluate(() => { __st.t = 125000; }); await sleep(600);
  await p.evaluate(() => { __log.length = 0; Azure.Reproductor.recargar(); }); await sleep(600);
  l = await p.evaluate(() => window.__log.join('|'));
  ok('recargar retoma desde donde estaba (125 s)', /seek 125000/.test(l), l);
  // AVPlay informa 0 un instante antes de recargar: se usa la última posición buena
  await p.evaluate(() => { __st.t = 0; Azure.Reproductor.info().pos = 0; __log.length = 0; Azure.Reproductor.recargar(); }); await sleep(600);
  l = await p.evaluate(() => window.__log.join('|'));
  ok('si AVPlay informa 0, retoma la última posición buena', /seek 125000/.test(l), l);
  // duración tardía: salta en cuanto se conoce
  await p.evaluate(() => { __st.durTarde = true; __log.length = 0; Azure.Reproductor.recargar(); }); await sleep(500);
  await p.evaluate(() => { __st.durTarde = false; }); await sleep(900);
  l = await p.evaluate(() => window.__log.join('|'));
  ok('si la duración llega tarde, salta cuando se conoce', /seek 125000/.test(l), l);
  // subtítulos incrustados
  const pt = await p.evaluate(() => Azure.Reproductor.pistasTexto().map(x => x.idioma + ':' + x.actual).join(','));
  ok('pistas de texto: la activa se lee de AVPlay (no "desactivado")', pt === 'eng:true,spa:false', pt);
  await p.evaluate(() => { __log.length = 0; Azure.Reproductor.elegirTexto(1); });
  l = await p.evaluate(() => window.__log.join('|'));
  ok('elegir pista: modo nativo (silent false) y selecciona', /silent false\|sel TEXT1/.test(l), l);
  await p.evaluate(() => { __log.length = 0; Azure.Reproductor.alternarSubNativo(); });
  l = await p.evaluate(() => window.__log.join('|'));
  ok('modo "estilo Azure": silent true', /silent true/.test(l), l);
  await p.evaluate(() => { __log.length = 0; Azure.Reproductor.elegirTexto(-1); });
  l = await p.evaluate(() => window.__log.join('|') + ' off=' + Azure.Reproductor.info().textoOff);
  ok('desactivar oculta (silent true)', /silent true/.test(l) && /off=true/.test(l), l);
  await p.evaluate(() => { Azure.Almacen.set('sub_nativo', true); __log.length = 0; Azure.Reproductor.abrir([{ title: 'w', url: 'http://x/w.mp4' }], 0); }); await sleep(500);
  l = await p.evaluate(() => window.__log.join('|'));
  ok('el siguiente video vuelve a mostrar subtítulos (no queda apagado)', /silent false/.test(l), l);
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join() || 'ninguno'); await b.close();
})();
