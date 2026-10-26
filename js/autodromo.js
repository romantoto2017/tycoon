import * as THREE from 'three';
import { AUTOS, AUTO_DEPORTIVO } from '../data/objetos.js';
import { AUTODROMO as AD, AUTOPISTA as AU, AUTOS_DESDE } from './constantes.js';
import { Auto, AutoComprado, specsAuto, pasoAuto } from './auto.js';
import { formato } from './util.js';
import { sfx } from './sfx.js';

// Autódromo Vecibanda Ring, a mitad de la autopista (abre con los autos, al 60%). Afuera, el
// estadio estilo Allianz Arena: un óvalo enorme de almohadones romboidales (blanco de día, rojo de
// noche), con el nombre y el sponsor (Sancor Seguros), estacionamientos y torres de luz. Adentro,
// el trazado del dibujo (TRAZADO) con pianos, leca, paredes de publicidad que frenan, alambrado,
// tribunas llenas de huevos que festejan los récords, un huevo banderillero y el semáforo.
//
// Jugabilidad: en la entrada, "Entrar al autódromo" abre la pantalla para elegir uno de tus autos
// (con tus tiempos y las medallas). Largás detenido con el semáforo y son vueltas cronometradas.
// Bronce, plata y oro salen de una simulación: un piloto automático da vueltas con la misma física
// del juego (auto.js) siguiendo el medio de la pista y frenando justo para cada curva. Oro es ganarle
// por un 4%, plata es ir apenas más lento (2%) y bronce, un 7% más lento. Pasarse de los límites de
// pista (más allá del piano) anula la vuelta. Cada medalla paga una vez por auto y cada récord tuyo
// por debajo del bronce paga un poco más cuanto más mejorás. Las misiones Hot-Wheels y Verstappen
// (misiones.js) piden el oro con un auto y con todos.

// ---------- Trazado ----------
// Puntos del dibujo de referencia (píxeles de la imagen de 556 × 556), en el sentido de marcha.
// El primero es la línea de largada y llegada (la raya roja).
const TRAZADO = [
  [135, 295], [127, 272], [118, 264], [85, 256], [56, 249], [44, 240], [45, 227], [57, 220], [80, 219],
  [140, 219], [200, 219], [214, 213], [242, 185], [270, 158], [284, 155], [340, 155], [402, 155], [414, 161],
  [431, 184], [448, 207], [460, 214], [470, 225], [474, 238], [469, 250], [461, 256], [461, 266], [472, 271],
  [498, 272], [508, 278], [511, 292], [510, 307], [503, 318], [472, 343], [440, 368], [400, 394], [384, 397],
  [372, 389], [342, 355], [312, 322], [298, 318], [240, 331], [176, 346], [160, 347], [151, 337], [143, 316],
];
const PASO = 3; // distancia entre puntos del medio de la pista
const MEDIO = AD.ancho / 2;
const PUERTAS = 10; // controles a lo largo de la vuelta (para que no se pueda cortar camino)
const LIMITE = MEDIO + 7; // límites de pista: pasando el piano y la franja blanca, la vuelta no vale
const PARED = MEDIO + 28; // las paredes de publicidad (y el alambrado): ahí el auto choca
const GRILLA = 9; // puntos antes de la línea donde se larga
export const MEDALLAS = [
  { id: 'oro', nombre: 'Oro', factor: 0.96, premio: { base: 3e8, minutos: 5 }, color: '#ffd23f' },
  { id: 'plata', nombre: 'Plata', factor: 1.02, premio: { base: 1.2e8, minutos: 2.5 }, color: '#cfd8dc' },
  { id: 'bronce', nombre: 'Bronce', factor: 1.07, premio: { base: 5e7, minutos: 1 }, color: '#d18b47' },
];
const RECORD = { base: 1.5e7, minutos: 0.3, tope: 6 }; // por cada segundo que mejorás tu récord

// Da vuelta los triángulos que miran para abajo (si no, no se ven desde arriba).
function haciaArriba(pos) {
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i];
    const uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i];
    const vz = pos[i + 8] - pos[i + 2];
    if (uz * vx - ux * vz < 0) {
      for (let j = 0; j < 3; j++) [pos[i + 3 + j], pos[i + 6 + j]] = [pos[i + 6 + j], pos[i + 3 + j]];
    }
  }
  return pos;
}

// Tela de publicidad: paneles iguales de izquierda a derecha. Cada marca es [texto, fondo, letra]
// o [logo, fondo] (logo: 'sancor' o 'sancor_blanco', en assets/especiales; se pinta al cargar).
function pintarMarcas(marcas, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const ancho = w / marcas.length;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  marcas.forEach(([t, fondo, letra], m) => {
    g.fillStyle = fondo;
    g.fillRect(m * ancho, 0, ancho, h);
    if (t.startsWith('sancor')) {
      const img = new Image();
      img.onload = () => {
        const alto = h * 0.74;
        const largo = Math.min(ancho * 0.86, (alto * img.width) / img.height);
        const altoReal = (largo * img.height) / img.width;
        g.drawImage(img, m * ancho + (ancho - largo) / 2, (h - altoReal) / 2, largo, altoReal);
        tex.needsUpdate = true;
      };
      img.src = `assets/especiales/${t}.png`;
      return;
    }
    g.fillStyle = letra;
    g.font = `800 ${Math.min(h * 0.62, (ancho * 1.6) / t.length)}px Fredoka, Arial, sans-serif`;
    g.fillText(t, m * ancho + ancho / 2, h / 2 + 2);
  });
  return tex;
}

// Lámina con el logo de Sancor (con su fondo), del tamaño pedido.
function cartelSancor(ancho, alto, blanco = false) {
  const tex = pintarMarcas([[blanco ? 'sancor_blanco' : 'sancor', blanco ? '#a6196e' : '#ffffff']], 512, Math.round((512 * alto) / ancho));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  m.userData.noSolido = true;
  return m;
}

const aMundo = ([px, py]) => new THREE.Vector3(AD.x + (px - 276) * AD.escala, 0, AD.z + (py - 155) * AD.escala);

function armarTrazado() {
  const curva = new THREE.CatmullRomCurve3(TRAZADO.map(aMundo), true, 'centripetal');
  const largo = curva.getLength();
  const n = Math.round(largo / PASO);
  const pts = curva.getSpacedPoints(n).slice(0, n);
  const puntos = pts.map((p) => ({ x: p.x, z: p.z, tx: 0, tz: 0, k: 0, giro: 0 }));
  for (let i = 0; i < n; i++) {
    const a = puntos[(i - 1 + n) % n];
    const b = puntos[(i + 1) % n];
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    puntos[i].tx = (b.x - a.x) / l;
    puntos[i].tz = (b.z - a.z) / l;
  }
  // Curvatura (1 / radio): cuánto gira la dirección por unidad de distancia, suavizada. giro
  // tiene el signo: positivo, la curva es para el lado −lateral (lo de afuera queda del lado +).
  const crudo = puntos.map((p, i) => {
    const a = puntos[(i - 2 + n) % n];
    const b = puntos[(i + 2) % n];
    let d = Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz);
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return d / (4 * PASO);
  });
  for (let i = 0; i < n; i++) {
    let suma = 0;
    for (let j = -3; j <= 3; j++) suma += crudo[(i + j + n) % n];
    puntos[i].giro = suma / 7;
    puntos[i].k = Math.abs(puntos[i].giro);
  }
  return { puntos, n, largo: n * PASO };
}
export const PISTA = armarTrazado();

// El punto de la pista más cercano (buscando cerca del anterior) y qué tan al costado está.
function cercano(x, z, desde = null) {
  const { puntos, n } = PISTA;
  let mejor = 0;
  let dMejor = Infinity;
  const [a, b] = desde == null ? [0, n] : [desde - 40, desde + 120];
  for (let j = a; j < b; j++) {
    const i = ((j % n) + n) % n;
    const p = puntos[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < dMejor) { dMejor = d; mejor = i; }
  }
  const p = puntos[mejor];
  return { i: mejor, lateral: p.tx * (z - p.z) - p.tz * (x - p.x) };
}

// Lleva las vueltas: controles en orden, línea de llegada y si te cortaste camino.
class Cronometro {
  constructor() {
    this.i = PISTA.n - GRILLA;
    this.puerta = 0;
    this.inicio = 0; // largada: el reloj arranca con la verde
    this.anulada = false;
    this.fuera = 0;
  }

  // Devuelve el tiempo de la vuelta si se completó una en este paso (y si valió), o null.
  paso(x, z, t) {
    const { n } = PISTA;
    const c = cercano(x, z, this.i);
    const antes = this.i;
    this.i = c.i;
    this.lateral = c.lateral;
    const avance = (c.i - antes + n) % n;
    if (avance > 0 && avance < n / 4) {
      const proxima = Math.round(((this.puerta + 1) * n) / (PUERTAS + 1));
      if (this.puerta < PUERTAS && (proxima - antes + n) % n <= avance) this.puerta++;
    }
    if (Math.abs(c.lateral) > LIMITE) this.anulada = true; // se fue de los límites de pista
    const cruzo = antes > n * 0.85 && c.i < n * 0.15;
    if (!cruzo) return null;
    if (this.puerta < PUERTAS) { this.puerta = 0; return null; } // la largada (o una vuelta incompleta)
    const vuelta = { tiempo: t - this.inicio, valida: !this.anulada };
    this.inicio = t;
    this.puerta = 0;
    this.anulada = false;
    return vuelta;
  }
}

// ---------- Simulación ----------
// Un piloto automático con la física del juego: mira la pista adelante, frena para llegar a cada
// curva a la velocidad que el agarre permite (con un margen) y apunta a un punto más adelante en el
// medio de la pista. Da dos vueltas; la que cuenta es la segunda (lanzada).
export function simular(def) {
  const sp = specsAuto(def);
  const { puntos, n } = PISTA;
  const g = puntos[n - GRILLA];
  const a = { pos: { x: g.x, z: g.z }, angulo: Math.atan2(g.tx, g.tz), vel: 0, direccion: 0, velMax: sp.v, specs: sp };
  const crono = new Cronometro();
  const vCurva = puntos.map((p) => Math.min(sp.v, Math.sqrt((sp.lateral * 0.97) / Math.max(p.k, 1e-5))));
  const dt = 1 / 60;
  const ejes = { x: 0, y: 0 };
  const vueltas = [];
  let fuera = 0;
  for (let t = 0; t < 900 && vueltas.length < 2; t += dt) {
    const i = crono.i;
    // Velocidad para poder frenar a tiempo para lo que viene.
    let objetivo = vCurva[i];
    const alcance = (a.vel * a.vel) / (2 * sp.freno * 0.92) + 20;
    for (let d = PASO; d < alcance; d += PASO) {
      const j = (i + Math.round(d / PASO)) % n;
      objetivo = Math.min(objetivo, Math.sqrt(vCurva[j] ** 2 + 2 * sp.freno * 0.92 * d));
    }
    ejes.y = a.vel > objetivo ? -1 : a.vel < objetivo * 0.985 ? 1 : 0;
    // Volante: hacia un punto más adelante en el medio de la pista.
    const mira = puntos[(i + Math.round((8 + 0.3 * Math.abs(a.vel)) / PASO)) % n];
    let error = Math.atan2(mira.x - a.pos.x, mira.z - a.pos.z) - a.angulo;
    error = Math.atan2(Math.sin(error), Math.cos(error));
    ejes.x = Math.max(-1, Math.min(1, -error * 4));
    pasoAuto(a, ejes, dt);
    if (Math.abs(crono.lateral || 0) > LIMITE - 4) fuera += dt;
    const v = crono.paso(a.pos.x, a.pos.z, t);
    if (v) vueltas.push(v.tiempo);
  }
  return { largada: vueltas[0], lanzada: vueltas[1], fuera };
}

// Tiempo de cada medalla para un auto (cacheado: la simulación tarda unos milisegundos).
const objetivos = new Map();
export function objetivosDe(def) {
  if (!objetivos.has(def.id)) {
    const s = simular(def);
    const base = s.lanzada || s.largada || 999;
    objetivos.set(def.id, Object.fromEntries(MEDALLAS.map((m) => [m.id, Math.round(base * m.factor * 10) / 10])));
  }
  return objetivos.get(def.id);
}

export const formatoTiempo = (t) => {
  if (t == null || !Number.isFinite(t)) return '–:––.–––';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
};

// ---------- Autódromo ----------
// El estadio (estilo Allianz Arena): un óvalo enorme entre la autopista y la pista, con la
// entrada mirando a la autopista. a, b: medios ejes; alto: de la fachada (≈ 42 m).
const ARENA = { x: aMundo([125, 155]).x, z: AU.z + AU.medioAncho + 12 + 110, a: 170, b: 110, alto: 105, exp: 2.4, base: 9 };
// Borde del óvalo (superelipse: más lleno que una elipse) en el ángulo t, escalado por r.
const bordeArena = (t, r = 1) => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [ARENA.x + ARENA.a * r * Math.sign(c) * Math.abs(c) ** (2 / ARENA.exp), ARENA.z + ARENA.b * r * Math.sign(s) * Math.abs(s) ** (2 / ARENA.exp)];
};
const enArena = (x, z, margen = 0) => Math.abs((x - ARENA.x) / (ARENA.a + margen)) ** ARENA.exp + Math.abs((z - ARENA.z) / (ARENA.b + margen)) ** ARENA.exp < 1;
const ENTRADA = { x: ARENA.x, z: ARENA.z - ARENA.b * 0.92 - 4 }; // la puerta principal

export class Autodromo {
  constructor({ escena, colisiones, kit, estado, ui, guardar, progreso, tycoon, flota }) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.kit = kit;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.progreso = progreso;
    this.tycoon = tycoon;
    this.flota = flota;
    this.abierto = null;
    this.carrera = null;
    this.festejo = 0;
    this.reloj = 0;
    this.grupo = new THREE.Group();
    this.grupo.visible = false;
    escena.add(this.grupo);
    this.choques = [];
    this.armar();
  }

  get datos() {
    this.estado.autodromo ??= { mejores: {}, medallas: {} };
    return this.estado.autodromo;
  }

  // Tus autos: el Deportivo (si lo compraste) y los del galpón. Los demás se ven bloqueados.
  autos() {
    const tengo = new Set(this.estado.autos || []);
    const lista = [AUTO_DEPORTIVO, ...AUTOS];
    return lista.map((def) => ({ def, tuyo: def.id === 'deportivo' ? !!this.tycoon.auto : tengo.has(def.id) && this.estado.compras.includes('galpon') }));
  }

  enPista(pos) {
    return Math.abs(pos.x - AD.x) < 900 && pos.z > AU.z + AU.medioAncho && pos.z < AD.z + 900;
  }

  get corriendo() { return !!this.carrera; }
  get bloqueado() { return this.carrera?.fase === 'semaforo'; }

  // ---------- Entrar ----------
  accion(jugador) {
    if (!this.abierto || this.carrera || jugador.pos.y > 3) return '';
    if (Math.hypot(jugador.pos.x - ENTRADA.x, jugador.pos.z - ENTRADA.z) > 10) return '';
    return 'Entrar al autódromo (E)';
  }

  hacer() {
    if (!this.abierto || this.carrera) return;
    const filas = this.autos().map(({ def, tuyo }) => {
      const obj = objetivosDe(def);
      const mejor = this.datos.mejores[def.id];
      const ganadas = this.datos.medallas[def.id] || [];
      return {
        id: def.id, nombre: def.nombre, tuyo, vmax: def.vmax, cero100: def.cero100, agarre: def.agarre,
        mejor: formatoTiempo(mejor), tieneMejor: mejor != null,
        medallas: MEDALLAS.map((m) => ({ id: m.id, nombre: m.nombre, color: m.color, tiempo: formatoTiempo(obj[m.id]), ganada: ganadas.includes(m.id) })),
      };
    });
    this.ui.abrirAutodromo({ autos: filas, largo: (PISTA.largo / 2.47 / 1000).toFixed(2) }, (id) => this.empezar(id), () => this.alCerrar?.());
  }

  // Larga con el auto elegido: un auto propio de la carrera, en la grilla, con el semáforo.
  empezar(id) {
    const def = id === 'deportivo' ? AUTO_DEPORTIVO : AUTOS.find((a) => a.id === id);
    const { puntos, n } = PISTA;
    const g = puntos[n - GRILLA];
    const angulo = Math.atan2(g.tx, g.tz);
    const auto = id === 'deportivo' ? new Auto(this.escena, g.x, g.z, angulo) : new AutoComprado(this.escena, def, g.x, g.z, angulo);
    auto.specs = specsAuto(def);
    this.carrera = { auto, def, fase: 'semaforo', t: 0, crono: new Cronometro(), vuelta: 1, ultima: null, mejorSesion: null, objetivos: objetivosDe(def) };
    this.ponerSemaforo(0);
    this.alSubir?.(auto);
    sfx.pip();
  }

  // Sale de la pista: el auto de la carrera desaparece y quedás a pie en la entrada.
  salir() {
    const c = this.carrera;
    if (!c) return;
    this.escena.remove(c.auto.grupo);
    this.carrera = null;
    this.ponerSemaforo(-1);
    this.ui.ocultarCarrera();
    this.alBajar?.({ x: ENTRADA.x, z: ENTRADA.z - 4 });
  }

  // ---------- Premios ----------
  premio(p) {
    const n = Math.max(p.base, (this.tycoon.ingresoPorSegundo || 0) * 60 * p.minutos);
    const e = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / e) * e;
  }

  terminarVuelta(v) {
    const c = this.carrera;
    const id = c.def.id;
    c.ultima = v;
    c.vuelta++;
    this.agitar = 2.5; // el banderillero agita la bandera a cuadros
    if (!v.valida) {
      sfx.error();
      this.ui.toast(`Vuelta anulada (te fuiste de los límites de pista): ${formatoTiempo(v.tiempo)}`, 'error');
      return;
    }
    if (c.mejorSesion == null || v.tiempo < c.mejorSesion) c.mejorSesion = v.tiempo;
    const d = this.datos;
    const antes = d.mejores[id];
    const record = antes == null || v.tiempo < antes;
    let ganado = 0;
    const mensajes = [];
    // Medallas nuevas (de la más fácil a la más difícil).
    d.medallas[id] ??= [];
    for (const m of [...MEDALLAS].reverse()) {
      if (v.tiempo <= c.objetivos[m.id] && !d.medallas[id].includes(m.id)) {
        d.medallas[id].push(m.id);
        const p = this.premio(m.premio);
        ganado += p;
        mensajes.push(`¡Medalla de ${m.nombre}!`);
      }
    }
    // Récord por debajo del bronce: más plata cuanto más mejorás.
    if (record && antes != null && v.tiempo <= c.objetivos.bronce) {
      const mejora = antes - v.tiempo;
      const p = Math.min(this.premio({ base: RECORD.base, minutos: RECORD.minutos }) * (1 + mejora), this.premio({ base: RECORD.base * RECORD.tope, minutos: RECORD.minutos * RECORD.tope }));
      ganado += Math.round(p);
      mensajes.push(`Mejoraste ${mejora.toFixed(3)} s`);
    }
    if (record) {
      d.mejores[id] = v.tiempo;
      this.festejo = 6; // las gradas festejan
    }
    if (ganado > 0) this.estado.plata += ganado;
    if (record || ganado) {
      sfx.gol();
      this.ui.toast(`${record ? '¡RÉCORD! ' : ''}${formatoTiempo(v.tiempo)} ${mensajes.join(' · ')}${ganado ? ` (+$${formato(ganado)})` : ''}`, 'plata');
    } else {
      sfx.cobrar();
      this.ui.toast(`Vuelta: ${formatoTiempo(v.tiempo)}`, 'info');
    }
    this.guardar();
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador) {
    this.ultimaPos = jugador.pos;
    if (!this.abierto) {
      if (this.progreso() < AUTOS_DESDE) { this.abierto = false; return; }
      this.abierto = true;
      this.colisiones.push(...this.choques);
    }
    const lejos = Math.hypot(jugador.pos.x - AD.x, jugador.pos.z - (AD.z + 300));
    this.grupo.visible = lejos < 1600;
    if (!this.grupo.visible) return;
    this.reloj += dt;
    // De noche la fachada brilla en rojo (como el Allianz Arena) y se prenden las luces.
    const noche = this.noche ? this.noche() : 0;
    if (noche !== this.nocheAntes) {
      this.nocheAntes = noche;
      this.matFachada.emissiveIntensity = noche * 1.2;
      this.matPuertas.color.set('#8a7a5a').lerp(new THREE.Color('#ffd88a'), noche);
      this.matFocos.color.set('#d9dde0').lerp(new THREE.Color('#ffffff'), noche);
      this.matLuces.color.set('#cfd6dc').lerp(new THREE.Color('#ff5a4a'), noche);
    }
    this.animarPublico(dt);
    this.animarBandera(dt);
    const c = this.carrera;
    if (!c) return;
    c.t += dt;
    if (c.fase === 'semaforo') {
      // Rojo, amarillo, verde: un segundo cada uno. Con la verde, largás.
      const luz = Math.min(2, Math.floor(c.t));
      if (luz !== this.luz) { this.ponerSemaforo(luz); luz < 2 ? sfx.pip() : sfx.brillo(); }
      this.ui.semaforoCarrera(luz);
      if (c.t >= 2) {
        c.fase = 'corriendo';
        c.t = 0;
        this.agitar = 3;
        this.ui.toast('¡Largaste!', 'ok');
      }
    } else {
      this.ui.semaforoCarrera(c.t < 1.2 ? 2 : -1);
      if (c.t > 1.2 && this.luz !== -1) this.ponerSemaforo(-1);
      // Por el pasto se va mucho más despacio.
      const a = c.auto;
      const v = c.crono.paso(a.pos.x, a.pos.z, c.t);
      if (Math.abs(c.crono.lateral) > MEDIO + 2 && a.vel > 18) a.vel -= a.vel * 1.4 * dt;
      this.chocarParedes(a, c.crono);
      if (v) this.terminarVuelta(v);
    }
    const mejor = this.datos.mejores[c.def.id];
    const sig = MEDALLAS.slice().reverse().find((m) => mejor == null || mejor > c.objetivos[m.id]);
    this.ui.hudCarrera({
      auto: c.def.nombre, vuelta: c.vuelta, tiempo: formatoTiempo(c.fase === 'corriendo' ? c.t - c.crono.inicio : 0),
      ultima: c.ultima ? `${formatoTiempo(c.ultima.tiempo)}${c.ultima.valida ? '' : ' (anulada)'}` : '–',
      mejor: formatoTiempo(mejor), velocidad: Math.round((Math.abs(c.auto.vel) / 2.47) * 3.6),
      objetivo: sig ? `${sig.nombre}: ${formatoTiempo(c.objetivos[sig.id])}` : '¡Todas las medallas!', colorObjetivo: sig?.color || '#8dff6a',
      fuera: c.crono.anulada ? 'anulada' : Math.abs(c.crono.lateral || 0) > MEDIO + 2 ? 'pasto' : '',
    });
  }

  // Las paredes frenan: si el auto llega a la pared (donde la hay), queda contra ella y pierde
  // casi toda la velocidad.
  chocarParedes(a, crono) {
    const lado = Math.sign(crono.lateral || 0);
    if (!lado || !this.paredes?.[lado]?.[crono.i]) return;
    const medio = (a.medio?.[0] || 2.1) + 0.3;
    if (Math.abs(crono.lateral) < PARED - medio) return;
    const p = PISTA.puntos[crono.i];
    const l = lado * (PARED - medio);
    a.pos.x = p.x - p.tz * l;
    a.pos.z = p.z + p.tx * l;
    if (Math.abs(a.vel) > 8) {
      if (!this.golpe || this.reloj - this.golpe > 0.6) sfx.choque();
      this.golpe = this.reloj;
    }
    a.vel *= 0.3;
    a.colocar();
  }

  // ---------- Dibujo ----------
  ponerSemaforo(luz) {
    this.luz = luz;
    this.luces?.forEach((m, i) => m.color.set(i === luz ? ['#ff2a1a', '#ffc21a', '#2bff5a'][i] : '#2a2a2a'));
  }

  animarPublico(dt) {
    if (this.festejo > 0) this.festejo -= dt;
    const saltando = this.festejo > 0;
    if (!saltando && !this.saltaban) return;
    this.saltaban = saltando;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    this.huevos.forEach((h, i) => {
      const y = saltando ? Math.abs(Math.sin(this.reloj * 9 + h.fase)) * 1.4 : 0;
      p.set(h.x, h.y + y, h.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.giro + (saltando ? Math.sin(this.reloj * 6 + h.fase) * 0.4 : 0));
      s.set(1, 1, 1);
      m.compose(p, q, s);
      this.mallaHuevos.setMatrixAt(i, m);
      this.mallaOjos.setMatrixAt(i, m);
    });
    this.mallaHuevos.instanceMatrix.needsUpdate = true;
    this.mallaOjos.instanceMatrix.needsUpdate = true;
  }

  armar() {
    const k = this.kit;
    const g = this.grupo;
    const { puntos, n } = PISTA;
    const solido = (m) => { g.add(m); this.choques.push(new THREE.Box3().setFromObject(m)); return m; };
    this.matFocos = new THREE.MeshBasicMaterial({ color: '#d9dde0' }); // focos y luces (brillan más de noche)
    // Pista al estilo de un circuito de F1: asfalto oscuro parejo, línea blanca en el borde,
    // pianos anchos y planos (rojo, blanco y azul) adentro y afuera de cada curva con una franja
    // blanca atrás, leca (arena) del lado de afuera de las curvas cerradas, postes rojos y blancos
    // en los vértices, paredes de publicidad alrededor y árboles atrás.
    // ¿Este punto está lejos de cualquier otra parte de la pista? (para no tapar la pista con una
    // pared o una leca donde el trazado pasa cerca de sí mismo).
    const lejosDeLaPista = (x, z, margen, i0) => {
      for (let j = 0; j < n; j += 2) {
        if (Math.abs(((j - i0 + n + n / 2) % n) - n / 2) < 30) continue;
        if ((puntos[j].x - x) ** 2 + (puntos[j].z - z) ** 2 < margen * margen) return false;
      }
      return true;
    };
    const v = (p, l, y) => [p.x - p.tz * l, y, p.z + p.tx * l];
    // Franjas a lo largo de la pista: lados = [[desde, hasta]] en lateral (+ o −); color(i, lado)
    // devuelve el color del tramo (o null para no dibujarlo).
    const franja = (lados, y, color) => {
      const pos = [];
      const col = [];
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const a = puntos[i];
        const b = puntos[(i + 1) % n];
        for (const [l0, l1] of lados) {
          const tramo = color(i, Math.sign(l0 + l1));
          if (!tramo) continue;
          c.set(tramo);
          const q = [v(a, l0, y), v(a, l1, y), v(b, l1, y), v(b, l0, y)];
          pos.push(...q[0], ...q[2], ...q[1], ...q[0], ...q[3], ...q[2]);
          for (let m = 0; m < 6; m++) col.push(c.r, c.g, c.b);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(haciaArriba(pos), 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    };
    const ASFALTO = '#3f4146';
    g.add(franja([[-MEDIO, MEDIO]], 0.07, () => ASFALTO));
    g.add(franja([[MEDIO - 1.2, MEDIO - 0.4], [-(MEDIO - 0.4), -(MEDIO - 1.2)]], 0.09, () => '#f4f4f4'));
    // Pianos: en las curvas (con un poco de margen antes y después), de los dos lados.
    const curva = puntos.map((p, i) => {
      for (let j = -6; j <= 6; j++) if (puntos[(i + j + n) % n].k > 1 / 300) return true;
      return false;
    });
    const RAYAS = ['#e53935', '#ffffff', '#1e63d6', '#ffffff'];
    g.add(franja([[MEDIO, MEDIO + 4.5], [-(MEDIO + 4.5), -MEDIO]], 0.09, (i) => (curva[i] ? RAYAS[Math.floor(i / 2) % 4] : null)));
    g.add(franja([[MEDIO + 4.5, MEDIO + 7], [-(MEDIO + 7), -(MEDIO + 4.5)]], 0.085, (i) => (curva[i] ? '#f2f2f2' : null)));
    // Leca de arena del lado de afuera de las curvas cerradas.
    const leca = puntos.map((p, i) => {
      if (p.k < 1 / 200) return 0;
      const afuera = p.giro > 0 ? 1 : -1;
      const [x, , z] = v(p, afuera * (MEDIO + 20), 0);
      return lejosDeLaPista(x, z, MEDIO + 16, i) ? afuera : 0;
    });
    g.add(franja([[MEDIO + 7, MEDIO + 26], [-(MEDIO + 26), -(MEDIO + 7)]], 0.08, (i, lado) => (leca[i] === lado || leca[(i + 1) % n] === lado ? '#dcc79c' : null)));
    // Postes rojos y blancos en los vértices de las curvas (donde más dobla).
    for (let i = 0; i < n; i++) {
      const p = puntos[i];
      if (p.k < 1 / 120 || p.k < puntos[(i + 1) % n].k || p.k < puntos[(i - 1 + n) % n].k) continue;
      const adentro = p.giro > 0 ? -1 : 1;
      for (const d of [-4, 4]) {
        const q = puntos[(i + d + n) % n];
        const [x, , z] = v(q, adentro * (MEDIO + 8), 0);
        g.add(k.noSolido(k.cajaDe(x - 0.35, 0, z - 0.35, x + 0.35, 2.4, z + 0.35, '#ffffff')));
        g.add(k.noSolido(k.cajaDe(x - 0.37, 2.4, z - 0.37, x + 0.37, 3.4, z + 0.37, '#e53935')));
      }
    }
    // Paredes de publicidad alrededor (marcas de la Vecibanda), del lado de afuera de la leca.
    // La tela de las paredes: marcas de la Vecibanda y Sancor Seguros (el sponsor) dos veces.
    const MARCAS = [['VECIBANDA', '#0d2a6b', '#ffffff'], ['sancor', '#ffffff'], ['LA DOSIS', '#c62828', '#ffffff'], ['POWER CAMP', '#111111', '#ffd23f'],
      ['sancor_blanco', '#a6196e'], ['LO DE LOURDES', '#ffffff', '#c62828'], ['VECIBANDA MOTORS', '#1d1f22', '#ffffff']];
    const telaPared = pintarMarcas(MARCAS, 1792, 64);
    telaPared.wrapS = THREE.RepeatWrapping;
    const matPared = new THREE.MeshLambertMaterial({ map: telaPared, side: THREE.DoubleSide });
    const LARGO_CARTEL = 168; // unidades que ocupa la tela entera (siete marcas)
    // El alambrado arriba de las paredes (malla con transparencia) y sus postes.
    const malla = k.imagenCanvas((c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.strokeStyle = 'rgba(70,74,80,0.9)';
      c.lineWidth = 2;
      for (let x = -h; x < w + h; x += 12) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke();
        c.beginPath(); c.moveTo(x + h, 0); c.lineTo(x, h); c.stroke();
      }
      c.fillStyle = 'rgba(60,64,70,1)';
      c.fillRect(0, 0, w, 3);
    }, 64, 64).material.map;
    malla.wrapS = malla.wrapT = THREE.RepeatWrapping;
    const matMalla = new THREE.MeshBasicMaterial({ map: malla, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    const postes = [];
    this.paredes = {};
    for (const lado of [1, -1]) {
      const pos = [];
      const uv = [];
      let s = 0;
      const d = PARED;
      const sirve = puntos.map((p, i) => { const [x, , z] = v(p, lado * d, 0); return lejosDeLaPista(x, z, d - 2, i); });
      this.paredes[lado] = sirve; // para los choques (actualizar)
      const posM = [];
      const uvM = [];
      for (let i = 0; i < n; i++) {
        const a = puntos[i];
        const b = puntos[(i + 1) % n];
        const [ax, , az] = v(a, lado * d, 0);
        const [bx, , bz] = v(b, lado * d, 0);
        const largo = Math.hypot(bx - ax, bz - az);
        if (sirve[i] && sirve[(i + 1) % n] && largo < PASO * 4) {
          // Del lado + la cara que mira a la pista es la de atrás: la tela va al revés para que se lea.
          const u0 = (lado * -s) / LARGO_CARTEL;
          const u1 = (lado * -(s + largo)) / LARGO_CARTEL;
          pos.push(ax, 0, az, bx, 0, bz, bx, 2.2, bz, ax, 0, az, bx, 2.2, bz, ax, 2.2, az);
          uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
          const m0 = s / 6;
          const m1 = (s + largo) / 6;
          posM.push(ax, 2.2, az, bx, 2.2, bz, bx, 8.5, bz, ax, 2.2, az, bx, 8.5, bz, ax, 8.5, az);
          uvM.push(m0, 0, m1, 0, m1, 1, m0, 0, m1, 1, m0, 1);
          if (i % 8 === 0) postes.push([ax, az]);
        }
        s += largo;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, matPared));
      const geoM = new THREE.BufferGeometry();
      geoM.setAttribute('position', new THREE.Float32BufferAttribute(posM, 3));
      geoM.setAttribute('uv', new THREE.Float32BufferAttribute(uvM, 2));
      g.add(new THREE.Mesh(geoM, matMalla));
    }
    const mallaPostes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 8.8, 0.3), new THREE.MeshLambertMaterial({ color: '#4a4e55' }), postes.length);
    const mp = new THREE.Matrix4();
    postes.forEach(([x, z], i) => mallaPostes.setMatrixAt(i, mp.makeTranslation(x, 4.4, z)));
    mallaPostes.frustumCulled = false;
    g.add(mallaPostes);
    // Árboles atrás de las paredes.
    const arboles = [];
    for (let i = 0; i < n; i += 9) {
      for (const lado of [1, -1]) {
        const d = MEDIO + 48 + ((i * 7) % 23);
        const [x, , z] = v(puntos[i], lado * d, 0);
        if (lejosDeLaPista(x, z, d - 6, i) && !enArena(x, z, 12)) arboles.push([x, z, 0.9 + ((i * 13) % 7) / 10]);
      }
    }
    const tronco = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 5, 1.2), new THREE.MeshLambertMaterial({ color: '#6d4a2c' }), arboles.length);
    const copa = new THREE.InstancedMesh(new THREE.SphereGeometry(4.2, 8, 6), new THREE.MeshLambertMaterial({ color: '#2f7d32' }), arboles.length);
    const mt = new THREE.Matrix4();
    arboles.forEach(([x, z, e], i) => {
      tronco.setMatrixAt(i, mt.makeScale(e, e, e).setPosition(x, 2.5 * e, z));
      copa.setMatrixAt(i, mt.makeScale(e, e * 1.15, e).setPosition(x, 7.5 * e, z));
    });
    tronco.frustumCulled = false;
    copa.frustumCulled = false;
    g.add(tronco, copa);
    // Línea de largada a cuadros y la grilla.
    const p0 = puntos[0];
    const ang0 = Math.atan2(p0.tx, p0.tz);
    const cuadros = k.imagenCanvas((c, w, h) => {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect((x * w) / 16, (y * h) / 2, w / 16, h / 2); }
    }, 256, 32);
    cuadros.scale.set(AD.ancho, 4, 1);
    cuadros.rotation.order = 'YXZ'; // acostada y de costado a costado de la pista
    cuadros.rotation.set(-Math.PI / 2, ang0, 0);
    cuadros.position.set(p0.x, 0.11, p0.z);
    g.add(cuadros);
    const pg = puntos[n - GRILLA];
    const marca = k.cajaDe(-3, 0.08, -0.25, 3, 0.11, 0.25, '#f4f4f4');
    marca.position.set(pg.x - pg.tx * 6, 0.095, pg.z - pg.tz * 6);
    marca.rotation.y = ang0;
    g.add(marca);

    // Semáforo sobre la línea: dos postes, un travesaño y la caja con las tres luces.
    const lado = (p, l) => new THREE.Vector3(p.x - p.tz * l, 0, p.z + p.tx * l);
    const pa = puntos[2];
    for (const l of [-(MEDIO + 2.5), MEDIO + 2.5]) {
      const q = lado(pa, l);
      solido(k.cajaDe(q.x - 0.4, 0, q.z - 0.4, q.x + 0.4, 14, q.z + 0.4, '#3a3d42'));
    }
    const travesano = k.cajaDe(-(MEDIO + 3), 13.2, -0.4, MEDIO + 3, 14, 0.4, '#3a3d42');
    travesano.position.set(pa.x, 13.6, pa.z);
    travesano.rotation.y = Math.atan2(pa.tx, pa.tz);
    g.add(k.noSolido(travesano));
    for (const vuelta of [0, Math.PI]) {
      const banner = cartelSancor(AD.ancho, 2.6, vuelta > 0);
      banner.position.set(pa.x, 15.6, pa.z);
      banner.rotation.y = Math.atan2(pa.tx, pa.tz) + Math.PI + vuelta;
      g.add(banner);
    }
    const caja = new THREE.Group();
    caja.position.set(pa.x, 11.6, pa.z);
    caja.rotation.y = Math.atan2(pa.tx, pa.tz) + Math.PI; // mira a los que llegan
    caja.add(k.noSolido(k.cajaDe(-3.6, -1.4, -0.4, 3.6, 1.4, 0.4, '#16171a')));
    this.luces = [-2.3, 0, 2.3].map((x) => {
      const mat = new THREE.MeshBasicMaterial({ color: '#2a2a2a' });
      const luz = new THREE.Mesh(new THREE.CircleGeometry(0.95, 18), mat);
      luz.position.set(x, 0, 0.42);
      caja.add(luz);
      return mat;
    });
    g.add(caja);

    // Gradas llenas de huevos: una en la recta de largada y otra en la recta de arriba, del lado de
    // afuera. Los huevos son dos mallas instanciadas (cuerpo y ojos): liviano aunque sean cientos.
    const centro = puntos.reduce((s, p) => ({ x: s.x + p.x / n, z: s.z + p.z / n }), { x: 0, z: 0 });
    this.huevos = [];
    // Tribuna moderna de dos bandejas (como las de los circuitos de F1): estructura gris clara,
    // escalones, bandeja de arriba más atrás, techo volado con columnas y cartel. Atrás de la pared.
    const grada = (i0) => {
      const p = puntos[(i0 + n) % n];
      let afuera = 1;
      if ((p.x - p.tz * 10 - centro.x) ** 2 + (p.z + p.tx * 10 - centro.z) ** 2 < (p.x - centro.x) ** 2 + (p.z - centro.z) ** 2) afuera = -1;
      const largo = 150;
      const ang = Math.atan2(p.tx, p.tz);
      const base = lado(p, afuera * (MEDIO + 32));
      const gr = new THREE.Group();
      gr.position.copy(base);
      gr.rotation.y = ang + (afuera > 0 ? -Math.PI / 2 : Math.PI / 2);
      // En el grupo: x a lo largo de la recta, z hacia afuera (los escalones suben hacia atrás).
      const estructura = '#c9ced3';
      const filas = [];
      const bandeja = (z0, y0, escalones) => {
        for (let e = 0; e < escalones; e++) {
          gr.add(k.cajaDe(-largo / 2, 0, z0 + e * 2.4, largo / 2, y0 + 1.2 + e * 1.15, z0 + e * 2.4 + 2.4, e % 2 ? '#aab1b8' : '#b8bfc6'));
          filas.push([y0 + 1.2 + e * 1.15, z0 + e * 2.4 + 1.2]);
        }
        return z0 + escalones * 2.4;
      };
      const finBaja = bandeja(0, 0, 8);
      gr.add(k.cajaDe(-largo / 2, 9.2, finBaja - 1, largo / 2, 11.2, finBaja + 0.6, '#1d1f22')); // pasillo con carteles
      gr.add(k.cartel('VECIBANDA RING · GRAN PREMIO', 40, 1.8, '#ffffff', '#1d1f22').translateY(10.2).translateZ(finBaja - 1.05).rotateY(Math.PI));
      for (const x of [-48, 48]) gr.add(cartelSancor(26, 1.8).translateX(x).translateY(10.2).translateZ(finBaja - 1.06).rotateY(Math.PI));
      const finAlta = bandeja(finBaja + 0.6, 11.2, 7);
      gr.add(k.cajaDe(-largo / 2, 0, finAlta, largo / 2, 21, finAlta + 0.8, estructura));
      for (const x of [-largo / 2, -largo / 4, 0, largo / 4, largo / 2]) gr.add(k.cajaDe(x - 0.5, 0, finAlta, x + 0.5, 27, finAlta + 0.8, '#8d949b'));
      for (const x of [-largo / 2 - 0.4, largo / 2 - 0.4]) gr.add(k.cajaDe(x, 0, 0, x + 0.8, 21, finAlta, estructura)); // laterales
      // Techo volado (inclinado hacia la pista).
      const techo = k.cajaDe(-largo / 2 - 2, -0.3, -finAlta / 2 - 6, largo / 2 + 2, 0.3, finAlta / 2 + 1, '#eceff1');
      techo.position.set(0, 26.5, finAlta / 2 - 2);
      techo.rotation.x = 0.12;
      gr.add(k.noSolido(techo));
      gr.add(k.cartel('VECIBANDA RING', 30, 3.2, '#ffffff', '#c62828').translateY(24).translateZ(-6.5).rotateY(Math.PI));
      gr.add(k.noSolido(k.cajaDe(-largo / 2, 25.6, -6.2, largo / 2, 25.9, -5.6, this.matFocos))); // luces del techo
      g.add(gr);
      gr.updateMatrixWorld(true);
      // Choques en pedacitos (la grada está girada: una sola caja taparía la pista).
      for (let x = -largo / 2; x < largo / 2; x += 10) {
        const caja3 = new THREE.Box3();
        for (const [lx, lz] of [[x, 0], [x + 10, 0], [x, finAlta + 0.8], [x + 10, finAlta + 0.8]]) caja3.expandByPoint(new THREE.Vector3(lx, 0, lz).applyMatrix4(gr.matrixWorld));
        caja3.max.y = 20;
        caja3.camara = false;
        this.choques.push(caja3);
      }
      const pos = new THREE.Vector3();
      for (const [y, z] of filas) {
        for (let x = -largo / 2 + 1.5; x < largo / 2 - 1; x += 2.2) {
          if (Math.random() < 0.1) continue; // algún lugar vacío
          pos.set(x + (Math.random() - 0.5) * 0.5, y, z).applyMatrix4(gr.matrixWorld);
          this.huevos.push({ x: pos.x, y: pos.y, z: pos.z, giro: gr.rotation.y + Math.PI + (Math.random() - 0.5) * 0.5, fase: Math.random() * 6 });
        }
      }
    };
    grada(-20);
    // La segunda, en la recta de abajo (la de arriba queda pegada a la autopista).
    const abajo = aMundo([240, 331]);
    grada(cercano(abajo.x, abajo.z).i);
    // El banderillero: un huevo grande arriba de un tarimita, al costado de la línea, con la bandera.
    const pb = lado(puntos[6], -(MEDIO + 6));
    solido(k.cajaDe(pb.x - 1.6, 0, pb.z - 1.6, pb.x + 1.6, 1.6, pb.z + 1.6, '#c62828'));
    const geoHuevo = new THREE.SphereGeometry(1, 12, 9);
    geoHuevo.scale(0.75, 1, 0.75);
    geoHuevo.translate(0, 1, 0);
    const matHuevo = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const bandera = new THREE.Group();
    const huevoGrande = new THREE.Mesh(geoHuevo, matHuevo);
    huevoGrande.scale.setScalar(1.6);
    bandera.add(huevoGrande);
    const ojosGrandes = new THREE.Mesh(this.geoOjos(), new THREE.MeshBasicMaterial({ color: '#111111' }));
    ojosGrandes.scale.setScalar(1.6);
    bandera.add(ojosGrandes);
    this.palo = new THREE.Group();
    this.palo.position.set(1.1, 2.6, 0.4);
    this.palo.add(k.noSolido(k.cajaDe(-0.08, 0, -0.08, 0.08, 4.2, 0.08, '#5d4037')));
    const tela = k.imagenCanvas((c, w, h) => { for (let x = 0; x < 6; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect((x * w) / 6, (y * h) / 4, w / 6, h / 4); } }, 96, 64);
    tela.material.side = THREE.DoubleSide;
    tela.scale.set(2.6, 1.7, 1);
    tela.position.set(1.3, 3.4, 0);
    this.palo.add(tela);
    bandera.add(this.palo);
    bandera.position.set(pb.x, 1.6, pb.z);
    bandera.rotation.y = Math.atan2(puntos[6].tx, puntos[6].tz) - Math.PI / 2; // mirando a la pista
    g.add(bandera);
    this.agitar = 0;
    // Público.
    // Mayoría de huevos de siempre y algunos pintados (como la tribuna de colores de un GP).
    const colores = ['#fff8e7', '#f3e2c7', '#e9d3b0', '#fde9c9', '#f6efe2', '#fff8e7', '#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa'];
    this.mallaHuevos = new THREE.InstancedMesh(geoHuevo, matHuevo, this.huevos.length);
    this.mallaOjos = new THREE.InstancedMesh(this.geoOjos(), new THREE.MeshBasicMaterial({ color: '#111111' }), this.huevos.length);
    const col = new THREE.Color();
    this.huevos.forEach((h, i) => this.mallaHuevos.setColorAt(i, col.set(colores[(i * 7 + Math.floor(i / 13)) % colores.length])));
    this.saltaban = true;
    this.festejo = 0.0001;
    this.mallaHuevos.frustumCulled = false;
    this.mallaOjos.frustumCulled = false;
    g.add(this.mallaHuevos, this.mallaOjos);

    // ---------- El estadio, estilo Allianz Arena ----------
    // La fachada: almohadones romboidales inflados (textura con brillo en el medio), sobre un óvalo
    // que se ensancha hacia el medio y se curva hacia adentro arriba, hasta el techo. De día se ve
    // blanco plateado; de noche brilla en rojo (emissive, lo sube actualizar con la noche).
    const rombos = k.imagenCanvas((c, w, h) => {
      c.fillStyle = '#7d858d';
      c.fillRect(0, 0, w, h);
      const rombo = (cx, cy) => {
        const gr = c.createRadialGradient(cx, cy - h * 0.08, 2, cx, cy, w * 0.5);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.55, '#e9edf0');
        gr.addColorStop(1, '#b9c1c8');
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(cx, cy - h / 2 + 3); c.lineTo(cx + w / 2 - 3, cy); c.lineTo(cx, cy + h / 2 - 3); c.lineTo(cx - w / 2 + 3, cy);
        c.closePath();
        c.fill();
      };
      rombo(w / 2, h / 2);
      for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) rombo(x, y);
    }, 128, 128).material.map;
    rombos.wrapS = rombos.wrapT = THREE.RepeatWrapping;
    this.matFachada = new THREE.MeshLambertMaterial({ map: rombos, emissive: '#ff2a1f', emissiveMap: rombos, emissiveIntensity: 0 });
    const A = ARENA;
    // Perfil de la fachada: [altura (0 a 1), cuánto se abre (1 = el borde del óvalo)].
    const PERFIL = [[0, 0.93], [0.12, 0.975], [0.3, 1], [0.55, 1.005], [0.75, 0.985], [0.87, 0.95], [0.95, 0.885], [1, 0.8]];
    const SEG = 96;
    const posF = [];
    const uvF = [];
    const idx = [];
    PERFIL.forEach(([t, r], fila) => {
      for (let j = 0; j <= SEG; j++) {
        const [x, z] = bordeArena((j / SEG) * Math.PI * 2, r);
        posF.push(x, A.base + t * (A.alto - A.base), z);
        uvF.push((j / SEG) * 64, t * 9);
      }
      if (fila) {
        for (let j = 0; j < SEG; j++) {
          const a0 = (fila - 1) * (SEG + 1) + j;
          const b0 = fila * (SEG + 1) + j;
          idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
        }
      }
    });
    const geoF = new THREE.BufferGeometry();
    geoF.setAttribute('position', new THREE.Float32BufferAttribute(posF, 3));
    geoF.setAttribute('uv', new THREE.Float32BufferAttribute(uvF, 2));
    geoF.setIndex(idx);
    geoF.computeVertexNormals();
    const fachada = new THREE.Mesh(geoF, this.matFachada);
    fachada.material.side = THREE.DoubleSide;
    g.add(fachada);
    // Techo: casi plano, blanco, cerrando arriba, con un anillo de luz en el borde.
    const posT = [];
    const anillos = [[0.8, 0], [0.62, 3], [0.38, 5], [0.001, 6]];
    for (let r = 1; r < anillos.length; r++) {
      for (let j = 0; j < SEG; j++) {
        const t0 = (j / SEG) * Math.PI * 2;
        const t1 = ((j + 1) / SEG) * Math.PI * 2;
        const [ax, az] = bordeArena(t0, anillos[r - 1][0]);
        const [bx, bz] = bordeArena(t1, anillos[r - 1][0]);
        const [cx2, cz2] = bordeArena(t0, anillos[r][0]);
        const [dx, dz] = bordeArena(t1, anillos[r][0]);
        const y0 = A.alto + anillos[r - 1][1];
        const y1 = A.alto + anillos[r][1];
        posT.push(ax, y0, az, cx2, y1, cz2, bx, y0, bz, bx, y0, bz, cx2, y1, cz2, dx, y1, dz);
      }
    }
    const geoT = new THREE.BufferGeometry();
    geoT.setAttribute('position', new THREE.Float32BufferAttribute(haciaArriba(posT), 3));
    geoT.computeVertexNormals();
    g.add(new THREE.Mesh(geoT, new THREE.MeshLambertMaterial({ color: '#e6eaee' })));
    this.matLuces = new THREE.MeshBasicMaterial({ color: '#cfd6dc' });
    const posL = [];
    for (let j = 0; j < SEG; j++) {
      const [ax, az] = bordeArena((j / SEG) * Math.PI * 2, 0.805);
      const [bx, bz] = bordeArena(((j + 1) / SEG) * Math.PI * 2, 0.805);
      posL.push(ax, A.alto - 0.2, az, bx, A.alto - 0.2, bz, bx, A.alto + 1.2, bz, ax, A.alto - 0.2, az, bx, A.alto + 1.2, bz, ax, A.alto + 1.2, az);
    }
    const geoL = new THREE.BufferGeometry();
    geoL.setAttribute('position', new THREE.Float32BufferAttribute(posL, 3));
    const anilloLuz = new THREE.Mesh(geoL, this.matLuces);
    anilloLuz.material.side = THREE.DoubleSide;
    g.add(anilloLuz);
    // Base de vidrio oscuro con las entradas iluminadas alrededor.
    const posB = [];
    for (let j = 0; j < SEG; j++) {
      const [ax, az] = bordeArena((j / SEG) * Math.PI * 2, 0.9);
      const [bx, bz] = bordeArena(((j + 1) / SEG) * Math.PI * 2, 0.9);
      posB.push(ax, 0, az, bx, 0, bz, bx, A.base + 0.5, bz, ax, 0, az, bx, A.base + 0.5, bz, ax, A.base + 0.5, az);
    }
    const geoB = new THREE.BufferGeometry();
    geoB.setAttribute('position', new THREE.Float32BufferAttribute(posB, 3));
    geoB.computeVertexNormals();
    g.add(new THREE.Mesh(geoB, new THREE.MeshLambertMaterial({ color: '#1f2933', side: THREE.DoubleSide })));
    this.matPuertas = new THREE.MeshBasicMaterial({ color: '#8a7a5a' });
    const puertas = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 5.5, 0.3), this.matPuertas, 28);
    const mq = new THREE.Matrix4();
    for (let j = 0; j < 28; j++) {
      const t = (j / 28) * Math.PI * 2 + Math.PI / 28;
      const [x, z] = bordeArena(t, 0.905);
      const [x2, z2] = bordeArena(t + 0.01, 0.905);
      mq.makeRotationY(Math.atan2(x2 - x, z2 - z) + Math.PI / 2).setPosition(x, 2.75, z);
      puertas.setMatrixAt(j, mq);
    }
    puertas.frustumCulled = false;
    g.add(puertas);
    // Choques: el óvalo en tajadas (cajas a lo ancho).
    for (let q = -6; q < 6; q++) {
      const x0 = A.x + (q / 6) * A.a * 0.9;
      const x1 = A.x + ((q + 1) / 6) * A.a * 0.9;
      const xm = Math.max(Math.abs(x0 - A.x), Math.abs(x1 - A.x)) / (A.a * 0.9);
      const f = (1 - Math.min(1, xm) ** A.exp) ** (1 / A.exp) * 0.9;
      this.choques.push(new THREE.Box3(new THREE.Vector3(x0, 0, A.z - A.b * f), new THREE.Vector3(x1, A.alto, A.z + A.b * f)));
    }
    // El nombre en letras blancas grandes (como "Allianz Arena") y el logo de Sancor abajo.
    const frente = A.z - A.b - 2.5;
    const nombre = k.imagenCanvas((c, w, h) => {
      c.clearRect(0, 0, w, h);
      let tam = 140;
      c.font = `800 ${tam}px Fredoka, Arial, sans-serif`;
      const ancho = c.measureText('VECIBANDA RING').width;
      if (ancho > w - 40) tam = Math.floor((tam * (w - 40)) / ancho);
      c.font = `800 ${tam}px Fredoka, Arial, sans-serif`;
      c.fillStyle = '#ffffff';
      c.shadowColor = 'rgba(0,0,0,0.35)';
      c.shadowBlur = 8;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('VECIBANDA RING', w / 2, h / 2);
    }, 1024, 160);
    nombre.material = new THREE.MeshBasicMaterial({ map: nombre.material.map, transparent: true, depthWrite: false });
    nombre.scale.set(150, 23, 1);
    nombre.position.set(A.x, A.base + (A.alto - A.base) * 0.62, frente - 1.5);
    nombre.rotation.y = Math.PI;
    g.add(nombre);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    new THREE.TextureLoader().load('assets/especiales/sancor_blanco.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; logo.material.map = t; logo.material.needsUpdate = true; });
    logo.position.set(A.x, A.base + (A.alto - A.base) * 0.38, frente - 1);
    logo.rotation.y = Math.PI;
    g.add(logo);
    // Entrada principal: marquesina, cartel y un tótem de Sancor en la plaza.
    const fz = A.z - A.b * 0.9;
    g.add(k.noSolido(k.cajaDe(ENTRADA.x - 16, 7.5, fz - 9, ENTRADA.x + 16, 8.3, fz, '#2b2f36')));
    for (const dx of [-15, 15]) g.add(k.noSolido(k.cajaDe(ENTRADA.x + dx - 0.4, 0, fz - 8.8, ENTRADA.x + dx + 0.4, 7.5, fz - 8, '#2b2f36')));
    const cartelEntrada = k.cartel('ENTRADA · VECIBANDA RING', 24, 2.4, '#ffffff', '#c62828');
    cartelEntrada.position.set(ENTRADA.x, 9.6, fz - 8.6);
    cartelEntrada.rotation.y = Math.PI;
    g.add(cartelEntrada);
    g.add(k.noSolido(k.cajaDe(ENTRADA.x - 6, 0, fz - 0.4, ENTRADA.x + 6, 6.5, fz, this.matPuertas)));
    const totem = cartelSancor(12, 3.4, true);
    totem.rotation.y = Math.PI;
    totem.position.set(ENTRADA.x + 26, 7.6, fz - 16.4);
    g.add(totem);
    solido(k.cajaDe(ENTRADA.x + 25.5, 0, fz - 16.3, ENTRADA.x + 26.5, 5.9, fz - 15.7, '#2b2f36'));
    // Plaza y estacionamientos (con sus líneas) a los costados, y torres de luz.
    const plaza = AU.z + AU.medioAncho + 2;
    g.add(k.noSolido(k.cajaDe(A.x - A.a - 10, 0, plaza, A.x + A.a + 10, 0.06, A.z - A.b * 0.6, k.tex('concreto', '#c9c6bf', 5))));
    const lineas = k.imagenCanvas((c, w, h) => {
      c.fillStyle = '#4b4e53';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#f2f2f2';
      for (let x = 0; x < w; x += w / 8) c.fillRect(x, 0, 3, h * 0.42);
      for (let x = 0; x < w; x += w / 8) c.fillRect(x, h * 0.58, 3, h * 0.42);
    }, 256, 128).material.map;
    lineas.wrapS = lineas.wrapT = THREE.RepeatWrapping;
    for (const lado of [-1, 1]) {
      const largoX = 120;
      const x0 = lado < 0 ? A.x - A.a - 12 - largoX : A.x + A.a + 12;
      const fondoZ = A.b * 1.6;
      const t = lineas.clone();
      t.needsUpdate = true;
      t.repeat.set(largoX / 40, fondoZ / 20);
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(largoX, fondoZ), new THREE.MeshLambertMaterial({ map: t }));
      piso.rotation.x = -Math.PI / 2;
      piso.position.set(x0 + largoX / 2, 0.06, plaza + fondoZ / 2);
      g.add(piso);
    }
    const torre = (x, z, alto = 62) => {
      solido(k.cajaDe(x - 0.7, 0, z - 0.7, x + 0.7, alto, z + 0.7, '#8d949b'));
      g.add(k.noSolido(k.cajaDe(x - 4, alto, z - 0.6, x + 4, alto + 4, z + 0.6, '#3a3d42')));
      for (let f = 0; f < 3; f++) for (let c = 0; c < 4; c++) g.add(k.noSolido(k.cajaDe(x - 3.4 + c * 1.8, alto + 0.5 + f * 1.2, z - 0.7, x - 2.4 + c * 1.8, alto + 1.3 + f * 1.2, z - 0.62, this.matFocos)));
    };
    for (const dx of [-1, 1]) for (const dz of [0.15, 0.95]) torre(A.x + dx * (A.a + 70), plaza + A.b * 1.6 * dz);
    // Torres de luz también a lo largo de la pista (del lado de afuera, atrás del alambrado).
    for (let i = 60; i < n; i += 170) {
      const p = puntos[i];
      for (const lado of [1, -1]) {
        const [x, , z] = v(p, lado * (PARED + 14), 0);
        if (lejosDeLaPista(x, z, PARED + 10, i) && !enArena(x, z, 10)) { torre(x, z, 48); break; }
      }
    }
  }

  // Ojitos de huevo (dos esferitas negras al frente).
  geoOjos() {
    if (!this._ojos) {
      const a = new THREE.SphereGeometry(0.11, 6, 5);
      const b = a.clone();
      a.translate(-0.24, 1.25, 0.68);
      b.translate(0.24, 1.25, 0.68);
      const pos = new Float32Array([...a.attributes.position.array, ...b.attributes.position.array]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const ia = a.index.array;
      const off = a.attributes.position.count;
      geo.setIndex([...ia, ...b.index.array].map((v, i) => (i < ia.length ? v : v + off)));
      this._ojos = geo;
    }
    return this._ojos;
  }

  // El banderillero agita (al largar y en cada vuelta).
  animarBandera(dt) {
    if (this.agitar > 0) {
      this.agitar -= dt;
      this.palo.rotation.z = Math.sin(this.reloj * 14) * 0.8;
    } else this.palo.rotation.z *= 0.9;
  }
}
