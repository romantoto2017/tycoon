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
- `OBJETOS_VECIBANDA`: los 8 objetos especiales (nombre, precio, etapa, descripción, forma). Aparecen en pedestales en el camino de entrada. Son caros a propósito (10 a 30 minutos juntando plata) y no hacen falta para el cartel final. Hasta comprarlo, el botón dice solo "Objeto Vecibanda N": qué es se ve al comprarlo. Los últimos tres: el Láser de Tepho, la Tele Chica (la Futura) y el Prepucio de Val.
- `CUADROS`: nombre, precio y archivo de imagen (en `assets/cuadros/`). Toman la forma de la foto. Un `.mp4` se ve animado (conviene subir también la versión `.webm` con el mismo nombre). Las fotos originales que se subieron quedan en `assets/cuadros/originales/`; `herramientas/especiales.py` las recorta y achica.
- `LUJOS`: objetos de rico con lugar fijo (estatuas, piano, T-Rex, Nico de cartón, bóveda, piscina infinita, helicóptero).

Para cambiar algo: editá el archivo en GitHub (ícono del lápiz), guardá con "Commit changes" y recargá el juego.

## La Schwepa

Cada minuto de juego hay un 5% de chance de que la Schwepa llegue en su Zanella Zapucai, entre por el portón, se baje al lado del cobrador y se lleve TODO: lo que está esperando ahí y la plata que tenés. Mientras está en el terreno el cobrador automático se frena. Todo está en `js/ladron.js` (probabilidad, porcentaje, recorrido y la moto).

Alrededor del 20% de la partida, en el garage, se compra el **AK-47** (y después el auto, que es bastante caro): aparece un slot abajo (tecla `1`) para sacarla. Con el arma en la mano se dispara con clic izquierdo (la cámara gira con el derecho) o con el botón rojo en el celu. Cuando a la Schwepa se le acaba la vida sale rajando, te devuelve lo que robó y no vuelve por 15 minutos de juego.

## Manu Mendez

Morocho, pelo corto con rulos, alto y medio gordito, con la remera gris de rayas (cara y remera con `herramientas/manu.py`, en el contenedor). Todo en `js/manu.js`.

- **Solo:** el 30% de las veces anda paseando (vereda de la mansión o plaza de la ciudad, como Dufre). Si te ve te dice "¿Me estás mirando de pesado mano?", "Vamo a robar al shopin gil" o "Te voy a llenar de plomo pero pa buena".
- **Con la Schwepa, a la mansión:** 0,5% por minuto, solo si estás en la casa. Entran caminando por el portón, cada uno con un AK-47, y se llevan TODO (lo del cobrador y la plata que tenés). No se los puede parar: el cartel queda hasta que se van.
- **Con la Schwepa, asaltando un local:** 5% por minuto mientras andás por la ciudad, en el local que te quede más cerca (la ropa de LUCCABOSSIO™, la verdulería o un auto de Vecibanda Motors). Apuntan, gritan y tiran al aire un par de minutos; después se van con la ropa, el cajón de verdura o manejando el auto (el de la vidriera vuelve al rato).

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

**El Shileno** está SIEMPRE sentado en el segundo pec dec (el de la derecha, que es solo suyo) con el celu levantado y la cabeza gacha mirándolo: no se mueve ni te dice nada. Cuerpo normal, camiseta negra con rayas azules como la de la foto.

**El profe que no es profe** está siempre en el gym: enorme, con el jogging Jordan y las Nike TN de la tienda y una musculosa finita (tira en el medio y espalda de nadador) que le deja ver todos los músculos y los tatuajes. El cuerpo es de bloques, pero con cada músculo aparte y el relieve pintado (`cuerpoProfe` en `js/gimnasio.js`, que `crearPersonaje` llama con `detallar`): pectorales, abdominales, serratos, trapecios, dorsales en V, hombros, bíceps, tríceps y antebrazos, reloj en la muñeca derecha y pulsera en la izquierda. Tatuajes como en las fotos: el texto del pecho, las tres estrellas de la panza y la manga del antebrazo izquierdo salen de sus fotos (tinta sola, `herramientas/gym_nuevos.py`, acá en el contenedor) y el tribal polinesio del hombro y el brazo derecho (con la punta en el pecho) se dibuja. Anda por los pasillos: hace series en las máquinas que estén libres (curl con mancuernas de 20, banca, dominadas, pec dec, jalón), se mira al espejo sacando bíceps y, de vez en cuando, si estás entrenando, viene a corregirte la técnica de ese ejercicio ("Bro, ..."). Si querés la máquina que está usando, te la deja.

En la pared derecha, a la altura del mostrador, está el cuadro del gym (`assets/cuadros/cuadrogym.jpeg`, sin cartel).

Hay cinco ejercicios que se hacen de verdad (`js/gimnasio.js`): curl de bíceps con mancuernas frente al espejo, press de banca, dominadas, peck deck y jalón al pecho. Te parás al lado de la máquina, "Entrenar (E)", elegís el peso en el panel (siempre arranca en el más liviano) y hacés repeticiones con el botón grande (o la barra espaciadora / el botón de saltar), manteniéndolo apretado para seguir. Se mueven los hombros, los codos y las rodillas, y también la barra, el cable o los brazos de la máquina y las placas.

Los pesos son realistas: cada ejercicio tiene el máximo que levanta una persona normal una sola vez (`rm` en `EJERCICIOS`; banca 75 kg, curl 17 kg por mancuerna, dominadas cuerpo + 12 kg, peck deck 60, jalón 70) y las repeticiones posibles con cada peso salen de la fórmula de Epley (por ejemplo, en banca: 60 kg unas 8, 70 kg unas 3, 80 kg ninguna). Cada botón de peso dice el máximo aproximado. La barra de energía baja con cada rep y se recupera descansando (unos 35 s). Las últimas 2 o 3 antes del fallo son un minijuego: hay que apretar rápido varias veces para subir el peso antes de que se acabe el tiempo; si no llegás, el peso vuelve y la serie termina. Moverse o "Salir (E)" te saca. Bauti gordo pesa más, así que no puede hacer ni una dominada.

Solo Bauti cambia de cuerpo: cada repetición le suma puntos (`estado.bautiGym`); con unas 1000 repeticiones adelgaza (y camina más rápido) y, ya flaco, con unas 2400 más se pone musculoso. El progreso se ve en el panel y se guarda con la partida. Los números están en `BAUTI_GYM` de `js/gimnasio.js`.

## Casino Vecibanda

En la Ciudad Vecibanda, sobre la avenida de la entrada (al lado del hotel), está el casino (se ve desde el principio pero abre cuando la mansión llega al 25%, `CASINO_DESDE`; antes la puerta tiene el cartel de CERRADO), inspirado en el del Schedule 1: edificio de ladrillo con la marquesina redonda, la escalinata y las letras CASINO de neón arriba (de día rosas; de noche cambian de colores y titilan, igual que las lamparitas de la marquesina). Todo está en `js/casino.js`; la manzana la marca `ESPECIALES` en `js/ciudad.js`.

Adentro, un casino de verdad: alfombra roja con firuletes, boiserie de madera y tapiz bordó con columnas doradas y apliques, cielorraso artesonado dorado, arañas rosas, neón fucsia alrededor, la pantalla del JACKPOT en el fondo, la barra con botellas iluminadas y charcos de luz en la alfombra. Hay 36 tragamonedas como las de las fotos y tres mesas. Se juega con "Jugar al ... (E)" parado en la banqueta; se abre un panel abajo (la cámara mira la mesa o la máquina) con la apuesta (escalera 1-2-5, ÷10, ×10 y Máx) y los botones. Espacio o Enter hacen la acción principal y E o Esc te levantan (no mientras gira o se reparte). **Máximo por apuesta: 100 B** (`LIMITE`). Las chances son las de verdad (la casa gana un poquito en promedio):

- **Tragamonedas:** tres rodillos que giran de verdad. 3 frutas x2, misma fruta x10, 3 campanas x25, 3 sietes x100 (devuelve el 96%).
- **Blackjack:** zapato de 6 mazos; el crupier pide hasta 16 y se planta en 17; blackjack paga 3 a 2; se puede doblar.
- **Póker (Casino Hold'em):** ante, flop, y ir (el doble del ante) o retirarse. El crupier califica con par de 4; el ante paga según la mano (escalera real 100, escalera de color 20, póker 10, full 3, color 2, el resto 1) y el ir 1 a 1.
- **Ruleta europea:** fichas en el paño (plenos 35 a 1, docenas y columnas 2 a 1, rojo/negro, par/impar y mitades 1 a 1), quedan puestas para repetir; la rueda y la bolita giran de verdad y se ve el historial.

El crupier de las tres mesas es **Astrojorge**: alto y flaco, pelo blanco con dos entradas y la "piscina" en la coronilla, camisa blanca, chaleco, moño rojo y la plaquita con el nombre. Camina a la mesa donde te sentás y te habla. La cara sale de `assets/caras/astrojorge.jpeg` y la ropa se dibuja con `herramientas/casino.py` (acá en el contenedor); la calva es `calva: true` en `js/texturas.js`.

Afuera hay un estacionamiento y siempre está el **auto de Astrojorge** (un sedán viejo celeste con óxido, "Auto de Astrojorge" pintado en las puertas, el lugar reservado y una papa metida en el caño de escape).

## LUCCABOSSIO™

Sobre la misma avenida que las tiendas de ropa (al lado de La Futbolera) está el local de Lucca Bossio, armado lo más parecido al de verdad (`assets/especiales/luccabossiolocal.jpeg` y `localluccabossio2.jpeg`): planta baja de un edificio blanco, la banda negra con el logo blanco de la viborita, todo el frente de vidrio con LUCCABOSSIO™ y el texto de la marca pegados, la puerta de vidrio abierta, el 3174 en la columna, el domo de la cámara y la maceta de granito afuera. Adentro: paredes blancas, piso de madera clara, rieles negros con spots, el perchero con la ropa colgada y dos prendas de frente, el mueble blanco con remeras dobladas y un estante arriba con una planta, el cubo blanco de la vidriera, el perchero de jeans, el banco de madera, el espejo, un cuadro con la mascota y el mostrador de madera al fondo con el posnet y las bolsas (atrás, el logo negro y la puerta al depósito). La mascota (el bichito) flota dando vueltas por el local. Todo está en `js/lucca.js`; los logos y la mascota se recortan con `herramientas/lucca.py` (acá en el contenedor).

- **Shaggy** (el cuñado de Lucca, cara de `assets/caras/shaggy.jpeg`, con la remera Bossio x Tranca y el jogging De Acanto) atiende el mostrador: "Ver la ropa (E)" abre el catálogo, en blanco y negro como la web de la marca.
- **Lucca Bossio** (cara de `assets/caras/luccabossio.jpeg`, con su hoodie Knox y el jean Nudos de Archibald) a veces está en el local y si no anda caminando por las veredas de alguna manzana de la ciudad (cambia cada uno o dos minutos, nunca delante tuyo). Cuando te acercás te tira una de las suyas ("Tengo la mejor marca de nicho de Uruguay", "Qué onda mano", "De hecho, mi ropa sí vale los 5000 pesos 🤓👆"...); con "Hablar con Lucca Bossio (E)" te dice otra.
- **La ropa** sale de luccabossio.com (las fotos de producto están en `assets/ropa/luccabossio/` y se recortan con `python3 herramientas/ropa.py lb_`): 7 remeras, 2 hoodies, el full zip Knox, la campera reversible Voynich, 2 joggings y el jean. Se compra y se usa como la de las otras tiendas, pero es bastante más cara (12 B las remeras y hasta 38 B la campera). Los pantalones se hacen con `estirar`: en cada fila, el pantalón de la foto se estira a todo el ancho de la pierna, así cubre la pierna entera, como puesto.
- **El hoodie x TussiWarriors** trae el pasamontañas: tapa la cabeza entera (con el logo, "TU$$i" y las costuras de la boca, como el de la foto) y los agujeros de los ojos y la boca caen donde los tiene cada uno (`ojos` y `boca` en `data/personajes.js`). Con él puesto no se ven el pelo largo, la colita, la kipá ni los lentes.

## La playa (frente a la mansión)

Cruzando la calle desde el portón está la playa, estilo Miami Beach (`js/playa.js`, medidas en `PLAYA` de `js/constantes.js`): arena clara con la franja mojada en la orilla, el mar turquesa que se vuelve azul profundo hacia el horizonte (un solo plano con un shader corto: color según la distancia a la orilla, ondas y destellos), la espuma que va y viene y olas que llegan a la orilla. Hay un muelle de madera con barandas y farol, palmeras altas y arbustos con flores en el cantero entre la vereda y la arena, reposeras y sombrillas pastel, bancos frente al agua y la casilla del guardavidas rosa y turquesa. Del portón sale un deck de madera (con la senda peatonal en la calle) hasta la arena. De día, sombras largas en la arena; de noche se prenden luces cálidas en las palmeras, el deck y el muelle, y las luces de la mansión se reflejan en el agua. A los costados de la bahía la orilla es de piedras.

Se camina por la arena y por el agua de la orilla (hasta `vadeo` adentro; por el muelle se llega a la punta). El auto no entra al mar: en la orilla hay un choque que solo frena a los autos (`soloAutos`, lo ignora `jugador.js`).

**Francis Jeremy** (el rapero) surfea yendo y viniendo sobre la cresta, parado de costado en su tabla (#UNDER). Si te acercás a la orilla, sale del agua, clava la tabla en la arena y te tira alguna: "Vamo a surfear esas olas mano", "Cómo quedan unos cogollitos", "POLICÍA, ¡ABRA LA PUERTA!", "#under", "MUAJAJAJAJAJ". El cuerpo está hecho a mano como el del profe: torso desnudo con los pectorales y abdominales pintados y el tatuaje del abdomen sacado de su foto (el texto gótico y el felino, `herramientas/francis.py`, acá en el contenedor), las mangas tatuadas en los antebrazos, la bermuda a cuadros amarilla (como el bóxer de la foto), descalzo y con las rastas rubias de raíz oscura.

Cuando ya tenés algún perro, "Hablar con Francis Jeremy (E)" abre una charla con opciones (con el mouse, tocando o con las teclas 1, 2, 3). Casi todas terminan en nada; eligiendo las justas, en el momento justo, te da una pócima (una por vez). Para qué sirve no se cuenta acá (está en `js/playa.js` y en `Perros` de `js/ladron.js`).

## TP a la ciudad

A la salida de la mansión (al lado del portón, del lado izquierdo) se compra el **TP a la Ciudad Vecibanda** por 5 T (precio fijo y opcional, aparece con el auto). Es un portal con aro celeste: "Ir a la Ciudad Vecibanda (E)" te deja en la avenida de la entrada de la ciudad, donde está el portal de vuelta ("Volver a la mansión (E)"). Solo a pie. Lugar y precio en `TP_CIUDAD` (`js/constantes.js`); el portal es `crearPortal` en `js/ciudad.js` y lo usa `main.js`.

## Misiones

**Premios:** cada misión da plata al cumplirla: lo que más convenga entre un monto fijo según el % al que se desbloquea (unos 10 minutos de lo que se gana en ese momento de la partida) y unos minutos de lo que estás ganando cuando la cumplís, según lo difícil que es, con un tope para que dejarla para el final no rompa la partida. Ponerse trabado (Bauti, lejos la más difícil): 100 B fijos. Rescatar al Cusi: 20 M o 6 minutos, hasta 600 M. Empilchado: 1.500 M o 3 minutos, hasta 6.000 M. El panel muestra el premio de cada una (y "Cobraste" cuando ya está). Las misiones cumplidas antes de que hubiera premios se cobran una vez al cargar (`estado.premios`).

La sección de misiones aparece cuando la mansión llega al 10% (`MISIONES_DESDE`); antes no está el botón. Con el botón de la lista (al lado de la configuración, o la tecla M) se abre el panel de misiones. Las que piden un progreso mayor (`desde`, como la del Cusi al 50%) se ven grises con un "?" de piedra, sin decir cuánto falta, hasta que se llega; ahí avisa "Nueva misión desbloqueada". En el panel cada una es de un personaje, muestra su avance y se tilda cuando se cumple (`js/misiones.js`, guardadas en `estado.misiones`).

- **Ponerse trabado (Bauti):** entrenar en el Power Camp hasta adelgazar y quedar musculoso del todo.
- **Rescatar al Cusi (Juanma):** cuando la mansión llega al 50% jugando con Juanma, salta un diálogo (Juanma a la derecha y el texto abajo; se avanza con Continuar, E o Espacio): el Cusi se perdió, sin ninguna pista de dónde (está escondido en el bosque al pie de la montaña del pelado). Solo con Juanma aparece ahí (con cualquier otro no está). Al lado de él, "Agarrar al Cusi (E)": Juanma lo lleva en brazos y, al entrar a la mansión, se cumple la misión. Desde ahí el Cusi vive en el hall de planta baja y se lo ve con cualquier personaje. Si cambiás de personaje con el Cusi en brazos, vuelve al bosque. El Cusi es un nene chiquito y muy cabezón (cara de `assets/caras/cusi.jpeg`).
- **Rescatar al Pipi (Tepho):** igual que la del Cusi, desde el 10%: jugando con Tepho salta un diálogo y el Pipi aparece tirado boca arriba contra la cerca, en el rincón más escondido del terreno (al fondo a la izquierda, detrás de la fábrica y la mansión; `PIPI_TIRADO`). "Levantar al Pipi (E)", llevarlo a la mansión y se queda en el hall al lado del Cusi. Es chiquito, más flaco que lo normal (`gordura` negativa) y sin ser cabezón (cara de `assets/caras/pipi.jpeg`). Los dos rescates usan la misma clase (`Perdido` en `js/misiones.js`).

- **Ricas llantas** y **Il conto por favore** (de cualquiera, con el ícono de la banda, desde el 60%): tener dos autos de Vecibanda Motors y comprarse la Ferrari F40. Se revisan en cada compra del concesionario (`revisarAutos` en `js/misiones.js`).
- **Hot-Wheels** y **Verstappen** (de cualquiera, desde el 60%, con el autódromo): sacar la medalla de oro con algún auto (10 B) y con todos los autos, el Auto Deportivo incluido (1 T). El panel muestra cuántos oros llevás.

## Karaoke

En la sala del karaoke (tercer piso), con la pantalla de letras comprada, al acercarte aparece "Poner el karaoke (E)" (y "Parar el karaoke"). Suena "Los Guaranguitos": una cumbia hecha con WebAudio en `js/sfx.js` (`Karaoke`) (bajo, acordes, güiro, bombo, palmas y la melodía guía), sin archivo de audio. La letra (`LETRA`) se va pintando de amarillo sílaba por sílaba, en la pantalla y en una barra abajo del HUD (solo si estás en la sala), con la línea que sigue más chica. Cada sílaba dura una corchea a 100 BPM y cada línea dos compases; el tiempo sale del reloj del audio, así la letra no se separa de la música aunque el juego vaya lento. Mientras suena, la canción del juego se baja (como con la radio de Lourdes), y se escucha aunque la música esté apagada.

## La montaña del pelado y la foto Vecibanda

Atrás de la mansión, para el lado del garage, hay una montaña grande (con dos colinas más chicas al lado) y en la cima el pelado con la camiseta de La Dosis, recortado de `peladomontaña.jpeg` con `herramientas/pelado_montana.py` (rembg, acá en la compu, no se manda a ningún servicio). No le afecta la niebla, así se ve desde lejos. Se sube caminando hasta la cima (el piso sigue exacto la superficie dibujada; el auto no sube) y las piedras van enterradas en la ladera. Al pie está el bosque del Cusi.

La foto de la Vecibanda (`assets/cuadros/fotovecibanda.jpeg`) es un cuadro gigante que ocupa la pared de atrás de la cabina del DJ en el Salón de Fiestas (último mueble que se compra ahí).

## La Mazza

Cada minuto de juego hay un 0,5% de chance de que caiga la Mazza (está enamorada de Juanma). Si estás jugando con Juanma te persigue por toda la mansión (escaleras incluidas) y le salen corazones al verte; si no, entra a preguntar por él. No se la puede echar a la fuerza: se va sola a los 5 minutos. Pero les tiene pánico a las lechugas (ver abajo): si hay una cerca, puesta en el piso o en la mano de alguien, sale corriendo para el otro lado gritando, como los creepers con los gatos; al tercer susto se va. Todo está en `js/mazza.js`.

## Moneda

Si subís `assets/moneda.png`, reemplaza a la moneda "VB" dibujada por código (en el HUD y en los bloques).

## Helicóptero, terraza y bóveda

- **Helicóptero** (`js/helicoptero.js`): cuando comprás el helipuerto, el helicóptero se puede manejar. Al lado aparece "Volar el helicóptero (E)". Adelante/atrás avanza, izquierda/derecha gira, y manteniendo saltar (Espacio o el botón) sube; si soltás, baja despacito hasta apoyarse (en el piso, un techo o la terraza). Solo te bajás cuando está apoyado. Choca con paredes y edificios, la cámara va más lejos y el aparato se inclina al avanzar y girar.
- **Piscina infinita:** ahora va del pabellón hasta el helipuerto y llega al borde de atrás de la terraza; el agua queda al ras del vidrio y se derrama por afuera a una canaleta. Tiene escalones, luces abajo del agua y un deck de madera adelante.
- **Jacuzzi y reposeras:** deck de madera, jacuzzi redondo de piedra con asiento, luz abajo del agua y burbujas (se puede meter uno), escalones, toallas y champagne; tres reposeras con almohadón a rayas y respaldo reclinado, mesitas con jugo, sombrilla grande cuadrada y macetas redondas.
- **Bóveda de oro** (garage): cámara de acero con la puerta redonda gigante abierta (volante, pernos, bisagra), estantes llenos de lingotes, pilas de monedas, una montaña de oro y bolsas de plata con luz dorada adentro, el teclado de la clave, el cartel "BÓVEDA VECIBANDA" y afuera una tarima con la pirámide de lingotes.
- **Fuegos artificiales** del final: 20 segundos al terminar la mansión, y nada más (ya no arrancan al cargar la partida).

## Muebles

Cada mueble se compra por separado, como en un tycoon: al entrar a una habitación aparece un botón en el piso donde va el próximo mueble (primero la luz, después la cama, el ropero, la alfombra...). Se compran de a uno y en orden. La lista de muebles de cada habitación, con su nombre y dónde aparece el botón, está en `js/muebles.js`. Si cambiás muebles, volvé a correr el balance (abajo) para recalcular los precios.


### Cine y biblioteca (segundo piso)

- **Cine:** sala oscura con cortinas que tapan el ventanal y techo de estrellitas, pantalla grande con "VECIBANDA: LA PELÍCULA" y telón rojo, tres filas de butacas rojas en escalonado con luces en los escalones, proyector con su haz, marquesina "CINE VECIBANDA" con lamparitas arriba de la puerta y máquina de pochoclos.
- **Biblioteca:** paredes verde inglés con boiserie, estanterías de piso a techo en toda la pared de adentro y alrededor de la puerta (con lomos de libros de colores), escalera corrediza, alfombra persa, mesa larga con lámparas verdes de banquero, sillones de cuero junto al ventanal, globo terráqueo y plantas.

### Tercer piso (rediseñado)

Salas de noche, con neones (`js/muebles.js`, "Piso 3"). Los carteles van en las paredes de los costados o arriba de la puerta (antes algunos tapaban la puerta).

- **Fiesta Vecibanda:** paredes oscuras con LED, truss en el techo, pista LED de baldosas con estrellas, bola de boliche colgada con haces de colores que giran (sin la lámpara), cabina de DJ con frente LED, bandejas y mixer, parlantes, cabezales móviles y la foto gigante.
- **Estudio de música:** home studio, no sala de ensayo. Escritorio con la compu y dos pantallas (en una el FL Studio con su logo, `assets/especiales/fllogo.jpeg`; en la otra la lista de canales), monitores de estudio en pies, tecladito MIDI, una guitarra eléctrica con ampli chico, micrófono de condensador con antipop y paneles acústicos.
- **Karaoke:** pantalla grande con la letra, neón KARAOKE, escenario bajo con dos micrófonos, sillón largo y mesa ratona.
- **Bar Vecibanda:** terciopelo bordó con zócalo de madera, apliques dorados, barra de mármol, espejo y estantes de botellas iluminados, colgador de copas, banquetas y mesitas.
- **Sala de trofeos (Vecibanda Awards):** estatuillas doradas con alas sobre una base con la placa "VECIBANDA AWARDS", podio 1-2-3 con el neón atrás, vitrinas y alfombra roja.
- **Vecibanda TV:** setup violeta con tres monitores, la pantalla grande con la ciudad de noche, paneles de neón, silla gamer, parlantes con luz, aro de luz, puf y planta.

Algunos muebles cambiaron de nombre (`estudio_musica_bateria` → `pc`, `guitarras` → `guitarra`, `streaming_croma` → `neones`); las partidas viejas los conservan (`MIGRAR` en `js/progresion.js`). Se recalcularon los precios con `node herramientas/balance.mjs --escribir`.
## Precios y duración

Los precios de la mansión están en `js/precios.js` y se calculan con `herramientas/balance.mjs`, que simula una partida completa (unas 3 horas; `node herramientas/balance.mjs --escribir`). Los precios de los objetos especiales y los cuadros se editan directo en `data/objetos.js`.

El progreso se guarda solo en el navegador (localStorage). "Reiniciar partida" en la configuración lo borra.

La música del juego es `assets/especiales/vecicoon.mp3`, en loop sin cortes (`js/sfx.js`: se decodifica en un AudioBuffer y el loop corta donde termina el sonido, salteando el silencio del final del mp3). En el restaurante se baja y suena la radio de Lourdes. En la configuración, al lado del volumen de la música, el botón del parlante la prende y apaga (`musicaOn` en los ajustes, se guarda aunque se reinicie la partida). Los efectos de sonido siguen generados con WebAudio.

## Muebles y pinturas (créditos)

- Los muebles son modelos 3D del **Furniture Kit de Kenney** (kenney.nl), licencia CC0 (dominio público). Están en `assets/muebles/` y se cargan al empezar (`js/modelos.js`): ahí se cambian los colores (madera, metal, tapizados) y qué modelos se usan. Cada habitación los acomoda en `js/muebles.js`.
- Las pinturas famosas son obras de dominio público tomadas de Wikimedia Commons; la lista está en `assets/pinturas/CREDITOS.md`.

## Dufre, Ottati, la moneda y los cuadros de los pasillos

- **Dufre** (`js/dufre.js`) a veces camina por la vereda de la mansión, de punta a punta, y a veces da vueltas a la plaza de la Ciudad Vecibanda (cada 4 minutos puede mudarse, solo si estás lejos de los dos lugares, así nunca desaparece delante tuyo). Siempre con el buzo de entrenamiento negro (franjas blancas, logo y escudo, armado con `herramientas/dufre.py`), el cierre hasta la pera y las manos en los bolsillos. Si te acercás, frena, te mira y te dice "¿Vamo a ver el interno?" (vuelve a decirlo cuando te alejás y volvés).
- **Ottati** (también en `js/dufre.js`) pasea igual que Dufre (los dos usan `Paseante`: vereda de la mansión o plaza de la ciudad). Remera blanca de Nacional con el frente, la espalda y la manga de las fotos (`remeraFotos.espalda` y `manga`), morochito, rapado (`peinado: 'rapado'`) y medio gordito (`gordura: 0.45`, menos que Bauti o la Mazza). Si te acercás, frena, te dice "¿Qué onda mano?" y te ofrece la mano: "Chocar la mano con Ottati (E)". Al chocarla dice "A lo baraja gil" o "Acá ando buscando unas churraskitas gil" (se van turnando). El choque es el mismo que el de Kelvin (`ofrecerMano`, `empezarChoque` y `moverChoque` en `js/gimnasio.js`). La cara sale de un cuadro del video `assets/caras/ottati1.mp4` y la remera de `assets/especiales/remeraottati*.jpeg`, recortadas con `herramientas/ottati.py` (acá en el contenedor, sin servicios externos).
- **La moneda** tiene la cara del Negro Bebé: `assets/moneda.png`, hecha con `herramientas/moneda.py` desde `assets/especiales/moneda.jpeg`.
- **Pasillos:** de las pinturas famosas solo quedó la Gioconda, con la cara de Bauti (bautizoom) puesta acá con OpenCV (`herramientas/gioconda_bauti.py`, sin servicios de IA externos) y su cartel de siempre. En los otros lugares van Masacre, Toto lindo, Veneca y el video de la flauta del pelado, sin cartel. Las pinturas famosas de las habitaciones y del restaurante se sacaron.
- **Flauta del Pelado:** objeto Vecibanda nuevo (flauta dulce verde lima en su pedestal).

## Ciudad Vecibanda y la autopista

Siguiendo la calle de la mansión para el lado del gym arranca la **autopista** (dos carriles por mano, barandas, faroles, árboles y carteles verdes con los km). Son unos 19 km hasta la **Ciudad Vecibanda**: en auto, sobre la autopista, va mucho más rápido (hasta 150 en vez de 34) y se llega en unos 2 minutos; caminando son más de 20. Al salir de la autopista el auto frena solo a la velocidad normal.

La ciudad (`js/ciudad.js`) está armada como una de verdad: una cuadrícula de 8 x 8 manzanas con dos avenidas anchas que se cruzan en el medio (una es la continuación de la autopista), rascacielos de vidrio en el centro, alrededor edificios de 3 a 7 pisos con negocios y toldos sobre la vereda (farmacia, pizzería, kiosco, café, panadería...), y en las afueras casas con jardín y techo de dos aguas. Hay plaza con fuente y la moneda gigante, el Banco Vecibanda (escalinata, columnas y frontón), el Hotel VB, el Super Vecibanda con estacionamiento, una estación de servicio, un parque con juegos, semáforos, sendas peatonales, faroles que se prenden de noche, autos estacionados y gente caminando por las veredas (no hacen nada).

- **Cancha de fútbol:** la pelota se patea caminando contra ella; gol en los arcos.
- **Cancha de básquet:** al lado de la pelota aparece "Tirar al aro (E)". Sale en parábola al aro más cerca; de cerca entra casi siempre y de lejos se erra más (los de afuera de la línea de 3 valen 3).

- **Verdulería** (sobre la avenida, a una cuadra de la plaza): toldo a rayas, cajones de verdura y el verdulero. En el mostrador aparece "Comprar lechuga $500K (E)". Es un easter egg: el juego no dice para qué sirven.
- **Lechugas** (`js/lechugas.js`): van al slot 2 de la barra (al lado del AK, tecla 2). Con una en la mano, tocando (o haciendo clic en) el piso del terreno de la mansión, afuera de la casa, se deja ahí, una por una; tocando una que ya está, se levanta (si te queda alguna en la mano). Cuando no te queda ninguna, el ítem desaparece de la barra. Se guardan en la partida (`estado.lechugas` y `estado.lechugasPuestas`). Una fila en el portón es una valla que la Mazza no cruza. Quedan plantadas en un montoncito de tierra y, si ponés una al lado de otra, se acomoda sola en fila (a 1,5), así la valla sale pareja. No hay ningún botón que lo explique.

Hay unas 50 personas caminando (más en el centro); las que quedan lejos no se dibujan ni se mueven.

## Galpón Vecibanda y Vecibanda Motors (autos)

- **Galpón Vecibanda** (`galpon` en `js/progresion.js`, armado en `js/exterior.js`): otro terreno pegado a la mansión, del lado del garage (`GALPON` en `js/constantes.js`). Como un galpón de campo: chapa acanalada clara (textura `chapa`), zócalo de hormigón, bordes verdes, techo a dos aguas, el portón corredizo corrido a un costado y un camino de hormigón hasta la calle. Su botón aparece al 60% (`AUTOS_DESDE`, con `desde` en el ítem); cuesta 20B fijo y es opcional (no hace falta para el cartel final ni cuenta para las 3 horas).
- **Vecibanda Motors** (`js/auto.js`): está desde el principio (se ve, con los autos adentro), pero abre al 60%: antes la puerta de vidrio está cerrada, arriba dice "CERRADO · ABRE AL 60%" y no te deja entrar; al abrir, la puerta desaparece y avisa. A la salida de la ciudad, al costado de la autopista (`CONCESIONARIO`), como la foto de referencia: caja de paneles gris oscuro, vidriera de punta a punta, el nombre en la franja de arriba, cielorraso blanco con tiras de luz, escalones con luces, canteros y una palmera. Adentro, los autos con su cartel (nombre, precio y precio de verdad); el más caro, en una plataforma que gira. Solo se dibuja de cerca y los modelos se cargan recién cuando te acercás.
- **Comprar:** acercate a un auto y "Comprar … (E)". Sin el galpón no se puede ("Primero comprá el Galpón Vecibanda"). El auto queda en el galpón (`estado.autos`), estacionado en su lugar, y **se maneja** igual que el Auto Deportivo (`AutoComprado` en `js/auto.js`), cada uno con su velocidad, aceleración y agarre de verdad (ver Autódromo).
- **Autos y precios** (`AUTOS` en `data/objetos.js`, ahí se agregan más): precio en el juego = 9B × (precio real en dólares / 350) ^ 0,6, redondeado (350 dólares es la Jordan 3 x J Balvin, que sale 9B). Con la proporción exacta el McLaren costaría 41T (más de 50 horas de juego), así que la escala se comprime pero mantiene el orden y los hace carísimos. Al final de la partida se ganan ~216M por segundo: el Miata sale unos 6 minutos de eso y la F40, unas 3 horas.

| Auto | De verdad (aprox.) | En el juego |
| --- | --- | --- |
| Mazda MX-5 Miata (NA) | US$ 12.000 | 75B |
| BMW Serie 3 E36 | US$ 14.000 | 85B |
| VW Golf GTI Clubsport | US$ 28.000 | 130B |
| Nissan GT-R R35 | US$ 120.000 | 350B |
| McLaren P1 | US$ 1.600.000 | 1,5T |
| Ferrari F40 | US$ 3.200.000 | 2,5T |

- **Modelos 3D** (`assets/autos/`, de Sketchfab): venían con 100 a 400 mil triángulos cada uno; `herramientas/autos.mjs` (gltf-transform, acá en el contenedor) les saca el motor y las piezas diminutas, simplifica (con cuidado la carrocería, los vidrios y las luces) hasta ~30 mil triángulos, deja solo la textura de color a 256 px y comprime con meshopt: quedan entre 0,6 y 1 MB. Los zips originales se sacaron del repo (pesaban 58 MB para GitHub Pages); siguen en el historial de git (commits "Add files via upload").
- **Créditos** (CC-BY 4.0 salvo el Golf, CC-BY-NC-SA 4.0): Mazda Miata MX-5, BMW 3-Series E36 [Street] y Nissan Skyline GTR R35 por [Black Snow](https://sketchfab.com/BlackSnow02); McLaren P1 y Ferrari F40 por [vecarz / Nic Cheung](https://sketchfab.com/heynic); 2016 Volkswagen Golf GTI Clubsport Mk7 por [Ddiaz Design](https://sketchfab.com/ddiaz-design). Modificados (achicados) para el juego.

## Autódromo Vecibanda Ring

- **Dónde:** a mitad de la autopista, del lado de las casas (`AUTODROMO` en `js/constantes.js`). El estadio está desde el principio (se ve y es sólido), pero abre al 60%, igual que sus dos misiones: antes la puerta tiene el cartel "CERRADO · ABRE AL 60%" y no te deja entrar (`js/autodromo.js`).
- **El estadio** (`ARENA`), estilo Allianz Arena: un óvalo enorme (unos 140 × 90 m y 42 m de alto) de almohadones romboidales inflados, que de día se ve blanco plateado y de noche brilla en rojo; base de vidrio oscuro con entradas iluminadas, techo blanco con un anillo de luz, "VECIBANDA RING" en letras blancas grandes y el logo de Sancor Seguros en la fachada, la entrada principal con marquesina mirando a la autopista, plaza, estacionamientos con sus líneas a los costados y torres de luz (también a lo largo de la pista).
- **Pista:** el trazado del dibujo de referencia (`TRAZADO`, en píxeles de la imagen), pasado por una curva suave: 1,58 km y 14 m de ancho, al estilo de un circuito de F1: asfalto oscuro con línea blanca en el borde, pianos anchos rojos, blancos y azules adentro y afuera de cada curva (con franja blanca atrás), leca de arena del lado de afuera de las curvas cerradas, postes rojos y blancos en los vértices, paredes de publicidad (marcas de la Vecibanda y Sancor Seguros) que frenan al auto, alambrado arriba de las paredes y árboles atrás (donde el trazado pasa cerca de sí mismo, no se ponen para no tapar la pista). Línea de largada a cuadros, semáforo arriba de la línea, dos tribunas de dos bandejas con techo llenas de huevos (la mayoría blancos y algunos pintados; festejan cuando hacés récord) y un huevo banderillero que agita la bandera a cuadros al largar y en cada vuelta. El cartel "vecibandaring" del edificio se achica hasta entrar entero.
- **Cómo se juega:** en la puerta, "Entrar al autódromo (E)" abre la pantalla con todos los autos (los que no tenés, bloqueados): velocidad, aceleración y agarre, tus medallas, los tiempos de cada una y tu récord. Elegís uno y largás detenido: rojo, amarillo, verde (con el semáforo el auto no se mueve). Son vueltas cronometradas; el panel muestra la vuelta, el tiempo, la última, tu récord, la próxima medalla y la velocidad. Por el pasto se va mucho más despacio, las paredes frenan el auto en seco y, como en la F1, pasarse de los límites de pista (más allá del piano y la franja blanca) anula la vuelta. "Salir del autódromo (E)" te deja a pie en la entrada (el auto de la carrera es aparte: el tuyo sigue donde estaba).
- **Simulación y medallas:** un piloto automático da vueltas con la misma física del juego (`simular`), siguiendo el medio de la pista, usando casi todo el agarre y frenando justo para cada curva (sin pasarse nunca de los límites), con el auto mejorado en el Taller según la medalla (`NIVEL_MEDALLA` en `data/taller.js`): bronce = 4% más lento que él con el auto de fábrica, plata = empatarle con todas las mejoras al nivel 2, oro = ganarle por 2% con todo al máximo. Sin mejorar el auto, el oro es casi imposible (hay que ser un 14% más rápido que el piloto automático). Oro: McLaren P1 0:50,9 · GT-R 0:55,5 · F40 0:57,9 · Golf GTI 1:02,9 · BMW E36 1:07,2 · Miata 1:09,1 · Auto Deportivo 1:18,1. Los tiempos se calculan una vez y quedan guardados en el navegador (`vecibanda-objetivos`, con una firma: si cambian los autos o las mejoras, se recalculan). En la carrera, el auto corre con sus mejoras y su pintura.
- **Frenos:** en el auto, el botón de saltar (Espacio) es el freno (frena a fondo, ≈ 1,15 g); con el freno o al frenar con atrás se prenden las ópticas traseras de cada auto: en el Auto Deportivo cambian de rojo apagado a rojo prendido, y en los del concesionario se les pone encima una capa roja con la misma forma (`capaFreno` en `js/auto.js`: los triángulos de las ópticas de cada modelo, elegidas por el nombre del material en `OPTICAS`; la Ferrari usa la textura de su tapa trasera, así se prenden solo las cuatro luces redondas).
- **Derrapar:** manteniendo Shift (manejando, Shift no es el Shift Lock) o el botón "Derrapar" (aparece en el lugar del de agacharse mientras manejás, y se pinta de amarillo cuando el auto va cruzado) la cola se suelta: la trompa gira más rápido que la trayectoria, el auto se va de costado y pierde velocidad según cuánto cruce. Al soltar, las gomas agarran y se endereza solo. El piloto automático no derrapa.
- **Sponsor:** Sancor Seguros (`assets/especiales/sancor.png` y `sancor_blanco.png`, recortados del logo con `herramientas/sancor.py`): en las paredes, el pórtico del semáforo, las tribunas, la fachada del estadio, el tótem de la entrada y la pantalla del autódromo.
- **Premios** (`estado.autodromo`): cada medalla paga una vez por auto: bronce 50 M o 1 minuto de lo que ganás, plata 120 M o 2,5 minutos, oro 300 M o 5 minutos (lo que sea más). La plata grande está en las misiones Hot-Wheels y Verstappen. Cada récord tuyo por debajo del bronce paga 18 segundos de ingreso (mínimo 15 M) por cada segundo que mejorás, más el básico, con tope de 6 veces eso.
- **Física de verdad** (`specsAuto` y `pasoAuto` en `js/auto.js`, los números en `data/objetos.js`): cada auto con su velocidad máxima, su 0 a 100 km/h y su agarre reales. La aceleración baja a medida que se acerca a la máxima; frena con el agarre (≈ 1 g); y a más velocidad menos puede doblar (el giro se limita por la aceleración lateral), así que hay que frenar para las curvas. En la autopista y en el autódromo cada auto llega a su máxima de verdad (el Auto Deportivo, un BYD F0, a 151 km/h; el McLaren, a 350); en el barrio y la ciudad hay un tope de calle (unos 50 km/h el Deportivo, un poco más los rápidos).

## Perros

Olga (labradora negra de 5-6 meses, con su osito de peluche, como en las fotos), Olivia (labradora rubia, bien gordita) y Pancho (salchicha mini negro y marrón). Aparecen para comprar al 75% (`PERROS` en `data/objetos.js`: precio fijo, opcionales, como el galpón) y se sientan afuera, a la derecha de la entrada, mirando a la calle. Mueven la cola, te miran cuando te acercás y con "Hacerle mimos (E)" ladran, ladean la cabeza y les salen corazones (`Perros` en `js/ladron.js`). Cuidan la casa: cuando no estás y llega la Schwepa, la echan ("La Schwepa te vino a robar..... ¡Olga defendió tu plata de la Schwepa!").

## Mapa

Arriba a la derecha está el minimapa (centrado en vos, con el norte arriba y una flecha azul para donde mirás o manejás). Tocándolo, o con la N, se abre el mapa entero a pantalla completa: se arrastra para moverse y se hace zoom con la rueda, pellizcando o con + y −. N o Esc lo cierran. La playa se ve con la arena, el mar (turquesa en la orilla y azul hacia el horizonte) y el muelle. Lo que todavía no desbloqueaste (autódromo, Vecibanda Motors y el taller antes del 60%, el casino antes del 25%, el restaurante antes del 30% y el galpón hasta que lo comprás) aparece tapado con un "?" y con "?" de nombre (`oculto` en `js/main.js`).

- **Qué se ve:** fotos desde arriba de verdad (una cámara ortográfica, de día, sin cielo, nubes ni carteles flotantes) del barrio (la mansión con lo que compraste, el gym, el galpón, el restaurante, las casas, los árboles y la montaña), del autódromo (la pista con los pianos, el estadio y el estacionamiento) y de la ciudad con Vecibanda Motors y el Taller. Abajo, el plano dibujado: la calle, la autopista con la línea del medio, la pista y la ciudad (cada manzana con su color y las calles y avenidas), así se ve todo aunque todavía no haya foto. Arriba, los nombres: los grandes siempre y los demás (las tiendas, la plaza, el súper, el garage...) cuando hay zoom.
- **Cuándo se sacan las fotos** (`capturarMapa` en `js/main.js`): de a una, al empezar (el autódromo y el barrio), el barrio de nuevo si compraste algo (cada 90 s como mucho, o al abrir el mapa) y la ciudad cuando terminó de armarse (se arma cuando vas para ese lado; antes se ve su plano). El dibujo está en `js/ui.js` (Mapa) y el plano de la ciudad sale de `planoCiudad` (`js/ciudad.js`).

## Taller

Al lado de Vecibanda Motors, a la salida de la ciudad (`TALLER` en `js/constantes.js`, `Taller` en `js/auto.js`). Abre al 60%, igual que el concesionario: antes se ve, pero con el portón bajo y el cartel "CERRADO · ABRE AL 60%". Galpón de chapa naranja con el portón levantado (la chapa enrollada arriba), marco de franjas amarillas y negras, el cartel de neón "TALLER" arriba del portón y otro alto al costado de la autopista, tira de neón en el alero y lámparas colgando con luz cálida adentro.

- **Entrar:** llegás manejando un auto (no el helicóptero). A unos 3 m del portón aparece arriba "E · Entrar al taller" y el botón "Entrar al taller (E)". Adentro el auto queda en el box (líneas amarillas y el elevador) y la cámara lo mira más alta y alejada, con la pared de las herramientas de fondo (llaves, martillo, destornilladores, sierra, el banco y el carro rojo).
- **Menú:** a la izquierda, 6 pestañas con íconos (Motor, Turbo, Gomas, Frenos, Pintura, Llantas) que cambian el contenido sin cerrar. A la derecha se ve el auto de verdad en el taller (se gira arrastrando) y abajo la tarjeta de stats: velocidad máxima, aceleración, manejo y frenado. Con el mouse o el foco sobre una mejora, cada barra muestra en franja translúcida el valor nuevo y "+X%" en verde.
- **Mejoras:** 4 niveles por pestaña, cada uno una tarjeta con ícono, nombre (por ejemplo "Pistones de competición"), lo que mejora, el precio y el botón. Los comprados tienen el check; el siguiente, el borde iluminado; los demás, grises con candado. Sin plata, el precio sale en rojo y el botón queda apagado, con un cartelito que dice cuánto falta. Al comprar: destello en la tarjeta, sonido y el contador de plata baja animado (pasa arriba a la derecha mientras estás en el taller).
- **Pintura y llantas:** 8 colores con el elegido marcado con un anillo blanco, la rueda de tono con el cuadrado de saturación y brillo, y el código hexadecimal. El color cambia en vivo sobre el auto; "Pintar" lo cobra y lo guarda, y si cerrás o cambiás de pestaña sin confirmar vuelve al de antes. Arriba del auto, dos botones para elegir qué pintar (carrocería o llantas). Qué piezas de cada modelo son carrocería y llantas está en `PARTES` (`js/auto.js`).
- **Datos** (`data/taller.js`): nombre, ícono, efecto y precio de cada nivel (fracción del precio del auto; el Auto Deportivo cuenta como uno de 20 B), el precio de la pintura (0,5% del auto) y los 8 colores. Las mejoras entran en la física de siempre (`specsAuto(def, mejoras)` en `js/auto.js`): Motor sube la velocidad máxima, Turbo baja el 0 a 100, Gomas sube el agarre en las curvas y Frenos, la frenada. Se guardan en `estado.taller[id del auto]` con la partida.

## Tiendas de ropa y el ropero

Sobre la avenida, enfrente de la plaza, hay tres tiendas: **KICKS** (zapatillas, joggings y la gorra; el cartel es `assets/especiales/logotiendaderopa.png`), **VECI DRIP** (remeras BAPE, Supreme, Corteiz y los conjuntos Corteiz) y **LA FUTBOLERA** (camperas de clubes, buzo SAFA y botines F50). En la vidriera hay maniquíes vestidos con la ropa de la tienda, y al fondo el que atiende (también vestido con ropa de ahí). En el mostrador aparece "Ver la ropa (E)" y se abre el catálogo. La ropa es cara (de 500 millones a 9 mil millones): es para el final de la partida. Con la primera compra, el que atiende te explica que te la ponés en el ropero.

Arreglos aparte (`herramientas/rellenar_ropa.py`, después de `ropa.py`): el buzo Corteiz celeste usa solo el cuerpo de la foto (sin capucha, mangas ni fondo) y el jogging celeste se endereza pierna por pierna para que no quede fondo; al jogging Jordan se le borraron la mano de la modelo, la piel y las zapatillas rellenando con IA (LaMa, corriendo acá con onnxruntime, sin servicios externos). Las zapatillas 3D tienen los costados hechos en tiras (`tapa` en `js/zapatillas.js`) para que al angostar la punta y el talón no se hundan y asome el pantalón (pasaba sobre todo en las Balvin).

- **Bauti** no consigue nada de su talle mientras está gordo ("Disculpá bro, no nos queda talle XXXXL") y el ropero tampoco le sirve. Cuando adelgaza en el Power Camp, ya puede.
- **Ropero:** en cualquier ropero comprado de la mansión aparece "Abrir ropero (E)". A la izquierda está tu personaje en 3D girando (se puede girar arrastrando) y a la derecha tus prendas por tipo. Tocás una y te la probás; "Ponérmelo" la deja puesta. Cada personaje tiene su propia ropa puesta (`estado.vestuario`); lo comprado está en `estado.ropa`.
- **Misión Empilchado** (de cualquier personaje): "Comprate 5 pilchas ricas". Las misiones de cualquiera llevan en el panel un ícono propio (tres muñequitos de bloques, "Todos") en vez de la cara de un personaje.
- **Cambiar de personaje** solo se puede adentro de la mansión (si no, el aviso sale en la misma pantalla de configuración o del menú).

Cómo se arma la ropa: `herramientas/ropa.py` recorta las fotos de `assets/ropa/` acá en la compu (rembg local) y deja en `assets/ropa/prendas/` el frente de cada remera/buzo/campera (solo el cuerpo, entre los brazos), la manga (enderezada de la foto, del hombro al puño, o tela lisa con puño para los buzos), la tela, las dos piernas de cada pantalón y el frente de la gorra; y en `assets/ropa/tienda/` la foto recortada del catálogo. En la foto del conjunto Corteiz negro la manga del buzo tapaba el jogging: se borra con inpainting de OpenCV (también local) y se rellena con el negro del pantalón, en el catálogo y en la prenda puesta. `js/vestir.js` las carga y `js/personaje.js` las pone en el muñeco: el frente a la medida del torso, las mangas largas siguiendo el brazo con la mano asomando, cada pierna con su mitad del pantalón. Las zapatillas no son fotos: son modelos 3D (`js/zapatillas.js`) con suela, capellada, puntera, cordones y los detalles de cada una (la pipa de Nike calcada del logo, las columnas de las Shox, las burbujas y ondas de las TN, el estampado elefante y el atardecer de las J Balvin, los tapones de los F50). Precios y tiendas en `data/ropa.js`.

Para la Chromebook: cada manzana es una sola malla por material (lo que no se ve no se dibuja), los choques de la ciudad están en una grilla (solo se miran los de alrededor) y la ciudad se arma recién cuando vas para ese lado, de a una manzana por cuadro, así no se traba.
