import * as THREE from 'three';
import { PERSONAJES } from '../data/personajes.js';
import { crearMundo } from './mundo.js';
import { Jugador } from './jugador.js';
import { Controles } from './controles.js';
import { Tycoon } from './tycoon.js';
import { crearPersonaje } from './personaje.js';
import { prepararMoneda, obtenerCara } from './texturas.js';
import { cargar, guardar, borrar } from './guardado.js';
import { iniciarAudio } from './sfx.js';
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
  const camara = new THREE.PerspectiveCamera(65, 1, 0.5, 900);
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
  let reiniciando = false;
  const guardarAhora = () => { if (!reiniciando) guardar(estado); };

  const tycoon = new Tycoon({ escena, colisiones, estado, ui: UI, guardar: guardarAhora });
  tycoon.reconstruir();

  UI.prepararHUD();

  // ---------- Personaje ----------
  const elegir = async (p) => {
    iniciarAudio();
    const cara = await obtenerCara(p);
    jugador.setModelo(crearPersonaje(p, cara));
    estado.personaje = p.id;
    guardarAhora();
    UI.mostrar('seleccion', false);
    UI.mostrar('hud', true);
    controles.activo = true;
  };
  const abrirSeleccion = async () => {
    controles.activo = false;
    await UI.armarSeleccion(PERSONAJES, estado.personaje, elegir);
    UI.mostrar('hud', false);
    UI.mostrar('seleccion', true);
  };

  document.getElementById('btn-personaje').addEventListener('click', abrirSeleccion);
  document.getElementById('btn-reiniciar').addEventListener('click', async () => {
    controles.activo = false;
    if (await UI.pedirConfirmacion()) {
      reiniciando = true;
      borrar();
      location.reload();
    } else {
      controles.activo = true;
    }
  });

  // Mientras se elige, se ve el personaje guardado (o el primero) de fondo.
  const previo = PERSONAJES.find((p) => p.id === estado.personaje) || PERSONAJES[0];
  jugador.setModelo(crearPersonaje(previo, await obtenerCara(previo)));
  await abrirSeleccion();
  UI.mostrar('cargando', false);

  // ---------- Guardado automático ----------
  setInterval(guardarAhora, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardarAhora(); });
  window.addEventListener('pagehide', guardarAhora);

  if (location.search.includes('debug')) window.juego = { estado, jugador, tycoon, controles };

  // ---------- Bucle ----------
  const reloj = new THREE.Clock();
  const dir = new THREE.Vector3();
  const objetivo = new THREE.Vector3().copy(jugador.pos);
  let medida = 0;
  let cuadros = 0;

  const bucle = () => {
    requestAnimationFrame(bucle);
    const real = reloj.getDelta();
    const dt = Math.min(real, 0.05);

    controles.direccion(dir);
    jugador.actualizar(dt, dir, controles.saltar, colisiones);
    tycoon.actualizar(dt, jugador);
    mundo.actualizar(dt);
    UI.actualizarHUD(estado.plata, tycoon.ingresoPorSegundo);

    // Cámara en tercera persona alrededor del jugador.
    objetivo.lerp(jugador.pos, Math.min(1, dt * 12));
    const cp = Math.cos(controles.pitch);
    camara.position.set(
      objetivo.x + Math.sin(controles.yaw) * cp * controles.dist,
      objetivo.y + 4 + Math.sin(controles.pitch) * controles.dist,
      objetivo.z + Math.cos(controles.yaw) * cp * controles.dist,
    );
    if (camara.position.y < 0.8) camara.position.y = 0.8;
    camara.lookAt(objetivo.x, objetivo.y + 4, objetivo.z);

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
