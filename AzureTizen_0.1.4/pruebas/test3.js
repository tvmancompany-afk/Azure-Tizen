const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
process.on('unhandledRejection', e => { console.log(R.join('\n')); console.log('CRASH:', String(e.message).split('\n')[0]); process.exit(1); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const press = k => p.keyboard.press(k);
  const act = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.__t ? a.__t.textContent : a.textContent) : 'ninguno'; });
  const clickBtn = t => p.evaluate(t => { const e = [...document.querySelectorAll('.btn')].filter(b => b.offsetParent !== null).find(b => b.textContent === t); if (!e) return false; e.click(); return true; }, t).then(v => { if (!v) ok('(botón "' + t + '" existe)', false, 'no encontrado'); return v; });
  const largo = async () => { await p.keyboard.down('Enter'); await sleep(900); await p.keyboard.up('Enter'); await sleep(200); };
  const dialogoBtns = () => p.evaluate(() => [...document.querySelectorAll('.dialogo .btn')].map(b => b.textContent));

  // A. datos
  const d = await p.evaluate(() => {
    const P = Azure.Pref, o = {};
    P.agregarLista({ title: 'Lista web', url: 'http://x/l.m3u', type: 'm3u' });
    P.agregarLista({ title: 'Cuenta XT', url: 'http://srv:80', type: 'xtream', user: 'u', pass: 'p' });
    o.sinTitulo = P.agregarLista({ title: '', url: 'http://x' });
    const e = P.crearEntrada('Mi entrada', 'http://c/img.png'); const s = P.agregarSublista(e.id, 'Sub 1', '');
    o.n1 = P.agregarVideos(e.id, null, [{ title: 'V1', url: 'http://a/1.mp4' }, { title: 'V1 dup', url: 'http://a/1.mp4' }, { title: 'malo', url: 'ftp://x' }, { title: 'Carp', url: 'http://a/c.m3u', isList: true }]);
    o.n2 = P.agregarVideos(e.id, s.id, [{ title: 'S1', url: 'http://a/1.mp4' }]);
    o.total = P.ordenado().map(x => x.tipo + ':' + x.title).join(',');
    return o;
  });
  ok('Preferentes: sin título no se crea; duplicados y no-http se rechazan', d.sinTitulo === null && d.n1 === 2 && d.n2 === 1, JSON.stringify(d));
  ok('Preferentes: orden inicial', d.total === 'lista:Lista web,lista:Cuenta XT,entrada:Mi entrada', d.total);

  // B. pantalla
  await p.evaluate(() => Azure.Pantallas.ir('preferentes', {}, true)); await sleep(300);
  ok('foco en la primera fila de Preferentes', /^Lista web$/.test(await act()), await act());
  ok('3 filas visibles', (await p.evaluate(() => document.querySelectorAll('.lista .fila:not([style*="display: none"])').length)) === 3, '');
  await press('ArrowDown'); await press('ArrowDown'); await press('Enter'); await sleep(300);
  ok('Enter en entrada: muestra sublista y videos', /^Sub 1$/.test(await act()) && (await p.evaluate(() => document.querySelectorAll('.lista .fila:not([style*="display: none"])').length)) === 3, await act());
  await press('Enter'); await sleep(200);
  ok('Enter en sublista: muestra su video', /^S1$/.test(await act()), await act());
  await press('Escape'); await sleep(200); await press('Escape'); await sleep(200);
  ok('Atrás x2 vuelve a la raíz', /^Lista web$/.test(await p.evaluate(() => document.querySelector('.lista .fila').__t.textContent)) && (await p.evaluate(() => document.getElementById('pref-titulo').textContent)) === 'Listas preferentes', '');

  // C. mantener OK -> acciones
  await p.evaluate(() => Azure.Foco.poner(document.querySelector('.lista .fila')));
  await largo();
  const bt = await dialogoBtns();
  ok('mantener OK abre acciones (candado, subir, bajar, editar, borrar)', ['PONER CANDADO', 'SUBIR', 'BAJAR', 'EDITAR', 'BORRAR'].every(x => bt.includes(x)), JSON.stringify(bt));
  await clickBtn('BAJAR'); await sleep(200);
  ok('BAJAR cambia el orden', (await p.evaluate(() => Azure.Pref.ordenado()[1].title)) === 'Lista web', await p.evaluate(() => Azure.Pref.ordenado().map(x => x.title).join(',')));
  ok('el foco sigue al elemento movido', /^Lista web$/.test(await act()), await act());
  await largo(); await clickBtn('PONER CANDADO'); await sleep(150);
  await largo(); const bt2 = await dialogoBtns();
  ok('con candado se oculta EDITAR', bt2.includes('QUITAR CANDADO') && !bt2.includes('EDITAR'), JSON.stringify(bt2));
  await press('Escape'); await sleep(150);
  ok('Atrás cierra el diálogo', !(await p.evaluate(() => document.querySelector('.dialogo'))), '');
  await largo(); await clickBtn('BORRAR'); await sleep(150);
  ok('BORRAR pide confirmación', (await dialogoBtns()).includes('CANCELAR'), JSON.stringify(await dialogoBtns()));
  await clickBtn('BORRAR'); await sleep(200);
  ok('confirmar borra', (await p.evaluate(() => Azure.Pref.listas().length)) === 1, '');

  // D. exportar / importar por API
  const e = await p.evaluate(() => {
    const A = Azure; A.Exportar.guardarClaves('a', 'b', 'c');
    const o = { v1: A.Exportar.verificarClaves('a', 'b', 'c'), v2: A.Exportar.verificarClaves('a', 'b', 'x') };
    const txt = A.Exportar.crearAzure(); o.cab = txt.slice(0, 20);
    A.Pref.listas().concat(A.Pref.entradas()); localStorage.removeItem('azure.pref_listas'); localStorage.removeItem('azure.pref_entradas'); localStorage.removeItem('azure.pref_orden');
    o.vacio = A.Pref.ordenado().length;
    o.imp = A.Exportar.importar(txt); const en = A.Pref.entradas()[0];
    o.entrada = [en.title, en.videos.length, en.videos[1] && en.videos[1].list, en.sublists.length, en.sublists[0].videos.length, en.locked];
    o.xt = A.Pref.listas().filter(x => x.type === 'xtream').length;
    for (const mal of ['', '{}', 'no json', JSON.stringify({ azure: 0 })]) { try { A.Exportar.importar(mal); o['mal' + mal.length] = 'no falló'; } catch (er) { o['mal' + mal.length] = 'ok'; } }
    o.txt = A.Exportar.crearTxt().split('\n').filter(l => /^\[/.test(l)).join('|');
    return o;
  });
  ok('contraseñas de exportar: correctas pasan, erróneas no', e.v1 === true && e.v2 === false, JSON.stringify(e));
  ok('exportar -> importar conserva listas, entradas, sublistas y marca de lista', e.vacio === 0 && e.imp.listas === 1 && e.imp.entradas === 1 && JSON.stringify(e.entrada) === '["Mi entrada",2,true,1,1,false]', JSON.stringify(e));
  ok('importar rechaza textos inválidos', e.mal0 === 'ok' && e.mal2 === 'ok' && e.mal7 === 'ok', JSON.stringify(e));
  ok('.txt legible tiene [LISTA], [ENTRADA], [SUBLISTA]', /\[LISTA\].*\[ENTRADA\]/.test(e.txt) && /SUBLISTA/.test(await p.evaluate(() => Azure.Exportar.crearTxt())), e.txt);

  // E. flujo UI exportar con 3 contraseñas
  await clickBtn('EXPORTAR / IMPORTAR'); await sleep(150);
  await clickBtn('EXPORTAR'); await sleep(200);
  const camposPw = await p.evaluate(() => [...document.querySelectorAll('.dialogo input[type=password]')].map(i => !!i.closest('.campo-caja').querySelector('.btn')));
  ok('las 3 contraseñas de exportar tienen ojo', camposPw.length === 3 && camposPw.every(Boolean), JSON.stringify(camposPw));
  const inputs = p.locator('.dialogo input'); await inputs.nth(0).fill('a'); await inputs.nth(1).fill('b'); await inputs.nth(2).fill('x');
  await clickBtn('CONTINUAR'); await sleep(200);
  ok('contraseñas distintas: aviso', /no coinciden/.test(await p.evaluate(() => document.querySelector('.dialogo .msg').textContent)), '');
  await clickBtn('CERRAR'); await sleep(100);
  await clickBtn('EXPORTAR / IMPORTAR'); await clickBtn('EXPORTAR'); await sleep(200);
  const in2 = p.locator('.dialogo input'); await in2.nth(0).fill('a'); await in2.nth(1).fill('b'); await in2.nth(2).fill('c');
  await clickBtn('CONTINUAR'); await sleep(250);
  ok('con las 3 correctas muestra el .azure', /^\{"azure":1/.test(await p.evaluate(() => (document.querySelector('.dialogo textarea') || {}).value || '')), '');
  await clickBtn('CERRAR'); await sleep(100);

  // F. A PREFERENTES desde la principal
  await p.evaluate(() => Azure.Pantallas.volver()); await sleep(200);
  await p.locator('input.campo').first().fill('http://127.0.0.1:8765/lista.m3u'); await clickBtn('ABRIR');
  await p.waitForFunction(() => /2501/.test(document.getElementById('info-elementos').textContent), null, { timeout: 8000 });
  await largo();
  const bm = await dialogoBtns(); ok('mantener OK en la lista: ABRIR COMO LISTA / A PREFERENTES', bm.includes('A PREFERENTES'), JSON.stringify(bm));
  await clickBtn('A PREFERENTES'); await sleep(150); await clickBtn('GUARDAR EN UNA ENTRADA'); await sleep(150); await clickBtn('Mi entrada'); await sleep(150); await clickBtn('VIDEOS SUELTOS DE LA ENTRADA'); await sleep(200);
  ok('guardó el video en la entrada', (await p.evaluate(() => Azure.Pref.entradas()[0].videos.length)) === 3, await p.evaluate(() => Azure.Pref.entradas()[0].videos.length));

  // G. auto-recarga con video roto
  await p.evaluate(() => { Azure.Almacen.set('rep_auto', 1); });
  await p.reload(); await sleep(400);
  const modo1 = await p.evaluate(() => { Azure.Pantallas.reproducir([{ title: 'roto', url: 'http://127.0.0.1:8765/nope.mp4' }], 0); return Azure.Reproductor.info().auto; });
  ok('modo recarga = 1 (mismo video)', modo1 === 1, modo1);
  const fin = await p.waitForFunction(() => Azure.Reproductor.info().estado === 'error', null, { timeout: 20000 }).then(() => p.evaluate(() => Azure.Reproductor.info().intentos), () => 'sin error');
  ok('con video roto reintenta 5 veces y luego muestra el error', fin === 5, fin);
  ok('el error se ve en pantalla y queda en el registro', /Error: /.test(await p.evaluate(() => document.querySelector('.rep-error').textContent)) && /Reproducción:/.test(await p.evaluate(() => Azure.Registro.texto())), '');
  await press('Escape'); await sleep(150); await press('Escape'); await sleep(300);

  // H. bloqueo
  await p.evaluate(() => Azure.Pantallas.ir('config', {}, true)); await sleep(200);
  await p.evaluate(() => document.querySelector('.plegable > .cab').click());
  await clickBtn('ACTIVAR'); await sleep(150);
  const in3 = p.locator('.dialogo input'); await in3.nth(0).fill('abc'); await in3.nth(1).fill('abc'); await clickBtn('GUARDAR'); await sleep(200);
  ok('contraseña de 3 caracteres se rechaza', /al menos 4/.test(await p.evaluate(() => (document.querySelector('.dialogo .msg') || {}).textContent || '')), '');
  await clickBtn('CERRAR'); await sleep(100);
  await clickBtn('ACTIVAR'); await sleep(150);
  const in4 = p.locator('.dialogo input'); await in4.nth(0).fill('abcd'); await in4.nth(1).fill('abcd'); await clickBtn('GUARDAR'); await sleep(200);
  ok('bloqueo activado', await p.evaluate(() => Azure.Seguridad.activa()), '');
  ok('no guarda la contraseña en claro', !(await p.evaluate(() => JSON.stringify(localStorage))).includes('abcd'), '');
  await p.reload(); await sleep(400);
  ok('al reiniciar pide la contraseña', /bloqueado/.test(await p.evaluate(() => document.querySelector('.panel h2').textContent)), '');
  await p.locator('input').first().fill('mala'); await clickBtn('DESBLOQUEAR'); await sleep(100);
  ok('contraseña incorrecta', /incorrecta/.test(await p.evaluate(() => document.querySelector('.estado.error').textContent)), '');
  await p.locator('input').first().fill('abcd'); await clickBtn('DESBLOQUEAR'); await sleep(200);
  ok('contraseña correcta entra', (await p.evaluate(() => document.querySelector('.barra h1').textContent)) === 'Azure', '');

  // I. prueba de red
  await p.evaluate(() => Azure.Pantallas.ir('prueba', {}, true)); await sleep(300);
  ok('Prueba de red muestra el entorno', /AVPlay: no/.test(await p.evaluate(() => document.querySelector('.mono').textContent)), '');

  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.length ? '\n' + errs.join('\n') : 'ninguno');
  await b.close();
})();
