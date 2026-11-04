import * as THREE from 'three';
import { PERSONAJES } from '../data/personajes.js';
import { crearMundo } from './mundo.js';
import { Jugador } from './jugador.js';
import { Controles } from './controles.js';
import { Tycoon } from './tycoon.js';
import { crearPersonaje } from './personaje.js';
import { prepararMoneda, cargarCabeza } from './texturas.js';
import { cargar, guardar, borrar, cargarAjustes, guardarAjustes } from './guardado.js';
import { iniciarAudio, setVolumenes, pausarAudio, sfx, Karaoke } from './sfx.js';
import * as UI from './ui.js';
import { formato } from './util.js';
import { cargarModelos, MODELOS } from './modelos.js';
import { ITEMS } from './progresion.js';
import { momento, hastaLaManana } from './cielo.js';
import { Ladron, Perros } from './ladron.js';
import { Mazza } from './mazza.js';
import { Restaurante } from './restaurante.js';
import { Gimnasio, fisico, bautiGordo, BAUTI_GYM } from './gimnasio.js';
import { Misiones } from './misiones.js';
import { Dufre, Ottati } from './dufre.js';
import { Manu, Banda } from './manu.js';
import { Amarishuow } from './amarishuow.js';
import { subirPendientes } from './liberar.js';
import { Pony, PRECIO_PAJA } from './pony.js';
import { Estatua } from './estatua.js';
import { Multijugador } from './multijugador.js';
import { Chat } from './chat.js';
import { Bar } from './bar.js';
import { Hilario } from './hilario.js';
import { Humano } from './humano.js';
import { Cachimba } from './cachimba.js';
import { GeometryDash } from './geometry.js';
import { Ciudad, planoCiudad, RADIO_CIUDAD, crearPortal } from './ciudad.js';
import { Casino, CASINO_DESDE } from './casino.js';
import { Lucca } from './lucca.js';
import { Playa } from './playa.js';
import { Concesionario, Flota, Taller } from './auto.js';
import { Autodromo, PISTA } from './autodromo.js';
import { PLATOS } from './resto.js';
import { RESTO, PARRILLA, GYM, MANSION, CALLE_Z, AUTOPISTA, AUTODROMO, CIUDAD, CONCESIONARIO, TALLER, GALPON, MONTANA, GARAGE, PISCINA, CANCHA, TP_CIUDAD, PLAYA, AUTOS_DESDE, BARRIO, DX, CACHIMBA, COSTA, LIMITE_MAPA, COMCAR } from './constantes.js';
import { crearAK } from './arma.js';
import { Lechugas, PRECIO_LECHUGA } from './lechugas.js';
import { PRENDAS, PRENDA, SLOTS } from '../data/ropa.js';
import { vestido } from './vestir.js';
import { Probador } from './probador.js';
import { NicoBaraja } from './nico.js';
import { PEDIR_COMPLETA } from './entorno.js';
import { Costa, alturaCosta, rutaCosta } from './costa.js';
import { Tanzania } from './tanzania.js';
import { Fumar, Fumadores } from './fumar.js';
import { Celular } from './celular.js';
import { Comcar } from './comcar.js';
import { Policia } from './policia.js';

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
  // El canvas ocupa toda la pantalla por CSS (no se le fija el tamaño en px: si no, en el celu,
  // al entrar a pantalla completa o esconderse la barra del navegador, queda más chico hasta
  // que llega el resize y asoma el fondo abajo). Acá solo se ajusta la resolución a lo que mide.
  let anchoCanvas = 0;
  let altoCanvas = 0;
  // iPhone: a veces el 100% del CSS queda corto (la barra de Safari que se esconde, la de estado
  // en la app de inicio) y abajo asoma una franja negra. El canvas toma el alto más grande que
  // diga el navegador.
  const altoPantalla = () => {
    const vv = window.visualViewport;
    let h = Math.max(window.innerHeight, document.documentElement.clientHeight, vv ? vv.height + vv.offsetTop : 0);
    if (navigator.standalone) h = Math.max(h, window.innerWidth > window.innerHeight ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height));
    return Math.round(h);
  };
  const corregirAlto = () => {
    const h = altoPantalla();
    if (Math.abs(canvas.clientHeight - h) > 1) canvas.style.height = `${h}px`;
  };
  const ajustar = () => {
    corregirAlto();
    anchoCanvas = canvas.clientWidth || window.innerWidth;
    altoCanvas = canvas.clientHeight || window.innerHeight;
    renderer.setSize(anchoCanvas, altoCanvas, false);
    camara.aspect = anchoCanvas / altoCanvas;
    camara.updateProjectionMatrix();
  };
  for (const ev of ['resize', 'orientationchange', 'fullscreenchange']) window.addEventListener(ev, ajustar);
  document.addEventListener('fullscreenchange', ajustar);
  window.visualViewport?.addEventListener('resize', ajustar);
  ajustar();

  const mundo = crearMundo(escena);
  const colisiones = [];
  const jugador = new Jugador(escena);
  const controles = new Controles(canvas);

  const estado = cargar();
  // ?completo: muestra la mansión terminada sin tocar la partida guardada.
  const vistaCompleta = new URLSearchParams(location.search).has('completo');
  if (vistaCompleta) estado.compras = ITEMS.map((i) => i.id);
  if (PEDIR_COMPLETA) {
    estado.compras = ITEMS.map((i) => i.id);
    estado.plata = Math.max(estado.plata, 5e14); // 500T: Nico y la tanzania entera
    guardar(estado);
  }
  // Partidas guardadas antes de que el terreno fuera una compra.
  if (estado.compras.length && !estado.compras.includes('terreno')) estado.compras.unshift('terreno');
  estado.ropa ??= [];
  estado.vestuario ??= {};
  estado.autos ??= []; // los del concesionario (AUTOS en data/objetos.js), en el orden en que se compraron
  const puedeVestirse = (id) => !(id === 'bauti' && bautiGordo(estado));
  let reiniciando = false;
  const guardarAhora = () => { if (!reiniciando && !vistaCompleta) guardar(estado); };

  const tycoon = new Tycoon({ escena, colisiones, estado, ui: UI, guardar: guardarAhora });
  tycoon.reconstruir();
  tycoon.lote.absorber(mundo.estaticos);
  colisiones.push(...mundo.choques);
  // El piso natural: la montaña y, en la costa, el acantilado y la subida.
  const alturaMontana = mundo.altura;
  mundo.altura = (x, z) => Math.max(alturaMontana(x, z), alturaCosta(x, z));
  jugador.terreno = mundo.altura;
  if (estado.costa) LIMITE_MAPA.x1 = COSTA.x1; // la costa ya está abierta (le pagaste a Nico)
  UI.prepararHUD();
  const ladron = new Ladron(escena, tycoon, UI);
  // Olga, Olivia y Pancho: se compran al 75%, se sientan afuera y cuidan la casa de la Schwepa.
  const perros = new Perros(escena, tycoon, UI, () => guardarAhora());
  ladron.perros = perros;
  const mazza = new Mazza(escena, tycoon, UI);
  const resto = new Restaurante(escena, tycoon, UI);
  const gym = new Gimnasio(escena, UI);
  const misiones = new Misiones(escena, tycoon, UI);
  const dufre = new Dufre(escena, UI);
  const ottati = new Ottati(escena, UI);
  const ciudad = new Ciudad(escena, UI);
  // El casino de la ciudad (se arma con su manzana): tragamonedas, blackjack, póker y ruleta.
  const casino = new Casino({ ciudad, escena, estado, ui: UI, guardar: guardarAhora, progreso: () => tycoon.progreso });
  casino.alSalir = () => { controles.activo = modo === 'juego'; };
  // Lucca Bossio: su local (atiende Shaggy), él caminando por la ciudad y su ropa.
  const lucca = new Lucca({ ciudad, escena, estado, ui: UI });
  // La playa frente a la mansión (con Francis Jeremy surfeando y su pócima para los perros).
  const playa = new Playa({ escena, colisiones, estado, ui: UI, guardar: guardarAhora });
  const concesionario = new Concesionario({ escena, colisiones, kit: tycoon.kit, estado, ui: UI, guardar: guardarAhora, progreso: () => tycoon.progreso });
  // Manu Mendez: solo, de paseo; con la Schwepa, robando (la mansión o un local de la ciudad).
  const manu = new Manu(escena, UI);
  const amarishuow = new Amarishuow(escena, UI);
  const hilario = new Hilario(escena, UI);
  // El Humano (de noche, en la ciudad) y su barrio, La Cachimba del Piojo (solo si te invitó).
  const humano = new Humano({ escena, ui: UI, estado, guardar: () => guardarAhora(), hora: () => hora(), ingreso: () => tycoon.ingresoPorSegundo || 0, pausar: (b) => { controles.activo = !b && modo === 'juego'; } });
  const cachimba = new Cachimba({ escena, estado, ui: UI, guardar: () => guardarAhora(), colisiones });
  // Nico Baraja (al 99% de la mansión) habilita la costa: las mansiones de lujo y el galpón de tanzania.
  // Bauti 100% musculoso ("trabado"): solo él puede pegarle a los demás jugadores.
  const bautiTrabado = () => estado.personaje === 'bauti' && (estado.bautiGym || 0) >= BAUTI_GYM.adelgazar + BAUTI_GYM.musculo;
  const pausarDialogo = (b) => { controles.activo = !b && modo === 'juego'; };
  const nico = new NicoBaraja({ escena, estado, ui: UI, guardar: () => guardarAhora(), progreso: () => tycoon.progreso, pausar: pausarDialogo });
  const costa = new Costa({ escena, estado, ui: UI, guardar: () => guardarAhora(), colisiones, pausar: pausarDialogo });
  const tanzania = new Tanzania({ escena, estado, ui: UI, guardar: () => guardarAhora(), colisiones });
  nico.alAbrir = () => { LIMITE_MAPA.x1 = COSTA.x1; };
  playa.tanzania = tanzania; // Francis te compra tanzania
  cachimba.tanzania = tanzania; // El Humano también, en la Cachimba
  cachimba.pausar = pausarDialogo;
  costa.tanzania = tanzania; // los dueños de las mansiones te compran (y uno te da el celular)
  const celular = new Celular({ escena, estado, ui: UI, guardar: () => guardarAhora(), tanzania, ciudad, controles, modo: () => modo });
  celular.alCambiarMarcas = (lista) => UI.marcasMapa(lista);
  // Los personajes de verdad a los que se les entrega en mano (su grupo 3D, o null si no está armado).
  celular.ubicar = (ref) => ({
    nico: () => nico.nico?.grupo, francis: () => playa.francis?.m.grupo, hilario: () => hilario.modelo?.grupo,
    humano: () => cachimba.humano?.grupo, dufre: () => dufre.modelo?.grupo, lagatta: () => bar.lagatta?.m.grupo,
  })[ref]?.() || null;
  const fumadores = new Fumadores({ escena, estado, cabezas: () => [
    ...ciudad.peatones.map((p) => ({ cabeza: p.mod.partes.cabeza, piel: p.piel })),
    ...cachimba.gente.filter((m) => m.villero).map((m) => ({ cabeza: m.partes.cabeza, piel: m.piel })),
  ] });
  // El C.O.M.C.A.R. (la cárcel) y la policía que te puede mandar ahí.
  const comcar = new Comcar({ escena, estado, ui: UI, guardar: () => guardarAhora(), colisiones, jugador, hora: () => hora(), pausar: pausarDialogo });
  const policia = new Policia({ escena, estado, ui: UI, guardar: () => guardarAhora(), jugador, tanzania, comcar, pausar: pausarDialogo, colisiones });
  policia.alMarcar = (l) => UI.marcasMapa(l, 'policia');
  comcar.alEncarcelar = () => { if (conduciendo) { const v = vehiculo; if (v === tycoon.heli) v.prendido = false; conduciendo = false; vehiculo = null; jugador.conduciendo = false; jugador.contenedor.visible = true; jugador.sombra.visible = true; } if (pony.montado) pony.bajar(jugador); celular.cerrar(); };
  let relojVisitas = 0;
  const visitasAvisadas = new Set();
  const fumar = new Fumar({ escena, estado, ui: UI, guardar: () => guardarAhora(), jugador, tanzania, puede: () => modo === 'juego' && controles.activo && !conduciendo });
  tanzania.alComprar = (it) => { if (it.tipo === 'galpon') delete fotos.costa; }; // la foto del mapa, con el galpón
  const pony = new Pony({ escena, estado, ui: UI, guardar: () => guardarAhora() });
  const estatua = new Estatua({ escena, colisiones });
  const bar = new Bar({ ciudad, escena, estado, ui: UI, jugador, controles, guardar: () => guardarAhora(), ingreso: () => tycoon.ingresoPorSegundo || 0 });
  bar.alMision = (que, a) => misiones.revisarBar(que, a, () => { a.mareoHasta = (estado.tiempoJugado || 0) + 15 * 60; });
  casino.alGanar = () => misiones.revisarCasino();
  // El testamento de la estatua del patio.
  const abrirTestamento = () => {
    controles.activo = false;
    UI.mostrar('testamento', true);
  };
  const cerrarTestamento = () => {
    UI.mostrar('testamento', false);
    controles.activo = modo === 'juego';
  };
  document.getElementById('testamento-cerrar').addEventListener('click', cerrarTestamento);
  window.addEventListener('keydown', (e) => {
    if (!UI.visible('testamento')) return;
    if (e.code === 'Escape' || e.code === 'KeyE') { e.stopImmediatePropagation(); e.preventDefault(); cerrarTestamento(); }
  }, true);
  const banda = new Banda({ escena, tycoon, ui: UI, ciudad, lucca, concesionario });
  ladron.ocupado = () => banda.enCasa;
  const flota = new Flota(escena, colisiones, estado); // los autos comprados, en el galpón
  const autodromo = new Autodromo({ escena, colisiones, kit: tycoon.kit, estado, ui: UI, guardar: guardarAhora, progreso: () => tycoon.progreso, tycoon, flota });
  // El Taller, al lado de Vecibanda Motors: se entra manejando (la E en el portón).
  const taller = new Taller({ escena, colisiones, kit: tycoon.kit, estado, ui: UI, guardar: guardarAhora, progreso: () => tycoon.progreso, tycoon, flota });
  taller.alSalir = () => { taller.soltarCamara(camara); controles.activo = modo === 'juego'; };

  // ---------- Mapa ----------
  // Fotos desde arriba (cámara ortográfica, de día, sin cielo ni carteles flotantes) de las zonas
  // con estructuras: el autódromo y el barrio al empezar (el barrio se vuelve a sacar si compraste
  // cosas) y la ciudad cuando termina de armarse (antes se ve su plano dibujado). En ui.js se
  // dibujan el minimapa y el mapa grande, arriba del plano (calles, autopista, pista, ciudad).
  const ZONAS_MAPA = {
    // Con multijugador, el barrio entero (los 9 terrenos), con menos detalle.
    barrio: globalThis.VECI?.red ? [BARRIO.x0 - 10, -365, BARRIO.x1 + 10, 190] : [-660 + DX, -365, 335, 190],
    autodromo: [AUTODROMO.x - 900, AUTOPISTA.z - 30, AUTODROMO.x + 900, AUTODROMO.z + 900],
    ciudad: [CIUDAD.x - RADIO_CIUDAD - 20, CIUDAD.z - RADIO_CIUDAD - 20, TALLER.x1 + 30, CIUDAD.z + RADIO_CIUDAD + 20],
    cachimba: [CACHIMBA.x0 - 20, CACHIMBA.z0 - 20, CACHIMBA.x1 + 20, AUTOPISTA.z - AUTOPISTA.medioAncho],
    costa: [COSTA.x0 - 60, COSTA.meseta.z0 - 20, COSTA.x1 + 20, PLAYA.orilla + 12],
    comcar: [COMCAR.x0 - 30, COMCAR.z0 - 30, COMCAR.x1 + 30, AUTOPISTA.z - AUTOPISTA.medioAncho],
  };
  const PX_MAPA = { barrio: globalThis.VECI?.red ? 1 : 1.6, autodromo: 0.9, ciudad: 1.5, cachimba: 1.2, costa: 1, comcar: 1 }; // píxeles por unidad de cada foto
  const fotos = {};
  const camMapa = new THREE.OrthographicCamera(-1, 1, 1, -1, 10, 2000);
  camMapa.up.set(0, 0, -1); // el norte (−z) arriba
  const enCanvas = (img) => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  };
  const capturarMapa = (id) => {
    const [x0, z0, x1, z1] = ZONAS_MAPA[id];
    const w = Math.round((x1 - x0) * PX_MAPA[id]);
    const h = Math.round((z1 - z0) * PX_MAPA[id]);
    // De a pedazos chicos (con el mismo antialias): una sola foto grande pedía ~50 MB de golpe a la
    // placa de video y en el iPhone se caía el WebGL (todo negro al abrir el mapa).
    const T = 512;
    const rt = new THREE.WebGLRenderTarget(T, T, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    camMapa.position.set((x0 + x1) / 2, 900, (z0 + z1) / 2);
    camMapa.lookAt((x0 + x1) / 2, 0, (z0 + z1) / 2);
    // Sin carteles flotantes, con lo que está lejos a la vista y sin niebla (correrla, no
    // sacarla: sacarla recompila todos los materiales).
    const ocultos = [];
    escena.traverse((o) => { if (o.isSprite && o.visible) { o.visible = false; ocultos.push(o); } });
    const lejos = [concesionario.grupo, taller.grupo, autodromo.grupo, costa.grupo, tanzania.grupo, comcar.grupo].filter((g) => g && !g.visible);
    for (const g of lejos) g.visible = true;
    const [near, far] = [escena.fog.near, escena.fog.far];
    mundo.paraMapa(true);
    escena.fog.near = 1e5;
    escena.fog.far = 1e6;
    // WebGL lee de abajo para arriba: cada pedazo se da vuelta al pasarlo a la imagen.
    const img = new ImageData(w, h);
    const px = new Uint8Array(T * T * 4);
    const [ux, uz] = [(x1 - x0) / w, (z1 - z0) / h]; // unidades por píxel
    for (let ty = 0; ty < h; ty += T) {
      for (let tx = 0; tx < w; tx += T) {
        const tw = Math.min(T, w - tx);
        const th = Math.min(T, h - ty);
        camMapa.left = -(x1 - x0) / 2 + tx * ux;
        camMapa.right = camMapa.left + tw * ux;
        camMapa.top = (z1 - z0) / 2 - ty * uz;
        camMapa.bottom = camMapa.top - th * uz;
        camMapa.updateProjectionMatrix();
        rt.viewport.set(0, 0, tw, th);
        renderer.setRenderTarget(rt);
        renderer.render(escena, camMapa);
        renderer.readRenderTargetPixels(rt, 0, 0, tw, th, px);
        for (let r = 0; r < th; r++) img.data.set(px.subarray(r * tw * 4, (r + 1) * tw * 4), ((ty + th - 1 - r) * w + tx) * 4);
      }
    }
    renderer.setRenderTarget(null);
    rt.dispose();
    mundo.paraMapa(false);
    escena.fog.near = near;
    escena.fog.far = far;
    for (const g of lejos) g.visible = false;
    for (const o of ocultos) o.visible = true;
    // Hasta que la imagen nueva esté lista se sigue viendo la anterior (si había).
    const vieja = fotos[id]?.canvas || null;
    const foto = { x0, z0, x1, z1, canvas: vieja, compras: estado.compras.length, cuando: performance.now() };
    fotos[id] = foto;
    const poner = (imagen) => {
      if (vieja?.close) vieja.close();
      foto.canvas = imagen;
    };
    // Como ImageBitmap (no cuenta para el tope de memoria de canvas del iPhone: las fotos del
    // mapa son de las más grandes); si el navegador no puede, en un canvas.
    if (window.createImageBitmap) createImageBitmap(img).then(poner, () => poner(enCanvas(img)));
    else poner(enCanvas(img));
  };
  let esperaMapa = 2; // segundos hasta la próxima foto (de a una, así no se traba)
  const fotosPendientes = () => {
    if (!fotos.autodromo) return 'autodromo';
    if (!fotos.barrio || (fotos.barrio.compras !== estado.compras.length && performance.now() - fotos.barrio.cuando > 90000)) return 'barrio';
    if (ciudad.lista && !fotos.ciudad) return 'ciudad';
    if (cachimba.grupo && estado.cachimba?.visitada && !fotos.cachimba) return 'cachimba';
    if (costa.grupo && !fotos.costa) return 'costa';
    if (comcar.listo && !fotos.comcar) return 'comcar';
    return null;
  };
  const centroPista = PISTA.puntos.reduce((a, q) => ({ x: a.x + q.x / PISTA.puntos.length, z: a.z + q.z / PISTA.puntos.length }), { x: 0, z: 0 });
  const centro = (r) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
  const plano = planoCiudad();
  const NOMBRES_CIUDAD = { plaza: 'Plaza', banco: 'Banco', futbol: 'Cancha de fútbol', basquet: 'Cancha de básquet', nafta: 'Estación de servicio', parque: 'Parque', super: 'Súper', hotel: 'Hotel', verdu: 'Verdulería', kicks: 'KICKS', drip: 'VECI DRIP', futbolera: 'LA FUTBOLERA', casino: 'Casino', lucca: 'LUCCABOSSIO™', bar: 'Lagatta Bar' };
  // nivel 0: siempre; 1: con un poco de zoom; 2: de cerca. desde: zoom mínimo (píxeles por unidad).
  const etiqueta = (r, texto, nivel, desde) => ({ ...('x0' in r ? centro(r) : r), texto, nivel, desde });
  // Lo que todavía no desbloqueaste: en el mapa se tapa con un "?" (y el nombre también es "?").
  const oculto = (e, area, bloqueado) => Object.assign(e, { area, bloqueado });
  const progreso = () => tycoon.progreso;
  const margen = (r, m) => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m });
  const cajaPista = PISTA.puntos.reduce((a, q) => ({ x0: Math.min(a.x0, q.x), z0: Math.min(a.z0, q.z), x1: Math.max(a.x1, q.x), z1: Math.max(a.z1, q.z) }), { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity });
  UI.prepararMapa({
    plano: {
      calle: { x0: -650, x1: AUTOPISTA.x1 + 10, z0: CALLE_Z - 6, z1: CALLE_Z + 6 },
      autopista: { x0: AUTOPISTA.x0 - 30, x1: AUTOPISTA.x1, z0: AUTOPISTA.z - AUTOPISTA.medioAncho, z1: AUTOPISTA.z + AUTOPISTA.medioAncho },
      pista: { puntos: PISTA.puntos, ancho: AUTODROMO.ancho },
      ciudad: plano,
      edificios: [
        { ...CONCESIONARIO, color: '#3d4045' }, { ...TALLER, color: '#d4581f' }, { ...MANSION, color: '#e8e2d6' }, { ...GYM, color: '#1e1f22' },
        { ...GALPON, color: '#9aa1a8' }, { ...RESTO, color: '#b55239' }, { ...GARAGE, color: '#cfc9bd' },
      ],
      zonas: { ...ZONAS_MAPA, todo: [CIUDAD.x - 420, -460, 360, AUTODROMO.z + 920] },
      playa: { arena: { x0: PLAYA.x0, z0: PLAYA.z0, x1: PLAYA.x1, z1: PLAYA.orilla }, mar: { x0: PLAYA.mar.x0, z0: PLAYA.orilla, x1: PLAYA.mar.x1, z1: PLAYA.mar.z1 }, muelle: { x0: PLAYA.muelle.x - PLAYA.muelle.ancho / 2, z0: PLAYA.orilla - 9, x1: PLAYA.muelle.x + PLAYA.muelle.ancho / 2, z1: PLAYA.orilla + PLAYA.muelle.largo } },
    },
    etiquetas: [
      etiqueta(MANSION, 'Mansión', 0, 0),
      etiqueta({ x: (COMCAR.x0 + COMCAR.x1) / 2, z: COMCAR.z0 - 20 }, 'C.O.M.C.A.R.', 0, 0),
      // La costa: "?" desde que Nico espera (99%), el nombre cuando le pagaste.
      Object.assign(oculto(etiqueta({ x: (COSTA.x0 + COSTA.x1) / 2, z: COSTA.meseta.z0 + 40 }, 'La Costa', 0, 0), { x0: COSTA.x0, z0: COSTA.meseta.z0, x1: COSTA.x1, z1: PLAYA.orilla }, () => !estado.costa), { nada: () => !estado.costa && tycoon.progreso < COSTA.desde }),
      Object.assign(etiqueta({ x: COSTA.galpon.x, z: COSTA.galpon.z }, 'Galpón de tanzania', 1, 0.15), { nada: () => !estado.tanzania?.compras?.includes('tz_galpon') }),
      // Hasta que El Humano te invita no está; después, "?" hasta que vas.
      Object.assign(oculto(etiqueta(CACHIMBA, 'La Cachimba del Piojo', 0, 0), CACHIMBA, () => !estado.cachimba?.visitada), { nada: () => !estado.cachimba }),
      oculto(etiqueta(centroPista, 'Autódromo Vecibanda Ring', 0, 0), margen(cajaPista, 70), () => progreso() < AUTOS_DESDE),
      etiqueta({ x: CIUDAD.x, z: CIUDAD.z - RADIO_CIUDAD - 30 }, 'Ciudad Vecibanda', 0, 0),
      etiqueta({ x: (AUTOPISTA.x0 + AUTOPISTA.x1) / 2, z: AUTOPISTA.z + 30 }, 'Autopista', 0, 0),
      etiqueta(GYM, 'Power Camp (gym)', 1, 0.15),
      oculto(etiqueta(GALPON, 'Galpón Vecibanda', 1, 0.15), margen(GALPON, 4), () => !estado.compras.includes('galpon')),
      oculto(etiqueta(RESTO, 'Restaurante', 1, 0.15), margen(RESTO, 4), () => !tycoon.restoAbierto),
      etiqueta({ x: (PLAYA.x0 + PLAYA.x1) / 2, z: (PLAYA.z0 + PLAYA.orilla) / 2 }, 'Playa', 1, 0.15),
      etiqueta({ x: PLAYA.muelle.x, z: PLAYA.orilla + PLAYA.muelle.largo + 8 }, 'Muelle', 2, 0.6),
      etiqueta({ x: MONTANA.x, z: MONTANA.z }, 'Montaña', 1, 0.15),
      oculto(etiqueta({ x: (CONCESIONARIO.x0 + CONCESIONARIO.x1) / 2, z: CONCESIONARIO.z1 + 14 }, 'Vecibanda Motors', 1, 0.15), margen(CONCESIONARIO, 6), () => progreso() < AUTOS_DESDE),
      oculto(etiqueta({ x: (TALLER.x0 + TALLER.x1) / 2, z: TALLER.z0 - 30 }, 'Taller', 1, 0.15), margen(TALLER, 6), () => progreso() < AUTOS_DESDE),
      etiqueta(GARAGE, 'Garage', 2, 0.6),
      etiqueta(PISCINA, 'Piscina', 2, 0.6),
      etiqueta(CANCHA, 'Cancha', 2, 0.6),
      ...plano.manzanas.filter((m) => m.tipo).map((m) => (m.tipo === 'casino'
        ? oculto(etiqueta(m, NOMBRES_CIUDAD[m.tipo], 2, 0.45), m, () => progreso() < CASINO_DESDE)
        : etiqueta(m, NOMBRES_CIUDAD[m.tipo], 2, 0.45))),
    ],
    zonasDe: () => Object.values(fotos),
    alAbrir: () => {
      controles.activo = false;
      if (fotos.barrio?.compras !== estado.compras.length) capturarMapa('barrio'); // con lo último que compraste
    },
    alCerrar: () => { controles.activo = modo === 'juego'; },
  });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyN' && controles.activo && modo === 'juego' && !UI.mapaAbierto()) UI.abrirMapa(); });
  concesionario.alComprar = () => misiones.revisarAutos();
  const karaoke = new Karaoke(UI); // la canción con la letra al ritmo, en la sala del karaoke
  // Choques de este cuadro: en la ciudad, solo los de alrededor (son muchos); si no, los de siempre.
  let choquesActuales = colisiones;
  let avisoAutopista = false;

  // ---------- Ajustes ----------
  const ajustes = cargarAjustes();
  const aplicarAjustes = () => {
    ponerCalidad(ajustes.calidad);
    setVolumenes({ general: ajustes.general, musica: ajustes.musica, efectos: ajustes.efectos, musicaOn: ajustes.musicaOn });
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
  let vehiculo = null; // el que estás manejando: un auto (el deportivo o uno del galpón) o tycoon.heli
  // Multijugador (js/arranque.js conecta y elige el terreno): los demás, sus mansiones, el podio.
  const VECI = globalThis.VECI || {};
  const mj = VECI.red ? new Multijugador({ escena, colisiones, estado, jugador, tycoon, ui: UI, red: VECI.red, uid: VECI.uid, nombre: VECI.nombre, camara }) : null;
  if (mj) {
    // Bauti trabado (100% musculoso) le pega a otro jugador y lo tira al cielo; acá, cuando te toca a vos.
    mj.alGolpe = (g) => {
      if (conduciendo || pony.montado) return;
      jugador.vel.y = 190; // con gravedad 196: unos 90 de alto
      jugador.pos.y += 0.5;
      sfx.choque();
      UI.toast(`¡${g.nombre} te pegó una piña y te mandó al cielo!`, 'error', 4000);
    };
    mj.alMorir = (que) => {
      if (que === 'muere') {
        if (pony.montado) pony.bajar(jugador);
        controles.activo = false;
        if (jugador.modelo) jugador.modelo.grupo.rotation.x = -Math.PI / 2; // tirado en el piso
      } else {
        if (jugador.modelo) jugador.modelo.grupo.rotation.x = 0;
        controles.activo = modo === 'juego';
      }
    };
  }
  if (mj) new Chat({ mj, controles, ui: UI, modo: () => modo });
  if (VECI.aviso) setTimeout(() => UI.toast(VECI.aviso, 'error', 5000), 4000);
  let avisoHeli = false;
  const ejes = { x: 0, y: 0 };
  const tmpBajada = new THREE.Vector3();
  const btnManejar = document.getElementById('btn-manejar');
  let textoManejar = '';
  const autos = () => [...(tycoon.auto ? [tycoon.auto] : []), ...flota.autos, ...tanzania.autos];
  // El auto más cercano para subirse (a menos de 6), o null.
  const cercaDelAuto = () => {
    let mejor = null;
    let dMejor = 6;
    if (comcar.preso) return null; // en cana no se maneja
    for (const a of autos()) {
      if (Math.abs(jugador.pos.y - (a.pos.y || 0)) >= 2) continue; // a su altura (la camioneta está en el cerro)
      const d = Math.hypot(jugador.pos.x - a.pos.x, jugador.pos.z - a.pos.z);
      if (d < dMejor) { dMejor = d; mejor = a; }
    }
    return mejor;
  };
  const cercaDelHeli = () => {
    const h = tycoon.heli;
    return h && !comcar.preso && Math.abs(jugador.pos.y - h.pos.y) < 2.5 && Math.hypot(jugador.pos.x - h.pos.x, jugador.pos.z - h.pos.z) < 7.5;
  };
  const enHeli = () => conduciendo && vehiculo === tycoon.heli;
  const subirOBajar = () => {
    // En el autódromo, bajarse es salir de la pista (el auto de la carrera desaparece).
    if (conduciendo && autodromo.corriendo) { autodromo.salir(); return; }
    if (conduciendo) {
      const v = vehiculo;
      // Del helicóptero solo te bajás apoyado.
      if (v === tycoon.heli && !v.apoyado) return;
      if (v === tycoon.heli) v.prendido = false;
      conduciendo = false;
      vehiculo = null;
      jugador.pos.copy(v.puntoBajada(tmpBajada));
      jugador.vel.set(0, 0, 0);
    } else {
      const v = cercaDelAuto() || (cercaDelHeli() ? tycoon.heli : null);
      if (!v) return;
      sacarArma(false);
      sacarLechuga(false);
      conduciendo = true;
      vehiculo = v;
      if (v !== tycoon.heli) v.vel = 0;
      else {
        v.prendido = true;
        if (!avisoHeli) {
          avisoHeli = true;
          UI.toast('Mantené saltar para subir; si soltás, baja despacito', 'info');
        }
      }
      controles.yaw = v.angulo + Math.PI;
    }
    jugador.conduciendo = conduciendo;
    jugador.contenedor.visible = !conduciendo;
    jugador.sombra.visible = !conduciendo;
  };
  // El autódromo te sube al auto de la carrera y, al salir, te deja a pie en la entrada.
  autodromo.alSubir = (v) => {
    sacarArma(false);
    sacarLechuga(false);
    conduciendo = true;
    vehiculo = v;
    controles.yaw = v.angulo + Math.PI;
    controles.activo = modo === 'juego';
    jugador.conduciendo = true;
    jugador.contenedor.visible = false;
    jugador.sombra.visible = false;
  };
  autodromo.alBajar = (p) => {
    conduciendo = false;
    vehiculo = null;
    jugador.pos.set(p.x, 0.2, p.z);
    jugador.vel.set(0, 0, 0);
    jugador.conduciendo = false;
    jugador.contenedor.visible = true;
    jugador.sombra.visible = true;
  };
  autodromo.alCerrar = () => { controles.activo = modo === 'juego'; };
  autodromo.noche = () => momento(hora()).noche; // la fachada del estadio brilla de noche
  // ---------- Dormir ----------
  // De noche, cerca de una cama comprada aparece "Dormir": fundido a negro y se despierta
  // a la mañana. La hora va aparte del tiempo jugado (estado.desfaseHora), así no cambian
  // las estadísticas ni la espera de la Schwepa.
  const hora = () => estado.tiempoJugado + (estado.desfaseHora || 0);
  const cartelSueno = document.getElementById('sueno');
  let durmiendo = false;
  const camaCerca = () => {
    if (conduciendo || durmiendo || momento(hora()).noche < 0.5) return null;
    return tycoon.camas.find((c) => Math.hypot(c.x - jugador.pos.x, c.z - jugador.pos.z) < 5.5 && Math.abs(c.y - jugador.pos.y) < 2.5) || null;
  };
  const dormir = async () => {
    const cama = camaCerca();
    if (!cama) return;
    durmiendo = true;
    controles.activo = false;
    if (cama.dueno) misiones.durmio(estado.personaje, cama.dueno);
    estado.ultimaCama = { x: cama.x, y: cama.y, z: cama.z }; // multijugador: ahí reaparecés si te morís
    cartelSueno.classList.remove('oculto');
    requestAnimationFrame(() => cartelSueno.classList.add('visible'));
    await new Promise((r) => setTimeout(r, 1800));
    estado.desfaseHora = (estado.desfaseHora || 0) + hastaLaManana(hora());
    guardarAhora();
    cartelSueno.classList.remove('visible');
    await new Promise((r) => setTimeout(r, 900));
    cartelSueno.classList.add('oculto');
    durmiendo = false;
    controles.activo = modo === 'juego';
    UI.toast('¡Buen día!', 'info');
  };
  // Caja fuerte: en la bóveda del garage (con la bóveda comprada) se guarda la plata y se saca
  // cuando quieras. Lo de la caja no lo roba nadie (ni la Schwepa ni Manu).
  const $c = (id) => document.getElementById(id);
  const CAJA = { x: GARAGE.x0 + 7.5, z: GARAGE.z0 + 4 }; // en la puerta de la cámara de la bóveda
  const cercaCaja = () => !conduciendo && estado.compras.includes('lujo_boveda') && Math.hypot(jugador.pos.x - CAJA.x, jugador.pos.z - CAJA.z) < 4.5 && jugador.pos.y < 3;
  const verCaja = () => {
    estado.cajaFuerte ??= 0;
    $c('caja-guardada').textContent = `$${formato(estado.cajaFuerte)}`;
    $c('caja-bolsillo').textContent = `$${formato(estado.plata)}`;
    $c('caja-guardar-todo').disabled = $c('caja-guardar-mitad').disabled = estado.plata < 1;
    $c('caja-sacar-todo').disabled = $c('caja-sacar-mitad').disabled = estado.cajaFuerte < 1;
  };
  const abrirCaja = () => {
    controles.activo = false;
    verCaja();
    UI.mostrar('caja', true);
    $c('caja-guardar-todo').focus({ preventScroll: true });
  };
  const cerrarCaja = () => {
    UI.mostrar('caja', false);
    controles.activo = modo === 'juego';
  };
  const moverCaja = (guardar, parte) => {
    estado.cajaFuerte ??= 0;
    const monto = Math.floor((guardar ? estado.plata : estado.cajaFuerte) * parte);
    if (monto < 1) return;
    estado.plata += guardar ? -monto : monto;
    estado.cajaFuerte += guardar ? monto : -monto;
    sfx.comprar();
    UI.toast(guardar ? `Guardaste $${formato(monto)} en la caja fuerte` : `Sacaste $${formato(monto)} de la caja fuerte`, 'plata');
    guardarAhora();
    verCaja();
  };
  $c('caja-guardar-todo').addEventListener('click', () => moverCaja(true, 1));
  $c('caja-guardar-mitad').addEventListener('click', () => moverCaja(true, 0.5));
  $c('caja-sacar-todo').addEventListener('click', () => moverCaja(false, 1));
  $c('caja-sacar-mitad').addEventListener('click', () => moverCaja(false, 0.5));
  $c('caja-cerrar').addEventListener('click', cerrarCaja);
  window.addEventListener('keydown', (e) => {
    if (!UI.visible('caja')) return;
    if (e.code === 'Escape' || e.code === 'KeyE') { e.stopImmediatePropagation(); e.preventDefault(); cerrarCaja(); }
  }, true);

  // TP a la ciudad (se compra a la salida de la mansión): el portal de la mansión te lleva a la
  // entrada de la ciudad, donde está el de vuelta. Solo a pie.
  const tpComprado = () => estado.compras.includes('tp_ciudad');
  let portalCasa = null;
  let portalCiudad = null;
  const cercaTP = () => {
    if (!tpComprado() || conduciendo || enHeli() || pony.montado || comcar.preso) return null;
    const lejos = (x, z) => Math.hypot(jugador.pos.x - x, jugador.pos.z - z);
    if (lejos(TP_CIUDAD.x, TP_CIUDAD.z) < 3.4) return 'casa';
    if (lejos(TP_CIUDAD.llegada.x, TP_CIUDAD.llegada.z) < 3.4) return 'ciudad';
    return null;
  };
  const textoTP = () => ({ casa: 'Ir a la Ciudad Vecibanda (E)', ciudad: 'Volver a la mansión (E)' })[cercaTP()] || '';
  const usarTP = (desde) => {
    const d = desde === 'casa' ? TP_CIUDAD.llegada : TP_CIUDAD;
    jugador.pos.set(d.x, 1, d.z - 5);
    jugador.vel?.set(0, 0, 0);
    sfx.brillo();
    UI.toast(desde === 'casa' ? '¡TP a la Ciudad Vecibanda!' : '¡De vuelta en la mansión!', 'plata');
  };
  let esperaTP = 0;
  const actualizarTP = (dt) => {
    if ((esperaTP -= dt) <= 0) {
      esperaTP = 1;
      if (tpComprado() && !portalCiudad) {
        portalCiudad = crearPortal('MANSIÓN');
        portalCiudad.position.set(TP_CIUDAD.llegada.x, 0, TP_CIUDAD.llegada.z);
        escena.add(portalCiudad);
      }
      if (tpComprado() && !portalCasa) {
        portalCasa = crearPortal('CIUDAD VECIBANDA');
        portalCasa.position.set(TP_CIUDAD.x, 0, TP_CIUDAD.z);
        escena.add(portalCasa);
      }
      if (!tpComprado() && portalCasa) { escena.remove(portalCasa); portalCasa = null; } // partida nueva
    }
    portalCasa?.userData.girar(dt);
    portalCiudad?.userData.girar(dt);
  };
  // Un solo botón de acción (como los avisos de Roblox): manejar o dormir, con la E.
  const accion = () => {
    if (conduciendo && !enHeli() && !autodromo.corriendo && taller.accion(jugador, vehiculo)) {
      if (taller.hacer(vehiculo)) controles.activo = false;
      return;
    }
    const victima = bautiTrabado() && !conduciendo && mj?.cercano(jugador.pos);
    if (victima) {
      mj.pegar(victima);
      sfx.choque();
      UI.toast(`¡Bauti le pegó a ${victima.info.nombre || 'alguien'} y lo mandó al cielo!`, 'plata');
      return;
    }
    if (comcar.accion(jugador)) {
      comcar.hacer(jugador);
      return;
    }
    if (celular.accion(jugador)) { // entregar un pedido de Tranzapp va antes que charlar
      celular.hacer(jugador);
      return;
    }
    if (!conduciendo && nico.accion(jugador)) {
      nico.hacer();
      return;
    }
    if (!conduciendo && costa.accion(jugador)) {
      costa.hacer(jugador);
      return;
    }
    if (tanzania.accion(jugador)) {
      tanzania.hacer();
      return;
    }
    if (cachimba.accion(jugador)) {
      cachimba.hacer(jugador);
      return;
    }
    if (!conduciendo && pony.hacer(jugador, estado.personaje === 'bauti')) return;
    if (!conduciendo && estatua.accion(jugador)) {
      abrirTestamento();
      return;
    }
    if (cercaCaja()) {
      abrirCaja();
      return;
    }
    if (cercaTP()) {
      usarTP(cercaTP());
      return;
    }
    if (!conduciendo && playa.accion(jugador)) {
      if (playa.hacer(jugador, () => { controles.activo = modo === 'juego'; })) controles.activo = false;
      return;
    }
    if (!conduciendo && casino.accion(jugador)) {
      if (casino.hacer(jugador)) controles.activo = false;
      return;
    }
    if (!conduciendo && bar.accion(jugador)) {
      bar.hacer(jugador);
      return;
    }
    if (!conduciendo && lucca.accion(jugador)) {
      lucca.hacer(jugador);
      return;
    }
    if (!conduciendo && ciudad.accion(jugador)) {
      ciudad.hacer(jugador);
      return;
    }
    if (!conduciendo && concesionario.accion(jugador)) {
      concesionario.hacer(jugador);
      return;
    }
    if (!conduciendo && karaoke.accion(jugador)) {
      karaoke.hacer(jugador);
      return;
    }
    if (!conduciendo && autodromo.accion(jugador)) {
      controles.activo = false;
      autodromo.hacer(jugador);
      return;
    }
    if (misiones.accion(jugador)) {
      misiones.hacer(jugador);
      return;
    }
    if (gym.accion(jugador)) {
      gym.hacer(jugador);
      return;
    }
    if (!conduciendo && perros.accion(jugador)) {
      perros.hacer(jugador);
      return;
    }
    if (!conduciendo && amarishuow.accion(jugador)) {
      amarishuow.hacer(jugador);
      return;
    }
    if (!conduciendo && ottati.accion(jugador)) {
      ottati.hacer(jugador);
      return;
    }
    if (resto.accion(jugador)) {
      if (resto.hacer(jugador) === 'menu') {
        controles.activo = false;
        UI.abrirMenuResto(PLATOS, (id) => resto.pedir(id, jugador), () => { controles.activo = modo === 'juego'; });
      }
      return;
    }
    if (arcadeCerca()) {
      controles.activo = false;
      geometry.abrir(() => { controles.activo = modo === 'juego'; });
      return;
    }
    if (roperoCerca()) abrirRopero();
    else if (camaCerca()) dormir();
    else subirOBajar();
  };
  btnManejar.addEventListener('click', accion);
  // En el gym cada apretada cuenta (el minijuego de las últimas reps): Espacio y el botón de saltar.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat && gym.entrenando && controles.activo) gym.pulsar(jugador);
  });
  document.getElementById('btn-saltar')?.addEventListener('pointerdown', () => { if (gym.entrenando) gym.pulsar(jugador); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && modo === 'juego' && controles.activo) accion();
  });

  const ir = (nuevo) => {
    if (nuevo !== 'juego' && conduciendo) subirOBajar();
    if (nuevo !== 'juego' && gym.entrenando) gym.dejar(jugador);
    if (nuevo !== 'juego' && casino.jugando) casino.salir(true);
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
  // Derrapar: en el mismo lugar (manejando no te agachás). Se mantiene apretado, como Shift.
  let ultimoDerrape = null;
  const btnDerrapar = document.getElementById('btn-derrapar');
  btnDerrapar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    controles.derrapeTactil = true;
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btnDerrapar.addEventListener(ev, () => { controles.derrapeTactil = false; });

  // ---------- Lechugas (slot 2) ----------
  // Se compran en la verdulería de la ciudad. Con una en la mano, tocar el piso del terreno
  // la deja ahí (y tocar una puesta la levanta). No se explica para qué sirven.
  const lechugas = new Lechugas(escena, estado, guardarAhora);
  const btnLechuga = document.getElementById('btn-lechuga');
  const cantLechugas = btnLechuga.querySelector('.slot-cant');
  let ultimoLechuga = null;
  // Sin lechugas en el bolsillo no aparece el ítem (las puestas quedan donde están).
  const hayLechugas = () => estado.lechugas > 0;
  const sacarLechuga = (v) => {
    lechugas.enMano = v && hayLechugas() && !conduciendo && !gym.entrenando;
    if (lechugas.enMano && armaEnMano) sacarArma(false);
    if (lechugas.enMano) jugador.modelo.manoD.add(lechugas.mano);
    else lechugas.mano.parent?.remove(lechugas.mano);
    jugador.modelo.herramienta = lechugas.enMano;
  };
  btnLechuga.addEventListener('pointerdown', (e) => { e.preventDefault(); sacarLechuga(!lechugas.enMano); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Digit2' && modo === 'juego' && controles.activo && hayLechugas()) sacarLechuga(!lechugas.enMano);
  });
  controles.alTocar = (x, y) => {
    if (!lechugas.enMano || modo !== 'juego' || conduciendo) return;
    if (lechugas.tocar(x, y, camara, jugador, choquesActuales, tycoon.agua)) sfx.lechuga();
  };
  const actualizarLechugas = () => {
    const ver = modo === 'juego' && hayLechugas() && !conduciendo;
    if (!ver && lechugas.enMano) sacarLechuga(false);
    const est = ver ? `${lechugas.enMano}|${estado.lechugas}` : '';
    if (est === ultimoLechuga) return;
    ultimoLechuga = est;
    btnLechuga.classList.toggle('oculto', !ver);
    btnLechuga.setAttribute('aria-pressed', String(lechugas.enMano));
    cantLechugas.textContent = `×${estado.lechugas}`;
    lechugas.mano.visible = estado.lechugas > 0;
  };
  mazza.lechugas = lechugas;
  mazza.conLechuga = () => lechugas.enMano && estado.lechugas > 0;
  ciudad.precioLechuga = formato(PRECIO_LECHUGA);
  // La paja para el pony (pony.js): una sola vez.
  ciudad.precioPaja = formato(PRECIO_PAJA);
  ciudad.puedePaja = () => !estado.paja && !estado.pony;
  ciudad.alComprarPaja = () => {
    if (estado.plata < PRECIO_PAJA) {
      UI.toast(`Te faltan ${formato(PRECIO_PAJA - estado.plata)}`, 'error');
      sfx.error();
      return;
    }
    estado.plata -= PRECIO_PAJA;
    estado.paja = 'comprada';
    guardarAhora();
    sfx.comprar();
    UI.toast('Compraste un fardo de paja. Ponelo afuera de la mansión, al lado de la cerca', 'plata', 5000);
  };
  ciudad.alComprarLechuga = () => {
    if (estado.plata < PRECIO_LECHUGA) {
      UI.toast(`Te faltan ${formato(PRECIO_LECHUGA - estado.plata)}`, 'error');
      sfx.error();
      return;
    }
    estado.plata -= PRECIO_LECHUGA;
    estado.lechugas++;
    guardarAhora();
    sfx.comprar();
    UI.toast(estado.lechugas === 1 ? 'Compraste una lechuga' : `Compraste una lechuga (tenés ${estado.lechugas})`, 'plata');
  };

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
    armaEnMano = v && tycoon.tieneArma && !conduciendo && !gym.entrenando;
    if (armaEnMano && lechugas.enMano) sacarLechuga(false);
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
    for (const b of choquesActuales) {
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
    // La Schwepa con Manu: no se la puede parar, pero el tiro le pega igual.
    if (!pego && banda.posicionSchwepa(blanco)) {
      const t = blanco.clone().sub(rayo.origin).dot(rayo.direction);
      if (t > 0 && t < dist && rayo.distanceSqToPoint(blanco) < 2.6 * 2.6) {
        dist = t;
        pego = true;
      }
    }
    if (pego) misiones.tiroSchwepa(estado.personaje);
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
    if (pony.montado) pony.bajar(jugador);
    const enMano = armaEnMano;
    const conLechuga = lechugas.enMano;
    if (enMano) sacarArma(false);
    if (conLechuga) sacarLechuga(false);
    // Bauti cambia de cuerpo entrenando en el gym (gimnasio.js: fisico). La ropa de las
    // tiendas que tenga puesta este personaje (Bauti gordo no: no hay de su talle).
    const pf = fisico(p, estado);
    jugador.setModelo(crearPersonaje(pf, await cargarCabeza(p), await vestido(puedeVestirse(p.id) ? estado.vestuario[p.id] : null)));
    jugador.personaje = pf;
    jugador.estado = estado;
    if (enMano) sacarArma(true);
    if (conLechuga) sacarLechuga(true);
    jugador.factorVel = pf.velocidad || 1;
    jugador.setEscala(p.alto || 1);
    puedeAgacharse = (p.alto || 1) > 1;
    controles.agacharse = false;
    estado.personaje = p.id;
    guardarAhora();
  };
  const personajeGuardado = () => PERSONAJES.find((p) => p.id === estado.personaje);

  // ---------- Ropa: tiendas de la ciudad y roperos de la mansión ----------
  // estado.ropa: las prendas compradas; estado.vestuario[personaje]: lo que tiene puesto cada uno.
  const TALLE = 'Disculpá bro, no nos queda talle XXXXL';
  const tuyas = () => PRENDAS.filter((p) => estado.ropa.includes(p.id));
  let explicarRopero = false;
  ciudad.alTienda = (t) => {
    const v = t.T.vendedor;
    if (!puedeVestirse(estado.personaje)) {
      ciudad.decir(t, TALLE);
      UI.toast(`${v.nombre}: "${TALLE}"`, 'info');
      return;
    }
    controles.activo = false;
    UI.abrirCatalogo({
      titulo: t.T.nombre,
      sub: `${v.nombre} te muestra lo que hay`,
      plata: () => estado.plata,
      prendas: PRENDAS.filter((p) => p.tienda === t.T.id).map((p) => ({ ...p, tuya: estado.ropa.includes(p.id) })),
      tema: t.T.id,
      alComprar: (id) => {
        const p = PRENDA[id];
        if (estado.plata < p.precio) {
          UI.toast(`Te faltan ${formato(p.precio - estado.plata)}`, 'error');
          sfx.error();
          return false;
        }
        estado.plata -= p.precio;
        estado.ropa.push(id);
        guardarAhora();
        sfx.comprar();
        UI.toast(`¡Compraste ${p.nombre}!`, 'plata');
        ciudad.decir(t, 'Ponétela en un ropero de la casa');
        if (estado.ropa.length === 1) explicarRopero = true;
        misiones.revisarRopa();
        return true;
      },
      alCerrar: () => {
        if (!explicarRopero) { controles.activo = modo === 'juego'; return; }
        // La primera compra: el que atiende explica (cortito) dónde se la pone.
        explicarRopero = false;
        UI.dialogo({
          nombre: v.nombre, cara: t.cara.toDataURL(), remera: v.remera,
          lineas: ['¡Buena compra, bro!', 'Para ponértela andá a cualquier ropero de la mansión: ahí te la probás y elegís qué te ponés.'],
          alTerminar: () => { controles.activo = modo === 'juego'; },
        });
      },
    });
  };
  lucca.alTienda = ciudad.alTienda;


  // Ropero: a la izquierda tu personaje (en 3D, girando) y a la derecha tus prendas.
  const probador = new Probador(document.getElementById('ropero-vista'));
  // Geometry Dash en las máquinas del arcade.
  const geometry = new GeometryDash({ estado, guardar: () => guardarAhora(), sfx });
  const arcadeCerca = () => !conduciendo && tycoon.arcades.some((a) => Math.hypot(a.x - jugador.pos.x, a.z - jugador.pos.z) < 3.4 && Math.abs(a.y - 3.5 - jugador.pos.y) < 3);
  const roperoCerca = () => {
    if (conduciendo) return null;
    return tycoon.roperos.find((r) => Math.hypot(r.x - jugador.pos.x, r.z - jugador.pos.z) < 4.5 && Math.abs(r.y - jugador.pos.y) < 2.5) || null;
  };
  const abrirRopero = async () => {
    const p = personajeGuardado();
    if (!p) return;
    controles.activo = false;
    const pf = fisico(p, estado);
    const cab = await cargarCabeza(p);
    const probar = async (ropa) => probador.mostrar(crearPersonaje(pf, cab, await vestido(ropa), { otraVista: true }));
    const puedo = puedeVestirse(p.id);
    probador.abrir();
    UI.abrirRopero({
      titulo: `Ropero de ${p.nombre}`,
      slots: SLOTS,
      tuyas: tuyas(),
      puesto: (puedo && estado.vestuario[p.id]) || {},
      aviso: puedo ? '' : 'Todavía no te entra nada de esto. Primero tenés que adelgazar.',
      alProbar: probar,
      alListo: async (ropa) => {
        estado.vestuario[p.id] = ropa;
        guardarAhora();
        await ponerPersonaje(p);
        UI.toast('¡Listo, quedaste facha!', 'plata');
      },
      alCerrar: () => { probador.cerrar(); controles.activo = modo === 'juego'; },
    });
    await probar(puedo ? estado.vestuario[p.id] : null);
  };

  // Solo se cambia de personaje adentro de la mansión (cualquier piso).
  const enLaMansion = () => jugador.pos.x > MANSION.x0 && jugador.pos.x < MANSION.x1 && jugador.pos.z > MANSION.z0 && jugador.pos.z < MANSION.z1;
  // El aviso sale adentro de la pantalla desde donde se apretó (configuración o menú), no
  // atrás de ella. Se va solo a los 4 segundos.
  let avisoTimer = null;
  const puedeCambiar = (dondeAviso) => {
    if (!estado.personaje || enLaMansion()) return true;
    const el = document.getElementById(dondeAviso);
    el.textContent = 'Para cambiar de personaje tenés que estar adentro de la mansión';
    el.classList.remove('oculto');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => el.classList.add('oculto'), 4000);
    sfx.error();
    return false;
  };
  gym.alEntrar = () => {
    if (armaEnMano) sacarArma(false);
    if (lechugas.enMano) sacarLechuga(false);
  };
  gym.alCambiarFisico = async (mensaje) => {
    await ponerPersonaje(personajeGuardado());
    UI.toast(mensaje, 'plata');
    sfx.brillo();
  };

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
  $('btn-menu-personaje').addEventListener('click', () => { iniciarAudio(); if (puedeCambiar('aviso-menu')) abrirSeleccion(); });
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
  // ---------- Misiones ----------
  // Ícono de las misiones que puede hacer cualquiera: tres muñequitos de bloques (como los
  // personajes del juego) sobre un fondo violeta con brillo, y una estrellita dorada.
  let icono = null;
  const iconoBanda = () => {
    if (icono) return icono;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const f = g.createLinearGradient(0, 0, 128, 128);
    f.addColorStop(0, '#7c3aed');
    f.addColorStop(1, '#2563eb');
    g.fillStyle = f;
    g.fillRect(0, 0, 128, 128);
    const brillo = g.createRadialGradient(64, 40, 4, 64, 40, 70);
    brillo.addColorStop(0, 'rgba(255,255,255,0.35)');
    brillo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = brillo;
    g.fillRect(0, 0, 128, 128);
    const muneco = (x, y, e, remera) => {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x - 15 * e + 3, y + 3, 30 * e, 62 * e);
      g.fillStyle = '#ffd7a8';
      g.fillRect(x - 10 * e, y, 20 * e, 20 * e); // cabeza
      g.fillStyle = '#2b1d14';
      g.fillRect(x - 10 * e, y, 20 * e, 6 * e); // pelo
      g.fillStyle = '#111';
      g.fillRect(x - 6 * e, y + 10 * e, 3 * e, 3 * e);
      g.fillRect(x + 3 * e, y + 10 * e, 3 * e, 3 * e);
      g.fillStyle = remera;
      g.fillRect(x - 15 * e, y + 22 * e, 30 * e, 22 * e); // torso y brazos
      g.fillStyle = '#1e3a8a';
      g.fillRect(x - 10 * e, y + 44 * e, 9 * e, 18 * e);
      g.fillRect(x + 1 * e, y + 44 * e, 9 * e, 18 * e);
    };
    muneco(34, 46, 0.95, '#ef4444');
    muneco(94, 46, 0.95, '#22c55e');
    muneco(64, 34, 1.15, '#fbbf24');
    g.fillStyle = '#ffd23f';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 6 : 14;
      g.lineTo(108 + Math.cos(a) * r, 20 + Math.sin(a) * r);
    }
    g.fill();
    icono = c.toDataURL();
    return icono;
  };
  const caras = {};
  const caraDe = async (id) => {
    if (!caras[id]) caras[id] = (await cargarCabeza(PERSONAJES.find((p) => p.id === id))).frente.toDataURL();
    return caras[id];
  };
  // Cara partida al medio: la mitad izquierda de uno y la derecha del otro (Restaurando la amistad).
  const mitades = {};
  const caraMitades = async ([a, b]) => {
    const k = `${a}|${b}`;
    if (!mitades[k]) {
      const [ca, cb] = await Promise.all([a, b].map((id) => cargarCabeza(PERSONAJES.find((p) => p.id === id))));
      const s = ca.frente.width;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      g.drawImage(ca.frente, 0, 0, s / 2, s, 0, 0, s / 2, s);
      g.drawImage(cb.frente, s / 2, 0, s / 2, s, s / 2, 0, s / 2, s);
      g.fillStyle = '#ffffff';
      g.fillRect(s / 2 - 2, 0, 4, s);
      mitades[k] = c.toDataURL();
      c.width = c.height = 1;
    }
    return mitades[k];
  };
  UI.onCaraSecreta((ids) => (ids.length > 1 ? caraMitades(ids) : ids[0] ? caraDe(ids[0]) : null));
  const abrirMisiones = async () => {
    if (modo !== 'juego' || !misiones.abiertas || UI.visible('misiones') || UI.visible('dialogo')) return;
    if (gym.entrenando) gym.dejar(jugador);
    controles.activo = false;
    // Las misiones de cualquiera (personaje: null) llevan el ícono de la banda, no una cara.
    const lista = await Promise.all(misiones.lista(jugador).map(async (m) => (m.caras
      ? { ...m, cara: await caraMitades(m.caras), nombre: m.caras.map((id) => PERSONAJES.find((p) => p.id === id).nombre).join(' y ') }
      : m.personaje
        ? { ...m, cara: await caraDe(m.personaje), nombre: PERSONAJES.find((p) => p.id === m.personaje).nombre }
        : { ...m, cara: iconoBanda(), nombre: 'Todos' })));
    UI.puntoMisiones(false);
    UI.abrirMisiones(lista, () => { controles.activo = modo === 'juego'; });
  };
  $('btn-misiones').addEventListener('click', abrirMisiones);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && controles.activo && modo === 'juego') abrirMisiones(); });
  // Diálogo de historia con un personaje a la derecha (el del Cusi con Juanma, el del Pipi con Tepho).
  misiones.alHablar = async (id, lineas, alTerminar) => {
    if (gym.entrenando) gym.dejar(jugador);
    controles.activo = false;
    const p = PERSONAJES.find((x) => x.id === id);
    UI.dialogo({ nombre: p.nombre, cara: await caraDe(id), remera: p.remera, lineas, alTerminar: () => { controles.activo = modo === 'juego'; UI.puntoMisiones(true); alTerminar(); } });
  };
  $('btn-cerrar-config').addEventListener('click', cerrarConfig);
  $('btn-salir-menu').addEventListener('click', () => { volverAlJuego = false; ir('menu'); });
  $('btn-cambiar-personaje').addEventListener('click', () => {
    if (!puedeCambiar('aviso-config')) return;
    volverAlJuego = true;
    abrirSeleccion();
  });
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
    else if (gym.entrenando) gym.dejar(jugador);
    else if (!UI.visible('testamento') && !UI.visible('caja') && !UI.visible('confirmar') && !UI.visible('final') && !UI.visible('menu-resto') && !UI.visible('misiones') && !UI.visible('dialogo') && !UI.visible('catalogo') && !UI.visible('ropero')) abrirConfig();
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

  // ?debug: juego.depurar.camaraLibre deja mover la cámara a mano (para sacar fotos).
  const depurar = { camaraLibre: false };
  if (location.search.includes('debug')) window.juego = { renderer, depurar, estado, jugador, tycoon, controles, ir, camara, ladron, mazza, resto, gym, misiones, dufre, ottati, manu, banda, amarishuow, pony, estatua, mj, bar, hilario, humano, cachimba, nico, costa, tanzania, comcar, policia, ciudad, casino, lucca, playa, concesionario, flota, karaoke, autodromo, taller, perros, lechugas, sacarLechuga, fotos: () => fotos, capturarMapa: (id) => capturarMapa(id) };

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
    for (const b of choquesActuales) {
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
      let d = vehiculo.angulo + Math.PI - controles.yaw;
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
      // En el helicóptero la cámara va más lejos (se ve todo el aparato y el paisaje).
      const lejos = enHeli() ? Math.max(controles.dist, 26) : controles.dist;
      const libre = distanciaLibre(cabeza, dir, lejos);
      // Acercarse al toque si hay una pared; alejarse suave.
      distActual = libre < distActual ? libre : distActual + (libre - distActual) * Math.min(1, dt * 5);
      deseada.copy(cabeza).addScaledVector(dir, distActual);
      // Ni abajo del pasto ni adentro de la montaña.
      const piso = mundo.altura(deseada.x, deseada.z) + 0.8;
      if (deseada.y < Math.max(0.6, piso)) deseada.y = Math.max(0.6, piso);
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

  // Los faroles del restaurante y las luces del gym iluminan su cuadra de noche: la luz sube
  // de a poco al acercarse.
  const centroResto = new THREE.Vector3((RESTO.x0 + PARRILLA.x) / 2, 0, RESTO.z1);
  const centroGym = new THREE.Vector3((GYM.x0 + GYM.x1) / 2, 0, (GYM.z0 + GYM.z1) / 2);
  const cerca = (c, r) => THREE.MathUtils.clamp((r + 40 - Math.hypot(jugador.pos.x - c.x, jugador.pos.z - c.z)) / 40, 0, 1);
  let luzGym = 0;
  const luzBarrio = () => Math.max(tycoon.restoAbierto ? cerca(centroResto, 55) : 0, cerca(centroGym, 60), ciudad.adentro(jugador.pos) ? 1 : 0);

  // ---------- Bucle ----------
  const reloj = new THREE.Clock();
  const dir = new THREE.Vector3();

  const bucle = () => {
    requestAnimationFrame(bucle);
    // Por si el aviso de cambio de tamaño tarda (pasa en el celu): se mira cada cuadro.
    corregirAlto();
    if (canvas.clientWidth !== anchoCanvas || canvas.clientHeight !== altoCanvas) ajustar();
    const real = reloj.getDelta();
    const dt = Math.min(real, 0.05);

    choquesActuales = ciudad.choquesCerca(jugador.pos, tycoon.heli?.caja, ...autos().map((a) => a.caja)) || colisiones;
    if (enHeli()) {
      tycoon.heli.actualizar(dt, controles.ejes(ejes), controles.saltar, choquesActuales, mundo.altura);
      jugador.pos.copy(tycoon.heli.pos);
    } else if (conduciendo) {
      vehiculo.terreno = mundo.altura;
      vehiculo.ruta = rutaCosta;
      // En la autopista (la ciudad queda a 3 km) y en el autódromo, cada auto llega a su
      // velocidad máxima de verdad; en el barrio y en la ciudad, a su tope de calle.
      const enAutopista = ciudad.enAutopista(vehiculo.pos);
      vehiculo.velMax = enAutopista || autodromo.enPista(vehiculo.pos) ? vehiculo.specs.v : vehiculo.specs.barrio;
      if (enAutopista && !avisoAutopista) {
        avisoAutopista = true;
        UI.toast('¡Autopista! Acá el auto vuela: a fondo hasta la Ciudad Vecibanda', 'info');
      }
      // Con el semáforo en rojo o amarillo, el auto no se mueve.
      // En el auto, el botón de saltar es el freno.
      const mando = autodromo.bloqueado ? { x: 0, y: 0 } : controles.ejes(ejes);
      mando.freno = !autodromo.bloqueado && controles.saltar;
      mando.derrape = !autodromo.bloqueado && controles.derrapar;
      if (vehiculo !== tycoon.heli) bar.desviarEjes(mando, reloj.elapsedTime);
      vehiculo.actualizar(dt, mando, choquesActuales);
      jugador.pos.copy(vehiculo.pos);
    } else if (gym.entrenando) {
      // Entrenando en el gym: moverse lo saca de la máquina; saltar (o el botón) hace la repetición.
      controles.direccion(dir);
      if (dir.lengthSq() > 0.04) gym.dejar(jugador);
      else gym.sostener(dt, jugador, controles.saltar || UI.repGymApretado());
    } else if (resto.asiento) {
      // Sentado en el restaurante: moverse o saltar lo levanta de la silla.
      controles.direccion(dir);
      if (dir.lengthSq() > 0.04 || controles.saltar) resto.levantar(jugador);
      else resto.sostener(dt, jugador);
    } else {
      controles.direccion(dir);
      bar.desviar(dir, reloj.elapsedTime);
      jugador.autoSalto = controles.esTactil;
      jugador.quiereAgacharse = puedeAgacharse && controles.agacharse;
      if (jugador.actualizar(dt, dir, controles.saltar, choquesActuales, tycoon.agua)) sfx.salto();
    }
    if (!enHeli()) tycoon.heli?.actualizar(dt, ejes, false, colisiones, mundo.altura); // las aspas frenan solas
    const texto = modo !== 'juego' || gym.entrenando || casino.jugando ? ''
      : conduciendo ? (enHeli() ? (tycoon.heli.apoyado ? 'Bajar del helicóptero (E)' : '') : autodromo.corriendo ? 'Salir del autódromo (E)' : taller.auto ? '' : taller.accion(jugador, vehiculo) || 'Bajar del auto (E)')
      : comcar.accion(jugador) || celular.accion(jugador) || (bautiTrabado() && mj?.cercano(jugador.pos) ? `Pegarle a ${mj.cercano(jugador.pos).info.nombre || 'él'} (E)` : '') || nico.accion(jugador) || costa.accion(jugador) || tanzania.accion(jugador) || cachimba.accion(jugador) || pony.accion(jugador) || estatua.accion(jugador) || (cercaCaja() ? 'Abrir la caja fuerte (E)' : '') || textoTP() || playa.accion(jugador) || casino.accion(jugador) || bar.accion(jugador) || lucca.accion(jugador) || ciudad.accion(jugador) || concesionario.accion(jugador) || autodromo.accion(jugador) || karaoke.accion(jugador) || misiones.accion(jugador) || gym.accion(jugador) || ottati.accion(jugador) || amarishuow.accion(jugador) || perros.accion(jugador) || (cercaDelAuto() ? 'Manejar (E)' : cercaDelHeli() ? 'Volar el helicóptero (E)' : resto.accion(jugador) || (arcadeCerca() ? 'Jugar al Geometry Dash (E)' : roperoCerca() ? 'Abrir ropero (E)' : camaCerca() ? 'Dormir (E)' : ''));
    const estadoAgachar = modo === 'juego' && puedeAgacharse && !conduciendo ? String(jugador.agachado) : '';
    if (estadoAgachar !== ultimoAgachar) {
      ultimoAgachar = estadoAgachar;
      btnAgachar.classList.toggle('oculto', !estadoAgachar);
      btnAgachar.setAttribute('aria-pressed', estadoAgachar || 'false');
    }
    controles.manejando = conduciendo && !enHeli() && !taller.auto; // en el taller no hay botón de derrapar
    const estadoDerrape = modo === 'juego' && controles.manejando ? String(!!vehiculo.deriva && Math.abs(vehiculo.deriva) > 0.08) : '';
    if (estadoDerrape !== ultimoDerrape) {
      ultimoDerrape = estadoDerrape;
      btnDerrapar.classList.toggle('oculto', !estadoDerrape);
      btnDerrapar.setAttribute('aria-pressed', estadoDerrape || 'false');
    }
    if (texto !== textoManejar) {
      textoManejar = texto;
      btnManejar.textContent = texto;
      btnManejar.classList.toggle('oculto', !texto);
    }
    // Manejando, el botón (bajar del auto, entrar al taller...) va arriba a la izquierda: abajo
    // en el medio tapaba la calle.
    btnManejar.classList.toggle('arriba', conduciendo);
    tycoon.actualizar(dt, jugador);
    ladron.actualizar(dt, modo === 'juego' && !vistaCompleta);
    perros.actualizar(dt, jugador);
    mazza.actualizar(dt, jugador, modo === 'juego' && !vistaCompleta, estado.personaje === 'juanma');
    resto.actualizar(dt, jugador, modo === 'juego');
    gym.actualizar(dt, jugador, modo === 'juego');
    taller.actualizar(dt, jugador, conduciendo ? vehiculo : null);
    misiones.actualizar(dt, jugador, modo === 'juego' && !vistaCompleta && controles.activo);
    dufre.actualizar(dt, jugador, modo === 'juego');
    ottati.actualizar(dt, jugador, modo === 'juego');
    amarishuow.actualizar(dt, jugador, modo === 'juego');
    hilario.actualizar(dt, jugador, modo === 'juego');
    humano.actualizar(dt, jugador, modo === 'juego', momento(hora()).noche, !conduciendo);
    cachimba.actualizar(dt, jugador, modo === 'juego');
    nico.actualizar(dt, jugador);
    costa.actualizar(dt, jugador);
    tanzania.actualizar(dt, jugador);
    fumar.actualizar(dt);
    comcar.actualizar(dt, jugador);
    // Visitas de verdad: un pibe en la sala de visitas del lado de afuera y otro preso adentro se ven
    // por la reja (sus posiciones ya viajan por la red); acá solo el aviso a los dos.
    if (mj && (relojVisitas += dt) > 2) {
      relojVisitas = 0;
      for (const o of mj.otros.values()) {
        if (!o.grupo.visible || !o.actual || visitasAvisadas.has(o.uid)) continue;
        const enSala = (q) => comcar.enSalaVisitas(q);
        if (comcar.preso && enSala(o.actual)) { visitasAvisadas.add(o.uid); UI.toast(`¡${o.info.nombre || 'Alguien'} te vino a visitar! Andá a la sala de visitas`, 'plata', 5000); }
        else if (!comcar.preso && o.info.preso && enSala(jugador.pos)) { visitasAvisadas.add(o.uid); UI.toast(`${o.info.nombre || 'Alguien'} está preso: esperalo en la reja de la sala`, 'info', 5000); }
      }
      if (!comcar.preso && !comcar.enSalaVisitas(jugador.pos)) visitasAvisadas.clear();
    }
    policia.actualizar(dt, jugador, conduciendo, modo === 'juego' && controles.activo);
    fumadores.actualizar(dt, jugador);
    celular.actualizar(dt, jugador, conduciendo && vehiculo === tanzania.autos[0], vehiculo?.vel || 0);
    pony.actualizar(dt, jugador);
    if (modo === 'juego') mj?.actualizar(dt, { modo: enHeli() ? 'heli' : conduciendo ? 'auto' : pony.montado ? 'pony' : 'pie', vehiculo: conduciendo ? vehiculo : null });
    banda.actualizar(dt, jugador, modo === 'juego' && !vistaCompleta, ladron);
    manu.actualizar(dt, jugador, modo === 'juego', banda.activa);
    concesionario.actualizar(dt, jugador);
    karaoke.actualizar(dt, jugador);
    autodromo.actualizar(dt, jugador);
    flota.actualizar();
    ciudad.actualizar(dt, jugador, modo === 'juego');
    casino.actualizar(dt, jugador, momento(hora()).noche);
    lucca.actualizar(dt, jugador);
    bar.actualizar(dt, jugador);
    actualizarTP(dt);
    playa.actualizar(dt, jugador, momento(hora()).noche, !conduciendo);
    actualizarArma(dt);
    actualizarLechugas();
    brillos.actualizar(dt);
    // Adentro del gym se prenden las luces (sube de a poco al entrar, como un fundido).
    luzGym += ((modo === 'juego' && gym.dentro(jugador.pos) ? 1 : modo === 'juego' && (casino.dentro(jugador.pos) || bar.dentro(jugador.pos)) ? 0.7 : modo === 'juego' && tanzania.dentro(jugador.pos) ? -0.8 : 0) - luzGym) * Math.min(1, dt * 4);
    mundo.actualizar(dt, hora(), estado.compras.includes('farolas') ? 1 : luzBarrio(), camara.position, luzGym);
    if (modo === 'juego') {
      estado.tiempoJugado += dt;
      UI.actualizarHUD(estado.plata, tycoon.ingresoPorSegundo + tanzania.ingresoPorSegundo, tycoon.progreso);
      // Mapa: la próxima foto que falte (de a una) y el minimapa con dónde estás.
      esperaMapa -= dt;
      if (esperaMapa <= 0 && !UI.mapaAbierto()) {
        esperaMapa = 1.5;
        const id = fotosPendientes();
        if (id) capturarMapa(id);
      }
      UI.mapaCuadro(jugador.pos, conduciendo ? vehiculo.angulo : jugador.angulo, controles.activo && !taller.auto);
      if (taller.auto) taller.camara(camara); // adentro del taller, con el menú
      else if (casino.jugando) casino.camara(camara); // sentado en una mesa o en una tragamonedas
      else if (!depurar.camaraLibre) { camaraJuego(dt); bar.camara(camara, reloj.elapsedTime); }
    } else {
      camaraMenu(dt);
      UI.mapaCuadro(jugador.pos, 0, false); // en el menú no hay minimapa
    }

    // Canvas de un solo dibujo: se suben ya a la placa de video y se vacían (js/liberar.js).
    subirPendientes((t) => renderer.initTexture(t));
    // Con el mapa abierto (tapa toda la pantalla) no se dibuja el 3D: menos calor en el celu.
    if (!UI.mapaAbierto()) renderer.render(escena, camara);
  };
  bucle();
}

iniciar();
