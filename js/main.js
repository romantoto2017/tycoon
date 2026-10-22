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
import { Ladron } from './ladron.js';
import { Mazza } from './mazza.js';
import { crearAK } from './arma.js';

async function iniciar() {
  // La fuente redonda tiene que estar lista antes de dibujar carteles.
  await Promise.race([
    document.fonts ? document.fonts.load('700 40px Fredoka') : null,
    new Promise((r) => setTimeout(r, 2000)),
  ]).catch(() => {});
  await Promise.all([prepararMoneda(), cargarModelos(MODELOS)]);

  const canvas = document.getElementById('juego');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // Resolución: por defecto la nativa de la pantalla (nítido); en la configuración se puede
  // bajar (Calidad de imagen) para ganar fps. No cambia sola.
  const NATIVA = Math.min(window.devicePixelRatio || 1, 2);
  let pixelRatio = NATIVA;
  renderer.setPixelRatio(pixelRatio);
  const ponerCalidad = (calidad) => {
    const pr = Math.round(NATIVA * calidad * 100) / 100;
    if (pr === pixelRatio) return;
    pixelRatio = pr;
    renderer.setPixelRatio(pixelRatio);
    ajustar();
  };

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
  const ladron = new Ladron(escena, tycoon, UI);
  const mazza = new Mazza(escena, tycoon, UI);

  // ---------- Ajustes ----------
  const ajustes = cargarAjustes();
  const aplicarAjustes = () => {
    ponerCalidad(ajustes.calidad);
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
      sacarArma(false);
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

  // Agacharse: botón exclusivo de los personajes altos (Jeipi). Toca para agacharse o pararse.
  let puedeAgacharse = false;
  let ultimoAgachar = null;
  const btnAgachar = document.getElementById('btn-agachar');
  btnAgachar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    controles.agacharse = !controles.agacharse;
  });

  // ---------- AK-47 (para echar a la Schwepa) ----------
  // Como una herramienta de Roblox: se saca y se guarda con el slot de abajo o la tecla 1.
  // Con el arma en la mano el personaje mira hacia la cámara; clic izquierdo (o el botón
  // rojo en el celu) dispara ráfagas hacia donde apunta el mouse (o el centro de la pantalla).
  const btnArma = document.getElementById('btn-arma');
  const btnDisparar = document.getElementById('btn-disparar');
  const mira = document.getElementById('mira');
  const ak = crearAK();
  ak.position.set(0, -1.9, 0);
  ak.rotation.x = Math.PI / 2;
  let armaEnMano = false;
  let cadencia = 0;
  let ultimoArma = null;
  const sacarArma = (v) => {
    armaEnMano = v && tycoon.tieneArma && !conduciendo;
    if (armaEnMano) jugador.modelo.manoD.add(ak);
    else ak.parent?.remove(ak);
    jugador.modelo.apuntar = armaEnMano;
    controles.armado = armaEnMano;
    if (!armaEnMano) controles.disparando = false;
  };
  btnArma.addEventListener('pointerdown', (e) => { e.preventDefault(); sacarArma(!armaEnMano); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1' && modo === 'juego' && controles.activo && tycoon.tieneArma) sacarArma(!armaEnMano);
  });
  const trazadoras = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1), new THREE.MeshBasicMaterial({ color: '#ffe082' }));
    m.visible = false;
    m.userData.vida = 0;
    escena.add(m);
    return m;
  });
  let proxima = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const boca = new THREE.Vector3();
  const blanco = new THREE.Vector3();
  const tmpPunto = new THREE.Vector3();
  const disparar = () => {
    if (controles.esTactil || controles.shiftLock || controles.primeraPersona) ndc.set(0, 0);
    else ndc.set((controles.apunte.x / window.innerWidth) * 2 - 1, -(controles.apunte.y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camara);
    const rayo = raycaster.ray;
    let dist = 160;
    for (const b of colisiones) {
      if (b.containsPoint(rayo.origin)) continue;
      if (rayo.intersectBox(b, tmpPunto)) dist = Math.min(dist, tmpPunto.distanceTo(rayo.origin));
    }
    let pego = false;
    if (ladron.posicion(blanco)) {
      const t = blanco.clone().sub(rayo.origin).dot(rayo.direction);
      if (t > 0 && t < dist && rayo.distanceSqToPoint(blanco) < 2.6 * 2.6) {
        dist = t;
        pego = ladron.herir(20);
      }
    }
    const fin = rayo.at(dist, tmpPunto);
    ak.userData.boca.getWorldPosition(boca);
    const tr = trazadoras[proxima++ % trazadoras.length];
    tr.position.copy(boca).lerp(fin, 0.5);
    tr.scale.z = Math.max(0.1, boca.distanceTo(fin));
    tr.lookAt(fin);
    tr.visible = true;
    tr.userData.vida = 0.05;
    tr.material.color.set(pego ? '#ff5252' : '#ffe082');
    ak.userData.fogonazo.visible = true;
    ak.userData.fogonazoVida = 0.04;
    controles.pitch = Math.min(1.4, controles.pitch + 0.006);
    sfx.disparo();
  };
  const actualizarArma = (dt) => {
    const ver = modo === 'juego' && tycoon.tieneArma && !conduciendo;
    if (!ver && armaEnMano) sacarArma(false);
    const estado = ver ? String(armaEnMano) : '';
    if (estado !== ultimoArma) {
      ultimoArma = estado;
      btnArma.classList.toggle('oculto', !ver);
      btnArma.setAttribute('aria-pressed', String(armaEnMano));
      btnDisparar.classList.toggle('oculto', !armaEnMano);
      canvas.classList.toggle('armado', armaEnMano);
    }
    mira.classList.toggle('oculto', !(controles.shiftLock || (armaEnMano && (controles.esTactil || controles.primeraPersona))));
    cadencia -= dt;
    if (armaEnMano && controles.disparando && cadencia <= 0) {
      cadencia = 0.11;
      disparar();
    }
    for (const tr of trazadoras) {
      if (tr.visible && (tr.userData.vida -= dt) <= 0) tr.visible = false;
    }
    if (ak.userData.fogonazo.visible && (ak.userData.fogonazoVida -= dt) <= 0) ak.userData.fogonazo.visible = false;
  };

  // Brillito al comprar para los que usan kipá (data/personajes.js: kipa).
  const brillos = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,214,90,0.95)');
    grad.addColorStop(1, 'rgba(255,215,64,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,240,170,0.95)';
    g.fillRect(29, 2, 6, 60);
    g.fillRect(2, 29, 60, 6);
    const tex = new THREE.CanvasTexture(c);
    const lista = Array.from({ length: 18 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, }));
      sp.visible = false;
      escena.add(sp);
      return sp;
    });
    return {
      tirar(centro) {
        lista.forEach((sp, i) => {
          const a = (i / lista.length) * Math.PI * 2;
          sp.userData.vel = new THREE.Vector3(Math.cos(a) * 2.2, 2.5 + Math.random() * 2.5, Math.sin(a) * 2.2);
          sp.position.set(centro.x + Math.cos(a) * 1.3, centro.y + 1.5 + Math.random() * 4, centro.z + Math.sin(a) * 1.3);
          sp.userData.vida = 1.1 + Math.random() * 0.4;
          sp.visible = true;
        });
        sfx.brillo();
      },
      actualizar(dt) {
        for (const sp of lista) {
          if (!sp.visible) continue;
          sp.userData.vida -= dt;
          if (sp.userData.vida <= 0) { sp.visible = false; continue; }
          sp.position.addScaledVector(sp.userData.vel, dt);
          sp.userData.vel.multiplyScalar(1 - dt * 1.5);
          const t = sp.userData.vida;
          sp.material.opacity = Math.min(1, t * 2);
          const e = 1.4 + 0.5 * Math.sin(t * 14);
          sp.scale.set(e, e, 1);
        }
      },
    };
  })();
  tycoon.alComprar = () => {
    if (PERSONAJES.find((x) => x.id === estado.personaje)?.kipa) brillos.tirar(jugador.pos);
  };

  const ponerPersonaje = async (p) => {
    const enMano = armaEnMano;
    if (enMano) sacarArma(false);
    jugador.setModelo(crearPersonaje(p, await cargarCabeza(p)));
    if (enMano) sacarArma(true);
    jugador.factorVel = p.velocidad || 1;
    jugador.setEscala(p.alto || 1);
    puedeAgacharse = (p.alto || 1) > 1;
    controles.agacharse = false;
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

  if (location.search.includes('debug')) window.juego = { estado, jugador, tycoon, controles, ir, camara, ladron, mazza };

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
    jugador.mirarA = (primera || controles.shiftLock || armaEnMano) && !conduciendo ? controles.yaw + Math.PI : null;
    objetivo.lerp(jugador.pos, Math.min(1, dt * 14));
    const cabeza = new THREE.Vector3(objetivo.x, objetivo.y + jugador.alto * 0.85, objetivo.z);
    if ((controles.shiftLock || armaEnMano) && !primera) {
      // Shift Lock o arma en la mano: la cámara va un poco a la derecha, por encima del hombro.
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
      jugador.quiereAgacharse = puedeAgacharse && controles.agacharse;
      if (jugador.actualizar(dt, dir, controles.saltar, colisiones, tycoon.agua)) sfx.salto();
    }
    const texto = modo !== 'juego' ? '' : conduciendo ? 'Bajar del auto (E)' : cercaDelAuto() ? 'Manejar (E)' : '';
    const estadoAgachar = modo === 'juego' && puedeAgacharse && !conduciendo ? String(jugador.agachado) : '';
    if (estadoAgachar !== ultimoAgachar) {
      ultimoAgachar = estadoAgachar;
      btnAgachar.classList.toggle('oculto', !estadoAgachar);
      btnAgachar.setAttribute('aria-pressed', estadoAgachar || 'false');
    }
    if (texto !== textoManejar) {
      textoManejar = texto;
      btnManejar.textContent = texto;
      btnManejar.classList.toggle('oculto', !texto);
    }
    tycoon.actualizar(dt, jugador);
    ladron.actualizar(dt, modo === 'juego' && !vistaCompleta);
    mazza.actualizar(dt, jugador, modo === 'juego' && !vistaCompleta, estado.personaje === 'juanma');
    actualizarArma(dt);
    brillos.actualizar(dt);
    mundo.actualizar(dt, estado.tiempoJugado, estado.compras.includes('farolas'));
    if (modo === 'juego') {
      estado.tiempoJugado += dt;
      UI.actualizarHUD(estado.plata, tycoon.ingresoPorSegundo, tycoon.progreso);
      camaraJuego(dt);
    } else {
      camaraMenu(dt);
    }

    renderer.render(escena, camara);
  };
  bucle();
}

iniciar();
