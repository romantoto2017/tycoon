# Memoria del proyecto

Notas entre sesiones (las sesiones web no se acuerdan de nada solas). Leer al empezar, actualizar al terminar cada tarea. Corto: una línea por cosa.

## Decisiones
- Plugins: solo ponytail anda solo. claude-mem no sirve en la web: su memoria se borra con el contenedor y sincronizarla pide cuenta paga (cmem.ai Pro) y una terminal.

## Pendiente
- Aprobar los números de la tanzania (data/tanzania.js): están en el juego con la propuesta.
- Liberar el terreno viejo de Tepho y le shpet pasa cuando entra cualquiera al juego publicado (Firebase no se puede tocar desde el contenedor).
- Multijugador y chat: probados solo con la red local de prueba; con Firebase real lo prueba el dueño.

## Último trabajo
- PASADO AL JUEGO (pasar_prueba.sh, ahora sin borrar assets): costa, tanzania, celular/Tranzapp, COMCAR, policía, autos visibles en multi. Partidas viejas cargan igual (mismas claves). prueba/ queda igual al juego para la próxima actu.
- COMCAR rediseñado: 2 pabellones de 3 pisos (H=7.4) enfrentados con patio interno, fachada azul/blanca con torres INR M4, rejas como planos con textura (reja()), carteles pintados en pared, torres de piedra, bandera. Gente y policía solo con estado.costa. Sin fuga automática de otros presos; visitas reales = posiciones de red + aviso (enSalaVisitas).
- EN PRUEBA: autos/heli de los demás se ven (pos.c = id del auto, m=3 heli). COMCAR (comcar.js, COMCAR en constantes): cárcel con presos esposados, guardias, Módulo 4, comedor, baños, patio, visitas; 8 pasos de fuga con el Extravirgen (túnel) o soborno a Benítez; estado.carcel. Policía (policia.js): patrullero con punto rojo en el mapa, controla y te encarcela si llevás tanzania.
- Tranzapp: pedidos de gente común (una casa por manzana de la ciudad, 12 casillas de la Cachimba; nombres GENTE/VILLA en celular.js), cada 30-75 s, hasta 4.
- EN PRUEBA: celular (Tranzapp + TanzaCoin, celular.js; se consigue vendiendo a un dueño), entregas con la van y punto azul (UI.marcasMapa), contador en el galpón, ojos rojos por personaje (OJOS en fumar.js), gente fumando tras 5 entregas, villeros compran, Bauti trabado pega y manda al cielo.
- EN PRUEBA: costa rediseñada (cerro con camino subible en auto, barrio privado, 4 mansiones con estilos reales), warehouse verde oscuro por dentro, camioneta manejable, fumar (F/🌿, ojos rojos), vender a Francis (1,8x) y El Humano (1,5x).
- Link de prueba con ?completa (antes del #): mansión 100% + 500T guardados en la partida de prueba (PEDIR_COMPLETA en prueba/js/entorno.js).
- EN PRUEBA (prueba/): Nico Baraja (nico.js, 200B al 99%, estado.costa), la costa (costa.js: bifurcación, acantilado, playa, 4 mansiones con dueños-compradores en data/compradores.js) y el tycoon de tanzania (tanzania.js + data/tanzania.js, estado.tanzania). Precios de tanzania = propuesta, falta que el dueño los apruebe.
- prueba/ cerrada con llave: …/prueba/#llave=… (solo la tiene el dueño; en el repo solo HUELLA en entorno.js). Si se pierde, generar otra y cambiar HUELLA.
- Copia de prueba en prueba/ (/.../prueba/): partidas con clave prueba-..., Firebase bajo prueba/ (js/entorno.js). La actu grande se hace ahí y se pasa con herramientas/pasar_prueba.sh.
- Una sola partida: sin lugar/conexión/sacado no se juega (arranque.js). Tepho y le shpet NO están echados: si entran desde una sesión sin terreno (app) se llevan el de su otra sesión (Safari) aunque esté abierta; la vieja queda en movidos/ y no entra (LIBERAR en red.js). Progreso: el de la sesión nueva (decisión del dueño). Aviso de ocupados muestra los nombres.
- Mapa negro/calor: foto del mapa en pedazos de 512 (antes ~50 MB de golpe), sin render 3D con el mapa abierto, lienzo del mapa se libera al cerrar; cuadros >1024 achicados (texturas 127→93 MB barrio, 179→135 ciudad); Constructor y Pila sueltan arrays al subir.
- iPhone otra vez: la Cachimba se arma recién a <1000 de distancia (antes al cargar: pico de memoria); peatones y villeros con sinCara (se vacía también el frente). Canvas vivos ~37 MB.
- Perros revividos vuelven a echar a la Schwepa 1 vez (defendio=false). paseoCiudad: vuelta a un grupo de manzanas al azar (no solo la plaza). Chat muestra 'Conectados (N)'.
- El Humano (humano.js, de noche en la ciudad; 3 noches dándole plata = invita) y La Cachimba del Piojo (cachimba.js, CACHIMBA en constantes, solo con estado.cachimba). Mar del mapa: PLAYA.mar.x0 = -1150 (tapaba el autódromo).
- Ciudad a 3 km (antes 20): CIUDAD.x = -4000. Hilario José (hilario.js, solo ciudad, hoverboard). Geometry Dash en el arcade (geometry.js). Astrohijo paga 1T.
- Lagatta Bar en la ciudad (bar.js), misiones Astrohijo/Palleiro/Pou/Valcohol. Los efectos de tomar no se explican en ningún texto del juego (pedido del dueño).
- Regla nueva en CLAUDE.md: no romper el progreso de los jugadores.
- Multijugador con Firebase (proyecto vecibandatycoon) y chat con globo sobre la cabeza.
- Música con loop natural.
- 10º terreno (LOTES[9] = -230, al final para no mover a nadie) para el amigo de la compu; LOTES_TOTAL=10: con los 10 ocupados la partida queda cerrada.
