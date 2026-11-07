// 0.1.21: barra de precarga en modo HTML5. Requiere servidor.py y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  await p.evaluate(() => { localStorage.setItem('x', '1'); Azure.Reproductor.abrir([{ title: 'v', url: 'http://127.0.0.1:8765/video.mp4' }], 0); });
  await sleep(2500);
  const r = await p.evaluate(() => ({ bh: Azure.Reproductor.bufferHasta(), w: document.querySelector('.rep-buf') && document.querySelector('.rep-buf').style.width, av: Azure.Reproductor.info().usaAv }));
  ok('HTML5 informa lo descargado', r.bh > 0, JSON.stringify(r));
  ok('la barra de precarga tiene ancho', r.w && parseFloat(r.w) > 0, JSON.stringify(r));
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.length ? errs.join(' ; ') : 'ninguno'); await b.close();
})();
