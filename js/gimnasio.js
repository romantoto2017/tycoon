import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { GYM as G, GYM_KELVIN as KV, GYM_ESTACIONES as EST } from './constantes.js';
import { PISO_GYM as F, PALETA_GYM as P, texturaAtlas, cilindroAtlas, orientar, celdaDisco, mancuernaGeo } from './gym.js';
import { mat } from './util.js';
import { sfx } from './sfx.js';

// Gimnasio Power Camp: Kelvin atiende en el mostrador (cada vez que entrás te dice "¿Todo
// bien bro?" y te ofrece la mano para chocarla) y hay cinco ejercicios que se hacen de verdad:
// te ponés en la máquina, elegís el peso y cada repetición mueve las articulaciones (hombro,
// codo, rodilla) y la barra o la máquina. Solo Bauti cambia el cuerpo: entrenando mucho
// adelgaza y, ya flaco, con mucho más se pone musculoso.

export const KELVIN = {
  id: 'kelvin', nombre: 'Kelvin', foto: 'kelvin.jpeg', recorte: [0.5, 0.5, 1], piel: '#d6a58a', pelo: '#1b1512', peinado: 'liso',
  remera: '#151517', pantalon: '#17181b', capucha: '#151517', remeraFotos: { frente: 'ropa/kelvin_frente.jpg', tela: 'ropa/kelvin_tela.jpg' },
};

// ---------- Bauti: adelgazar y después ponerse musculoso ----------
// Puntos por repetición: 1 + 2 x (qué tan pesado es para él). Unas 1100 reps buenas para
// quedar flaco y unas 2700 más para el músculo entero: le tiene que costar.
export const BAUTI_GYM = { adelgazar: 2400, musculo: 6000 };
const ESCALONES = 6; // el cuerpo cambia de a sextos (así no se rearma el muñeco a cada rato)
export function fisico(p, estado) {
  if (p.id !== 'bauti') return p;
  const puntos = estado.bautiGym || 0;
  const escalon = (v) => Math.floor(THREE.MathUtils.clamp(v, 0, 1) * ESCALONES + 1e-6) / ESCALONES;
  const flaco = escalon(puntos / BAUTI_GYM.adelgazar);
  const musculo = escalon((puntos - BAUTI_GYM.adelgazar) / BAUTI_GYM.musculo);
  return { ...p, gordura: 1 - flaco, musculo, velocidad: 0.5 + 0.5 * flaco };
}
// Qué tanto levanta (1 = una persona normal). Bauti gordo levanta menos; musculoso, mucho más.
const fuerzaDe = (p) => (p.id === 'bauti' ? 0.75 + 0.25 * (1 - (p.gordura ?? 1)) + 0.9 * (p.musculo || 0) : 1);

// ---------- Ejercicios ----------
// pesos: lo que se puede elegir. limite: lo máximo que hace una persona normal (fuerza 1).
const EJERCICIOS = {
  curl: { nombre: 'Curl de bíceps', pesos: [5, 7.5, 10, 12.5, 15, 17.5, 20, 25], limite: 15, texto: (kg) => `${String(kg).replace('.', ',')} kg c/u` },
  banca: { nombre: 'Press de banca', pesos: [20, 40, 50, 60, 70, 80, 100, 120], limite: 70 },
  dominadas: { nombre: 'Dominadas', pesos: [0, 5, 10, 20], limite: 10, texto: (kg) => (kg ? `+${kg} kg` : 'Sin peso') },
  pecdec: { nombre: 'Peck deck', pesos: [20, 30, 40, 50, 60, 70, 80], limite: 50 },
  jalon: { nombre: 'Jalón al pecho', pesos: [20, 30, 40, 50, 60, 70, 80, 90], limite: 55 },
};
const ZT = G.z0 + G.pared + 0.75; // frente de las torres de máquinas (ver gym.js)
// Dónde hay que pararse para que aparezca "Entrenar (E)".
const ENTRADAS = {
  curl: [EST.curl.x, EST.curl.z],
  banca: [EST.banca.x + 1.6, EST.banca.z + 3.2],
  dominadas: [EST.dominadas.x, EST.dominadas.z + 3.4],
  pecdec: [EST.pecdec.x, ZT + 4.6],
  jalon: [EST.jalon.x, ZT + 5.8],
};

// ---------- Brazos: de dónde a dónde (cinemática inversa de dos huesos) ----------
const LARGO_BRAZO = 1; // hombro -> codo
const LARGO_ANTEBRAZO = 0.9; // codo -> donde agarra la mano
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const mBase = new THREE.Matrix4();
const ABAJO = new THREE.Vector3(0, -1, 0);

// Pone el brazo con el codo en E y la mano hacia H (en coordenadas del torso).
function brazoPorPuntos(brazo, E, H, pliegue) {
  const S = brazo.position;
  const abajo = v1.subVectors(E, S).normalize();
  const f = v2.subVectors(H, E).normalize();
  const z = v3.copy(f).addScaledVector(abajo, -f.dot(abajo));
  if (z.lengthSq() < 1e-6) z.copy(pliegue).addScaledVector(abajo, -pliegue.dot(abajo));
  if (z.lengthSq() < 1e-6) z.set(0, 0, 1).addScaledVector(abajo, -abajo.z);
  z.normalize();
  const y = abajo.clone().negate();
  const x = new THREE.Vector3().crossVectors(y, z);
  mBase.makeBasis(x, y, z);
  brazo.quaternion.setFromRotationMatrix(mBase);
  brazo.codo.rotation.set(-Math.acos(THREE.MathUtils.clamp(f.dot(abajo), -1, 1)), 0, 0);
}

// Lleva la mano a T (torso) con el codo para el lado de "pliegue" (torso).
function brazoA(brazo, T, pliegue) {
  const S = brazo.position;
  const u = new THREE.Vector3().subVectors(T, S);
  const d = THREE.MathUtils.clamp(u.length(), 0.2, LARGO_BRAZO + LARGO_ANTEBRAZO - 0.002);
  u.normalize();
  const a = (LARGO_BRAZO ** 2 - LARGO_ANTEBRAZO ** 2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, LARGO_BRAZO ** 2 - a * a));
  const w = pliegue.clone().addScaledVector(u, -pliegue.dot(u));
  if (w.lengthSq() < 1e-6) w.set(0, 0, -1).addScaledVector(u, u.z);
  w.normalize();
  const E = S.clone().addScaledVector(u, a).addScaledVector(w, h);
  const H = S.clone().addScaledVector(u, d);
  brazoPorPuntos(brazo, E, H, w);
}

// Posición del mundo -> coordenadas del torso del muñeco.
const enTorso = (modelo, x, y, z) => modelo.partes.cuerpo.worldToLocal(new THREE.Vector3(x, y, z));

function soltarPose(modelo) {
  const { cuerpo, brazoI, brazoD, piernaI, piernaD } = modelo.partes;
  modelo.grupo.rotation.set(0, 0, 0);
  modelo.grupo.position.set(0, 0, 0);
  cuerpo.rotation.set(0, 0, 0);
  for (const b of [brazoI, brazoD]) { b.rotation.set(0, 0, 0); b.codo.rotation.set(0, 0, 0); }
  for (const p of [piernaI, piernaD]) { p.muslo.rotation.set(0, 0, 0); p.rodilla.rotation.set(0, 0, 0); }
}

function piernas(modelo, muslo, rodilla, abrir = 0) {
  const { piernaI, piernaD, cuerpo } = modelo.partes;
  piernaI.muslo.rotation.set(muslo, 0, -abrir);
  piernaD.muslo.rotation.set(muslo, 0, abrir);
  piernaI.rodilla.rotation.set(rodilla, 0, 0);
  piernaD.rodilla.rotation.set(rodilla, 0, 0);
  piernaI.muslo.position.y = 2;
  piernaD.muslo.position.y = 2;
  cuerpo.position.y = 2;
}

// Ida y vuelta de una repetición: sube (45%) y baja (55%), con aceleración suave.
function curva(t) {
  const suave = (x) => x * x * (3 - 2 * x);
  return t < 0.45 ? suave(t / 0.45) : 1 - suave((t - 0.45) / 0.55);
}

// ---------- Objetos que se mueven ----------
const matAtlas = () => new THREE.MeshLambertMaterial({ map: texturaAtlas(THREE) });
const matCromo = mat(P.cromo);

// Discos por lado para un peso de barra (barra olímpica de 20 kg).
function discosPorLado(total) {
  let resto = Math.max(0, (total - 20) / 2);
  const lista = [];
  for (const kg of [25, 20, 10, 5]) while (resto >= kg - 1e-6) { lista.push(kg); resto -= kg; }
  return lista;
}
const RADIO_DISCO = { 5: 0.5, 10: 0.66, 20: 0.88, 25: 0.95 };

// Barra olímpica (eje x) con los discos del peso pedido; centro en el origen.
function crearBarra(kg, largo = 7.2) {
  const g = new THREE.Group();
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, largo, 10), matCromo);
  barra.rotation.z = Math.PI / 2;
  g.add(barra);
  const geos = [];
  for (const s of [-1, 1]) {
    let x = largo / 2 - 1.5;
    for (const d of discosPorLado(kg)) {
      const ancho = 0.14 + d * 0.004;
      const geo = orientar(cilindroAtlas(THREE, RADIO_DISCO[d], ancho, celdaDisco(d), 22), 'x');
      x += ancho / 2;
      geo.translate(s * x, 0, 0);
      x += ancho / 2 + 0.01;
      geos.push(geo);
    }
    const tope = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), mat('#2b2d30'));
    tope.rotation.z = Math.PI / 2;
    tope.position.x = s * (largo / 2 - 1.62);
    g.add(tope);
  }
  if (geos.length) g.add(new THREE.Mesh(mergeGeometries(geos), matAtlas()));
  return g;
}

// Mancuerna para tener en la mano: el eje queda cruzado en la palma (eje x del antebrazo).
function crearMancuerna(kg) {
  const [c1, c2, m] = mancuernaGeo(THREE, kg, 0.27 + kg * 0.0045);
  for (const geo of [c1, c2, m]) geo.rotateZ(Math.PI / 2);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries([c1, c2]), matAtlas()), new THREE.Mesh(m, matCromo));
  g.scale.setScalar(0.85);
  return g;
}

// Pila de placas al costado de una torre: las de arriba (las del peso elegido) suben.
function crearPila(x, z) {
  const g = new THREE.Group();
  const placa = new THREE.BoxGeometry(0.9, 0.16, 0.9);
  const negro = mat('#111214');
  const placas = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(placa, negro);
    m.position.set(0, F + 0.4 + i * 0.18, 0);
    g.add(m);
    placas.push(m);
  }
  const guia = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 6), matCromo);
  guia.position.y = 3.2;
  g.add(guia);
  const perno = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), mat('#e53935'));
  g.add(perno);
  g.position.set(x, 0, z);
  return {
    grupo: g,
    // n: cuántas placas levanta (de arriba); s: cuánto (0 a 1).
    mover(n, s) {
      placas.forEach((m, i) => { m.position.y = F + 0.4 + i * 0.18 + (i >= 10 - n ? s * 1.6 : 0); });
      perno.position.set(0.35, F + 0.4 + (10 - n) * 0.18 + s * 1.6, 0.46);
    },
  };
}

export class Gimnasio {
  constructor(escena, ui) {
    this.escena = escena;
    this.ui = ui;
    this.kelvin = null;
    this.cargando = false;
    this.estabaAdentro = false;
    this.oferta = 0; // segundos que Kelvin tiene la mano extendida
    this.choque = null; // { t, punto }
    this.entrenando = null; // { id, peso, reps, rep: { t, dur, falla } | null }
    this.alCambiarFisico = null; // main.js: rearma el muñeco de Bauti
    this.alEntrar = null; // main.js: guarda el arma, etc.

    // Barra del press de banca (apoyada en los soportes) y la del jalón con su cable.
    const B = EST.banca;
    this.reposoBanca = new THREE.Vector3(B.x, 3.92, B.z + 1.72);
    this.barraBanca = crearBarra(60);
    this.barraBanca.position.copy(this.reposoBanca);
    escena.add(this.barraBanca);
    this.barraJalon = new THREE.Group();
    const bj = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 8), matCromo);
    bj.rotation.z = Math.PI / 2;
    this.barraJalon.add(bj);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), mat('#1a1b1d'));
      p.rotation.z = Math.PI / 2 + s * 0.35;
      p.position.set(s * 2.0, -0.12, 0);
      this.barraJalon.add(p);
    }
    this.poleaJalon = new THREE.Vector3(EST.jalon.x, 8.6, ZT + 3.4);
    this.reposoJalon = new THREE.Vector3(EST.jalon.x, 6.1, ZT + 3.4);
    this.barraJalon.position.copy(this.reposoJalon);
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), mat('#111'));
    escena.add(this.barraJalon, this.cable);
    this.ponerCable();
    // Brazos del pec dec (pivote arriba del hombro, con el rodillo vertical en la punta).
    this.brazosPec = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const brazo = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.18), mat('#24262a'));
      brazo.position.set(0.52, 0.25, 0);
      const rodillo = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.4, 10), mat('#101113'));
      rodillo.position.set(1.0, 0.45, s * 0.38);
      g.add(brazo, rodillo);
      g.userData.lado = s;
      escena.add(g);
      return g;
    });
    this.reposarPec();
    this.pilaPec = crearPila(EST.pecdec.x + 1.35, ZT);
    this.pilaJalon = crearPila(EST.jalon.x + 1.35, ZT);
    escena.add(this.pilaPec.grupo, this.pilaJalon.grupo);
    this.pilaPec.mover(0, 0);
    this.pilaJalon.mover(0, 0);
  }

  dentro(p) {
    return p.x > G.x0 && p.x < G.x1 && p.z > G.z0 && p.z < G.z1 && p.y < G.alto;
  }

  async crearKelvin() {
    this.cargando = true;
    const k = crearPersonaje(KELVIN, await cargarCabeza(KELVIN));
    k.grupo.position.set(KV.x, F, KV.z);
    k.grupo.rotation.y = -Math.PI / 2; // mira a la alfombra
    const nombre = crearEtiqueta([{ texto: 'Kelvin', tam: 60, color: '#e9e9e9' }], 4);
    nombre.sprite.position.y = 6.6;
    k.grupo.add(nombre.sprite);
    this.globo = crearEtiqueta([{ texto: '¿Todo bien bro?', tam: 54, color: '#ffffff' }], 6.5);
    this.globo.sprite.position.y = 8.1;
    this.globo.sprite.visible = false;
    k.grupo.add(this.globo.sprite);
    this.escena.add(k.grupo);
    this.kelvin = k;
  }

  hablar(texto, segundos = 3.5) {
    if (!this.globo) return;
    this.globo.actualizar([{ texto, tam: 54, color: '#ffffff' }]);
    this.globo.sprite.visible = true;
    this.tiempoGlobo = segundos;
    this.ui.toast(`Kelvin: "${texto}"`, 'info');
  }

  distKelvin(p) {
    return Math.hypot(p.x - KV.x, p.z - KV.z);
  }

  estacionCerca(jugador) {
    for (const [id, [x, z]] of Object.entries(ENTRADAS)) {
      if (Math.hypot(jugador.pos.x - x, jugador.pos.z - z) < 3.2 && jugador.pos.y < F + 2) return id;
    }
    return null;
  }

  // Texto del botón de acción, o '' si acá no hay nada.
  accion(jugador) {
    if (this.entrenando) return 'Dejar de entrenar (E)';
    if (!this.dentro(jugador.pos)) return '';
    if (this.kelvin && this.oferta > 0 && !this.choque && this.distKelvin(jugador.pos) < 5.4) return 'Chocar la mano (E)';
    const id = this.estacionCerca(jugador);
    return id ? `Entrenar: ${EJERCICIOS[id].nombre} (E)` : '';
  }

  hacer(jugador) {
    const t = this.accion(jugador);
    if (t.startsWith('Dejar')) this.dejar(jugador);
    else if (t.startsWith('Chocar')) this.chocar(jugador);
    else if (t.startsWith('Entrenar')) this.entrar(this.estacionCerca(jugador), jugador);
  }

  // ---------- Choque de manos con Kelvin ----------
  chocar(jugador) {
    const k = this.kelvin.grupo;
    jugador.angulo = Math.atan2(k.position.x - jugador.pos.x, k.position.z - jugador.pos.z);
    // Se encuentran a mitad de camino, a la altura del pecho.
    const punto = new THREE.Vector3((jugador.pos.x + k.position.x) / 2, 4.25, (jugador.pos.z + k.position.z) / 2);
    this.choque = { t: 0, punto, sono: false };
    this.oferta = 0;
  }

  // ---------- Entrenar ----------
  entrar(id, jugador) {
    const p = jugador.personaje || {};
    const ej = EJERCICIOS[id];
    const fuerza = fuerzaDe(p);
    // Arranca con el peso más pesado que le sale cómodo.
    const comodos = ej.pesos.filter((kg) => kg <= ej.limite * fuerza * 0.75);
    const peso = comodos.length ? comodos[comodos.length - 1] : ej.pesos[0];
    this.alEntrar?.();
    this.entrenando = { id, peso, reps: 0, rep: null, modelo: null, accesorios: [] };
    this.cambiarPeso(peso);
    this.ui.abrirPanelGym({
      nombre: ej.nombre,
      pesos: ej.pesos.map((kg) => ({ kg, texto: ej.texto ? ej.texto(kg) : `${kg} kg`, pesado: kg > ej.limite * fuerza * 1.15 })),
      peso,
      alPeso: (kg) => this.cambiarPeso(kg),
      alSalir: () => this.dejar(jugador),
    });
    this.actualizarPanel(jugador);
  }

  cambiarPeso(kg) {
    const e = this.entrenando;
    if (!e || (e.rep && e.rep.t < 1)) {
      if (e) e.pesoPendiente = kg;
      return;
    }
    e.peso = kg;
    e.pesoPendiente = null;
    if (e.id === 'banca') {
      this.escena.remove(this.barraBanca);
      this.barraBanca = crearBarra(kg);
      this.barraBanca.position.copy(this.reposoBanca);
      this.escena.add(this.barraBanca);
    }
    e.modelo = null; // vuelve a poner las mancuernas o el disco del cinturón
  }

  dejar(jugador) {
    const e = this.entrenando;
    if (!e) return;
    this.sacarAccesorios();
    if (jugador.modelo) soltarPose(jugador.modelo);
    const [x, z] = ENTRADAS[e.id];
    jugador.pos.set(x, F, z);
    jugador.vel.set(0, 0, 0);
    this.barraBanca.position.copy(this.reposoBanca);
    this.barraJalon.position.copy(this.reposoJalon);
    this.ponerCable();
    this.reposarPec();
    this.pilaPec.mover(0, 0);
    this.pilaJalon.mover(0, 0);
    this.entrenando = null;
    this.ui.cerrarPanelGym();
    if (e.reps) this.ui.toast(`${EJERCICIOS[e.id].nombre}: ${e.reps} repeticiones`, 'ok');
  }

  sacarAccesorios() {
    const e = this.entrenando;
    if (!e) return;
    for (const a of e.accesorios) a.parent?.remove(a);
    e.accesorios = [];
  }

  ponerAccesorios(modelo) {
    const e = this.entrenando;
    this.sacarAccesorios();
    const { brazoI, brazoD, cuerpo, fondoTorso } = modelo.partes;
    if (e.id === 'curl') {
      for (const b of [brazoI, brazoD]) {
        const m = crearMancuerna(e.peso);
        m.position.set(0, -LARGO_ANTEBRAZO, 0);
        b.codo.add(m);
        e.accesorios.push(m);
      }
    }
    if (e.id === 'dominadas' && e.peso > 0) {
      // Cinturón de lastre con el disco colgando adelante.
      const kg = e.peso >= 20 ? 20 : e.peso >= 10 ? 10 : 5;
      const geo = orientar(cilindroAtlas(THREE, RADIO_DISCO[kg] * 0.75, 0.12, celdaDisco(kg), 20), 'z');
      const d = new THREE.Mesh(geo, matAtlas());
      d.position.set(0, -0.55, fondoTorso / 2 + 0.25);
      const cinto = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, fondoTorso + 0.1), mat('#1b1c1e'));
      cinto.position.y = 0.15;
      cuerpo.add(d, cinto);
      e.accesorios.push(d, cinto);
    }
    e.modelo = modelo;
  }

  ponerCable() {
    const a = this.poleaJalon;
    const b = this.barraJalon.position;
    this.cable.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    this.cable.scale.set(1, Math.max(0.01, a.distanceTo(b)), 1);
    this.cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v1.subVectors(a, b).normalize());
  }

  reposarPec() {
    for (const g of this.brazosPec) {
      const s = g.userData.lado;
      g.position.set(EST.pecdec.x + s * 1.5, 4.15, ZT + 1.5 + 0.55);
      g.rotation.y = s > 0 ? 0 : Math.PI;
    }
  }

  actualizarPanel(jugador) {
    const e = this.entrenando;
    if (!e) return;
    let bauti = null;
    if (jugador.personaje?.id === 'bauti') {
      const pts = jugador.estado?.bautiGym || 0;
      const A = BAUTI_GYM.adelgazar;
      bauti = pts < A
        ? { texto: `Bauti adelgazando: ${Math.floor((pts / A) * 100)}%`, fraccion: pts / A, fase: 'flaco' }
        : { texto: `Bauti musculoso: ${Math.floor(Math.min(1, (pts - A) / BAUTI_GYM.musculo) * 100)}%`, fraccion: Math.min(1, (pts - A) / BAUTI_GYM.musculo), fase: 'musculo' };
    }
    this.ui.actualizarPanelGym({ reps: e.reps, peso: e.pesoPendiente ?? e.peso, bauti });
  }

  // Una repetición: tarda más cuanto más pesado; si es demasiado, no sube.
  empezarRep(jugador) {
    const e = this.entrenando;
    const ej = EJERCICIOS[e.id];
    const r = e.peso / (ej.limite * fuerzaDe(jugador.personaje || {}));
    const falla = r > 1.15;
    e.rep = { t: 0, dur: 1.25 + 0.9 * Math.min(r, 1.15), falla, r };
  }

  terminarRep(jugador) {
    const e = this.entrenando;
    const { falla, r } = e.rep;
    e.rep = null;
    if (e.pesoPendiente != null) this.cambiarPeso(e.pesoPendiente);
    if (falla) {
      sfx.error();
      this.ui.toast('¡Muy pesado! Probá con menos peso', 'error');
      return;
    }
    e.reps++;
    sfx.pesa();
    if (jugador.personaje?.id === 'bauti' && jugador.estado) {
      const antes = fisico(jugador.personaje, jugador.estado);
      jugador.estado.bautiGym = (jugador.estado.bautiGym || 0) + 1 + 2 * Math.min(r, 1);
      const despues = fisico(jugador.personaje, jugador.estado);
      if (antes.gordura !== despues.gordura || antes.musculo !== despues.musculo) {
        this.alCambiarFisico?.(despues.gordura < antes.gordura ? (despues.gordura === 0 ? '¡Bauti quedó flaco! Ahora a ponerse musculoso' : '¡Bauti está más flaco!') : '¡Bauti está más musculoso!');
      }
    }
    this.actualizarPanel(jugador);
  }

  // Mientras entrena: main.js no mueve al jugador y llama a esto. apretando: Espacio o el
  // botón de la repetición.
  sostener(dt, jugador, apretando) {
    const e = this.entrenando;
    const m = jugador.modelo;
    if (!e || !m) return;
    if (e.modelo !== m) this.ponerAccesorios(m);
    if (!e.rep && apretando) this.empezarRep(jugador);
    let s = 0;
    if (e.rep) {
      e.rep.t += dt / e.rep.dur;
      if (e.rep.falla) s = Math.min(0.28, curva(Math.min(e.rep.t, 1)) * 0.4) + Math.sin(e.rep.t * 60) * 0.015;
      else s = curva(Math.min(e.rep.t, 1));
      if (e.rep.t >= 1) this.terminarRep(jugador);
    }
    this.posar(e.id, jugador, s, e.peso);
  }

  // Coloca al jugador en la máquina y arma la pose para el avance s (0 = inicio, 1 = máximo).
  posar(id, jugador, s, peso) {
    const m = jugador.modelo;
    const { cuerpo, brazoI, brazoD, xBrazo, fondoTorso } = m.partes;
    const base = (x, y, z, angulo, acostado = 0) => {
      jugador.pos.set(x, y, z);
      jugador.angulo = angulo;
      jugador.vel.set(0, 0, 0);
      jugador.contenedor.position.set(x, y, z);
      jugador.contenedor.rotation.y = angulo;
      m.grupo.rotation.set(acostado, 0, 0);
      m.grupo.position.set(0, 0, 0);
      jugador.sombra.position.set(x, F + 0.06, z);
    };
    const listo = () => jugador.contenedor.updateMatrixWorld(true);
    const lados = [[brazoD, 1], [brazoI, -1]];

    if (id === 'curl') {
      const C = EST.curl;
      base(C.x, F, C.z, C.angulo);
      piernas(m, 0, 0);
      cuerpo.rotation.set(0.04, 0, 0);
      const phi = 0.15 + 2.25 * s;
      for (const [b, sd] of lados) {
        const S = b.position;
        const E = new THREE.Vector3(S.x + sd * 0.06, S.y - LARGO_BRAZO, S.z - 0.08);
        const H = E.clone().add(new THREE.Vector3(0, -Math.cos(phi), Math.sin(phi)).multiplyScalar(LARGO_ANTEBRAZO));
        brazoPorPuntos(b, E, H, new THREE.Vector3(0, 0, 1));
      }
    } else if (id === 'banca') {
      const B = EST.banca;
      const y = F + 1.3 + fondoTorso / 2;
      const z = B.z + 5.6;
      base(B.x, y, z, 0, -Math.PI / 2);
      piernas(m, 0.75, 0.95, 0.38);
      cuerpo.rotation.set(0, 0, 0);
      listo();
      // Barra: arriba (brazos estirados) -> al pecho -> arriba.
      const barra = new THREE.Vector3(B.x, THREE.MathUtils.lerp(y + 1.72, y + fondoTorso / 2 + 0.42, s), THREE.MathUtils.lerp(z - 3.95, z - 3.4, s));
      this.barraBanca.position.copy(barra);
      for (const [b, sd] of lados) brazoA(b, enTorso(m, barra.x + sd * (xBrazo + 0.42), barra.y, barra.z), new THREE.Vector3(sd, -0.15, -0.9));
    } else if (id === 'dominadas') {
      const D = EST.dominadas;
      const barY = 8.6;
      const barZ = D.z + 1.5;
      base(D.x, THREE.MathUtils.lerp(barY - 5.82, barY - 4.3, s), barZ + 0.45, Math.PI);
      piernas(m, -0.25 - 0.2 * s, 1.0 + 0.3 * s, 0.05);
      cuerpo.rotation.set(-0.05, 0, 0);
      listo();
      for (const [b, sd] of lados) {
        const xw = jugador.contenedor.localToWorld(new THREE.Vector3(sd * (xBrazo + 0.55), 0, 0)).x;
        brazoA(b, enTorso(m, xw, barY, barZ), new THREE.Vector3(sd, -1, 0.15));
      }
    } else if (id === 'pecdec') {
      const pd = EST.pecdec.x;
      base(pd, F + 1.5 + 0.45 - 2, ZT + 1.5 + fondoTorso / 2 + 0.05, 0);
      piernas(m, -1.5, 1.5, 0.12);
      cuerpo.rotation.set(0, 0, 0);
      listo();
      const psi = 0.08 + 1.62 * s;
      for (const [b, sd] of lados) {
        const S = b.position;
        const d = new THREE.Vector3(sd * Math.cos(psi), 0.02, Math.sin(psi));
        const E = S.clone().addScaledVector(d, LARGO_BRAZO);
        const H = E.clone().add(new THREE.Vector3(0, LARGO_ANTEBRAZO, 0));
        brazoPorPuntos(b, E, H, new THREE.Vector3(0, 1, 0));
      }
      // Los brazos de la máquina giran con los del jugador (pivote en cada hombro).
      for (const g of this.brazosPec) {
        const sd = g.userData.lado;
        const hombro = cuerpo.localToWorld((sd > 0 ? brazoD : brazoI).position.clone());
        g.position.copy(hombro);
        g.rotation.y = sd > 0 ? -psi : Math.PI + psi;
      }
      this.pilaPec.mover(Math.round(peso / 10), s);
    } else if (id === 'jalon') {
      const ja = EST.jalon.x;
      const y = F + 1.5 + 0.45 - 2;
      const z = ZT + 3.85;
      base(ja, y, z, Math.PI);
      piernas(m, -1.5, 1.5, 0.12);
      cuerpo.rotation.set(-0.08 - 0.14 * s, 0, 0);
      listo();
      const hombroY = y + 4;
      const barra = new THREE.Vector3(ja, THREE.MathUtils.lerp(hombroY + 1.78, hombroY + 0.1, s), THREE.MathUtils.lerp(z - 0.45, z - 0.95, s));
      this.barraJalon.position.copy(barra);
      this.ponerCable();
      for (const [b, sd] of lados) {
        const xw = jugador.contenedor.localToWorld(new THREE.Vector3(sd * (xBrazo + 0.75), 0, 0)).x;
        brazoA(b, enTorso(m, xw, barra.y, barra.z), new THREE.Vector3(sd, -1, -0.25));
      }
      this.pilaJalon.mover(Math.round(peso / 10), s);
    }
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador, jugando) {
    if (!this.kelvin) {
      if (!this.cargando) this.crearKelvin();
      return;
    }
    const k = this.kelvin;
    // Cada vez que entrás: "¿Todo bien bro?" y te ofrece la mano.
    const adentro = jugando && this.dentro(jugador.pos);
    if (adentro && !this.estabaAdentro) {
      this.hablar('¿Todo bien bro?');
      this.oferta = 14;
    }
    this.estabaAdentro = adentro;
    if (this.tiempoGlobo > 0) {
      this.tiempoGlobo -= dt;
      if (this.tiempoGlobo <= 0) this.globo.sprite.visible = false;
    }
    // Kelvin mira al jugador si está cerca (si no, a la alfombra).
    const objetivo = adentro && this.distKelvin(jugador.pos) < 22
      ? Math.atan2(jugador.pos.x - k.grupo.position.x, jugador.pos.z - k.grupo.position.z)
      : -Math.PI / 2;
    let d = objetivo - k.grupo.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    k.grupo.rotation.y += d * Math.min(1, dt * 4);
    k.partes.brazoI.rotation.set(0, 0, 0);
    k.partes.brazoI.codo.rotation.set(0, 0, 0);
    k.animar(dt, 0, true);
    if (this.oferta > 0) this.oferta -= dt;
    k.grupo.updateMatrixWorld(true);
    const { brazoI } = k.partes;
    // Mano extendida esperando el choque.
    if (this.oferta > 0 && !this.choque) {
      const frente = k.grupo.localToWorld(new THREE.Vector3(-0.6, 3.75, 1.6));
      brazoA(brazoI, k.partes.cuerpo.worldToLocal(frente), new THREE.Vector3(-1, -1, 0));
    }
    if (this.choque) this.animarChoque(dt, jugador);
  }

  animarChoque(dt, jugador) {
    const c = this.choque;
    c.t += dt;
    // 0 a 0,35 s: se acercan las manos; choque; hasta 0,6 quietas; después vuelven.
    const ida = THREE.MathUtils.clamp(c.t / 0.35, 0, 1);
    const vuelta = THREE.MathUtils.clamp((c.t - 0.6) / 0.4, 0, 1);
    const f = ida * (1 - vuelta);
    if (c.t >= 0.35 && !c.sono) {
      c.sono = true;
      sfx.choque();
      this.hablar('¡Eeeso bro! A entrenar', 3);
    }
    for (const modelo of [this.kelvin, jugador.modelo]) {
      if (!modelo) continue;
      const { cuerpo, brazoI } = modelo.partes;
      modelo.grupo.updateMatrixWorld(true);
      const hombro = cuerpo.localToWorld(brazoI.position.clone());
      const descanso = cuerpo.localToWorld(brazoI.position.clone().add(new THREE.Vector3(0, -1.9, 0.2)));
      const meta = descanso.lerp(c.punto, f);
      brazoA(brazoI, cuerpo.worldToLocal(meta.clone()), new THREE.Vector3(-1, -0.6, -0.2));
      if (hombro.distanceTo(c.punto) > 2.6 && f > 0.5) brazoI.codo.rotation.x *= 0.2; // de lejos estira el brazo entero
    }
    if (c.t > 1.05) {
      this.choque = null;
      for (const modelo of [this.kelvin, jugador.modelo]) {
        if (!modelo) continue;
        modelo.partes.brazoI.rotation.set(0, 0, 0);
        modelo.partes.brazoI.codo.rotation.set(0, 0, 0);
      }
    }
  }
}
