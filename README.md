# Tycoon Vecibanda — La Vecibanda House

Tycoon 3D de bloques para el navegador. Es un sitio 100% estático (HTML + JS + Three.js desde CDN): no hay que instalar nada.

## Jugar / publicar en GitHub Pages

1. En GitHub: **Settings → Pages**.
2. En **Source** elegí **Deploy from a branch**, la rama donde está el juego y la carpeta `/ (root)`. Guardá.
3. En 1–2 minutos queda en `https://<tu-usuario>.github.io/<repo>/`.

> No se puede abrir con doble clic en `index.html` (el navegador bloquea los módulos). Usá el link de Pages.

**Controles (al estilo Roblox):**
- PC: WASD / flechas para moverse, espacio para saltar, arrastrar el mouse para girar la cámara, rueda o `I`/`O` para el zoom (al máximo entra en primera persona), `,`/`.` para girar la cámara, `Shift` para el Shift Lock, `C` para agacharse (solo Jeipi) y `Esc` para la configuración.
- Celu (acostado): el joystick aparece donde apoyás el pulgar izquierdo, arrastrás el resto de la pantalla para mirar, pellizcás para el zoom y el botón de la flecha salta (si lo mantenés, salta seguido; también salta solo al chocar con algo bajo). En Android se pone en pantalla completa y horizontal al tocar Jugar; en iPhone conviene agregarlo a la pantalla de inicio.

## Ver la mansión terminada

Agregando `?completo` al link (`https://romantoto2017.github.io/tycoon/?completo`) se abre con todo construido. Esa vista no guarda nada: la partida de verdad queda como estaba.

## Fotos de las caras

- Van en `assets/caras/`. El archivo de cada uno se indica en `data/personajes.js` (campo `foto`, por ejemplo `toto.jpeg`).
- La foto va en el frente de la cabeza. La nuca, los costados y la parte de arriba se dibujan solos con el color de pelo y de piel de la foto.
- En `data/personajes.js` podés forzar `piel` y `pelo` (colores), `peinado` (`'liso'`, `'ondulado'` o `'rulos'`) y `cuerpo: 'gordo'`. Lo que no pongas se saca de la foto.
- `alto`: (opcional) Jeipi tiene 1.35: es más alto, no entra por las puertas parado y tiene el botón de agacharse.
- `remeraFotos` pone una remera con imágenes (frente con el diseño + tela para espalda y mangas). La de Bauti sale de `assets/caras/glassybauti.jpg`, recortada con `herramientas/remera_glassy.py` en `assets/ropa/`.
- Si querés una nuca propia (por ejemplo hecha con IA), subila a `assets/caras/` y poné su nombre en `fotoAtras` (ej. `fotoAtras: 'toto_atras.jpeg'`).
- Si la cara sale mal encuadrada, ajustá `recorte: [centroX, centroY, tamaño]` en `data/personajes.js`:
  - `centroX` / `centroY`: dónde está la cara, de 0 a 1 (0.5 = medio de la foto; un número más chico en `centroY` sube el recuadro).
  - `tamaño`: 1 = foto entera; más chico = más zoom.
- Si no hay foto, se muestra la inicial.
- Para agregar un personaje, copiá una línea en `data/personajes.js` y cambiale `id`, `nombre`, `foto` y colores.

## Objetos especiales, droppers y cuadros

Todo en `data/objetos.js`:

- `DROPPERS`: nombres y colores de las 10 máquinas.
- `MEJORAS_VALOR` / `MEJORAS_VELOCIDAD`: nombres de las mejoras.
- `OBJETOS_VECIBANDA`: los 8 objetos especiales (nombre, precio, etapa, descripción, forma). Aparecen en pedestales en el camino de entrada. Son caros a propósito (10 a 30 minutos juntando plata) y no hacen falta para el cartel final.
- `CUADROS`: nombre, precio y archivo de imagen (en `assets/cuadros/`). Toman la forma de la foto. Un `.mp4` se ve animado (conviene subir también la versión `.webm` con el mismo nombre). Las fotos originales que se subieron quedan en `assets/cuadros/originales/`; `herramientas/especiales.py` las recorta y achica.
- `LUJOS`: objetos de rico con lugar fijo (estatuas, piano, T-Rex, Nico de cartón, bóveda, piscina infinita, helicóptero).

Para cambiar algo: editá el archivo en GitHub (ícono del lápiz), guardá con "Commit changes" y recargá el juego.

## La Schwepa

Cada minuto de juego hay un 5% de chance de que la Schwepa llegue en su Zanella Zapucai, entre por el portón, se baje al lado del cobrador y se lleve TODO: lo que está esperando ahí y la plata que tenés. Mientras está en el terreno el cobrador automático se frena. Todo está en `js/ladron.js` (probabilidad, porcentaje, recorrido y la moto).

Alrededor del 20% de la partida, en el garage, se compra el **AK-47** (y después el auto, que es bastante caro): aparece un slot abajo (tecla `1`) para sacarla. Con el arma en la mano se dispara con clic izquierdo (la cámara gira con el derecho) o con el botón rojo en el celu. Cuando a la Schwepa se le acaba la vida sale rajando, te devuelve lo que robó y no vuelve por 15 minutos de juego.

## Día y noche

Un día dura 24 minutos de juego: 10 de día, 2 de atardecer (se pone el sol y sale la luna), 10 de noche con estrellas y 2 de amanecer. Se cuenta con el tiempo jugado, así que queda guardado con la partida. De noche, al lado de una cama comprada aparece "Dormir (E)": se funde a negro y te despertás a la mañana. Sin las farolas compradas, de noche casi no se ve; con farolas, el terreno queda iluminado. Arriba da vueltas despacito el dirigible "SAYAGO IS YOURS...". Todo está en `js/cielo.js`.

## Lo de Lourdes (restaurante)

El restaurante de Lourdes queda afuera del terreno, a unos 150 metros sobre la misma calle (para el lado del garage): se llega caminando o en auto. No se compra: aparece entero (edificio, mesas, microondas, Lourdes con su radio y decoración) cuando la mansión llega al 30% (`RESTO_ABRE` en `js/constantes.js`), con un aviso.

Lourdes está sentada en su mesa con una radio vieja que pasa cumbia mientras estás adentro. Al lado de ella aparece "Pedir comida (E)": elegís un plato del menú y ella lo calienta en un microondas. Al lado de cualquier silla aparece "Sentarse (E)" (moverse o saltar te levanta). Si estás sentado, Lourdes te lleva el plato con un vaso de agua a tu lugar; si no, lo deja en una silla cualquiera (marcada con una flecha amarilla) y te tenés que sentar ahí para que aparezca "Comer (E)". No se paga y es un plato por visita (al salir y volver a entrar podés pedir otro). El edificio, las mesas y los asientos están en `js/resto.js`; Lourdes, el servicio y el sentarse, en `js/restaurante.js`.

Sobre la vereda hay faroles de hierro: de noche, al acercarte, la cuadra se ilumina sola aunque no hayas comprado las farolas de la mansión (`luzResto` en `js/main.js`). La cara de Lourdes sale de `assets/caras/lourdes_cara.jpeg`, recortada con `herramientas/lourdes_cara.py` para que los ojos caigan detrás de los lentes.

Al lado del restaurante se compra la Parrilla Vecibanda: de ladrillo a la vista con chimenea, fogón, mesada de cemento y leñero (`parrilla` en `js/exterior.js`).

## Gym Power Camp

A unos 450 metros de la mansión para el otro lado de la calle (al revés que el restaurante) está el gym Power Camp, abierto desde el principio. Está hecho en base a las fotos de `assets/especiales/` (gym1 a gym8, las capturas de la entrada y `gymlogo.png`): fachada negra con POWER en letras blancas, la alfombra START de la entrada, el mostrador de madera, techo negro con aros de luz, el espejo con el stand largo de mancuernas POWER (de 2,5 a 40 kg), racks negros y amarillos, torres de máquinas con la placa POWER y discos con el logo. Edificio y equipamiento en `js/gym.js`.

Kelvin atiende en el mostrador (cara y buzo sacados del video `kelvincara.mp4` con `herramientas/kelvin.py`, acá en el contenedor). Cada vez que entrás te dice "¿Todo bien bro?" y te ofrece la mano: "Chocar la mano (E)".

Hay cinco ejercicios que se hacen de verdad (`js/gimnasio.js`): curl de bíceps con mancuernas frente al espejo, press de banca, dominadas, peck deck y jalón al pecho. Te parás al lado de la máquina, "Entrenar (E)", elegís el peso en el panel y hacés repeticiones con el botón grande (o la barra espaciadora / el botón de saltar), manteniéndolo apretado para seguir. Se mueven los hombros, los codos y las rodillas, y también la barra, el cable o los brazos de la máquina y las placas. Si el peso es demasiado para vos, la barra no sube. Moverse o "Salir (E)" te saca.

Solo Bauti cambia de cuerpo: cada repetición le suma puntos (`estado.bautiGym`); con unas 1000 repeticiones adelgaza (y camina más rápido) y, ya flaco, con unas 2400 más se pone musculoso. El progreso se ve en el panel y se guarda con la partida. Los números están en `BAUTI_GYM` de `js/gimnasio.js`.

## La Mazza

Cada minuto de juego hay un 3% de chance de que caiga la Mazza (está enamorada de Juanma). Si estás jugando con Juanma te persigue por toda la mansión (escaleras incluidas) y le salen corazones al verte; si no, entra a preguntar por él. No se la puede echar: se va sola a los 5 minutos. Todo está en `js/mazza.js`.

## Moneda

Si subís `assets/moneda.png`, reemplaza a la moneda "VB" dibujada por código (en el HUD y en los bloques).

## Muebles

Cada mueble se compra por separado, como en un tycoon: al entrar a una habitación aparece un botón en el piso donde va el próximo mueble (primero la luz, después la cama, el ropero, la alfombra...). Se compran de a uno y en orden. La lista de muebles de cada habitación, con su nombre y dónde aparece el botón, está en `js/muebles.js`. Si cambiás muebles, volvé a correr el balance (abajo) para recalcular los precios.

## Precios y duración

Los precios de la mansión están en `js/precios.js` y se calculan con `herramientas/balance.mjs`, que simula una partida completa (unas 3 horas; `node herramientas/balance.mjs --escribir`). Los precios de los objetos especiales y los cuadros se editan directo en `data/objetos.js`.

El progreso se guarda solo en el navegador (localStorage). "Reiniciar partida" en la configuración lo borra.

## Muebles y pinturas (créditos)

- Los muebles son modelos 3D del **Furniture Kit de Kenney** (kenney.nl), licencia CC0 (dominio público). Están en `assets/muebles/` y se cargan al empezar (`js/modelos.js`): ahí se cambian los colores (madera, metal, tapizados) y qué modelos se usan. Cada habitación los acomoda en `js/muebles.js`.
- Las pinturas famosas son obras de dominio público tomadas de Wikimedia Commons; la lista está en `assets/pinturas/CREDITOS.md`.
