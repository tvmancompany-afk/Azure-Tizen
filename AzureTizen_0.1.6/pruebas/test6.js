// 0.1.4: ventanita del reproductor en la pantalla principal. Requiere servidor.py (8765) y v.webm.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const clickBtn = t => p.evaluate(t => { const e = [...document.querySelectorAll('.btn')].find(b => b.textContent === t); if (!e) throw new Error('sin botón ' + t); e.click(); }, t);
  const ic = n => p.evaluate(n => { const i = document.querySelector('.mini-rep [data-ic="' + n + '"]'); if (!i) throw new Error('sin icono ' + n); i.parentNode.click(); }, n);
  await p.locator('input.campo').first().fill('http://127.0.0.1:8765/lista.m3u'); await clickBtn('ABRIR');
  await p.waitForFunction(() => /2501/.test(document.getElementById('info-elementos').textContent), null, { timeout: 8000 });
  ok('sin video la ventanita es negra (no vivo)', await p.evaluate(() => !document.querySelector('.mini-caja').classList.contains('vivo')), '');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => Azure.Reproductor.info().estado === 'reproduciendo', null, { timeout: 10000 });
  ok('Enter reproduce en la ventanita con título "Reproduciendo: Canal 1"', await p.evaluate(() => document.querySelector('.mini-titulo').textContent === 'Reproduciendo: Canal 1'), await p.evaluate(() => document.querySelector('.mini-titulo').textContent));
  ok('estado "Video activado."', await p.evaluate(() => /Video activado/.test(document.getElementById('estado-principal').textContent)), await p.evaluate(() => document.getElementById('estado-principal').textContent));
  ok('la ventanita NO muestra ▸ ni » ni lista ni título superior', await p.evaluate(() => !document.querySelector('.mini-rep .rep-titulo') && ![...document.querySelectorAll('.mini-rep .ib')].some(x => x.textContent === '▸' || x.textContent === '»') && !document.querySelector('.mini-rep [data-ic="lista"]')), '');
  ok('aleatorio/repetir ocultos hasta pulsar ›', await p.evaluate(() => getComputedStyle(document.querySelector('.mini-rep .rep-grupo')).display === 'none'), '');
  await p.evaluate(() => [...document.querySelectorAll('.mini-rep .ib')].find(x => x.textContent === '›').click());
  ok('› muestra aleatorio y repetir', await p.evaluate(() => getComputedStyle(document.querySelector('.mini-rep .rep-grupo')).display !== 'none'), '');
  await ic('siguiente'); await sleep(400);
  ok('siguiente cambia a Canal 2', await p.evaluate(() => Azure.Reproductor.info().idx === 1), '');
  await ic('adelante15'); await sleep(400);
  await ic('ajustes'); await sleep(300);
  ok('engranaje abre Velocidad/Audio', await p.evaluate(() => document.body.textContent.includes('Velocidad')), '');
  await p.keyboard.press('Escape'); await sleep(300);
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 10252, bubbles: true }))); await sleep(300);
  ok('tecla play/pausa pausa la ventanita', await p.evaluate(() => Azure.Reproductor.info().estado === 'pausa'), await p.evaluate(() => Azure.Reproductor.info().estado));
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 10252, bubbles: true }))); await sleep(300);
  // mantener OK
  await p.evaluate(() => document.querySelector('.lista .fila').__largo()); await sleep(200);
  const d = await p.evaluate(() => document.querySelector('.dialogo').textContent);
  ok('diálogo de mantener OK con texto de Android y CANCELAR', /se está tratando como video/.test(d) && /CANCELAR/.test(d) && /A PREFERENTES/.test(d) && /ABRIR COMO LISTA/.test(d), d);
  await clickBtn('CANCELAR'); await sleep(200);
  // Elegir video: abre en el título ACTUAL (no al inicio); derecha -> ✕; izquierda desde ✕ -> vuelve a la fila
  await p.evaluate(() => Azure.Reproductor.ir(59)); await sleep(500);
  await p.evaluate(() => document.querySelector('.mini-rep [data-ic="pantalla"]').parentNode.click()); await sleep(500);
  await p.evaluate(() => document.querySelector('.rep-titulo').click()); await sleep(400);
  const ev = await p.evaluate(() => { const a = document.activeElement; const v = [...document.querySelectorAll('.velo-pleno .lista .fila')].filter(f => f.style.display !== 'none').map(f => f.__idx); return { foco: a.__t ? a.__t.textContent : a.className, primera: v[0], ultima: v[v.length - 1] }; });
  ok('Elegir video abre en el título actual (60) con 3 filas arriba', ev.foco === '60 - Canal 60' && ev.primera === 56, JSON.stringify(ev));
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowRight'); await sleep(100);
  ok('derecha desde un título va a la ✕', await p.evaluate(() => !!document.activeElement.querySelector('[data-ic="cerrar"]')), '');
  await p.keyboard.press('ArrowLeft'); await sleep(100);
  ok('izquierda desde la ✕ vuelve al título donde estabas (62)', await p.evaluate(() => document.activeElement.__t && document.activeElement.__t.textContent === '62 - Canal 62'), await p.evaluate(() => document.activeElement.__t ? document.activeElement.__t.textContent : 'otro'));
  await p.keyboard.press('Escape'); await sleep(300); await p.keyboard.press('Escape'); await sleep(300); await p.keyboard.press('Escape'); await sleep(400);
  // Listas detiene el video
  await clickBtn('LISTAS'); await sleep(300);
  ok('ir a LISTAS detiene el video', await p.evaluate(() => !Azure.Reproductor.estaAbierto()), '');
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join(' | ') || 'ninguno');
  await b.close();
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
