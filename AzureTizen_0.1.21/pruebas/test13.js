// 0.1.14: en pantalla completa, ↓ en lo más bajo de los controles los oculta (movimiento por sectores). Requiere servidor.py y v.webm.
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
 await p.evaluate(() => { Azure.Cursor.poner(false); Azure.Pantallas.reproducir([{ title: 'a', url: 'http://127.0.0.1:8765/video.mp4?n=1' }], 0); }); await sleep(900);
 const oculto = () => p.evaluate(() => !!document.querySelector('.rep-ui.oculto'));
 ok('al abrir los controles se ven', !(await oculto()), '');
 // bajar hasta lo más bajo
 for (let i = 0; i < 8; i++) { await p.keyboard.press('ArrowDown'); await sleep(80); if (await oculto()) break; }
 ok('↓ repetido llega a lo más bajo y oculta los controles', await oculto(), await p.evaluate(() => document.activeElement.className));
 await p.keyboard.press('ArrowDown'); await sleep(200);
 ok('con los controles ocultos, una tecla los vuelve a mostrar', !(await oculto()), '');
 console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join() || 'ninguno'); await b.close(); })();
