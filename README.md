# Azure Tizen

Aplicación web para televisores Samsung Tizen, desarrollada en HTML, CSS y JavaScript sin dependencias de npm. La versión actual es **0.1.9** y el proyecto está en [`AzureTizen_0.1.9/`](./AzureTizen_0.1.9/).

## Empezar

- Guía de instalación para la Samsung UN75DU8000G: [`TIZEN_GUIA_UN75DU8000G.txt`](./TIZEN_GUIA_UN75DU8000G.txt)
- Instrucciones generales para instalar en una TV: [`docs/INSTALAR_EN_TIZEN.md`](./AzureTizen_0.1.9/docs/INSTALAR_EN_TIZEN.md)
- Mapa del porteo y riesgos conocidos: [`docs/MAPA_PORTEO.md`](./AzureTizen_0.1.9/docs/MAPA_PORTEO.md)
- Archivos PHP para el hosting: [`servidor/LEEME.txt`](./AzureTizen_0.1.9/servidor/LEEME.txt)
- Pruebas manuales y automatizadas: [`pruebas/LEEME.txt`](./AzureTizen_0.1.9/pruebas/LEEME.txt)

## Probar en un navegador de PC

Desde la carpeta del proyecto:

```sh
cd AzureTizen_0.1.9
python3 -m http.server 8000
```

Abre <http://localhost:8000> en Chrome (diseño de 1920 × 1080). Las flechas simulan el D-pad, Enter es OK, Esc es Atrás y F3 es amarillo. En un navegador normal se usa `<video>` en lugar de AVPlay; esto no sustituye las pruebas en la TV.

## GitHub Actions

El workflow de CI valida la sintaxis de los scripts JavaScript y la estructura XML de `config.xml`, y crea un paquete `.wgt` de prueba. El artefacto se conserva **7 días**.

El paquete de CI es **sin firmar**. Para instalarlo en una TV hay que abrir/importar el proyecto en Tizen Studio, seleccionar un certificado Samsung que incluya el DUID de la TV y empaquetarlo/instalarlo con ese certificado. El workflow no guarda certificados ni claves.

## Configuración Tizen

`config.xml` declara el perfil `tv-samsung` y una versión mínima requerida de Tizen 6.0. La compatibilidad y reproducción en el modelo concreto deben confirmarse en el dispositivo; el empaquetado y la validación en CI no emulan una TV ni AVPlay.
