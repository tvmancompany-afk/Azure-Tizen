// 0.1.4: cursor de TV (anillo) en pantalla principal y reproductor; en ventanas emergentes manda el foco por sectores.
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const abrirPaneles = (p) => p.evaluate(() => document.querySelectorAll('.plegable:not(.abierto) > .cab').forEach(c => c.click()));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const FF = async (v) => { await abrirPaneles(p); await p.locator('input.campo').first().fill(v); };
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const key = async (k, n) => { for (let i = 0; i < (n || 1); i++) await p.keyboard.press(k); await sleep(60); };
  const pos = () => p.evaluate(() => Azure.Cursor.pos());
  const vis = () => p.evaluate(() => getComputedStyle(document.querySelector('.cursor-anillo')).display !== 'none');
  ok('en un navegador de PC el cursor arranca apagado', !(await p.evaluate(() => Azure.Cursor.activo())) && !(await vis()), '');
  await p.evaluate(() => Azure.Cursor.poner(true));
  ok('al activarlo se ve el anillo', await vis(), '');
  const p0 = await pos(); await key('ArrowRight', 3); await key('ArrowDown', 2);
  const p1 = await pos();
  ok('flechas mueven el anillo 28 px por pulsación', p1.x - p0.x === 84 && p1.y - p0.y === 56, JSON.stringify([p0, p1]));
  // cargar lista con un clic del anillo en ABRIR
  await FF('http://127.0.0.1:8765/lista.m3u');
  const centro = sel => p.evaluate(s => { const e = [...document.querySelectorAll('.btn')].find(b => b.textContent === s); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const irA = async (c) => { await p.evaluate(c => { const a = document.querySelector('.cursor-anillo'); }, c); await p.evaluate(c => Azure.Cursor.pos && 0, c); };
  // mover el anillo con flechas hasta el botón ABRIR (acercamiento por pasos)
  const mueveA = async (t) => { for (let i = 0; i < 80; i++) { const c = (await pos()); const dx = t.x - c.x, dy = t.y - c.y; if (Math.abs(dx) < 28 && Math.abs(dy) < 28) break; if (Math.abs(dx) >= 28) await key(dx > 0 ? 'ArrowRight' : 'ArrowLeft'); else await key(dy > 0 ? 'ArrowDown' : 'ArrowUp'); } };
  await mueveA(await centro('ABRIR'));
  await key('Enter'); await sleep(300);
  await p.waitForFunction(() => /2501/.test(document.getElementById('info-elementos').textContent), null, { timeout: 8000 }).catch(() => {});
  ok('OK sobre ABRIR (clic del anillo) carga la lista', await p.evaluate(() => /2501/.test(document.getElementById('info-elementos').textContent)), await p.evaluate(() => document.getElementById('info-elementos').textContent));
  // anillo sobre la primera fila -> OK reproduce en la ventanita
  const fila = await p.evaluate(() => { const r = document.querySelector('.lista .fila').getBoundingClientRect(); return { x: r.left + 300, y: r.top + r.height / 2 }; });
  await mueveA(fila); await key('Enter'); await sleep(900);
  ok('OK del anillo sobre un título lo reproduce en la ventanita', await p.evaluate(() => Azure.Reproductor.estaAbierto() && Azure.Reproductor.info().idx === 0), '');
  // desplazar la lista con el anillo pegado al borde inferior
  const lista = await p.evaluate(() => { const r = document.querySelector('.lista').getBoundingClientRect(); return { b: r.bottom, x: r.left + 300 }; });
  await mueveA({ x: lista.x, y: lista.b - 30 });
  const top0 = await p.evaluate(() => document.querySelector('.lista .fila').__idx);
  await key('ArrowDown', 5); await sleep(150);
  ok('anillo pegado al borde de la lista: abajo la desplaza', (await p.evaluate(() => [...document.querySelectorAll('.lista .fila')].filter(f => f.style.display !== 'none')[0].__idx)) >= top0 + 4, '');
  // mantener OK (amarillo) abre el diálogo y ahí manda el foco por sectores
  await mueveA(await p.evaluate(() => { const f = [...document.querySelectorAll('.lista .fila')].find(f => f.style.display !== 'none'); const r = f.getBoundingClientRect(); return { x: r.left + 300, y: r.top + r.height / 2 }; }));
  await key('F3'); await sleep(300);
  ok('diálogo abierto: el anillo se oculta', await p.evaluate(() => Azure.Dialogo.hayAbierto()) && !(await vis()), '');
  const f0 = await p.evaluate(() => document.activeElement.textContent);
  await key('ArrowRight'); const f1 = await p.evaluate(() => document.activeElement.textContent);
  ok('en el diálogo las flechas mueven el foco por sectores (no el anillo)', f0 !== f1 && /ABRIR COMO LISTA/.test(f1), f0 + ' -> ' + f1);
  await key('Escape'); await sleep(250);
  ok('al cerrar el diálogo vuelve el anillo', await vis(), '');
  // tecla azul alterna
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 406, bubbles: true }))); await sleep(100);
  ok('tecla azul apaga el cursor', !(await p.evaluate(() => Azure.Cursor.activo())) && !(await vis()), '');
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 406, bubbles: true }))); await sleep(100);
  // pantalla completa: clic del anillo en el botón, controles visibles; clic en el video los oculta
  await p.evaluate(() => document.querySelector('.mini-rep [data-ic="pantalla"]').parentNode.click()); await sleep(600);
  ok('pantalla completa con controles: el anillo está visible', await vis(), '');
  await mueveA({ x: 960, y: 300 }); await key('Enter'); await sleep(200);
  ok('clic del anillo sobre el video oculta los controles', await p.evaluate(() => document.querySelector('.rep-ui').classList.contains('oculto')), '');
  ok('con los controles ocultos el anillo se esconde', !(await vis()), '');
  const t0 = await p.evaluate(() => document.getElementById('video').currentTime); await key('ArrowRight'); await sleep(300);
  ok('con controles ocultos, derecha adelanta 10 s', await p.evaluate(t => document.getElementById('video').currentTime > t + 8, t0), '');
  await key('Enter'); await sleep(200);
  ok('OK vuelve a mostrar los controles y el anillo', await p.evaluate(() => !document.querySelector('.rep-ui').classList.contains('oculto')) && await vis(), '');
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join(' | ') || 'ninguno');
  await b.close();
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
