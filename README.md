# Tycoon Vecibanda — La Vecibanda House

Tycoon 3D de bloques para el navegador. Es un sitio 100% estático (HTML + JS + Three.js desde CDN): no hay que instalar nada.

## Jugar / publicar en GitHub Pages

1. En GitHub: **Settings → Pages**.
2. En **Source** elegí **Deploy from a branch**, la rama donde está el juego y la carpeta `/ (root)`. Guardá.
3. En 1–2 minutos queda en `https://<tu-usuario>.github.io/<repo>/`.

> No se puede abrir con doble clic en `index.html` (el navegador bloquea los módulos). Usá el link de Pages.

**Controles:** WASD / flechas para moverse, espacio para saltar, arrastrar el mouse para girar la cámara, rueda para zoom, `Esc` para la configuración. En pantalla táctil aparece un joystick y un botón de salto.

## Fotos de las caras

- Van en `assets/caras/`. El archivo de cada uno se indica en `data/personajes.js` (campo `foto`, por ejemplo `toto.jpeg`).
- La foto se pone en las 6 caras de la cabeza. Si sale mal encuadrada, ajustá `recorte: [centroX, centroY, tamaño]` en `data/personajes.js`:
  - `centroX` / `centroY`: dónde está la cara, de 0 a 1 (0.5 = medio de la foto; un número más chico en `centroY` sube el recuadro).
  - `tamaño`: 1 = foto entera; más chico = más zoom.
- Si no hay foto, se muestra la inicial.
- Para agregar un personaje, copiá una línea en `data/personajes.js` y cambiale `id`, `nombre`, `foto` y colores.

## Objetos especiales, droppers y cuadros

Todo en `data/objetos.js`:

- `DROPPERS`: nombres y colores de las 10 máquinas.
- `MEJORAS_VALOR` / `MEJORAS_VELOCIDAD`: nombres de las mejoras.
- `OBJETOS_VECIBANDA`: los 8 objetos especiales (nombre, precio, etapa, descripción). Aparecen en pedestales en el camino de entrada.
- `CUADROS`: nombre, precio y archivo de imagen. Las imágenes van en `assets/cuadros/` (`cuadro1.jpg`, `cuadro2.jpg`…). Si no existen, se ve un cuadro de relleno.

Para cambiar algo: editá el archivo en GitHub (ícono del lápiz), guardá con "Commit changes" y recargá el juego.

## Moneda

Si subís `assets/moneda.png`, reemplaza a la moneda "VB" dibujada por código (en el HUD y en los bloques).

## Precios y duración

Los precios de la mansión están en `js/precios.js` y se calculan con `herramientas/balance.mjs`, que simula una partida completa (unas 3 horas). Los precios de los objetos especiales y los cuadros se editan directo en `data/objetos.js`.

El progreso se guarda solo en el navegador (localStorage). "Reiniciar partida" en la configuración lo borra.
