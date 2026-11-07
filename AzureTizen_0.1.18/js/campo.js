/* Interfaz común: campos de texto. Las contraseñas SIEMPRE llevan ojo (ver/ocultar), como en Azure Android 0.1.14. */
(function () {
  var Azure = window.Azure, el = Azure.el;

  function crear(etiqueta, valor, opts, esClave) {
    opts = opts || {};
    var input = el(opts.multilinea ? 'textarea' : 'input', { cls: 'campo', f: true });
    if (!opts.multilinea) input.type = esClave ? 'password' : (opts.tipo || 'text');
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.multilinea && opts.filas) input.rows = opts.filas;
    input.value = valor || '';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    if (opts.alCambiar) input.addEventListener('input', function () { opts.alCambiar(input.value); });

    var col = el('div', { cls: 'campo-col' });
    if (etiqueta) col.appendChild(el('div', { cls: 'campo-et', text: etiqueta }));
    col.appendChild(input);
    var cont = el('div', { cls: 'campo-caja' }, col);

    if (esClave) {
      var visible = false;
      var ojo = el('div', { cls: 'btn chico', text: 'VER', f: true, attrs: { tabindex: '-1' } });
      ojo.addEventListener('click', function () {
        visible = !visible;
        input.type = visible ? 'text' : 'password';
        ojo.textContent = visible ? 'OCULTAR' : 'VER';
      });
      cont.appendChild(ojo);
    }
    return {
      el: cont, input: input,
      valor: function () { return input.value; },
      poner: function (v) { input.value = v == null ? '' : v; }
    };
  }

  Azure.Campo = {
    texto: function (etiqueta, valor, opts) { return crear(etiqueta, valor, opts, false); },
    clave: function (etiqueta, valor, opts) { return crear(etiqueta, valor, opts, true); }
  };
})();
