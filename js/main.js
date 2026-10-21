import * as THREE from 'three';
import { PERSONAJES } from '../data/personajes.js';
import { crearMundo } from './mundo.js';
import { Jugador } from './jugador.js';
import { Controles } from './controles.js';
import { Tycoon } from './tycoon.js';
import { crearPersonaje } from './personaje.js';
import { prepararMoneda, cargarCabeza } from './texturas.js';
import { cargar, guardar, borrar, cargarAjustes, guardarAjustes } from './guardado.js';
import { iniciarAudio, setVolumenes, pausarAudio, sfx } from './sfx.js';
import * as UI from './ui.js';
import { formato } from './util.js';
import { cargarModelos, MODELOS } from './modelos.js';
import { ITEMS } from './progresion.js';

async function iniciar() {
  // La fuente redonda tiene que estar lista antes de dibujar carteles.
  await Promise.race([
    document.fonts ? document.fonts.load('700 40px Fredoka') : null,
    new Promise((r) => setTimeout(r, 2000)),
  ]).catch(() => {});
  await Promise.all([prepararMoneda(), cargarModelos(MODELOS)]);

  const canvas = document.getElementById('juego');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(pixelRatio);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(70, 1, 0.2, 900);
  const ajustar = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
  };
  window.addEventListener('resize', ajustar);
  ajustar();

  const mundo = crearMundo(escena);
  const colisiones = [];
  const jugador = new Jugador(escena);
  const controles = new Controles(canvas);

  const estado = cargar();
  // ?completo: muestra la mansión terminada sin tocar la partida guardada.
  const vistaCompleta = new URLSearchParams(location.search).has('completo');
  if (vistaCompleta) estado.compras = ITEMS.map((i) => i.id);
  // Partidas guardadas antes de que el terreno fuera una compra.
  if (estado.compras.length && !estado.compras.includes('terreno')) estado.compras.unshift('terreno');
  let reiniciando = false;
  const guardarAhora = () => { if (!reiniciando && !vistaCompleta) guardar(estado); };

  const tycoon = new Tycoon({ escena, colisiones, estado, ui: UI, guardar: guardarAhora });
  tycoon.reconstruir();
  tycoon.lote.absorber(mundo.estaticos);
  UI.prepararHUD();

  // ---------- Ajustes ----------
  const ajustes = cargarAjustes();
  const aplicarAjustes = () => {
    setVolumenes({ general: ajustes.general, musica: ajustes.musica, efectos: ajustes.efectos });
    controles.sensibilidad = ajustes.sensibilidad;
    guardarAjustes(ajustes);
  };
  UI.prepararConfig(ajustes, aplicarAjustes);
  aplicarAjustes();

  // ---------- Pantallas ----------
  // 'menu' | 'seleccion' | 'juego'
  let modo = 'menu';
  // ---------- Auto ----------
  let conduciendo = false;
  const ejes = { x: 0, y: 0 };
  const tmpBajada = new THREE.Vector3();
  const btnManejar = document.getElementById('btn-manejar');
  let textoManejar = '';
  const cercaDelAuto = () => {
    const a = tycoon.auto;
    return a && jugador.pos.y < 2 && Math.hypot(jugador.pos.x - a.pos.x, jugador.pos.z - a.pos.z) < 6;
  };
  const subirOBajar = () => {
    const a = tycoon.auto;
    if (!a) return;
    if (conduciendo) {
      conduciendo = false;
      jugador.pos.copy(a.puntoBajada(tmpBajada));
      jugador.vel.set(0, 0, 0);
    } else if (cercaDelAuto()) {
      conduciendo = true;
      a.vel = 0;
      controles.yaw = a.angulo + Math.PI;
    }
    jugador.conduciendo = conduciendo;
    jugador.contenedor.visible = !conduciendo;
    jugador.sombra.visible = !conduciendo;
  };
  btnManejar.addEventListener('click', subirOBajar);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && modo === 'juego' && controles.activo) subirOBajar();
  });

  const ir = (nuevo) => {
    if (nuevo !== 'juego' && conduciendo) subirOBajar();
    modo = nuevo;
    UI.mostrar('menu', nuevo === 'menu');
    UI.mostrar('seleccion', nuevo === 'seleccion');
    UI.mostrar('hud', nuevo === 'juego');
    UI.mostrar('config', false);
    controles.activo = nuevo === 'juego';
    if (nuevo === 'juego' && estado.compras.length === 0) UI.toast('Pisá los botones verdes para comprar', 'info');
    if (nuevo === 'juego' && tycoon.reintegro) {
      UI.toast(`¡Mansión nueva! Te devolvimos ${formato(tycoon.reintegro)} de lo que ya no entra`, 'plata');
      tycoon.reintegro = 0;
    }
    if (nuevo === 'menu') {
      document.getElementById('menu-progreso').textContent =
        estado.compras.length ? `Mansión ${Math.floor(tycoon.progreso * 100)}% · ${UI.duracion(estado.tiempoJugado)} jugados` : '';
      guardarAhora();
    }
  };

  const ponerPersonaje = async (p) => {
    jugador.setModelo(crearPersonaje(p, await cargarCabeza(p)));
    jugador.factorVel = p.velocidad || 1;
    estado.personaje = p.id;
    guardarAhora();
  };
  const personajeGuardado = () => PERSONAJES.find((p) => p.id === estado.personaje);

  const abrirSeleccion = async () => {
    await UI.armarSeleccion(PERSONAJES, estado.personaje, async (p) => {
      pantallaCompleta();
      iniciarAudio();
      await ponerPersonaje(p);
      ir('juego');
    });
    ir('seleccion');
  };

  // En el celu: pantalla completa y trabada en horizontal (Android; en iPhone no se puede,
  // ahí se juega agregándolo a la pantalla de inicio y aparece el aviso para girarlo).
  const pantallaCompleta = () => {
    if (!matchMedia('(pointer: coarse)').matches || document.fullscreenElement) return;
    document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  };

  const $ = (id) => document.getElementById(id);
  $('btn-jugar').addEventListener('click', () => {
    pantallaCompleta();
    iniciarAudio();
    if (personajeGuardado()) ir('juego');
    else abrirSeleccion();
  });
  $('btn-menu-personaje').addEventListener('click', () => { iniciarAudio(); abrirSeleccion(); });
  $('btn-volver-seleccion').addEventListener('click', () => ir(personajeGuardado() && modo === 'seleccion' && volverAlJuego ? 'juego' : 'menu'));

  let volverAlJuego = false;
  const abrirConfig = () => {
    controles.activo = false;
    UI.mostrar('config', true);
  };
  const cerrarConfig = () => {
    UI.mostrar('config', false);
    controles.activo = modo === 'juego';
  };
  $('btn-config').addEventListener('click', abrirConfig);
  $('btn-cerrar-config').addEventListener('click', cerrarConfig);
  $('btn-salir-menu').addEventListener('click', () => { volverAlJuego = false; ir('menu'); });
  $('btn-cambiar-personaje').addEventListener('click', () => { volverAlJuego = true; abrirSeleccion(); });
  $('btn-reiniciar').addEventListener('click', async () => {
    if (await UI.pedirConfirmacion()) {
      reiniciando = true;
      if (!vistaCompleta) borrar();
      location.reload();
    }
  });
  $('btn-final').addEventListener('click', () => {
    UI.mostrar('final', false);
    controles.activo = modo === 'juego';
  });
  UI.onCelebrar(() => { controles.activo = false; });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' || modo !== 'juego') return;
    if (UI.visible('config')) cerrarConfig();
    else if (!UI.visible('confirmar') && !UI.visible('final')) abrirConfig();
  });

  // Personaje de fondo mientras se ve el menú.
  const elegido = personajeGuardado();
  await ponerPersonaje(elegido || PERSONAJES[0]);
  if (!elegido) estado.personaje = null;
  ir('menu');
  UI.mostrar('cargando', false);

  // ---------- Guardado automático ----------
  setInterval(guardarAhora, 5000);
  document.addEventListener('visibilitychange', () => {
    pausarAudio(document.hidden);
    if (document.hidden) guardarAhora();
  });
  window.addEventListener('pagehide', guardarAhora);

  if (location.search.includes('debug')) window.juego = { estado, jugador, tycoon, controles, ir, camara };

  // ---------- Cámara ----------
  const objetivo = new THREE.Vector3().copy(jugador.pos);
  const rayo = new THREE.Ray();
  const punto = new THREE.Vector3();
  const deseada = new THREE.Vector3();
  let distActual = controles.dist;

  // Acerca la cámara si hay una pared o un techo entre ella y el jugador.
  const distanciaLibre = (origen, dir, maxDist) => {
    rayo.set(origen, dir);
    let d = maxDist;
    for (const b of colisiones) {
      if (b.camara === false || b.containsPoint(origen)) continue;
      if (rayo.intersectBox(b, punto)) {
        const dist = punto.distanceTo(origen);
        if (dist < d) d = dist;
      }
    }
    return Math.max(0.5, d - 0.5);
  };

  const derecha = new THREE.Vector3();
  const camaraJuego = (dt) => {
    if (conduciendo) {
      // La cámara se acomoda sola detrás del auto.
      let d = tycoon.auto.angulo + Math.PI - controles.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      controles.yaw += d * Math.min(1, dt * 3);
    }
    // Como en Roblox: en primera persona o con Shift Lock el personaje mira hacia donde mira la cámara.
    const primera = controles.primeraPersona && !conduciendo;
    jugador.mirarA = (primera || controles.shiftLock) && !conduciendo ? controles.yaw + Math.PI : null;
    objetivo.lerp(jugador.pos, Math.min(1, dt * 14));
    const cabeza = new THREE.Vector3(objetivo.x, objetivo.y + 4.5, objetivo.z);
    if (controles.shiftLock && !primera) {
      // Shift Lock: la cámara va un poco a la derecha, por encima del hombro.
      derecha.set(Math.cos(controles.yaw), 0, -Math.sin(controles.yaw));
      cabeza.addScaledVector(derecha, 1.75);
    }
    const cp = Math.cos(controles.pitch);
    const dir = new THREE.Vector3(Math.sin(controles.yaw) * cp, Math.sin(controles.pitch), Math.cos(controles.yaw) * cp);
    if (primera) {
      distActual = 0;
      camara.position.copy(cabeza);
      camara.lookAt(cabeza.x - dir.x, cabeza.y - dir.y, cabeza.z - dir.z);
    } else {
      const libre = distanciaLibre(cabeza, dir, controles.dist);
      // Acercarse al toque si hay una pared; alejarse suave.
      distActual = libre < distActual ? libre : distActual + (libre - distActual) * Math.min(1, dt * 5);
      deseada.copy(cabeza).addScaledVector(dir, distActual);
      if (deseada.y < 0.6) deseada.y = 0.6; // el pasto no choca: que no se meta abajo
      camara.position.copy(deseada);
      camara.lookAt(cabeza);
    }
    // Con la cámara pegada al personaje, se oculta (si no, tapa toda la pantalla).
    if (jugador.modelo) jugador.modelo.grupo.visible = distActual > 2.2;
  };

  let anguloMenu = 0.6;
  const camaraMenu = (dt) => {
    if (jugador.modelo) jugador.modelo.grupo.visible = true;
    anguloMenu += dt * 0.08;
    camara.position.set(Math.sin(anguloMenu) * 125, 70, -17 + Math.cos(anguloMenu) * 125);
    camara.lookAt(0, 16, -17);
  };

  // ---------- Bucle ----------
  const reloj = new THREE.Clock();
  const dir = new THREE.Vector3();
  let medida = 0;
  let cuadros = 0;

  const bucle = () => {
    requestAnimationFrame(bucle);
    const real = reloj.getDelta();
    const dt = Math.min(real, 0.05);

    if (conduciendo) {
      tycoon.auto.actualizar(dt, controles.ejes(ejes), colisiones);
      jugador.pos.copy(tycoon.auto.pos);
    } else {
      controles.direccion(dir);
      jugador.autoSalto = controles.esTactil;
      if (jugador.actualizar(dt, dir, controles.saltar, colisiones, tycoon.agua)) sfx.salto();
    }
    const texto = modo !== 'juego' ? '' : conduciendo ? 'Bajar del auto (E)' : cercaDelAuto() ? 'Manejar (E)' : '';
    if (texto !== textoManejar) {
      textoManejar = texto;
      btnManejar.textContent = texto;
      btnManejar.classList.toggle('oculto', !texto);
    }
    tycoon.actualizar(dt, jugador);
    mundo.actualizar(dt);
    if (modo === 'juego') {
      estado.tiempoJugado += dt;
      UI.actualizarHUD(estado.plata, tycoon.ingresoPorSegundo, tycoon.progreso);
      camaraJuego(dt);
    } else {
      camaraMenu(dt);
    }

    // Si la máquina no llega a 40 fps, bajar la resolución de a poco
    // (se ignoran los primeros segundos, que siempre son lentos). Va antes de dibujar:
    // cambiar el tamaño del canvas lo borra.
    if (real < 0.25 && reloj.elapsedTime > 4) {
      medida += real;
      cuadros++;
      if (medida > 2) {
        if (cuadros / medida < 40 && pixelRatio > 0.6) {
          pixelRatio = Math.max(0.6, pixelRatio - 0.15);
          renderer.setPixelRatio(pixelRatio);
          ajustar();
        }
        medida = 0;
        cuadros = 0;
      }
    }

    renderer.render(escena, camara);
  };
  bucle();
}

iniciar();
