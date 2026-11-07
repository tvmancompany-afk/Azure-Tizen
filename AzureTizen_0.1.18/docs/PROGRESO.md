# Progreso de Azure Tizen

Fuente de verdad si se pierde el chat. Una entrada por versión. Mapa del porteo y protocolos: `docs/MAPA_PORTEO.md`.












## 0.1.14 — Ocultar controles con ↓ (movimiento por sectores)
- Informe: los subtítulos incrustados ya funcionan (los dibuja la TV; con "Dibuja: AZURE" la TV no entrega el texto). El error de recarga volvió en una versión anterior a la 0.1.13 (fotos y registro pendientes).
- Pantalla completa: con los controles visibles, ↓ estando en lo más bajo (sin nada enfocable debajo) los oculta; con los controles ocultos cualquier tecla los muestra. Nuevo Foco.hayVecino(dir). Prueba: pruebas/test13.js.

## 0.1.13 — Estabilidad de AVPlay (informe: recargar deja el video en 00:00 y no responde; pausa que se reanuda sola y sin audio)
- Causa más probable del cuelgue al recargar (introducida en 0.1.10): al recargar se hacía seekTo(posición) DENTRO de la preparación y el reproductor solo arrancaba cuando el seek avisaba que terminó; si AVPlay no respondía a ese seek (fuentes sin rango, firmware), el video quedaba en 00:00 con la duración puesta, sin "cargando" y sin error. Ahora se reproduce primero y el salto a la posición se hace después desde el temporizador (con callbacks y registro "Reanudando en N s"); si falla, el video igual sigue desde el principio.
- Cada apertura lleva un número (E.gen): las respuestas tardías de una apertura anterior (prepare, errores, buffering, fin) se ignoran, para que una recarga no se mezcle con la sesión vieja.
- Espera de 300 ms entre close() y el nuevo open() de AVPlay.
- Si prepareAsync no responde en 25 s se trata como error (con "recarga automática" reintenta).
- En pausa: si AVPlay se reanuda solo al terminar de cargar, se vuelve a pausar (y se anota en el registro).
- Un video nuevo (no una recarga) vuelve a 1x: algunos firmware silencian el audio con velocidad distinta de 1 (sospecha para "se reproduce solo y sin audio"; sin confirmar).
- Indicador de red: rtt 0 = sin dato (no se muestra "0 ms").
- Pruebas: test12 amplía con AVPlay simulado (preparación sin respuesta, respuestas tardías). No probado en la TV.

## 0.1.12 — Corrección del indicador de red
- navigator.connection.rtt = 0 significa "aún sin medición", no latencia cero: ahora se oculta ("sin dato", arcos tenues) hasta que el navegador de la TV mida; con rtt 0 tampoco se usa la velocidad de bajada (valor por defecto 10 Mb/s).

## 0.1.11 — Indicador de red
- Nuevo js/senal.js: símbolo Wi-Fi arriba a la izquierda del botón C (solo pantalla principal) con tipo de conexión (webapis.network: Wi-Fi / Cable / Sin red), latencia y velocidad estimadas (navigator.connection) y los cortes de video de los últimos 5 min (se pone naranja con 3 o más). Cada corte se anota en el registro con esos datos ("Corte de video #N | red | rtt | bajada").
- Límite: una app web de Tizen no puede leer la intensidad real del Wi-Fi (RSSI); los arcos son una estimación del navegador de la TV con el tráfico reciente.
- Lectura del registro enviado (video JoJo, versión 0.1.9, TV UN75DU8000GXPE, Tizen 8.0 / Chromium 108): AVPlay lista AUDIO#1 Latino, #2 jap, #3 eng, VIDEO#0 640x480 h264 y TEXT#4,#5,#6 (text/plain, track_lang vacío, subtitle_type -1). Los índices de pista son los del campo index (4, 5, 6), que es lo que usa setSelectTrack; los nombres de los subtítulos salen como "Subtítulo 1/2/3" porque no traen idioma.

## 0.1.10 — Reanudar al recargar y subtítulos incrustados (informe de la TV del 2026-11-04)
- Informe: Rentry funciona; subtítulos por link funcionan perfecto; recargar empezaba de 0; con videos con subtítulos incrustados (inglés, español, español España) arrancaban solos, el menú decía "desactivado" y al elegir una pista dejaron de verse y no volvieron en ningún video.
- Reanudar: se guarda la última posición buena (E.ultPos) y se usa al recargar, al reintentar y al cambiar de motor aunque AVPlay informe 0; si la duración llega tarde la posición queda pendiente y se salta en cuanto se conoce. (Un directo sí empieza de cero.)
- Subtítulos incrustados: causa probable = al elegir una pista se llamaba setSilentSubtitle(true) (la TV deja de dibujarlos) y ese estado quedaba para los videos siguientes, y el firmware no entregaba el texto a nuestro dibujo. Ahora cada video arranca con setSilentSubtitle(false) (los dibuja la TV, como cuando arrancaban solos); el menú CC marca la pista activa leída de AVPlay (ya no "desactivado" fijo) y tiene la fila "Dibuja: LA TV / AZURE" para volver al dibujo propio con tu estilo (sub_nativo). Los subtítulos por link siguen dibujándolos Azure.
- No probado en la TV (solo con AVPlay simulado, pruebas/test12.js). Pendiente: fotos del registro ("AVPlay pistas…") y los cortes/recargas frecuentes (¿WiFi, ventanita, Control Samsung?).

## 0.1.9 — Explorador local (USB / disco duro)
- Archivo nuevo js/explorador.js: usa tizen.filesystem (listStorages → solo dispositivos EXTERNAL montados; resolve; listFiles; openStream/readBytes). Permiso nuevo en config.xml: http://tizen.org/privilege/filesystem.read.
- Pantalla principal: panel plegable "Explorador local" → ABRIR EXPLORADOR (ventana a pantalla completa). Carpetas 📁, videos/audios ▶ y subtítulos 💬 (SRT, VTT, ASS, SSA). Tocar un video reproduce la lista de la carpeta desde ese video en la ventanita (pantalla completa con su botón) y carga solo el subtítulo del mismo nombre si existe; tocar un subtítulo lo carga. Atrás sube un nivel; ↻ recarga (por si se conecta el USB después); ← sube.
- Subtítulos+ del reproductor: nuevo botón DESDE USB (solo carpetas y subtítulos).
- Lectura de subtítulos locales: UTF-8 (con o sin BOM), UTF-16 y, si no es UTF-8 válido, Windows-1252 (tildes y ñ de archivos viejos).
- Dirección del video: file.toURI() (si no existe, file://+fullPath).
- NO probado en la TV: nombres reales de los almacenes (removable_sda1…), si AVPlay abre el file:// del USB, permisos y tiempos de lectura. Probado en PC con tizen.filesystem simulado (pruebas/test11.js).
- FTP y recibir cast dentro de la app: inviables (una app web de Tizen no abre servidores ni sockets); la TV puede recibir cast con su propio receptor (Smart View, AirPlay 2, DLNA) sin los botones de Azure.

## 0.1.8 — Incidencias de la prueba en la TV (Incidencias.txt)
- Fuente y Buscar son pestañas desplegables, cerradas por defecto. El mensaje de estado de la fuente queda visible bajo la ventanita.
- Preferentes: elegir el 3.er stream de una sublista cargaba el 1.º (se buscaba el elemento por referencia y se regeneraba en cada lectura). Corregido por posición. Además, como en Android, al elegir un video se cierra Preferentes (conserva dónde estabas) y suena en la ventanita de la pantalla principal; la pantalla completa se pide con su botón (ya no salta sola).
- Preferentes acepta también enlaces `xtream://` (carpetas de una cuenta Xtream) como "video-lista" que se abre como lista, igual que Android (que solo valida http en los formularios manuales). Desde A PREFERENTES se guardan; en los formularios de video también se permite xtream://. Falta que el usuario enseñe un link de ejemplo si hay algún formato más.
- Botón AV/H5 dentro del reproductor (grupo ›/»): cambia entre AVPlay y HTML5 y reanuda el video actual (en directo, desde cero); queda recordado como "motor" para los siguientes videos.
- "EN VIVO" ahora va arriba a la izquierda como insignia dentro de los controles (se desvanece con ellos).
- Formularios: se ocultan las líneas de estado vacías (podía ser el "cuadro inaccesible" de agregar sublista/video; por confirmar).
- Subtítulos nativos (AVPlay): sin cambios de lógica; ahora el registro anota las pistas que ve AVPlay ("AVPlay pistas: …") y el primer subtítulo incrustado recibido, para diagnosticar en la TV.
- Pendiente: AV1 en AVPlay pide recargas (¿mejorable?), subtítulos nativos por diagnosticar, prueba de subtítulos por link (archive.org), Rentry en la TV.

## 0.1.7 — Rentry (solo cargar) y espacio de la pantalla principal
- Panel "Rentry" (después de Xtream): link o id → CARGAR. Lee /api/raw/<id> y, si falla, la página pública; toma SOLO las entradas `(Título|URL)` y las carga como lista. Mensajes de Android ("No se encontró ninguna entrada con el formato (Título|URL) en esa página."). Archivo nuevo js/rentry.js. Sin guardar ni código de edición.
- Columna izquierda de 760 a 640 px (ancho de la ventanita): la lista de la derecha gana 120 px.
- No probado aquí: que Rentry deje leer desde la TV (CORS / anti-bot). Prueba nueva: pruebas/test9.js.
- Pendiente anotado: botón para cambiar de reproductor (AVPlay / HTML5) dentro de una pestaña desplegable del reproductor; correcciones del informe de la prueba en TV.

## Pendiente para la próxima ronda (anotado 2026-11-03)
- Rentry (solo CARGAR, sin guardar ni código de edición), siguiendo RentrySupport.kt de Azure Android: leer /api/raw/<id> y, si falla, la página pública; extraer SOLO las entradas con el formato `(Título|URL)` entre paréntesis (regex `\(\s*([^|()]+?)\s*\|\s*(https?://[^()\s]+)\s*\)`), ignorando menú, avisos y metadatos; armar un M3U con ellas y cargarlo. Si no hay ninguna: "No se encontró ninguna entrada con el formato (Título|URL) en esa página." Riesgo: CORS/anti-bot de Rentry desde la TV (puede necesitar el proxy).
- Búsqueda de subtítulos por título (idea, API tipo OpenSubtitles) y subtítulos/explorador local por USB.
- Usar el espacio libre del lado izquierdo de la pantalla principal tras achicar la ventanita.

## 0.1.6 — Ajustes tras la primera prueba en la TV
- Fondo (fondo_azur.jpg) girado 90° (queda horizontal, se estira menos en 16:9).
- Ventanita de la pantalla principal más pequeña: 640×360 (antes 760×428).
- Cuentas Xtream guardadas (LISTAS): botón 🗑 por cuenta, con confirmación (para quitar duplicadas).
- 4:3: igual que Azure Android (contenedor 4:3 centrado y la imagen lo llena). AVPlay ahora fija primero el modo y luego el rectángulo, y repite a los 250 ms; en HTML5 usa object-fit: fill. Queda anotado en el registro ("Pantalla AVPlay: 4:3 …"). No probado aquí (solo AVPlay real lo confirma).
- Pendiente de observar (informe del usuario): Xtream que pide recarga / se queda en "cargando" con el tiempo (¿WiFi, ventanita, Control Samsung saturando la red?); Buddy Host bloqueado por el desafío anti-bot (Tizen no tiene WebView oculto: ver nota); subtítulos nativos del video sin efecto (probar con otro video con subs); subtítulos locales por USB y explorador local (idea, después).

## 0.1.5 — Listas preferentes (comparación con Android)
- Filas en "modo botones" (→ u OK mantenido entra; ← o Atrás sale; ↑/↓ cambian de fila): candado (confirmación "¿Desea proteger…?"), borrar (confirmaciones de Android), subir, bajar y ✎ editar (solo Tizen: no hay teléfono; oculto si está protegida). El foco sigue al elemento movido.
- Cabecera: ✕ en el nivel de arriba; ← título 🔍 ✕ dentro de entradas/sublistas. ← en una fila va al botón de arriba; ← en la lupa vuelve a la fila. Posición (entrada/sublista/fila) se conserva al cerrar y reabrir o al volver de reproducir.
- Prefijos 📁 (sublista) y 🔗 (link que abre otra lista); búsqueda sin acentos; mensajes vacíos y "Ningún título contiene…".
- Formularios con textos de Android, validación http(s) ("Debe empezar con http:// o https://"), casilla "Este link abre otra lista de links (no se reproduce)"; nuevo editar sublista y editar video.
- A PREFERENTES: selector de entrada (tocar = entrada; OK mantenido = sublistas, "(la entrada)", ATRÁS) con mensajes "Agregado a…" / "Ese link ya estaba en esa entrada.".
- Exportar: pestaña inferior plegable (EXPORTAR / IMPORTAR / CAMBIAR CONTRASEÑAS); al abrir Preferentes por primera vez se piden las 3 contraseñas (cancelar = salir); cada acción vuelve a pedirlas.
- Quitado: RECIBIR LISTA/SUBTÍTULO y ENVIAR A TV (sin Buddy WiFi). El anillo del cursor no actúa en Preferentes (solo sectores).
- No probado aquí: en la TV real (teclas, foco, tamaño de filas con 5 botones).

## 0.1.4 — Pantalla principal comparada con Azure Android (2026-11-03)
Comparada con capturas del usuario y MainActivity.kt de Android 0.1.14.

**Hecho**
- Reproductor integrado en la pantalla principal (columna izquierda, fijo, 760x428 = 16:9, como `aspectRatio(16f/9f)` de Android). Barra básica de Media3: anterior, -5 s, play, +15 s, siguiente, barra, tiempos, CC, ajustes (Velocidad/Audio), pantalla completa y › (muestra aleatorio y repetir). Línea "Reproduciendo: título" encima.
- Elegir un video o abrir un link directo reproduce ahí; el botón de pantalla completa abre el modo completo (▸, », subtítulos+, recarga automática+, Elegir video) SIN reiniciar el video. Atrás en pantalla completa vuelve a la ventanita con el video sonando; STOP lo detiene. Ir a LISTAS o CONFIGURACIÓN detiene el video. Desde Preferentes sigue abriendo a pantalla completa.
- Técnica: la capa de video va detrás de la página; el fondo de la principal tiene un agujero (clip-path) donde está la ventanita y AVPlay/<video> se ubican con `Reproductor.ponerRect`.
- Textos igualados a Android: "URL directa o lista M3U/TXT", "URL del host", "Contraseña", "Link del host (ej. http://host:puerto)", orden Xtream CONECTAR/LISTAS/GUARDAR, "Buscar título en la lista cargada", botón superior LISTAS, estados "Video activado.", "Lista cargada (N elementos).", "Texto limpiado.", diálogo de mantener OK con el texto de Android y botones A PREFERENTES / ABRIR COMO LISTA / CANCELAR.
- Revisión de código contra la restricción anti-crasheo de Azure Android (TEXTO_PEGADO_LIMITE): el cuadro "Pegar M3U/TXT" ahora funciona igual. Hasta 20 000 caracteres: completo, editable y se recuerda entre aperturas. Más grande: vista previa de solo lectura (2000 caracteres) con aviso, NO se guarda, y el texto completo se usa en LEER TEXTO y en GUARDAR del Buddy Host. Antes LEER TEXTO recortaba a 20 000 y el cuadro tenía maxLength (error de porteo: una lista grande se leía incompleta y GUARDAR subía el texto recortado).
- Decisión: el anillo queda SEPARADO del puntero nativo de Samsung (su TV sí trae puntero; en Control Samsung el pad lo activa). No se mezclan funciones. config.xml ahora pide `pointing-device-support="enable"` (en TVs de 2021+ viene desactivado). NO probado: si con eso el puntero del cuadro táctil de Control Samsung actúa dentro de Azure; si da problemas, poner "disable" o quitar la línea.
- Cursor de TV (js/cursor.js), lógica de movimiento de Azure Android (botón "C" y TvCursor.kt): anillo libre que se mueve 28 px por flecha y "clickea" con OK; mantener OK (o amarillo) = pulsación larga del elemento bajo el anillo; pegado al borde de una lista o del panel izquierdo, arriba/abajo desplaza; CH+/CH- pagina la lista. En diálogos y ventanas emergentes (mantener OK en un título, Ajustes, Velocidad, Audio, Subtítulos, Elegir video, menús) el cursor NO actúa y manda el movimiento por sectores (foco), como en Android donde esas ventanas son aparte. En pantalla completa con controles visibles manda el anillo (clic sobre el video oculta/muestra controles; clic en la barra de tiempo salta a ese punto); con controles ocultos las flechas siguen adelantando/atrasando 10 s. Se alterna con el botón "C" de la pantalla principal o la tecla AZUL; por defecto activo en la TV y apagado en un navegador de PC.
- Elegir video como Android: abre en el título actual (con 3 filas arriba, no al inicio de la lista); derecha desde cualquier título va a la ✕; izquierda desde la ✕ vuelve al título donde estabas.
- Elegir video: al volver de la ✕ con izquierda/abajo el foco regresa a la fila donde estabas.
- Elegir video sin portadas (RAM).
- Descartado por decisión: ARCHIVO, CARPETA LISTAS, MIS LISTAS, GUARDAR TXT (habrá un guardado propio en Listas preferentes más adelante), FTP, Explorador local, Buddy WiFi, Rentry.

**NO probado (necesita la TV)**: velocidad y fluidez del anillo con el control real (paso de 28 px, repetición de teclas), si la TV entrega las flechas repetidas con OK mantenido, la tecla azul; que AVPlay respete setDisplayRect en la ventanita y el agujero del fondo muestre el video; tamaño de la ventanita en 75"; teclas del control sobre la ventanita.

## 0.1.3 — Reproductor clonado de Azure Android (2026-11-02)
Basado en las 6 capturas del usuario (barra Media3, grupos ▸ y », engranaje con Velocidad/Audio, lista de velocidades, Elegir video).

**Hecho**
- Iconos SVG propios (js/iconos.js) imitando los de Android; barra de progreso, anterior/−5 s/pausa/+15 s/siguiente, aleatorio, repetir (UNO|TODOS), CC, engranaje, pantalla completa.
- Grupo ▸: redimensionar (Ajustar→Estirar→Recortar, Recortar apaga 4:3), 4:3, recargar. Grupo »: subtítulos+ y recarga automática+ (blanco / rojo modo 1 / celeste modo 2), con carteles como en Android.
- Título arriba clicable y botón lista: Elegir video a pantalla completa.
- Subtítulos+: link, texto pegado, Buddy Host y almacenados (guardar/cargar/borrar), más ESTILO.
- Elegir video SIN portadas (decisión del usuario, para cuidar la RAM): solo número y título; las portadas quedan para la pantalla principal.
- Descartados por decisión: candado, PiP, gestos, volumen, brillo, solo audio.

**NO probado (necesita la TV)**: AVPlay setSpeed con velocidades fraccionarias, pistas TEXT incrustadas, lista de audio, D-pad real sobre la barra de progreso.

## 0.1.2 — Configuración revisada contra Azure Android (2026-11-02)
Primera sección comparada parte por parte con Azure Android 0.1.14 (ConfigSupport.kt, SeguridadSupport.kt, DiagnosticoSupport.kt, ventana en MainActivity.kt).

**Hecho**
- Reloj en Configuración (hora del equipo, solo horas y minutos, se actualiza justo al cambiar el minuto; el formato 12/24 h sale de la configuración regional del navegador, no del ajuste de la TV).
- Bloqueo con contraseña: se pide SOLO al abrir la app (p. ej. tras apagar la TV), ya no tras 1 minuto en segundo plano (decisión del usuario; Android sí lo repite tras 1 minuto). `seguridad.js` sin `visibilitychange`; texto de Configuración actualizado.
- Estilo de subtítulos totalmente configurable (en la TV no se pueden usar los de Samsung, el subtítulo lo dibuja la app): tamaño 24-96 (paso 4), color (9 colores), grosor (normal/seminegrita/negrita), color y ancho del contorno (0-8 px, anillos de text-shadow, funciona en motores web antiguos), fondo (ninguno/translúcido/negro), posición (preajustes de Android: abajo, arriba, pegado abajo, pegado arriba) + ajuste fino en px (SUBIR/BAJAR de 10 en 10), RESTABLECER. Por defecto es el estilo anterior. Se guarda en `sub_estilo` (+ `sub_posicion`).
- Panel con vista previa sobre franjas blanca/gris/azul/negra, en Configuración (pestaña "Subtítulos (estilo y posición)") y en el reproductor (SUBTÍTULOS > ESTILO, cambia el subtítulo del video en vivo). Código: `js/pantallas_sub.js`, `js/subtitulos.js`.
- El subtítulo ya no ocupa todo el ancho: la caja (si hay fondo) mide lo que el texto; sin texto no se dibuja nada.

**Comparación de Configuración (Android vs Tizen)**
- Igual: pestañas cerradas al abrir, mínimo 4 caracteres y repetir contraseña, pantalla de bloqueo sin salida con Atrás.
- No aplica: Nombre de usuario (Buddy WiFi descartado), Malaquita (ventana flotante y portapapeles de Android; el texto llega por la app Control).
- Tizen tiene de más: motor del reproductor, User-Agent, Red (proxy), nombres de archivo del Buddy Host, Diagnóstico con registro y prueba de red.
- Falta a propósito: "copiar" el último error (la TV no tiene portapapeles); se puede enviar el registro por Buddy Host.
- Diferencia mantenida: CAMBIAR y QUITAR piden la contraseña actual (Android no la pide). Confirmado por el usuario que se deja como está en Tizen.
- Diferencia pendiente: al desbloquear (solo ocurre al abrir la app) siempre se entra a la principal; ya no hay caso de "volver donde estaba" porque el bloqueo no salta con la app abierta.

**Probado aquí**: Chromium de PC (`pruebas/test5.js`, 21 comprobaciones: modelo de estilo y límites, persistencia, panel y botones, subtítulo en el reproductor y cambio en vivo, bloqueo tras 5 minutos fuera = no, arranque nuevo = sí). test1 25, test2 25, test3 33, test4 21 sin regresiones.
**NO probado (requiere la TV)**: cómo se ve el tamaño real en una pantalla de 75", que la TV cierre la app al apagarse (para que el bloqueo se pida de nuevo), el formato de hora en la TV, y D-pad sobre los controles de la cuadrícula del panel de estilo.

## 0.1.1 — Archivos de servidor "T" y proxy de respaldo (2026-11-02)
Para sortear CORS sin tocar Azure Android ni la web actual del usuario (aprobado por él: copias con "T" al final).

**Hecho**
- `servidor/guardarT.php` y `servidor/leerT.php`: añaden CORS (y responden OPTIONS) y ejecutan `guardar.php`/`leer.php` originales sin modificarlos; misma `config.php`, misma carpeta `listas/` y mismas contraseñas.
- `servidor/proxyT.php`: proxy de respaldo con clave obligatoria (`CLAVE_PROXY`, se niega a funcionar con el valor de ejemplo), solo http/https, bloqueo de IP privadas/internas (con la IP ya validada fijada en curl), cada redirección revalidada (máx. 5), tope 5 MB, CORS. No verifica el SSL del destino (`VERIFICAR_SSL`).
- `js/red.js`: `Red.pedir` usa el proxy de respaldo solo para GET de datos y solo si la conexión directa falla por red/CORS (modos: SOLO SI FALLA / SIEMPRE / NO USAR). `Red.directo` nunca usa el proxy. La clave del proxy no se escribe en el registro. Errores del proxy se distinguen (`causa 'proxy'`).
- `js/buddyhost.js`: nombres de archivo editables (por defecto `guardarT.php` / `leerT.php`); si el host se escribe sin `http://`/`https://` prueba https y, si no conecta, http; respeta el esquema si se escribe. Muestra el mensaje del servidor en errores (ej. 403 contraseña incorrecta). El Buddy Host nunca pasa por el proxy.
- Configuración: panel "Red (proxy de respaldo)" y campos de archivo en "Buddy Host". Prueba de red: "PROBAR ESE LINK POR EL PROXY" y la prueba de M3U indica si llegó directo o por proxy.

**Probado aquí**: PHP 8 local (CORS, OPTIONS, clave mala, bloqueo 127.x/10.x/192.168.x/169.254.x/localhost/file/ftp, redirección, 404 conservado, corte a 5 MB) y la app en Chromium contra ese PHP (`pruebas/test4.js`, 21 comprobaciones; test1 25, test2 25, test3 33 sin regresiones).

**NO probado (requiere hosting y TV)**
- Los PHP en el hosting gratuito real (cURL activo, `gethostbynamel`, límites de tiempo/salida).
- Que el desafío anti-bot (cookie `__test`) no bloquee `leerT.php`/`guardarT.php`/`proxyT.php` desde la TV. Plan B por iframe/cookie NO se implementó: la cookie del desafío no lleva `SameSite=None`, así que un motor Chromium reciente no la enviaría en una petición entre sitios. Si pasa, la salida es otro hosting o una regla en el hosting.
- Si http en claro desde la app empaquetada y `<access origin="*">` bastan para los datos sin proxy.

**Decisiones**
- Que `listas/*.clave` sea visible por URL (no hay `.htaccess`) lo acepta el usuario: Buddy se hizo para que cada quien monte su servidor. Queda anotado, no se arregla.
- El título del Buddy Host sigue sin cifrado en cliente (igual que Android).

## 0.1.0 — Base del proyecto (2026-11-01)
Primera base de Azure para Samsung Tizen TV (app web empaquetada .wgt), portada desde Azure Android 0.1.14. Pensada para juntar
actualizaciones sin probar en la TV, instalar al final y recopilar errores.

**Hecho**
- Núcleo: utilidades y SHA-256 propio (`util.js`), registro de errores con pantalla de diagnóstico (`registro.js`), almacén (`almacen.js`) y capa de red única (`red.js`: todo CORS/HTTP se corrige ahí).
- Control remoto: teclas de Tizen (flechas, OK, Atrás 10009, reproducción, colores, canal) y OK mantenido (`teclas.js`); navegación espacial con foco (`foco.js`).
- Interfaz común: diálogos apilados, campos de texto con ojo en TODAS las contraseñas (también bloqueo y exportar), lista virtual (solo ~8 filas en pantalla; probada con 2501 elementos).
- Datos: M3U/TXT, índice HTML y clasificación remota (`m3u.js`), Xtream completo (`xtream.js`), Listas preferentes con listas, Xtream, entradas, sublistas, candado, orden unificado (`preferentes.js`), exportar/importar `.azure` y `.txt` (`exportar.js`), Buddy Host guardar/leer (`buddyhost.js`), bloqueo con contraseña (`seguridad.js`).
- Reproductor: AVPlay con respaldo de `<video>` HTML5, lista, repetir (NO/UNO/CONTINUO), aleatorio, imagen (Ajustar/Estirar/Recortar), 4:3, recarga automática (NO/MISMO VIDEO/SIGUIENTE), pistas de audio, subtítulos SRT/VTT/ASS con ajuste de tiempo y posición (`reproductor.js`, `subtitulos.js`).
- Pantallas: principal (Fuente, Pegar M3U/TXT, Buddy Host, Xtream con cuentas guardadas, Buscar, Elementos), Preferentes, reproductor, Configuración (Seguridad, subtítulos, motor, Buddy Host, Diagnóstico), bloqueo y Prueba de red y reproducción.
- `config.xml` con permisos de internet, teclas, AVPlay y `<access origin="*">`.

**Probado aquí (Chromium de PC, simulando teclas del control)**: lógica de M3U, HTML, Xtream, subtítulos, red/CORS y Buddy Host contra un servidor falso;
navegación con flechas, lista de 2501 elementos, búsqueda, reproducción de un video, pausa, salto de 10 s, subtítulo por link, Preferentes completas
(crear, mover, candado, borrar, exportar con 3 contraseñas, importar), bloqueo con contraseña, recarga automática con video roto. Ver `pruebas/`.
Se corrigieron dos fallos que salieron: el foco no seguía al cambiar de nivel en una lista y los diálogos devolvían vacío lo escrito.

**NO probado (requiere la TV)**
- Instalación del .wgt y la validez de `config.xml` (si Tizen Studio protesta, crear un proyecto TV "Basic" y comparar).
- AVPlay: los nombres de las funciones salen de la documentación de Samsung; el video se dibuja en una capa nativa detrás de la página.
- Teclas reales del control, foco con el mando, tamaño de letra en la TV.
- CORS y HTTP en claro desde la app empaquetada (`<access origin="*">` debería permitirlo; sin confirmar). Todo pasa por `js/red.js`.
- Buddy Host real: si el hosting responde su verificación anti-bot (cookie `__test`), la app lo detecta y lo explica, pero no puede resolverla. Hay que desactivarla para `guardar.php` y `leer.php` y enviar CORS.
- Referer y cookies al reproducir: Android los inyecta; en Tizen solo está la opción de User-Agent de AVPlay (Configuración > Reproductor).

**Decisiones y supuestos de esta base**
- Buddy WiFi, FTP, explorador local, PiP, widget, Malaquita, `azure://abrir`, cursor libre y patrón de móvil NO se portan. Rentry queda DESCARTADO (decisión del usuario, 2026-11-01): el envío de textos lo hace la app Control y está Buddy Host.
- Repetir NO = sigue con el siguiente hasta el final de la lista y se detiene (con aleatorio activo se comporta como continuo). Es un supuesto mío; en Android no pude confirmarlo.
- Recarga automática MISMO VIDEO reintenta hasta 5 veces (con 1,5 s entre intentos) y retoma la posición si no es en vivo; SIGUIENTE solo en continuo/aleatorio, con tope igual al largo de la lista.
- Atrás en la pantalla principal pregunta si salir. Con los controles del reproductor ocultos, izquierda/derecha saltan 10 s; ←→ con ff/rw saltan 30 s.
- Subtítulos: por link o pegando el texto (no hay selector de archivos en la TV). Preferentes se exportan e importan como texto (pegar, link o Buddy Host).
- Texto pegado: máximo 20 000 caracteres en el cuadro; una lista cargada por Buddy Host se lee completa en memoria.
- Los datos se guardan en localStorage (límite pequeño). Pendiente pasar a IndexedDB si las listas grandes lo requieren.
- El Buddy Host no cifra la clave (igual que Android).

**Pendiente**
- Instalar en la TV y recopilar errores (ver `docs/INSTALAR_EN_TIZEN.md`).
- (Subtítulos: decidido que se cargan por link o pegando texto; el estilo ya es configurable.)
- Seguir comparando Azure Tizen con Azure Android parte por parte (hecho: Configuración). Decidir si la contraseña de Preferentes lleva ojo (Android 0.1.15 no; Tizen sí, alcanzable con el D-pad).
- Porte a webOS (LG) después de Tizen.

## 0.1.15
- Reproductor: si AVPlay avisaba "cargando" y nunca avisaba el fin (el video seguía corriendo sin audio y la pantalla quedaba en "Cargando…", sin responder a play/pausa), ahora se detecta que el tiempo avanza y se quita el "Cargando…". Pausa también funciona desde "cargando". El registro anota "Pausa/play: AVPlay en X".
- Sin audio no se puede corregir desde la app: usar recargar o el botón AV/H5.

## 0.1.16
- Botón recargar ahora hace lo mismo que pulsar el título del video (reinicia contadores y avisa al item); en directo empieza de cero. El registro anota "Recargar: ...". No probado en la TV.

## 0.1.17
- Configuración > Diagnóstico: botón PROBAR CAPACIDADES DE LA TV (WebCodecs, códecs en hardware/software, WebAssembly, SIMD, hilos, núcleos) → resultado en el registro.
- Mientras hay un video abierto se anota cada minuto "Memoria: ..." en el registro (para ver si crece hasta "memoria llena").
- Indicador de señal: ya no suma un oyente nuevo cada vez que se rehace la pantalla (fuga pequeña).

## 0.1.18
- Configuración > Reproductor: campo "Cabeceras extra (experimento, AVPlay)". AVPlay solo admite USER_AGENT y COOKIE (confirmado en la documentación de Samsung); se intenta colar Referer/Origin tras el User-Agent con salto de línea. Sin garantía: el firmware puede ignorarlas. El registro anota "Cabeceras extra (experimento)". No probado en la TV.
