const { chromium } = require('playwright');
const R = []; const ok = (n, c, x) => R.push((c ? 'OK   ' : 'FALLA') + ' ' + n + (c ? '' : '  -> ' + x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/AzureTizen/index.html'); await sleep(400);
  const r = await p.evaluate(async () => {
    const Rn = Azure.Rentry, o = {};
    o.ids = ['https://rentry.co/milista/', 'rentry.org/abc?x=1', 'solo', ' https://rentry.co/a/b '].map(Rn.id).join('|');
    const html = '<html><nav>Menu (Falso|http://no.com)</nav><div id="text"><p>(Peli 1|http://v/1.mp4)</p><p>texto (sin formato) | http://x</p><p>( Peli 2 | https://v/2.m3u8 )</p></div><div class="ajax-x">pie (Pie|http://pie)</div></html>';
    o.cont = Rn.extraerContenido(html);
    o.m3u = Rn.extraerEntradas(o.cont);
    o.vacio = Rn.extraerEntradas('solo texto | http://x.com sin parentesis');
    // lectura: api falla -> página pública
    const orig = Azure.Red.texto; o.urls = [];
    Azure.Red.texto = (u) => { o.urls.push(u); return u.indexOf('/api/raw/') > 0 ? Promise.reject(new Error('CORS')) : Promise.resolve(html); };
    const l = await Rn.leer('rentry.co/milista'); o.leido = l.id + ':' + Rn.extraerEntradas(l.texto).split('\n').length;
    Azure.Red.texto = (u) => Promise.resolve(JSON.stringify({ status: '200', content: '(A|http://a/1)' }));
    o.api = Rn.extraerEntradas((await Rn.leer('x')).texto);
    // panel
    Azure.Red.texto = (u) => Promise.resolve(JSON.stringify({ status: '200', content: '(Uno|http://v/1.mp4)\n(Dos|http://v/2.mp4)' }));
    document.querySelectorAll('.plegable > .cab').forEach(c => { if (/Rentry/.test(c.textContent)) c.click(); });
    const campo = [...document.querySelectorAll('input.campo')].find(i => i.previousSibling && /Rentry/.test(i.previousSibling.textContent || ''));
    campo.value = 'rentry.co/prueba';
    const bt = [...document.querySelectorAll('.plegable.abierto .btn')].find(x => x.textContent === 'CARGAR'); bt.click();
    await new Promise(r => setTimeout(r, 400));
    o.info = document.getElementById('info-elementos').textContent;
    o.filas = Azure.Pantallas.actual().el.querySelector('.lista').__api.items().map(x => x.title).join(',');
    Azure.Red.texto = () => Promise.resolve(JSON.stringify({ status: '200', content: 'nada util' }));
    bt.click(); await new Promise(r => setTimeout(r, 300));
    o.msg = [...document.querySelectorAll('.plegable.abierto .estado')].map(e => e.textContent).join('|');
    return o;
  });
  ok('id de rentry', r.ids === 'milista|abc|solo|b', r.ids);
  ok('solo toma (Título|URL) de la página, ignora menú y pie', r.m3u === '#EXTM3U\n#EXTINF:-1 ,Peli 1\nhttp://v/1.mp4\n#EXTINF:-1 ,Peli 2\nhttps://v/2.m3u8\n', JSON.stringify(r.m3u));
  ok('sin paréntesis no se toma nada', r.vacio === '', r.vacio);
  ok('si falla /api/raw cae a la página pública', r.urls.length === 2 && /api\/raw/.test(r.urls[0]) && r.leido === 'milista:6', JSON.stringify(r));
  ok('lee /api/raw (JSON content)', /Título|\(A|A\nhttp/.test(r.api) || /,A\nhttp:\/\/a\/1/.test(r.api), r.api);
  ok('el panel carga la lista', /Elementos \(2\)/.test(r.info) && r.filas === 'Uno,Dos', r.info + ' ' + r.filas);
  ok('mensaje cuando no hay entradas', /No se encontró ninguna entrada con el formato \(Título\|URL\)/.test(r.msg), r.msg);
  console.log(R.join('\n')); console.log('ERRORES DE PÁGINA:', errs.join() || 'ninguno'); await b.close();
})();
