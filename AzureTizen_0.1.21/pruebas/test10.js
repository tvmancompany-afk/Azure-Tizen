// 0.1.8: Fuente/Buscar plegados, 3.er video de una sublista, Xtream en Preferentes, botón de motor, EN VIVO arriba. Requiere servidor.py y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const cerrados = await p.evaluate(() => [...document.querySelectorAll('.plegable')].map(x => [x.querySelector('.cab').textContent.replace(/[▾▸]/g, ''), x.classList.contains('abierto')]));
  ok('Fuente y Buscar son pestañas cerradas por defecto', cerrados.filter(c => /Fuente|Buscar/.test(c[0])).length === 2 && cerrados.filter(c => /Fuente|Buscar/.test(c[0])).every(c => !c[1]), JSON.stringify(cerrados));
  // Preferentes: sublista con 3 streams, elegir el tercero
  const r = await p.evaluate(() => {
    Azure.Exportar.guardarClaves('a', 'b', 'c');
    const e = Azure.Pref.crearEntrada('E', ''), s = Azure.Pref.agregarSublista(e.id, 'S', '');
    const n = Azure.Pref.agregarVideos(e.id, s.id, [{ title: 'uno', url: 'http://127.0.0.1:8765/video.mp4?n=1' }, { title: 'dos', url: 'http://127.0.0.1:8765/video.mp4?n=2' }, { title: 'tres', url: 'http://127.0.0.1:8765/video.mp4?n=3' }]);
    const x = Azure.Pref.agregarVideos(e.id, null, [{ title: 'Cat', url: 'xtream://live_cats?h=http%3A%2F%2Fa%3A1&u=u&p=p', list: true }, { title: 'mal', url: 'ftp://x' }]);
    return { n: n, x: x, eid: e.id };
  });
  ok('Pref acepta xtream:// como video-lista y rechaza ftp', r.n === 3 && r.x === 1, JSON.stringify(r));
  await p.evaluate(() => Azure.Pantallas.ir('preferentes', {}, true)); await sleep(300);
  const clickBtn = t => p.evaluate(t => { const e = [...document.querySelectorAll('.btn')].filter(b => b.offsetParent !== null).find(b => b.textContent === t); if (e) e.click(); return !!e; }, t);
  await p.evaluate(() => { const l = document.querySelector('.lista').__api; l.enfocar(0); }); await p.keyboard.press('Enter'); await sleep(300);
  await p.evaluate(() => { const l = document.querySelector('.lista').__api; l.enfocar(0); }); await p.keyboard.press('Enter'); await sleep(300);   // 📁 S
  await p.evaluate(() => { const l = document.querySelector('.lista').__api; l.enfocar(2); }); await p.keyboard.press('Enter'); await sleep(900);
  const q = await p.evaluate(() => ({ pant: Azure.Pantallas.actual().nombre, idx: Azure.Reproductor.info().idx, n: Azure.Reproductor.info().lista.length, t: (Azure.Reproductor.info().lista[Azure.Reproductor.info().idx] || {}).title }));
  ok('elegir el 3.er stream carga el 3.º (no el 1.º) y suena en la ventanita principal', q.pant === 'principal' && q.idx === 2 && q.n === 3 && q.t === 'tres', JSON.stringify(q));
  ok('el reproductor tiene el botón de motor (AV/H5) y EN VIVO arriba dentro de los controles', await p.evaluate(() => [...document.querySelectorAll('.mini-rep .ib')].some(x => /^(AV|H5)$/.test(x.textContent)) && !!document.querySelector('.mini-rep .rep-ui .rep-vivo')), '');
  const m = await p.evaluate(() => Azure.Reproductor.cambiarMotor());
  ok('sin AVPlay el botón de motor lo avisa y no rompe', /HTML5/.test(m), m);
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join() || 'ninguno'); await b.close();
})();
