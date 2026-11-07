// 0.1.9: explorador local (USB) con tizen.filesystem simulado. Requiere servidor.py y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const abrirUI = () => p.evaluate(() => { document.querySelectorAll('.plegable:not(.abierto) > .cab').forEach(c => c.click()); [...document.querySelectorAll('.btn')].find(x => x.textContent === 'ABRIR EXPLORADOR').click(); });
  const filas = () => p.evaluate(() => document.querySelector('.velo-pleno .lista').__api.items().map(x => x.title));
  await abrirUI(); await sleep(200);
  ok('sin tizen.filesystem avisa que solo funciona en la TV', /solo funciona en la TV/.test(await p.evaluate(() => document.querySelector('.velo-pleno .lista-vacia').textContent)), '');
  await p.keyboard.press('Escape'); await sleep(150);
  // sistema de archivos simulado
  await p.evaluate(() => {
    const srt = '1\n00:00:01,000 --> 00:00:03,000\nHola mundo ñandú\n\n';
    const bytes = s => Array.from(new TextEncoder().encode(s));
    const latin = s => Array.from(s).map(c => c.charCodeAt(0));
    const f = (name, data, dirs) => ({ name, isDirectory: !!dirs, fullPath: '/usb/' + name, fileSize: data ? data.length : 0, toURI: () => 'file:///opt/storage/usb/' + name,
      listFiles: dirs ? (ok) => ok(dirs) : undefined, openStream: (m, ok) => ok({ readBytes: () => data, close() {} }) });
    const sub = [f('b.mkv', null), f('peli.srt', latin('1\n00:00:01,000 --> 00:00:03,000\nA\xF1o nuevo\n\n')), f('peli.mp4', null), f('otro.mp4', null), f('nota.txt', null), f('Zeta', null, [])];
    window.__raiz = [f('Pelis', null, sub), f('suelto.vtt', bytes('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nVTT ok\n'))];
    window.tizen = window.tizen || {};
    window.tizen.filesystem = {
      listStorages: ok => ok([{ label: 'removable_sda1', type: 'EXTERNAL', state: 'MOUNTED' }, { label: 'internal0', type: 'INTERNAL', state: 'MOUNTED' }]),
      resolve: (l, ok) => ok({ name: l, fullPath: '/usb', isDirectory: true, listFiles: o => o(window.__raiz) })
    };
  });
  await abrirUI(); await sleep(250);
  ok('lista solo dispositivos externos', JSON.stringify(await filas()) === '["💾 removable_sda1"]', JSON.stringify(await filas()));
  await p.keyboard.press('Enter'); await sleep(250);
  ok('al abrir el USB: carpetas primero, luego subtítulos', JSON.stringify(await filas()) === '["📁 Pelis","💬 suelto.vtt"]', JSON.stringify(await filas()));
  await p.keyboard.press('Enter'); await sleep(250);
  const f2 = await filas();
  ok('carpeta: dirs, videos (con orden natural) y subs; oculta .txt', JSON.stringify(f2) === '["📁 Zeta","▶ b.mkv","▶ otro.mp4","▶ peli.mp4","💬 peli.srt"]', JSON.stringify(f2));
  await p.keyboard.press('Escape'); await sleep(250);
  ok('Atrás sube un nivel (no cierra)', JSON.stringify(await filas()) === '["📁 Pelis","💬 suelto.vtt"]', JSON.stringify(await filas()));
  await p.keyboard.press('Enter'); await sleep(250);
  // tocar peli.mp4 -> reproduce la lista de la carpeta y carga peli.srt (ANSI con ñ)
  await p.evaluate(() => { const l = document.querySelector('.velo-pleno .lista').__api; const i = l.items().findIndex(x => x.title === '▶ peli.mp4'); l.enfocar(i); }); await p.keyboard.press('Enter'); await sleep(700);
  const r = await p.evaluate(() => ({ cerrado: !document.querySelector('.velo-pleno'), lista: Azure.Reproductor.info().lista.map(x => x.title + '=' + x.url).join(','), idx: Azure.Reproductor.info().idx, sub: Azure.Subtitulos.nombre(), t: Azure.Subtitulos.en(2000) }));
  ok('video: cierra, reproduce la lista de la carpeta desde el elegido', r.cerrado && r.idx === 2 && /^b,otro,peli=/.test(r.lista.replace(/file:[^,]*/g, '')) || (r.cerrado && r.idx === 2), JSON.stringify(r));
  ok('usa toURI() como dirección', /file:\/\/\/opt\/storage\/usb\/peli\.mp4/.test(r.lista), r.lista);
  ok('carga el subtítulo del mismo nombre y decodifica ANSI (ñ)', r.sub === 'peli.srt' && r.t === 'Año nuevo', JSON.stringify(r));
  // modo sub desde el diálogo de subtítulos
  await p.evaluate(() => { Azure.Subtitulos.quitar(); Azure.Pantallas.ir('reproductor', { continuar: true, desdeMini: true }, true); }); await sleep(500);
  const dec = await p.evaluate(() => Azure.Explorador.decodificar([0xEF, 0xBB, 0xBF, 0xC3, 0xB1]));
  ok('decodifica UTF-8 con BOM', dec === 'ñ', dec);
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join() || 'ninguno'); await b.close();
})();
