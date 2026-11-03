// 0.1.4: texto pegado como Azure Android (límite 20 000, vista previa de solo lectura, recuerdo entre aperturas).
const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const clickBtn = t => p.evaluate(t => { const e = [...document.querySelectorAll('.btn')].find(b => b.textContent === t); if (!e) throw new Error('sin botón ' + t); e.click(); }, t);
  const abrirPegar = () => p.evaluate(() => [...document.querySelectorAll('.plegable .cab')].find(c => /Pegar/.test(c.textContent)).click());
  const caja = () => p.locator('.plegable textarea.campo').first();
  await abrirPegar();
  // texto corto: se muestra, se lee y se recuerda
  const corto = '#EXTM3U\n#EXTINF:-1,uno\nhttp://x.test/1.mp4\n#EXTINF:-1,dos\nhttp://x.test/2.mp4\n';
  await caja().fill(corto); await sleep(600);
  await clickBtn('LEER TEXTO'); await sleep(150);
  ok('LEER TEXTO corto: 2 elementos', await p.evaluate(() => /Lista cargada \(2 elementos\)/.test(document.getElementById('estado-principal').textContent)), await p.evaluate(() => document.getElementById('estado-principal').textContent));
  await p.reload(); await sleep(400); await abrirPegar();
  ok('el texto corto se recuerda al reabrir', (await caja().inputValue()) === corto, '');
  // texto grande: 3000 elementos (> 20 000 caracteres)
  let grande = '#EXTM3U\n'; for (let i = 1; i <= 3000; i++) grande += '#EXTINF:-1,Canal ' + i + '\nhttp://x.test/' + i + '.mp4\n';
  await p.evaluate(g => { const t = document.querySelector('.plegable textarea.campo'); t.value = g; t.dispatchEvent(new Event('input', { bubbles: true })); }, grande);
  await sleep(500);
  ok('texto grande: cuadro de solo lectura con vista previa de 2000 caracteres', await p.evaluate(() => { const t = document.querySelector('.plegable textarea.campo'); return t.readOnly && t.value.length === 2000; }), '');
  ok('aviso de texto largo', await p.evaluate(() => /Texto largo: vista previa/.test(document.querySelector('.plegable').textContent)), '');
  await clickBtn('LEER TEXTO'); await sleep(300);
  ok('LEER TEXTO lee el texto COMPLETO (3000 elementos, no 20 000 caracteres)', await p.evaluate(() => /Lista cargada \(3000 elementos\)/.test(document.getElementById('estado-principal').textContent)), await p.evaluate(() => document.getElementById('estado-principal').textContent));
  await p.reload(); await sleep(400); await abrirPegar();
  ok('el texto grande NO se guarda (queda vacío al reabrir)', (await caja().inputValue()) === '', '');
  await caja().fill(corto); await sleep(500);
  await clickBtn('LIMPIAR TEXTO'); await sleep(150);
  ok('LIMPIAR TEXTO vacía la caja y dice "Texto limpiado."', (await caja().inputValue()) === '' && await p.evaluate(() => /Texto limpiado/.test(document.getElementById('estado-principal').textContent)), '');
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join(' | ') || 'ninguno');
  await b.close();
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
