const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => { R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x)); };
process.on('unhandledRejection', e => { console.log(R.join('\n')); console.log('CRASH:', String(e.message).split('\n')[0]); process.exit(1); });
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

  // B. pantalla (Preferentes como Android: modo botones, ✕/←, lupa)
  await p.evaluate(() => { Azure.Exportar.guardarClaves('a', 'b', 'c'); Azure.Pantallas.ir('preferentes', {}, true); }); await sleep(300);
  const filaTxt = () => p.evaluate(() => { const l = document.querySelector('.lista'); return l.__api.actual().title; });
  const nFilas = () => p.evaluate(() => document.querySelectorAll('.lista .fila:not([style*="display: none"])').length);
  const tit = () => p.evaluate(() => document.querySelector('.pref-cab h1').textContent);
  ok('Preferentes: no actúa el anillo del cursor', await p.evaluate(() => Azure.Pantallas.actual().sinAnillo === true), '');
  ok('foco inicial en ✕ (arriba a la izquierda)', await p.evaluate(() => document.activeElement.getAttribute('aria-label') === 'Cerrar'), '');
  await press('ArrowDown'); await press('ArrowDown'); await sleep(100);
  ok('baja a la primera fila', /^Lista web$/.test(await act()), await act());
  ok('3 filas visibles', (await nFilas()) === 3, '');
  await press('ArrowDown'); await press('ArrowDown'); await press('Enter'); await sleep(300);
  ok('Enter en entrada: sublista y videos', (await tit()) === 'Mi entrada' && /^📁 Sub 1$/.test(await act()) && (await nFilas()) === 3, await act());
  ok('en una entrada se ve ← y la lupa', await p.evaluate(() => document.querySelector('[aria-label=Volver]').offsetParent !== null && document.querySelector('[aria-label=Buscar]').offsetParent !== null), '');
  await press('Enter'); await sleep(200);
  ok('Enter en sublista: su video', /^S1$/.test(await act()) && (await tit()) === 'Sub 1', await act());
  await press('Escape'); await sleep(200); await press('Escape'); await sleep(200);
  ok('Atrás x2 vuelve a la raíz', (await tit()) === 'Listas preferentes' && (await filaTxt()) === 'Lista web', await tit());
  // se conserva dónde estabas al cerrar y reabrir
  await p.evaluate(() => { const l = document.querySelector('.lista').__api; l.enfocar(2); }); await press('Enter'); await sleep(250);
  await p.evaluate(() => document.querySelector('[aria-label=Cerrar]:not([style*="none"])').click()); await sleep(250);
  await p.evaluate(() => Azure.Pantallas.ir('preferentes', {}, true)); await sleep(300);
  ok('al reabrir sigue en la misma entrada', (await tit()) === 'Mi entrada', await tit());
  await press('Escape'); await sleep(200);

  // C. modo botones
  await p.evaluate(() => Azure.Foco.poner(document.querySelector('.lista .fila')));
  await press('ArrowRight'); await sleep(150);
  const bts = () => p.evaluate(() => [...document.querySelectorAll('.lista .fila .rb')].map(x => x.getAttribute('aria-label')));
  ok('→ entra al modo botones (candado, borrar, subir, bajar, editar)', JSON.stringify(await bts()) === '["Proteger","Borrar","Subir","Bajar","Editar"]', JSON.stringify(await bts()));
  ok('el foco está en el candado', await p.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Proteger', '');
  await press('ArrowLeft'); await sleep(100);
  ok('← sale del modo botones y vuelve a la fila', (await bts()).length === 0 && /^Lista web$/.test(await act()), await act());
  await largo(); ok('mantener OK entra al modo botones', (await bts()).length === 5, '');
  await press('Escape'); await sleep(100);
  ok('Atrás sale del modo botones sin cerrar la pantalla', (await bts()).length === 0 && (await tit()) === 'Listas preferentes', '');
  await press('ArrowRight'); await press('ArrowRight'); await press('ArrowRight'); await press('ArrowRight'); await sleep(100);   // candado, borrar, subir, bajar
  await press('Enter'); await sleep(250);
  ok('BAJAR cambia el orden', (await p.evaluate(() => Azure.Pref.ordenado()[1].title)) === 'Lista web', await p.evaluate(() => Azure.Pref.ordenado().map(x => x.title).join(',')));
  ok('la fila y el botón siguen al elemento movido', await p.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Bajar' && (await filaTxt()) === 'Lista web', await p.evaluate(() => document.activeElement.outerHTML.slice(0, 80)));
  await press('ArrowLeft'); await press('ArrowLeft'); await press('ArrowLeft'); await sleep(100);   // candado
  await press('Enter'); await sleep(200);
  ok('proteger pide confirmación con el texto de Android', /Una vez protegida ya no se podrá editar/.test(await p.evaluate(() => document.querySelector('.dialogo .msg').textContent)) && /¿Desea proteger la lista\?/.test(await p.evaluate(() => document.querySelector('.dialogo h3').textContent)), '');
  await clickBtn('PROTEGER'); await sleep(250);
  ok('con candado se oculta ✎ y queda el candado rojo', JSON.stringify(await bts()) === '["Protegida","Borrar","Subir","Bajar"]' && await p.evaluate(() => !!document.querySelector('.lista .fila .rb.bloq')), JSON.stringify(await bts()));
  await press('ArrowRight'); await sleep(100);
  await press('Enter'); await sleep(200);
  ok('BORRAR pide confirmación', /¿Borrar esta lista\?/.test(await p.evaluate(() => document.querySelector('.dialogo h3').textContent)), '');
  await clickBtn('BORRAR'); await sleep(250);
  ok('confirmar borra', (await p.evaluate(() => Azure.Pref.listas().length)) === 1, '');
  // editar una entrada (✎) y búsqueda
  await p.evaluate(() => document.querySelector('.lista').__api.enfocar(Azure.Pref.ordenado().length - 1)); await press('ArrowRight');
  await p.evaluate(() => [...document.querySelectorAll('.lista .fila .rb')].pop().click()); await sleep(200);
  const inE = p.locator('.dialogo input'); await inE.nth(0).fill('Mi entrada 2'); await clickBtn('GUARDAR'); await sleep(250);
  ok('✎ edita el título de la entrada', (await p.evaluate(() => Azure.Pref.entradas()[0].title)) === 'Mi entrada 2', '');
  await p.evaluate(() => Azure.Foco.poner(document.querySelector('.lista .fila:last-child'))); await press('Escape');
  await p.evaluate(() => Azure.Pantallas.actual().el.querySelectorAll('.lista .fila').forEach(f => { if (f.__idx != null && f.__t.textContent === 'Mi entrada 2') f.click(); })); await sleep(250);
  await p.evaluate(() => document.querySelector('[aria-label=Buscar]').click()); await sleep(150);
  await p.locator('.pref-cab ~ .cuerpo input.campo').first().fill('zzz'); await sleep(200);
  ok('búsqueda sin resultados usa el texto de Android', /Ningún título contiene "zzz"\./.test(await p.evaluate(() => document.querySelector('.lista-vacia').textContent)), '');
  await p.evaluate(() => document.querySelector('[aria-label=Buscar]').click()); await sleep(150);
  await press('Escape'); await sleep(150);

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
  ok('exportar -> importar conserva listas, entradas, sublistas y marca de lista', e.vacio === 0 && e.imp.listas === 1 && e.imp.entradas === 1 && JSON.stringify(e.entrada) === '["Mi entrada 2",2,true,1,1,false]', JSON.stringify(e));
  ok('importar rechaza textos inválidos', e.mal0 === 'ok' && e.mal2 === 'ok' && e.mal7 === 'ok', JSON.stringify(e));
  ok('.txt legible tiene [LISTA], [ENTRADA], [SUBLISTA]', /\[LISTA\].*\[ENTRADA\]/.test(e.txt) && /SUBLISTA/.test(await p.evaluate(() => Azure.Exportar.crearTxt())), e.txt);

  // E. flujo UI exportar con 3 contraseñas
  await p.evaluate(() => { while (Azure.Pantallas.actual().nombre !== 'preferentes' || document.querySelector('[aria-label=Volver]').offsetParent !== null) { if (document.querySelector('[aria-label=Volver]') && document.querySelector('[aria-label=Volver]').offsetParent !== null) document.querySelector('[aria-label=Volver]').click(); else break; } });
  await p.evaluate(() => document.querySelector('.exp-tab').click()); await sleep(150);
  await clickBtn('EXPORTAR'); await sleep(200);
  const camposPw = await p.evaluate(() => [...document.querySelectorAll('.dialogo input[type=password]')].map(i => !!i.closest('.campo-caja').querySelector('.btn')));
  ok('las 3 contraseñas de exportar tienen ojo', camposPw.length === 3 && camposPw.every(Boolean), JSON.stringify(camposPw));
  const inputs = p.locator('.dialogo input'); await inputs.nth(0).fill('a'); await inputs.nth(1).fill('b'); await inputs.nth(2).fill('x');
  await clickBtn('CONTINUAR'); await sleep(200);
  ok('contraseñas distintas: error en el diálogo', /Contraseñas incorrectas\./.test(await p.evaluate(() => document.querySelector('.dialogo .estado').textContent)), '');
  await clickBtn('CANCELAR'); await sleep(100);
  await clickBtn('EXPORTAR'); await sleep(200);
  const in2 = p.locator('.dialogo input'); await in2.nth(0).fill('a'); await in2.nth(1).fill('b'); await in2.nth(2).fill('c');
  await clickBtn('CONTINUAR'); await sleep(250);
  ok('con las 3 correctas muestra el .azure', /^\{"azure":1/.test(await p.evaluate(() => (document.querySelector('.dialogo textarea') || {}).value || '')), '');
  await clickBtn('CERRAR'); await sleep(100);

  // F. A PREFERENTES desde la principal
  await p.evaluate(() => Azure.Pantallas.volver()); await sleep(200);
  await FF('http://127.0.0.1:8765/lista.m3u'); await clickBtn('ABRIR');
  await p.waitForFunction(() => /2501/.test(document.getElementById('info-elementos').textContent), null, { timeout: 8000 });
  await largo();
  const bm = await dialogoBtns(); ok('mantener OK en la lista: ABRIR COMO LISTA / A PREFERENTES', bm.includes('A PREFERENTES'), JSON.stringify(bm));
  await clickBtn('A PREFERENTES'); await sleep(150); await clickBtn('Mi entrada 2'); await sleep(200);
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
