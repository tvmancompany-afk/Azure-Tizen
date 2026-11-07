const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const abrirPaneles = (p) => p.evaluate(() => document.querySelectorAll('.plegable:not(.abierto) > .cab').forEach(c => c.click()));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const FF = async (v) => { await abrirPaneles(p); await p.locator('input.campo').first().fill(v); };
  const BF = async (v) => { await abrirPaneles(p); await p.locator('.col-der input.campo').fill(v); };
  const press = k => p.keyboard.press(k);
  const act = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.__t ? a.__t.textContent : (a.value !== undefined && a.tagName === 'INPUT' ? 'INPUT:' + a.value : a.textContent)) : 'ninguno'; });
  const clickBtn = t => p.evaluate(t => { const e = [...document.querySelectorAll('.btn')].find(b => b.textContent === t); if (!e) throw new Error('sin botón ' + t); e.click(); }, t);

  ok('foco inicial en un elemento enfocable', (await p.evaluate(() => !!document.activeElement && document.activeElement.hasAttribute('data-f'))), await act());

  // lista grande
  await FF('http://127.0.0.1:8765/lista.m3u');
  await clickBtn('ABRIR');
  await p.waitForFunction(() => /2501/.test(document.getElementById('info-elementos').textContent), null, { timeout: 8000 }).catch(() => {});
  const info = await p.evaluate(() => document.getElementById('info-elementos').textContent);
  ok('carga lista de 2501 elementos por red', /2501/.test(info), info);
  const filas = await p.evaluate(() => document.querySelectorAll('.lista .fila').length);
  ok('lista virtual: pocas filas en el DOM (' + filas + ')', filas >= 5 && filas <= 20, filas);
  ok('foco pasó a la lista tras abrir', /^1 - Canal 1$/.test(await act()), await act());
  for (let i = 0; i < 30; i++) await press('ArrowDown');
  ok('30 veces abajo -> fila 31', /^31 - Canal 31$/.test(await act()), await act());
  const antes = await p.evaluate(() => document.activeElement.__idx);
  await press('PageDown');
  const desp = await p.evaluate(() => document.activeElement.__idx);
  ok('PageDown pasa una página', desp > antes + 4, antes + ' -> ' + desp);
  for (let i = 0; i < 80; i++) await press('ArrowUp');
  ok('subir más allá de la fila 1 saca el foco de la lista', !(await p.evaluate(() => document.activeElement.classList.contains('fila'))), await act());
  // buscar
  await BF('canal 25');
  await sleep(100);
  const inf2 = await p.evaluate(() => document.getElementById('info-elementos').textContent);
  ok('búsqueda filtra (12 de 2501)', /\(12 de 2501\)/.test(inf2), inf2);
  await BF(''); await sleep(100);
  ok('limpiar búsqueda restaura', /2501/.test(await p.evaluate(() => document.getElementById('info-elementos').textContent)), '');

  // entrar a carpeta (última) y volver
  await p.evaluate(() => { Azure.Foco.poner(document.querySelector('.lista .fila')); });
  await p.keyboard.press('End').catch(() => {});
  await p.evaluate(() => { const f = document.querySelector('.lista .fila'); f.__nav; });
  // ir al final con el botón FIN
  await clickBtn('FIN'); await sleep(100);
  ok('FIN deja la última fila (carpeta) enfocada', /^2501 - Carpeta$/.test(await act()), await act());
  await press('Enter'); await sleep(600);
  ok('Enter en carpeta la abre (1 elemento)', /\(1\)/.test(await p.evaluate(() => document.getElementById('info-elementos').textContent)), await p.evaluate(() => document.getElementById('info-elementos').textContent));
  await press('Escape'); await sleep(200);
  ok('Atrás vuelve a la lista de 2501', /2501/.test(await p.evaluate(() => document.getElementById('info-elementos').textContent)), '');

  // reproducir
  await p.evaluate(() => { Azure.Foco.poner(document.querySelector('.lista .fila')); });
  await clickBtn('INICIO'); await sleep(100);
  await press('Enter'); await sleep(300);
  ok('Enter en video reproduce en la ventanita de la principal', await p.evaluate(() => !document.body.classList.contains('reproduciendo') && !!document.querySelector('.mini-caja')), '');
  const est = await p.waitForFunction(() => Azure.Reproductor.info().estado === 'reproduciendo' && Azure.Reproductor.info().pos > 800, null, { timeout: 10000 }).then(() => 'reproduciendo', () => p.evaluate(() => JSON.stringify(Azure.Reproductor.info())));
  ok('video HTML5 empieza a reproducir', est === 'reproduciendo', est);
  ok('la ventanita queda transparente (vivo) y el video está dentro de su área', await p.evaluate(() => { const c = document.querySelector('.mini-caja'); const r = c.getBoundingClientRect(), v = document.getElementById('video').getBoundingClientRect(); return c.classList.contains('vivo') && Math.abs(v.left - r.left) < 2 && Math.abs(v.width - r.width) < 2 && Math.abs(v.height - r.height) < 2; }), '');
  await p.screenshot({ path: '/tmp/mini_1.png' });
  const posAntes = await p.evaluate(() => Azure.Reproductor.info().pos);
  await p.evaluate(() => document.querySelector('.mini-rep [data-ic="pantalla"]').parentNode.click()); await sleep(500);
  ok('botón pantalla completa abre el reproductor completo sin reiniciar', await p.evaluate((a) => document.body.classList.contains('reproduciendo') && Azure.Reproductor.info().pos >= a - 300, posAntes), '');
  const motor = await p.evaluate(() => Azure.Reproductor.motor()); ok('motor sin AVPlay = HTML5', /HTML5/.test(motor), motor);
  const prog = await p.evaluate(() => parseFloat(document.querySelector('.rep-prog').style.width) > 0); ok('barra de progreso avanza', prog, '');
  await p.evaluate(() => Azure.Subtitulos.desdeUrl('http://127.0.0.1:8765/sub.srt'));
  const cue = await p.waitForFunction(() => document.querySelector('.sub-cue').textContent === 'Hola mundo', null, { timeout: 8000 }).then(() => 'Hola mundo', () => p.evaluate(() => document.querySelector('.sub-cue').textContent + ' @' + Azure.Reproductor.info().pos));
  ok('subtítulo cargado por link se dibuja', cue === 'Hola mundo', cue);
  ok('foco en barra del reproductor', await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.rep-ui')) || await p.evaluate(() => !!document.querySelector('.rep-ui .foco')), '');
  await press('Enter'); await sleep(400);
  ok('OK sobre PAUSAR pausa', (await p.evaluate(() => Azure.Reproductor.info().estado)) === 'pausa', await p.evaluate(() => Azure.Reproductor.info().estado));
  await press('Enter'); await sleep(400);
  await press('Escape'); await sleep(200);
  ok('Atrás oculta los controles', await p.evaluate(() => document.querySelector('.rep-ui').classList.contains('oculto')), '');
  const p0 = await p.evaluate(() => Azure.Reproductor.info().pos);
  await press('ArrowRight'); await sleep(500);
  const p1 = await p.evaluate(() => document.getElementById('video').currentTime * 1000);
  ok('Flecha derecha salta +10 s', p1 > p0 + 8000, p0 + ' -> ' + p1);
  await press('Escape'); await sleep(400);
  ok('Atrás sale al listado', !(await p.evaluate(() => document.body.classList.contains('reproduciendo'))) && /Elementos/.test(await p.evaluate(() => document.getElementById('info-elementos').textContent)), '');
  ok('al volver de pantalla completa el video sigue en la ventanita', await p.evaluate(() => document.getElementById('video').style.display === 'block' && !!document.getElementById('video').getAttribute('src') && document.querySelector('.mini-caja').classList.contains('vivo')), '');
  await p.screenshot({ path: '/tmp/mini_2.png' });
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 413, bubbles: true }))); await sleep(300);
  ok('STOP detiene el video de la ventanita', await p.evaluate(() => document.getElementById('video').style.display === 'none' && !Azure.Reproductor.estaAbierto()), '');

  // ojo en contraseñas de la pantalla principal
  const ojos = await p.evaluate(() => { document.querySelectorAll('.plegable > .cab').forEach(c => c.click()); const pw = [...document.querySelectorAll('input[type=password]')]; return pw.map(i => { const caja = i.closest('.campo-caja'); return !!caja && [...caja.querySelectorAll('.btn')].some(b => b.textContent === 'VER'); }); });
  ok('todas las contraseñas de la principal tienen ojo (' + ojos.length + ')', ojos.length >= 2 && ojos.every(Boolean), JSON.stringify(ojos));
  const tog = await p.evaluate(() => { const i = document.querySelector('input[type=password]'); const caja = i.closest('.campo-caja'); const v = [...caja.querySelectorAll('.btn')].find(b => b.textContent === 'VER'); v.click(); return i.type; });
  ok('el ojo muestra la contraseña', tog === 'text', tog);

  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.length ? '\n' + errs.join('\n') : 'ninguno');
  await b.close();
})();
