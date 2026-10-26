import * as THREE from 'three';
import { AUTOS, AUTO_DEPORTIVO } from '../data/objetos.js';
import { AUTODROMO as AD, AUTOPISTA as AU, AUTOS_DESDE } from './constantes.js';
import { Auto, AutoComprado, specsAuto, pasoAuto } from './auto.js';
import { formato } from './util.js';
import { sfx } from './sfx.js';

// Autódromo Vecibanda Ring, a mitad de la autopista (abre con los autos, al 60%). Afuera, el
// edificio estilo Nürburgring: la caja celeste con la cáscara curva de chapa oscura encima y el
// nombre en letras rojas. Adentro, el trazado del dibujo (data: TRAZADO), gradas llenas de huevos
// que festejan los récords, un huevo banderillero y el semáforo de largada (rojo, amarillo, verde).
//
// Jugabilidad: en la entrada, "Entrar al autódromo" abre la pantalla para elegir uno de tus autos
// (con tus tiempos y las medallas). Largás detenido con el semáforo y son vueltas cronometradas.
// Bronce, plata y oro salen de una simulación: un piloto automático da vueltas con la misma física
// del juego (auto.js) siguiendo el medio de la pista y frenando a tiempo para cada curva. Oro es
// igualar al piloto automático, plata es ir "normal" y bronce, tranquilo. Cada medalla paga una
// vez por auto (mucha plata) y cada récord tuyo por debajo del bronce paga más cuanto más mejorás.

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
const GRILLA = 9; // puntos antes de la línea donde se larga
export const MEDALLAS = [
  { id: 'oro', nombre: 'Oro', factor: 1, premio: { base: 2e9, minutos: 30 }, color: '#ffd23f' },
  { id: 'plata', nombre: 'Plata', factor: 1.08, premio: { base: 8e8, minutos: 15 }, color: '#cfd8dc' },
  { id: 'bronce', nombre: 'Bronce', factor: 1.2, premio: { base: 3e8, minutos: 8 }, color: '#d18b47' },
];
const RECORD = { base: 1e8, minutos: 2, tope: 15 }; // por cada segundo que mejorás tu récord

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
    if (Math.abs(c.lateral) > MEDIO + 45) this.anulada = true; // por el pasto, lejos: cortó camino
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
  const vCurva = puntos.map((p) => Math.min(sp.v, Math.sqrt((sp.lateral * 0.9) / Math.max(p.k, 1e-5))));
  const dt = 1 / 60;
  const ejes = { x: 0, y: 0 };
  const vueltas = [];
  let fuera = 0;
  for (let t = 0; t < 900 && vueltas.length < 2; t += dt) {
    const i = crono.i;
    // Velocidad para poder frenar a tiempo para lo que viene.
    let objetivo = vCurva[i];
    const alcance = (a.vel * a.vel) / (2 * sp.freno * 0.8) + 20;
    for (let d = PASO; d < alcance; d += PASO) {
      const j = (i + Math.round(d / PASO)) % n;
      objetivo = Math.min(objetivo, Math.sqrt(vCurva[j] ** 2 + 2 * sp.freno * 0.8 * d));
    }
    ejes.y = a.vel > objetivo ? -1 : a.vel < objetivo * 0.985 ? 1 : 0;
    // Volante: hacia un punto más adelante en el medio de la pista.
    const mira = puntos[(i + Math.round((8 + 0.3 * Math.abs(a.vel)) / PASO)) % n];
    let error = Math.atan2(mira.x - a.pos.x, mira.z - a.pos.z) - a.angulo;
    error = Math.atan2(Math.sin(error), Math.cos(error));
    ejes.x = Math.max(-1, Math.min(1, -error * 4));
    pasoAuto(a, ejes, dt);
    if (Math.abs(crono.lateral || 0) > MEDIO) fuera += dt;
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
const ENTRADA = (() => {
  const p = aMundo([135, 155]);
  return { x: p.x, z: AU.z + AU.medioAncho + 8 }; // la puerta, mirando a la autopista
})();
const EDIFICIO = { x0: ENTRADA.x - 110, x1: ENTRADA.x + 110, z0: AU.z + AU.medioAncho + 10, z1: AU.z + AU.medioAncho + 56, bajo: 12 };

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
      this.ui.toast(`Vuelta anulada (cortaste camino): ${formatoTiempo(v.tiempo)}`, 'error');
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
      if (v) this.terminarVuelta(v);
    }
    const mejor = this.datos.mejores[c.def.id];
    const sig = MEDALLAS.slice().reverse().find((m) => mejor == null || mejor > c.objetivos[m.id]);
    this.ui.hudCarrera({
      auto: c.def.nombre, vuelta: c.vuelta, tiempo: formatoTiempo(c.fase === 'corriendo' ? c.t - c.crono.inicio : 0),
      ultima: c.ultima ? `${formatoTiempo(c.ultima.tiempo)}${c.ultima.valida ? '' : ' (anulada)'}` : '–',
      mejor: formatoTiempo(mejor), velocidad: Math.round((Math.abs(c.auto.vel) / 2.47) * 3.6),
      objetivo: sig ? `${sig.nombre}: ${formatoTiempo(c.objetivos[sig.id])}` : '¡Todas las medallas!', colorObjetivo: sig?.color || '#8dff6a',
      fuera: Math.abs(c.crono.lateral || 0) > MEDIO + 2,
    });
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
    const telaPared = k.imagenCanvas((c, w, h) => {
      const marcas = [['VECIBANDA', '#0d2a6b', '#ffffff'], ['LA DOSIS', '#c62828', '#ffffff'], ['POWER CAMP', '#111111', '#ffd23f'], ['LO DE LOURDES', '#ffffff', '#c62828'], ['VECIBANDA MOTORS', '#1d1f22', '#ffffff']];
      const ancho = w / marcas.length;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      marcas.forEach(([t, fondo, letra], m) => {
        c.fillStyle = fondo;
        c.fillRect(m * ancho, 0, ancho, h);
        c.fillStyle = letra;
        c.font = `800 ${Math.min(h * 0.62, (ancho * 1.6) / t.length)}px Fredoka, Arial, sans-serif`;
        c.fillText(t, m * ancho + ancho / 2, h / 2 + 2);
      });
    }, 1280, 64).material.map;
    telaPared.wrapS = THREE.RepeatWrapping;
    const matPared = new THREE.MeshLambertMaterial({ map: telaPared, side: THREE.DoubleSide });
    const LARGO_CARTEL = 120; // unidades que ocupa la tela entera (cinco marcas)
    for (const lado of [1, -1]) {
      const pos = [];
      const uv = [];
      let s = 0;
      const d = MEDIO + 28;
      const sirve = puntos.map((p, i) => { const [x, , z] = v(p, lado * d, 0); return lejosDeLaPista(x, z, d - 2, i); });
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
        }
        s += largo;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, matPared));
    }
    // Árboles atrás de las paredes.
    const arboles = [];
    for (let i = 0; i < n; i += 9) {
      for (const lado of [1, -1]) {
        const d = MEDIO + 48 + ((i * 7) % 23);
        const [x, , z] = v(puntos[i], lado * d, 0);
        if (lejosDeLaPista(x, z, d - 6, i)) arboles.push([x, z, 0.9 + ((i * 13) % 7) / 10]);
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

    // ---------- Edificio estilo Nürburgring ----------
    const E = EDIFICIO;
    const largo = E.x1 - E.x0;
    const fondo = E.z1 - E.z0;
    const cx = (E.x0 + E.x1) / 2;
    const cz = (E.z0 + E.z1) / 2;
    const celeste = k.tex('estuco', '#b7c8de', 4);
    solido(k.cajaDe(E.x0, 0, E.z0, E.x1, E.bajo, E.z1, celeste));
    // La cáscara curva de chapa oscura, más ancha que la caja (sobresale adelante, como en la foto).
    const radio = fondo / 2 + 4;
    const geoCascara = new THREE.CylinderGeometry(radio, radio, largo + 6, 28, 1, true, 0, Math.PI);
    geoCascara.rotateZ(Math.PI / 2); // acostada a lo largo, la mitad de arriba
    const cascara = new THREE.Mesh(geoCascara, k.tex('chapa', '#40444b', 2.4));
    cascara.scale.set(1, 0.62, 1);
    cascara.position.set(cx, E.bajo - 0.2, cz);
    g.add(k.noSolido(cascara));
    for (const x of [E.x0 - 3, E.x1 + 3]) {
      const tapa = new THREE.Mesh(new THREE.CircleGeometry(radio, 28, 0, Math.PI), new THREE.MeshLambertMaterial({ color: '#33363c', side: THREE.DoubleSide }));
      tapa.rotation.y = Math.PI / 2;
      tapa.scale.set(1, 0.62, 1);
      tapa.position.set(x, E.bajo - 0.2, cz);
      g.add(k.noSolido(tapa));
    }
    // El nombre en letras rojas sobre la curva de adelante.
    // El texto se achica hasta entrar entero en la lámina (antes se cortaba en las puntas) y la
    // lámina va un poco separada de la curva, para que no se meta adentro de la chapa.
    const letras = k.imagenCanvas((c, w, h) => {
      c.clearRect(0, 0, w, h);
      let tam = 150;
      c.font = `900 ${tam}px Fredoka, Arial, sans-serif`;
      const ancho = c.measureText('vecibandaring').width;
      if (ancho > w - 60) tam = Math.floor((tam * (w - 60)) / ancho);
      c.font = `900 ${tam}px Fredoka, Arial, sans-serif`;
      c.fillStyle = '#e3241b';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('vecibandaring', w / 2, h / 2 + 8);
    }, 1024, 200);
    letras.material.transparent = true;
    letras.material.depthWrite = false;
    letras.scale.set(100, 19.5, 1);
    const angLetras = 0.95;
    letras.position.set(cx - 30, E.bajo + Math.sin(angLetras) * (radio * 0.62 + 2.4), cz - Math.cos(angLetras) * (radio + 2.4));
    letras.rotation.order = 'YXZ'; // mirando a la autopista (−z), recostado sobre la curva
    letras.rotation.set(-0.95, Math.PI, 0);
    g.add(letras);
    // Puertas, escaleras de metal y el cartel amarillo.
    const fz = E.z0 - 0.05;
    g.add(k.noSolido(k.cajaDe(ENTRADA.x - 4, 0, fz - 0.1, ENTRADA.x + 4, 7, fz, k.vidrio)));
    g.add(k.noSolido(k.cajaDe(ENTRADA.x - 4.4, 7, fz - 0.2, ENTRADA.x + 4.4, 7.6, fz, '#2b2d31')));
    const entrada = k.cartel('ENTRADA · VECIBANDA RING', 14, 1.6, '#ffffff', '#c62828');
    entrada.position.set(ENTRADA.x, 8.8, fz - 0.15);
    entrada.rotation.y = Math.PI;
    g.add(entrada);
    for (const dx of [-60, 55]) {
      g.add(k.noSolido(k.cajaDe(cx + dx - 3, 0, fz - 0.1, cx + dx + 3, 6, fz, '#3d4f63')));
      for (let s = 0; s < 8; s++) g.add(k.noSolido(k.cajaDe(cx + dx - 10 + s * 0.9, 0, fz - 3, cx + dx - 9.1 + s * 0.9, 0.75 * (s + 1), fz - 0.2, '#8d949b')));
      g.add(k.noSolido(k.cajaDe(cx + dx - 10, 6, fz - 3.2, cx + dx - 2.8, 6.15, fz - 3, '#8d949b')));
    }
    g.add(k.noSolido(k.cajaDe(ENTRADA.x + 14, 0, fz - 6.2, ENTRADA.x + 14.3, 6, fz - 5.9, '#8d949b')));
    const amarillo = k.cartel('PISTA ▸', 3, 2.2, '#111111', '#ffc928');
    amarillo.position.set(ENTRADA.x + 14.15, 6.4, fz - 6.3);
    amarillo.rotation.y = Math.PI;
    g.add(amarillo);
    // Vereda de la entrada.
    g.add(k.noSolido(k.cajaDe(E.x0 - 4, 0, AU.z + AU.medioAncho + 2, E.x1 + 4, 0.1, E.z0, k.tex('concreto', '#bdbab3', 4))));
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
