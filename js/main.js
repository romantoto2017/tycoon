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

async function iniciar() {
  // La fuente redonda tiene que estar lista antes de dibujar carteles.
  await Promise.race([
    document.fonts ? document.fonts.load('700 40px Fredoka') : null,
    new Promise((r) => setTimeout(r, 2000)),
  ]).catch(() => {});
  await prepararMoneda();

  const canvas = document.getElementById('juego');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(pixelRatio);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(65, 1, 0.3, 900);
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
  // Partidas guardadas antes de que el terreno fuera una compra.
  if (estado.compras.length && !estado.compras.includes('terreno')) estado.compras.unshift('terreno');
  let reiniciando = false;
  const guardarAhora = () => { if (!reiniciando) guardar(estado); };

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
  const ir = (nuevo) => {
    modo = nuevo;
    UI.mostrar('menu', nuevo === 'menu');
    UI.mostrar('seleccion', nuevo === 'seleccion');
    UI.mostrar('hud', nuevo === 'juego');
    UI.mostrar('config', false);
    controles.activo = nuevo === 'juego';
    if (nuevo === 'juego' && estado.compras.length === 0) UI.toast('Pisá los botones verdes para comprar', 'info');
    if (nuevo === 'menu') {
      document.getElementById('menu-progreso').textContent =
        estado.compras.length ? `Mansión ${Math.floor(tycoon.progreso * 100)}% · ${UI.duracion(estado.tiempoJugado)} jugados` : '';
      guardarAhora();
    }
  };

  const ponerPersonaje = async (p) => {
    jugador.setModelo(crearPersonaje(p, await cargarCabeza(p)));
    estado.personaje = p.id;
    guardarAhora();
  };
  const personajeGuardado = () => PERSONAJES.find((p) => p.id === estado.personaje);

  const abrirSeleccion = async () => {
    await UI.armarSeleccion(PERSONAJES, estado.personaje, async (p) => {
      iniciarAudio();
      await ponerPersonaje(p);
      ir('juego');
    });
    ir('seleccion');
  };

  const $ = (id) => document.getElementById(id);
  $('btn-jugar').addEventListener('click', () => {
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
      borrar();
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
    return Math.max(1.5, d - 0.6);
  };

  const camaraJuego = (dt) => {
    objetivo.lerp(jugador.pos, Math.min(1, dt * 12));
    const cabeza = new THREE.Vector3(objetivo.x, objetivo.y + 4, objetivo.z);
    const cp = Math.cos(controles.pitch);
    const dir = new THREE.Vector3(Math.sin(controles.yaw) * cp, Math.sin(controles.pitch), Math.cos(controles.yaw) * cp);
    const libre = distanciaLibre(cabeza, dir, controles.dist);
    // Acercarse rápido, alejarse suave.
    distActual = libre < distActual ? libre : distActual + (libre - distActual) * Math.min(1, dt * 4);
    deseada.copy(cabeza).addScaledVector(dir, distActual);
    if (deseada.y < 0.8) deseada.y = 0.8;
    camara.position.copy(deseada);
    camara.lookAt(cabeza);
  };

  let anguloMenu = 0.6;
  const camaraMenu = (dt) => {
    anguloMenu += dt * 0.08;
    camara.position.set(Math.sin(anguloMenu) * 85, 42, -10 + Math.cos(anguloMenu) * 85);
    camara.lookAt(0, 10, -10);
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

    controles.direccion(dir);
    if (jugador.actualizar(dt, dir, controles.saltar, colisiones, tycoon.agua)) sfx.salto();
    tycoon.actualizar(dt, jugador);
    mundo.actualizar(dt);
    if (modo === 'juego') {
      estado.tiempoJugado += dt;
      UI.actualizarHUD(estado.plata, tycoon.ingresoPorSegundo, tycoon.progreso);
      camaraJuego(dt);
    } else {
      camaraMenu(dt);
    }

    renderer.render(escena, camara);

    // Si la máquina no llega a 40 fps, bajar la resolución de a poco
    // (se ignoran los primeros segundos, que siempre son lentos).
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
  };
  bucle();
}

iniciar();
