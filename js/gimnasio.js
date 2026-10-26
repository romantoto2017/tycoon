import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, cargarImagen, texturaDeCanvas } from './texturas.js';
import { vestido } from './vestir.js';
import { GYM as G, GYM_KELVIN as KV, GYM_ESTACIONES as EST } from './constantes.js';
import { PISO_GYM as F, PALETA_GYM as P, texturaAtlas, cilindroAtlas, orientar, celdaDisco, mancuernaGeo } from './gym.js';
import { mat, GEO_CAJA } from './util.js';
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
// Bauti todavía gordo: no hay ropa de su talle (las tiendas no le venden y el ropero no le sirve).
export const bautiGordo = (estado) => (estado.bautiGym || 0) < BAUTI_GYM.adelgazar;
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
const fuerzaDe = (p) => (p.id === 'bauti' ? 0.8 + 0.2 * (1 - (p.gordura ?? 1)) + 0.8 * (p.musculo || 0) : 1);
// Peso del cuerpo (cuenta en las dominadas): Bauti gordo pesa bastante más.
const pesoCorporal = (p) => 70 + 40 * (p.gordura ?? (p.cuerpo === 'gordo' ? 1 : 0));

// ---------- Ejercicios ----------
// pesos: lo que se puede elegir (de menor a mayor). rm: lo máximo que levanta una persona
// normal (fuerza 1) UNA vez; en las dominadas es el total, cuerpo + lastre.
const EJERCICIOS = {
  curl: { nombre: 'Curl de bíceps', pesos: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20], rm: 17, texto: (kg) => `${String(kg).replace('.', ',')} kg c/u` },
  banca: { nombre: 'Press de banca', pesos: [20, 30, 40, 50, 60, 70, 80, 90, 100], rm: 75 },
  dominadas: { nombre: 'Dominadas', pesos: [0, 5, 10, 15, 20], rm: 82, cuerpo: true, texto: (kg) => (kg ? `+${kg} kg` : 'Sin peso') },
  pecdec: { nombre: 'Peck deck', pesos: [10, 20, 30, 40, 50, 60, 70, 80], rm: 60 },
  jalon: { nombre: 'Jalón al pecho', pesos: [10, 20, 30, 40, 50, 60, 70, 80, 90], rm: 70 },
};
// Cuántas repeticiones seguidas (descansado) se hacen con un peso: fórmula de Epley al revés
// (1RM = peso x (1 + reps / 30)). Con el máximo, una; más pesado, ninguna.
function repsMaximas(ej, kg, p) {
  const carga = kg + (ej.cuerpo ? pesoCorporal(p) : 0);
  const rm = ej.rm * fuerzaDe(p);
  return carga > rm + 1e-6 ? 0 : 1 + 30 * (rm / carga - 1);
}
const LUCHA_DESDE = 3; // las últimas reps antes del fallo se pelean (minijuego)
const DESCANSO = 35; // segundos quieto para recuperarse del todo
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
export function brazoA(brazo, T, pliegue) {
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
    const brazoPec = (s) => {
      const g = new THREE.Group();
      const brazo = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.18), mat('#24262a'));
      brazo.position.set(0.52, 0.25, 0);
      const rodillo = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.4, 10), mat('#101113'));
      rodillo.position.set(1.0, 0.45, s * 0.38);
      g.add(brazo, rodillo);
      g.userData.lado = s;
      escena.add(g);
      return g;
    };
    this.brazosPec = [-1, 1].map(brazoPec);
    this.reposarPec();
    // El otro pec dec (el del Shileno): los brazos quietos, abiertos, y su pila de placas.
    for (const s of [-1, 1]) {
      const g = brazoPec(s);
      g.position.set(EST.pecdec2.x + s * 1.5, 4.15, ZT + 1.5 + 0.55);
      g.rotation.y = s > 0 ? 0 : Math.PI;
    }
    const pila2 = crearPila(EST.pecdec2.x + 1.35, ZT);
    pila2.mover(0, 0);
    escena.add(pila2.grupo);
    this.shileno = null;
    this.profe = null;
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
    // El Shileno (siempre en su pec dec) y el profe.
    const sh = crearPersonaje(SHILENO, await cargarCabeza(SHILENO));
    const etiqueta = crearEtiqueta([{ texto: SHILENO.nombre, tam: 60, color: '#e9e9e9' }], 4);
    etiqueta.sprite.position.y = 6.4;
    sh.grupo.add(etiqueta.sprite);
    this.shileno = enContenedor(this.escena, sh);
    sentarShileno(this.shileno);
    const profe = new Profe(this);
    await profe.crear(this.escena);
    this.profe = profe;
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
    this.choque = empezarChoque(jugador, this.kelvin.grupo.position);
    this.oferta = 0;
  }

  // ---------- Entrenar ----------
  entrar(id, jugador) {
    const p = jugador.personaje || {};
    const ej = EJERCICIOS[id];
    // Siempre arranca con el peso más liviano.
    const peso = ej.pesos[0];
    this.profe?.liberar(id); // si el profe la estaba usando, te la deja
    this.alEntrar?.();
    // fatiga: cuánto de la serie ya gastó (0 descansado, 1 al fallo). serie: reps seguidas.
    this.entrenando = { id, peso, reps: 0, serie: 0, fatiga: 0, quieto: 0, rep: null, modelo: null, accesorios: [] };
    this.cambiarPeso(peso);
    this.ui.abrirPanelGym({
      nombre: ej.nombre,
      pesos: ej.pesos.map((kg) => {
        const n = Math.floor(repsMaximas(ej, kg, p));
        return { kg, texto: ej.texto ? ej.texto(kg) : `${kg} kg`, nota: n ? `máx ~${n}` : 'no podés', pesado: !n };
      }),
      peso,
      alPeso: (kg) => this.cambiarPeso(kg),
      alSalir: () => this.dejar(jugador),
      alPulsar: () => this.pulsar(jugador),
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
    this.ui.luchaGym(null);
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
    this.ui.actualizarPanelGym({ reps: e.reps, serie: e.serie, energia: 1 - e.fatiga, peso: e.pesoPendiente ?? e.peso, bauti });
  }

  // Cuántas reps le quedan en esta serie con el peso actual (cansancio incluido).
  quedan(jugador) {
    const e = this.entrenando;
    return (1 - e.fatiga) * repsMaximas(EJERCICIOS[e.id], e.peso, jugador.personaje || {});
  }

  // Una repetición. Descansado sube sola (más lenta cuanto más pesada); en las últimas antes
  // del fallo hay que pelearla apretando rápido; al fallo o con un peso imposible no sube.
  empezarRep(jugador) {
    const e = this.entrenando;
    const ej = EJERCICIOS[e.id];
    const p = jugador.personaje || {};
    const max = repsMaximas(ej, e.peso, p);
    const quedan = this.quedan(jugador);
    const r = (e.peso + (ej.cuerpo ? pesoCorporal(p) : 0)) / (ej.rm * fuerzaDe(p));
    const dur = 1.3 + 0.8 * Math.min(r, 1);
    if (max === 0 || quedan < 0.35) {
      e.rep = { t: 0, dur: 1.1, falla: true, r, motivo: max === 0 ? 'pesado' : 'fallo' };
    } else if (quedan <= LUCHA_DESDE) {
      // Minijuego: cuanto menos le queda, más rápido hay que apretar.
      const d = THREE.MathUtils.clamp((LUCHA_DESDE + 0.2 - quedan) / (LUCHA_DESDE - 0.15), 0, 1);
      e.rep = { t: 0, dur, r, lucha: { prog: 0, tiempo: 0, limite: 6, sube: 0.12 - 0.05 * d, baja: 0.22 + 0.3 * d, arriba: false } };
      this.ui.luchaGym({ prog: 0, tiempo: 1, dificil: d > 0.6 });
    } else {
      e.rep = { t: 0, dur, r };
    }
    e.costo = max ? 1 / max : 1;
  }

  // Cada apretada (tecla, botón grande o el de saltar): arranca una rep o empuja en la lucha.
  pulsar(jugador) {
    const e = this.entrenando;
    if (!e) return;
    if (!e.rep) { this.empezarRep(jugador); return; }
    const l = e.rep.lucha;
    if (!l || l.arriba) return;
    l.prog = Math.min(1, l.prog + l.sube);
    if (l.prog >= 1) { l.arriba = true; e.rep.t = 0.45; } // ¡subió! ahora baja controlado
  }

  terminarRep(jugador, ok) {
    const e = this.entrenando;
    const { r, motivo, lucha } = e.rep;
    e.rep = null;
    e.quieto = 0;
    this.ui.luchaGym(null);
    if (e.pesoPendiente != null) this.cambiarPeso(e.pesoPendiente);
    if (!ok) {
      sfx.error();
      if (motivo === 'pesado') this.ui.toast('¡No la movés ni una vez! Bajale el peso', 'error');
      else if (motivo === 'fallo') this.ui.toast('Estás al fallo: descansá un poco (o bajale el peso)', 'error');
      else {
        e.fatiga = 1;
        this.ui.toast('¡Fallo! No subió. Descansá y arrancá otra serie', 'error');
      }
      this.actualizarPanel(jugador);
      return;
    }
    e.reps++;
    e.serie++;
    e.fatiga = Math.min(1, e.fatiga + e.costo);
    sfx.pesa();
    if (lucha) this.ui.toast('¡Vamos! Subió', 'ok');
    this.profe?.alRep(e.id, jugador);
    if (jugador.personaje?.id === 'bauti' && jugador.estado) {
      const antes = fisico(jugador.personaje, jugador.estado);
      // Las reps pesadas y las peleadas al fallo valen más.
      jugador.estado.bautiGym = (jugador.estado.bautiGym || 0) + 1 + 2 * Math.min(r, 1) + (lucha ? 1 : 0);
      const despues = fisico(jugador.personaje, jugador.estado);
      if (antes.gordura !== despues.gordura || antes.musculo !== despues.musculo) {
        this.alCambiarFisico?.(despues.gordura < antes.gordura ? (despues.gordura === 0 ? '¡Bauti quedó flaco! Ahora a ponerse musculoso' : '¡Bauti está más flaco!') : '¡Bauti está más musculoso!');
      }
    }
    this.actualizarPanel(jugador);
  }

  // Mientras entrena: main.js no mueve al jugador y llama a esto. apretando: Espacio, el
  // botón grande o el de saltar mantenidos (sigue haciendo reps mientras no haya que pelear).
  sostener(dt, jugador, apretando) {
    const e = this.entrenando;
    const m = jugador.modelo;
    if (!e || !m) return;
    if (e.modelo !== m) this.ponerAccesorios(m);
    if (!e.rep && apretando && this.quedan(jugador) > LUCHA_DESDE) this.empezarRep(jugador);
    let s = 0;
    if (!e.rep) {
      // Descansando: se recupera (y si descansa un rato, la serie arranca de nuevo).
      e.quieto += dt;
      if (e.quieto > 1.5 && e.fatiga > 0) {
        e.fatiga = Math.max(0, e.fatiga - dt / DESCANSO);
        if (e.quieto > 8) e.serie = 0;
        this.tiempoPanel = (this.tiempoPanel || 0) + dt;
        if (this.tiempoPanel > 0.25) { this.tiempoPanel = 0; this.actualizarPanel(jugador); }
      }
    } else if (e.rep.falla) {
      // Empuja y no sube: tiembla un poco y vuelve.
      e.rep.t += dt / e.rep.dur;
      if (e.rep.perdio) s = e.rep.desde * Math.max(0, 1 - (e.rep.t - 0.5) * 2); // se le cae
      else s = Math.min(0.12, curva(Math.min(e.rep.t, 1)) * 0.25) + Math.sin(e.rep.t * 70) * 0.012;
      if (e.rep.t >= 1) this.terminarRep(jugador, false);
    } else if (e.rep.lucha) {
      const l = e.rep.lucha;
      if (!l.arriba) {
        // Subida peleada: el peso tira para abajo y cada apretada lo sube un poco.
        l.tiempo += dt;
        l.prog = Math.max(0, l.prog - l.baja * dt);
        s = l.prog + Math.sin(l.tiempo * 55) * 0.012 * (1 - l.prog);
        if (l.tiempo >= l.limite) { l.cae = (l.cae ?? l.prog); }
        this.ui.luchaGym({ prog: l.prog, tiempo: 1 - l.tiempo / l.limite, dificil: l.baja > 0.4 });
        if (l.cae != null) {
          // Se acabó el tiempo: el peso vuelve abajo y la serie termina.
          e.rep.falla = true;
          e.rep.t = 0.5;
          e.rep.dur = 0.8;
          e.rep.lucha = null;
          e.rep.motivo = null;
          e.rep.perdio = true;
          e.rep.desde = l.cae;
        }
      } else {
        // Ya arriba: baja controlado como una rep normal.
        e.rep.t += dt / e.rep.dur;
        s = curva(Math.min(e.rep.t, 1));
        if (e.rep.t >= 1) this.terminarRep(jugador, true);
      }
    } else {
      e.rep.t += dt / e.rep.dur;
      s = curva(Math.min(e.rep.t, 1));
      if (e.rep.t >= 1) this.terminarRep(jugador, true);
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
    // El profe anda solo por el gym (si estás lejos, ni se calcula).
    if (Math.hypot(jugador.pos.x - (G.x0 + G.x1) / 2, jugador.pos.z - (G.z0 + G.z1) / 2) < 160) this.profe?.actualizar(dt, jugador);
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
    // Mano extendida esperando el choque.
    if (this.oferta > 0 && !this.choque) ofrecerMano(k);
    if (this.choque) this.animarChoque(dt, jugador);
  }

  animarChoque(dt, jugador) {
    const c = this.choque;
    c.t += dt;
    if (c.t >= 0.35 && !c.sono) {
      c.sono = true;
      sfx.choque();
      this.hablar('¡Eeeso bro! A entrenar', 3);
    }
    if (moverChoque(c, [this.kelvin, jugador.modelo])) this.choque = null;
  }
}

// ---------- Choque de manos (Kelvin y Ottati) ----------
// Mano extendida hacia adelante, esperando que se la choquen.
export function ofrecerMano(modelo) {
  modelo.grupo.updateMatrixWorld(true);
  const frente = modelo.grupo.localToWorld(new THREE.Vector3(-0.6, 3.75, 1.6));
  brazoA(modelo.partes.brazoI, modelo.partes.cuerpo.worldToLocal(frente), new THREE.Vector3(-1, -1, 0));
}

// Arranca el choque: el jugador mira al otro y las manos se encuentran a mitad de camino,
// a la altura del pecho. Devuelve el estado que después se pasa a moverChoque().
export function empezarChoque(jugador, otro) {
  jugador.angulo = Math.atan2(otro.x - jugador.pos.x, otro.z - jugador.pos.z);
  return { t: 0, punto: new THREE.Vector3((jugador.pos.x + otro.x) / 2, otro.y + 4.05, (jugador.pos.z + otro.z) / 2) };
}

// Mueve los brazos derechos de los dos (c.t ya avanzado). Devuelve true cuando terminó.
// 0 a 0,35 s: se acercan las manos; choque; hasta 0,6 quietas; después vuelven.
export function moverChoque(c, modelos) {
  const ida = THREE.MathUtils.clamp(c.t / 0.35, 0, 1);
  const vuelta = THREE.MathUtils.clamp((c.t - 0.6) / 0.4, 0, 1);
  const f = ida * (1 - vuelta);
  const fin = c.t > 1.05;
  for (const modelo of modelos) {
    if (!modelo) continue;
    const { cuerpo, brazoI } = modelo.partes;
    if (fin) {
      brazoI.rotation.set(0, 0, 0);
      brazoI.codo.rotation.set(0, 0, 0);
      continue;
    }
    modelo.grupo.updateMatrixWorld(true);
    const hombro = cuerpo.localToWorld(brazoI.position.clone());
    const descanso = cuerpo.localToWorld(brazoI.position.clone().add(new THREE.Vector3(0, -1.9, 0.2)));
    const meta = descanso.lerp(c.punto, f);
    brazoA(brazoI, cuerpo.worldToLocal(meta.clone()), new THREE.Vector3(-1, -0.6, -0.2));
    if (hombro.distanceTo(c.punto) > 2.6 && f > 0.5) brazoI.codo.rotation.x *= 0.2; // de lejos estira el brazo entero
  }
  return fin;
}

// ======================= El Shileno y El profe que no es profe =======================
// El Shileno: SIEMPRE sentado en el segundo pec dec (el de la derecha) mirando el celu. No se
// mueve ni habla. El profe que no es profe: enorme, con el jogging Jordan y las TN de la tienda
// y una musculosa finita que le deja ver todos los músculos y los tatuajes (sacados de sus fotos
// con herramientas/gym_nuevos.py). Anda por el gym: a veces hace una máquina, a veces se mira
// en el espejo sacando bíceps y, de vez en cuando, si estás entrenando, viene a corregirte.
export const SHILENO = {
  id: 'shileno', nombre: 'El Shileno', foto: 'shileno.jpeg', pelo: '#2b211b', peinado: 'ondulado',
  remera: '#111216', pantalon: '#121316', remeraFotos: { frente: 'ropa/shileno_frente.jpg', tela: 'ropa/shileno_tela.jpg' },
};
export const PROFE = {
  id: 'profe', nombre: 'El profe que no es profe', foto: 'profe.jpeg', piel: '#d9a287', pelo: '#1d1714', peinado: 'rapado',
  remera: '#34373c', pantalon: '#151419', musculo: 1.05,
};
const ROPA_PROFE = { piernas: 'joggingjordan', pies: 'niketn' };
const TATUAJES = ['pecho', 'estrellas', 'antebrazo'];
const MUSCULOSA = '#34373c';
const CORRECCIONES = {
  curl: ['Bro, no balancees el cuerpo: los codos quietos, pegados al torso', 'Bro, bajá hasta estirar el brazo entero. Media rep no cuenta', 'Bro, subí controlado y apretá arriba un segundo'],
  banca: ['Bro, juntá las escápulas y sacá pecho antes de bajar', 'Bro, la barra baja hasta el pecho, no hasta la mitad', 'Bro, los pies firmes en el piso y no rebotes la barra en el pecho'],
  dominadas: ['Bro, subí hasta pasar la pera por arriba de la barra', 'Bro, nada de patear: bajá lento hasta estirar los brazos', 'Bro, tirá con la espalda, no con los brazos'],
  pecdec: ['Bro, cerrá apretando el pecho, no tires con los brazos', 'Bro, la espalda pegada al respaldo y los codos a la altura de los hombros', 'Bro, volvé lento, que el peso no te abra los brazos'],
  jalon: ['Bro, la barra va al pecho, nunca atrás de la nuca', 'Bro, sacá pecho y llevá los codos para abajo y atrás', 'Bro, no te tires para atrás: el torso casi quieto'],
};

// ---------- El cuerpo del profe ----------
// Todo de bloques (como el resto), pero con cada músculo aparte: pectorales, trapecios,
// dorsales que abren la espalda en V, hombros, bíceps, tríceps (cabeza larga y lateral),
// antebrazos y el cuello. La piel lleva el relieve pintado (luces y sombras de cada músculo) y
// arriba los tatuajes; la musculosa es una tira finita adelante y la espalda de nadador atrás.
const SOMBRA = (a) => `rgba(80,36,18,${a * 0.8})`;
const LUZ = (a) => `rgba(255,238,224,${a})`;
const TONOS = [0.92, 0.92, 1.04, 0.78, 1, 0.9]; // +x, -x, arriba, abajo, frente, atrás

function lienzo(w, h, piel, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = piel;
  g.fillRect(0, 0, w, h);
  dibujar?.(g, w, h);
  return c;
}

// Bulto: el centro más claro y los bordes más oscuros, así de lejos se ve redondeado.
function relieve(g, w, h, f = 1, cx = 0.5, cy = 0.42) {
  const r = g.createRadialGradient(w * cx, h * cy, Math.min(w, h) * 0.04, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  r.addColorStop(0, LUZ(0.24 * f));
  r.addColorStop(0.5, LUZ(0));
  r.addColorStop(1, SOMBRA(0.5 * f));
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);
}

// Líneas (en proporción del lienzo), con un poco de desenfoque para que parezcan sombras.
function trazos(g, w, h, lista, color, ancho, desenfoque = 0) {
  g.save();
  if (desenfoque) g.filter = `blur(${desenfoque}px)`;
  g.strokeStyle = color;
  g.lineWidth = ancho;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const puntos of lista) {
    g.beginPath();
    puntos.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h)));
    g.stroke();
  }
  g.restore();
}

function mancha(g, w, h, [x, y, rx, ry], color, desenfoque = 4) {
  g.save();
  g.filter = `blur(${desenfoque}px)`;
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x * w, y * h, rx * w, ry * h, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// Un pedazo del tatuaje (sx0..sy1 en proporción de la imagen) en un rectángulo del lienzo.
function tatuar(g, w, h, img, [x, y, an, al], [sx0, sy0, sx1, sy1] = [0, 0, 1, 1], espejo = false) {
  if (!img) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  g.save();
  g.globalAlpha = 0.92;
  if (espejo) {
    g.translate(w * (x * 2 + an), 0);
    g.scale(-1, 1);
  }
  g.drawImage(img, sx0 * iw, sy0 * ih, (sx1 - sx0) * iw, (sy1 - sy0) * ih, x * w, y * h, an * w, al * h);
  g.restore();
}

// Tribal polinesio del hombro derecho (como el de las fotos): arcos con "dientes de tiburón"
// en el hombro, bandas en el brazo y la punta que entra en el pecho.
const TINTA = 'rgba(28,34,48,0.88)';
function dientes(g, x0, x1, y0, y1, n, invertir = false) {
  const paso = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.moveTo(x0 + i * paso, invertir ? y0 : y1);
    g.lineTo(x0 + (i + 0.5) * paso, invertir ? y1 : y0);
    g.lineTo(x0 + (i + 1) * paso, invertir ? y0 : y1);
    g.closePath();
    g.fill();
  }
}
function tribal(g, w, h, parte) {
  g.save();
  g.fillStyle = TINTA;
  g.strokeStyle = TINTA;
  if (parte === 'hombro') {
    // Sol de arcos con dientes alrededor, y abajo una fila de puntas de lanza.
    g.lineWidth = w * 0.05;
    for (const r of [0.2, 0.34]) { g.beginPath(); g.arc(w * 0.5, 0, w * r, 0, Math.PI); g.stroke(); }
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI;
      const a1 = ((i + 1) / 12) * Math.PI;
      const am = (a0 + a1) / 2;
      g.beginPath();
      g.moveTo(w * 0.5 + Math.cos(a0) * w * 0.42, Math.sin(a0) * w * 0.42);
      g.lineTo(w * 0.5 + Math.cos(am) * w * 0.6, Math.sin(am) * w * 0.6);
      g.lineTo(w * 0.5 + Math.cos(a1) * w * 0.42, Math.sin(a1) * w * 0.42);
      g.closePath();
      g.fill();
    }
    g.fillRect(0, h * 0.7, w, h * 0.05);
    dientes(g, 0, w, h * 0.78, h * 0.98, 7);
  } else if (parte === 'brazo') {
    g.fillRect(0, 0, w, h * 0.05);
    dientes(g, 0, w, h * 0.07, h * 0.24, 6, true);
    g.fillRect(0, h * 0.27, w, h * 0.04);
    // Puntas de lanza.
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.2);
      g.beginPath();
      g.moveTo(x - w * 0.08, h * 0.48);
      g.lineTo(x, h * 0.34);
      g.lineTo(x + w * 0.08, h * 0.48);
      g.lineTo(x, h * 0.42);
      g.closePath();
      g.fill();
    }
    // Olas y otra fila de dientes, que termina antes del codo.
    g.lineWidth = h * 0.045;
    g.beginPath();
    for (let x = 0; x <= w; x += 2) g.lineTo(x, h * (0.6 + 0.05 * Math.sin((x / w) * Math.PI * 4)));
    g.stroke();
    g.fillRect(0, h * 0.7, w, h * 0.04);
    dientes(g, 0, w, h * 0.76, h * 0.9, 6);
  } else {
    // Pecho: arcos que salen del hombro (esquina de arriba de afuera) con dientes.
    const cx = parte === 'pechoIzq' ? 0 : w;
    g.lineWidth = w * 0.045;
    for (const r of [0.3, 0.52]) { g.beginPath(); g.arc(cx, 0, w * r, 0, Math.PI); g.stroke(); }
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI;
      const a1 = ((i + 1) / 10) * Math.PI;
      const am = (a0 + a1) / 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a0) * w * 0.34, Math.sin(a0) * w * 0.34);
      g.lineTo(cx + Math.cos(am) * w * 0.48, Math.sin(am) * w * 0.48);
      g.lineTo(cx + Math.cos(a1) * w * 0.34, Math.sin(a1) * w * 0.34);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

function cuerpoProfe(tatus) {
  return ({ cuerpo, brazoI, brazoD, torso, anchoTorso: A, fondoTorso: D, grosorBrazo, matPiel, extras }) => {
    const G = grosorBrazo * 0.9; // los brazos, un poco más finos que el muñeco base (y más pegados)
    const piel = `#${matPiel.color.clone().multiplyScalar(1 / 0.87).getHexString()}`; // como la cara
    const cache = new Map();
    const material = (c, i) => {
      const k = `${i}`;
      if (!cache.has(c)) cache.set(c, {});
      const porTono = cache.get(c);
      if (!porTono[k]) {
        const t = texturaDeCanvas(c);
        const m = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(TONOS[i], TONOS[i], TONOS[i]) });
        extras.push(t, m);
        porTono[k] = m;
      }
      return porTono[k];
    };
    const liso = lienzo(32, 32, piel, (g, w, h) => relieve(g, w, h, 0.7));
    // caras: { frente, atras, ext, int, arriba, abajo } (lienzos); ext/int: lado de afuera/adentro.
    const pieza = (padre, [w, h, d], [x, y, z], caras = {}, lado = 1, rot = null, geo = GEO_CAJA) => {
      const c = (n) => caras[n] || caras.todo || liso;
      const px = lado > 0 ? c('ext') : c('int');
      const nx = lado > 0 ? c('int') : c('ext');
      const lista = [px, nx, c('arriba'), c('abajo'), c('frente'), c('atras')].map(material);
      const m = new THREE.Mesh(geo, lista);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      if (rot) m.rotation.set(...rot);
      padre.add(m);
      return m;
    };

    // ---- Lo de antes (bloques lisos) se esconde ----
    torso.visible = false;
    for (const b of [brazoI, brazoD]) {
      for (const h of b.children) if (h.isMesh) h.visible = false;
      for (const h of b.codo.children) if (h.isMesh) h.visible = false;
    }

    // ---- Torso en V (ancho de hombros, angosto de cintura) ----
    const ahusado = GEO_CAJA.clone();
    const pos = ahusado.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) + 0.5;
      pos.setX(i, pos.getX(i) * (0.72 + 0.28 * t));
      pos.setZ(i, pos.getZ(i) * (0.84 + 0.16 * t));
    }
    extras.push(ahusado);
    const frente = lienzo(192, 128, piel, (g, w, h) => {
      relieve(g, w, h, 0.6, 0.5, 0.6);
      // Abdominales: tres filas de dos a cada lado de la línea del medio.
      for (const fila of [0, 1, 2]) {
        for (const lado of [-1, 1]) {
          const cx = 0.5 + lado * 0.1;
          const cy = 0.5 + fila * 0.15;
          mancha(g, w, h, [cx, cy, 0.045, 0.06], LUZ(0.3), 3);
          trazos(g, w, h, [[[cx - 0.05, cy + 0.07], [cx + 0.05, cy + 0.07]], [[cx + lado * 0.05, cy - 0.07], [cx + lado * 0.05, cy + 0.07]]], SOMBRA(0.45), 2.5, 1.2);
        }
      }
      trazos(g, w, h, [[[0.5, 0.36], [0.5, 1]]], SOMBRA(0.5), 3, 1.5);
      // Serratos (los dedos al costado de las costillas) y oblicuos.
      for (const lado of [-1, 1]) {
        const x0 = 0.5 + lado * 0.24;
        trazos(g, w, h, [0, 1, 2, 3].map((i) => [[x0, 0.3 + i * 0.07], [x0 + lado * 0.1, 0.27 + i * 0.07]]), SOMBRA(0.4), 2, 1);
        trazos(g, w, h, [[[0.5 + lado * 0.2, 0.62], [0.5 + lado * 0.15, 0.85], [0.5 + lado * 0.04, 1]]], SOMBRA(0.45), 3, 1.5);
      }
      // Sombra de los pectorales arriba.
      g.fillStyle = SOMBRA(0.35);
      g.fillRect(0, 0, w, h * 0.3);
      // Las tres estrellas del costado izquierdo de la panza.
      tatuar(g, w, h, tatus.estrellas, [0.7, 0.46, 0.2, 0.32]);
      // La musculosa: una tira finita en el medio (con el logo) y los breteles arriba.
      g.fillStyle = MUSCULOSA;
      g.fillRect(w * 0.455, h * 0.42, w * 0.09, h * 0.58);
      g.fillRect(w * 0.445, 0, w * 0.03, h * 0.45);
      g.fillRect(w * 0.525, 0, w * 0.03, h * 0.45);
      g.fillStyle = '#e9e9e9';
      for (let i = 0; i < 3; i++) g.fillRect(w * (0.49 + i * 0.012), h * (0.52 - i * 0.012), w * 0.007, h * (0.03 + i * 0.012));
    });
    const espalda = lienzo(192, 128, piel, (g, w, h) => {
      relieve(g, w, h, 0.6, 0.5, 0.35);
      // Dorsales (de la axila a la cintura), redondo mayor, romboides, la columna y los lumbares.
      for (const lado of [-1, 1]) {
        trazos(g, w, h, [[[0.5 + lado * 0.44, 0.12], [0.5 + lado * 0.36, 0.45], [0.5 + lado * 0.16, 0.86]]], SOMBRA(0.5), 4, 2);
        mancha(g, w, h, [0.5 + lado * 0.3, 0.35, 0.14, 0.2], LUZ(0.22), 6);
        trazos(g, w, h, [[[0.5 + lado * 0.1, 0.08], [0.5 + lado * 0.27, 0.22], [0.5 + lado * 0.4, 0.2]]], SOMBRA(0.4), 3, 1.5);
        trazos(g, w, h, [[[0.5 + lado * 0.07, 0.2], [0.5 + lado * 0.17, 0.42]]], SOMBRA(0.35), 2.5, 1.5);
        mancha(g, w, h, [0.5 + lado * 0.06, 0.78, 0.04, 0.2], LUZ(0.28), 3);
      }
      trazos(g, w, h, [[[0.5, 0.18], [0.5, 1]]], SOMBRA(0.55), 3.5, 1.5);
      // Espalda de nadador: los breteles se juntan en el medio y bajan a la tira de abajo.
      g.fillStyle = MUSCULOSA;
      for (const lado of [-1, 1]) {
        g.beginPath();
        g.moveTo(w * (0.5 + lado * 0.2), 0);
        g.lineTo(w * (0.5 + lado * 0.15), 0);
        g.lineTo(w * (0.5 + lado * 0.02), h * 0.42);
        g.lineTo(w * (0.5 + lado * 0.07), h * 0.42);
        g.closePath();
        g.fill();
      }
      g.fillRect(w * 0.45, h * 0.4, w * 0.1, h * 0.2);
      g.fillRect(w * 0.4, h * 0.58, w * 0.2, h * 0.42);
    });
    const costado = lienzo(64, 128, piel, (g, w, h) => {
      relieve(g, w, h, 0.6);
      trazos(g, w, h, [0, 1, 2, 3].map((i) => [[0.15, 0.3 + i * 0.08], [0.85, 0.24 + i * 0.08]]), SOMBRA(0.35), 2, 1);
    });
    pieza(cuerpo, [A, 2, D], [0, 1, 0], { frente, atras: espalda, ext: costado, int: costado }, 1, null, ahusado);

    // ---- Pectorales: grandes, con la sombra de abajo y las fibras hacia la axila ----
    for (const lado of [-1, 1]) {
      const pec = lienzo(128, 96, piel, (g, w, h) => {
        relieve(g, w, h, 0.9, lado > 0 ? 0.55 : 0.45, 0.4);
        const adentro = lado > 0 ? 0 : 1; // el lado del esternón (en la textura)
        const afuera = 1 - adentro;
        trazos(g, w, h, [0, 1, 2, 3, 4].map((i) => [[adentro + (afuera - adentro) * 0.08, 0.22 + i * 0.14], [afuera - (afuera - adentro) * 0.08, 0.12 + i * 0.06]]), SOMBRA(0.18), 2, 1);
        mancha(g, w, h, [0.5, 1.02, 0.6, 0.2], SOMBRA(0.6), 4);
        mancha(g, w, h, [adentro, 0.5, 0.06, 0.6], SOMBRA(0.4), 3);
        if (lado > 0) tatuar(g, w, h, tatus.pecho, [0.08, 0.16, 0.86, 0.5]);
        else tribal(g, w, h, 'pecho'); // la punta del tribal del hombro derecho
        // Bretel de la musculosa por el borde de adentro.
        g.fillStyle = MUSCULOSA;
        g.fillRect(w * (adentro ? 0.84 : 0.02), 0, w * 0.14, h);
      });
      pieza(cuerpo, [A * 0.46, 0.8, 0.36], [lado * A * 0.235, 1.5, D / 2 + 0.12], { frente: pec }, lado, [-0.06, lado * 0.12, 0]);
    }

    // ---- Trapecios, cuello y dorsales ----
    const trap = lienzo(64, 48, piel, (g, w, h) => relieve(g, w, h, 0.8, 0.5, 0.3));
    for (const lado of [-1, 1]) {
      pieza(cuerpo, [A * 0.32, 0.46, D * 0.72], [lado * A * 0.2, 2.02, -0.08], { todo: trap }, lado, [0, 0, -lado * 0.42]);
      const dorsal = lienzo(48, 128, piel, (g, w, h) => {
        relieve(g, w, h, 0.8, 0.5, 0.3);
        trazos(g, w, h, [[[0.2, 0.1], [0.8, 0.9]], [[0.5, 0.05], [0.9, 0.6]]], SOMBRA(0.3), 2, 1.5);
      });
      pieza(cuerpo, [0.42, 1.2, D * 0.76], [lado * A * 0.46, 1.25, -0.1], { todo: dorsal }, lado, [0, 0, lado * 0.22]);
    }
    pieza(cuerpo, [0.85, 0.36, 0.8], [0, 2.02, -0.02], { todo: liso });

    // ---- Brazos ----
    // Del lado derecho (brazoI, en -x): el tribal del hombro y el brazo. Del izquierdo (brazoD):
    // la manga del antebrazo. Reloj en la muñeca derecha y la pulsera negra en la izquierda.
    for (const [b, lado] of [[brazoI, -1], [brazoD, 1]]) {
      const conTribal = lado < 0;
      b.position.x -= lado * 0.08; // pegado al torso
      const manga = lado > 0 ? tatus.antebrazo : null;
      const deltoide = (cara) => lienzo(96, 96, piel, (g, w, h) => {
        relieve(g, w, h, 1, 0.5, 0.35);
        // Las tres cabezas del hombro: fibras en abanico que bajan a una punta.
        trazos(g, w, h, [0.2, 0.35, 0.5, 0.65, 0.8].map((x) => [[x, 0.05], [0.5 + (x - 0.5) * 0.4, 0.95]]), SOMBRA(0.18), 2, 1);
        if (cara === 'ext') trazos(g, w, h, [[[0.3, 0.1], [0.42, 0.9]], [[0.7, 0.1], [0.58, 0.9]]], SOMBRA(0.35), 2.5, 1.5);
        mancha(g, w, h, [0.5, 1.05, 0.5, 0.15], SOMBRA(0.5), 3);
        if (conTribal && cara !== 'int' && cara !== 'arriba') tribal(g, w, h, 'hombro');
      });
      const brazo = (cara) => lienzo(96, 96, piel, (g, w, h) => {
        relieve(g, w, h, 0.9);
        if (cara === 'atras') trazos(g, w, h, [[[0.25, 0.2], [0.5, 0.75], [0.75, 0.2]]], SOMBRA(0.5), 3, 1.5); // la herradura del tríceps
        if (cara === 'frente') trazos(g, w, h, [[[0.62, 0.1], [0.55, 0.45], [0.6, 0.9]]], 'rgba(70,90,120,0.35)', 2.5, 0.8); // vena
        if (conTribal && cara !== 'int' && cara !== 'arriba') tribal(g, w, h, 'brazo');
      });
      const caras = (f) => ({ frente: f('frente'), atras: f('atras'), ext: f('ext'), int: f('int'), arriba: f('arriba') });
      pieza(b, [G * 1.18, 0.8, G * 1.15], [lado * 0.06, -0.22, 0], caras(deltoide), lado);
      pieza(b, [G * 0.9, 0.86, G * 0.9], [0, -0.62, 0], caras(brazo), lado);
      // Bíceps (con el pico) y tríceps (cabeza larga atrás y la lateral de afuera).
      const biceps = lienzo(64, 64, piel, (g, w, h) => {
        relieve(g, w, h, 1.1, 0.5, 0.35);
        trazos(g, w, h, [[[0.55, 0.05], [0.5, 0.5], [0.58, 0.95]]], 'rgba(70,90,120,0.4)', 2.5, 0.8);
      });
      pieza(b, [G * 0.7, 0.6, 0.36], [0, -0.64, G * 0.45 + 0.12], { todo: biceps, frente: biceps }, lado);
      pieza(b, [G * 0.48, 0.34, 0.2], [0, -0.6, G * 0.45 + 0.34], { todo: biceps }, lado);
      const triceps = lienzo(64, 64, piel, (g, w, h) => {
        relieve(g, w, h, 1.1, 0.5, 0.3);
        trazos(g, w, h, [[[0.2, 0.3], [0.5, 0.85], [0.8, 0.3]]], SOMBRA(0.45), 2.5, 1.2);
      });
      pieza(b, [G * 0.76, 0.64, 0.3], [0, -0.52, -(G * 0.45 + 0.1)], { todo: triceps }, lado);
      pieza(b, [0.26, 0.56, G * 0.62], [lado * (G * 0.45 + 0.08), -0.56, -0.14], { todo: triceps }, lado);
      // Antebrazo: ancho arriba (con el braquiorradial) y más fino en la muñeca; abajo la mano.
      const antebrazo = (parte) => (cara) => lienzo(96, 96, piel, (g, w, h) => {
        relieve(g, w, h, 0.85);
        if (cara === 'frente') trazos(g, w, h, [[[0.35, 0], [0.45, 0.5], [0.4, 1]]], 'rgba(70,90,120,0.35)', 2, 0.8);
        trazos(g, w, h, [[[0.25, 0], [0.35, 1]], [[0.72, 0], [0.62, 1]]], SOMBRA(0.2), 2, 1.2);
        tatuar(g, w, h, manga, [0, 0, 1, 1], parte ? [0, 0.55, 1, 1] : [0, 0, 1, 0.55], cara === 'int');
      });
      pieza(b.codo, [G * 0.96, 0.5, G * 0.88], [0, -0.25, 0], caras(antebrazo(0)), lado);
      pieza(b.codo, [0.32, 0.46, 0.36], [lado * G * 0.32, -0.24, G * 0.34], { todo: liso }, lado);
      pieza(b.codo, [G * 0.74, 0.36, G * 0.68], [0, -0.66, 0], caras(antebrazo(1)), lado);
      const mano = new THREE.Mesh(GEO_CAJA, matPiel);
      mano.scale.set(G * 0.62, 0.3, G * 0.55);
      mano.position.y = -0.98;
      b.codo.add(mano);
      const reloj = new THREE.Mesh(GEO_CAJA, mat('#121315'));
      reloj.scale.set(G * 0.78, lado < 0 ? 0.16 : 0.07, G * 0.72);
      reloj.position.y = -0.84;
      b.codo.add(reloj);
      if (lado < 0) {
        const pantalla = new THREE.Mesh(GEO_CAJA, mat('#c9ccd0'));
        pantalla.scale.set(0.05, 0.13, 0.28);
        pantalla.position.set(-G * 0.39 - 0.02, -0.84, 0);
        b.codo.add(pantalla);
      }
    }
  };
}

// Algo que se pone en una máquina con posar() (el profe): el muñeco va adentro de un contenedor.
function enContenedor(escena, modelo) {
  const contenedor = new THREE.Group();
  contenedor.add(modelo.grupo);
  escena.add(contenedor);
  return { modelo, contenedor, pos: new THREE.Vector3(), vel: new THREE.Vector3(), angulo: 0, sombra: new THREE.Object3D() };
}

// Pasillos del gym por donde camina el profe (así no atraviesa las máquinas): uno a lo largo del
// fondo, delante de las torres, y otro que baja hasta el mostrador.
const PASILLO_Z = G.z0 + 8.5;
const PASILLO_X = G.x0 + 27;
const pasilloMasCerca = (x, z) => {
  const a = [THREE.MathUtils.clamp(x, G.x0 + 8, G.x1 - 6), PASILLO_Z];
  const b = [PASILLO_X, THREE.MathUtils.clamp(z, PASILLO_Z, G.z1 - 12)];
  return Math.hypot(a[0] - x, a[1] - z) < Math.hypot(b[0] - x, b[1] - z) ? a : b;
};
function camino(desde, hasta) {
  const a = pasilloMasCerca(...desde);
  const b = pasilloMasCerca(...hasta);
  const lista = [a];
  // Si cambian de pasillo, pasa por la esquina.
  if (a[1] === PASILLO_Z && b[0] === PASILLO_X && b[1] !== PASILLO_Z) lista.push([PASILLO_X, PASILLO_Z]);
  else if (a[0] === PASILLO_X && a[1] !== PASILLO_Z && b[1] === PASILLO_Z) lista.push([PASILLO_X, PASILLO_Z]);
  lista.push(b, hasta);
  return lista;
}
const ESPEJO = { x: G.x0 + 6, z: G.z0 + 25 }; // donde se para a mirarse (y sacar bíceps)

class Profe {
  constructor(gym) {
    this.gym = gym;
    this.cosa = null; // lo de enContenedor
    this.accion = null; // { tipo: 'maquina' | 'espejo' | 'corregir', ... }
    this.ruta = [];
    this.proxima = 25; // segundos hasta que pueda venir a corregirte
    this.estacion = null;
  }

  async crear(escena) {
    const tatus = Object.fromEntries(await Promise.all(TATUAJES.map(async (t) => [t, await cargarImagen(`assets/ropa/profe_tatu_${t}.png`)])));
    const [cabeza, ropa] = await Promise.all([cargarCabeza(PROFE), vestido(ROPA_PROFE)]);
    const m = crearPersonaje({ ...PROFE, detallar: cuerpoProfe(tatus) }, cabeza, ropa);
    const nombre = crearEtiqueta([{ texto: PROFE.nombre, tam: 56, color: '#ffd54f' }], 6);
    nombre.sprite.position.y = 6.9;
    m.grupo.add(nombre.sprite);
    this.globo = crearEtiqueta([{ texto: ' ', tam: 50, color: '#ffffff' }], 8);
    this.globo.sprite.position.y = 8.5;
    this.globo.sprite.visible = false;
    m.grupo.add(this.globo.sprite);
    this.cosa = enContenedor(escena, m);
    this.ponerEn(PASILLO_X, G.z1 - 14);
    this.siguiente();
  }

  ponerEn(x, z) {
    this.cosa.pos.set(x, F, z);
    this.cosa.contenedor.position.set(x, F, z);
  }

  hablar(texto, segundos = 5) {
    this.globo.actualizar([{ texto, tam: 50, color: '#ffffff' }]);
    this.globo.sprite.visible = true;
    this.tiempoGlobo = segundos;
    this.gym.ui.toast(`${PROFE.nombre}: "${texto}"`, 'info');
  }

  // Elige qué hacer: una máquina libre (casi siempre) o mirarse al espejo.
  siguiente() {
    const usada = this.gym.entrenando?.id;
    const libres = Object.keys(ENTRADAS).filter((id) => id !== usada && id !== this.ultima);
    if (Math.random() < 0.72 && libres.length) {
      const id = libres[Math.floor(Math.random() * libres.length)];
      this.ultima = id;
      this.ir(ENTRADAS[id], { tipo: 'maquina', id, reps: 8 + Math.floor(Math.random() * 5), rep: 0, t: 0 });
    } else {
      this.ir([ESPEJO.x, ESPEJO.z], { tipo: 'espejo', t: 0, dur: 7 + Math.random() * 6 });
    }
  }

  ir(destino, accion) {
    this.soltar();
    const { brazoI, brazoD } = this.cosa.modelo.partes;
    for (const b of [brazoI, brazoD]) { b.rotation.set(0, 0, 0); b.codo.rotation.set(0, 0, 0); }
    const p = this.cosa.pos;
    this.ruta = camino([p.x, p.z], destino);
    this.accion = { ...accion, enCamino: true };
  }

  // Deja la máquina en la que estaba (y la deja como estaba).
  soltar() {
    const id = this.estacion;
    if (!id) return;
    this.estacion = null;
    const g = this.gym;
    for (const a of this.mancuernas || []) a.parent?.remove(a);
    this.mancuernas = null;
    soltarPose(this.cosa.modelo);
    if (id === 'banca') g.barraBanca.position.copy(g.reposoBanca);
    if (id === 'jalon') { g.barraJalon.position.copy(g.reposoJalon); g.ponerCable(); g.pilaJalon.mover(0, 0); }
    if (id === 'pecdec') { g.reposarPec(); g.pilaPec.mover(0, 0); }
    const [x, z] = ENTRADAS[id];
    this.ponerEn(x, z);
  }

  // El jugador quiere la máquina que está usando: se la deja.
  liberar(id) {
    if (this.estacion === id || (this.accion?.tipo === 'maquina' && this.accion.id === id)) this.siguiente();
  }

  // Terminó una rep el jugador: a veces viene a corregirle la técnica.
  alRep(id, jugador) {
    if (this.proxima > 0 || this.accion?.tipo === 'corregir' || Math.random() > 0.3) return;
    const [x, z] = ENTRADAS[id];
    // Se para entre la máquina y el medio del gym, mirándote.
    const dx = PASILLO_X - x;
    const dz = (G.z0 + G.z1) / 2 - z;
    const d = Math.hypot(dx, dz) || 1;
    const lista = CORRECCIONES[id];
    this.ir([x + (dx / d) * 3.2, z + (dz / d) * 3.2], { tipo: 'corregir', id, t: 0, texto: lista[Math.floor(Math.random() * lista.length)], jugador });
    this.proxima = 80 + Math.random() * 80;
  }

  actualizar(dt, jugador) {
    const c = this.cosa;
    if (!c) return;
    const m = c.modelo;
    if (this.proxima > 0) this.proxima -= dt;
    if (this.tiempoGlobo > 0) {
      this.tiempoGlobo -= dt;
      if (this.tiempoGlobo <= 0) this.globo.sprite.visible = false;
    }
    const a = this.accion;
    if (a.enCamino) {
      // Caminando de punto en punto.
      const [px, pz] = this.ruta[0];
      const dx = px - c.pos.x;
      const dz = pz - c.pos.z;
      const largo = Math.hypot(dx, dz);
      const paso = 6.5 * dt;
      if (largo <= paso) {
        c.pos.x = px;
        c.pos.z = pz;
        this.ruta.shift();
        if (!this.ruta.length) this.llegar();
      } else {
        c.pos.x += (dx / largo) * paso;
        c.pos.z += (dz / largo) * paso;
        this.mirarA(Math.atan2(dx, dz), dt);
      }
      c.contenedor.position.copy(c.pos);
      m.animar(dt, 6.5, true);
      return;
    }
    if (a.tipo === 'maquina') {
      if (this.gym.entrenando?.id === a.id) { this.siguiente(); return; }
      a.t += dt / 1.9;
      if (a.t >= 1) {
        a.t = 0;
        a.rep++;
        if (a.rep >= a.reps) { this.siguiente(); return; }
      }
      this.gym.posar(a.id, c, curva(a.t), 70);
    } else if (a.tipo === 'espejo') {
      // Doble bíceps mirándose al espejo (la pared de la izquierda).
      a.t += dt;
      this.mirarA(-Math.PI / 2, dt);
      m.animar(dt, 0, true);
      const apriete = 0.15 * Math.sin(a.t * 2.5);
      for (const [b, sd] of [[m.partes.brazoD, 1], [m.partes.brazoI, -1]]) {
        const S = b.position;
        const E = new THREE.Vector3(S.x + sd * LARGO_BRAZO, S.y + 0.1, S.z + 0.2);
        const H = E.clone().add(new THREE.Vector3(-sd * (0.25 + apriete), LARGO_ANTEBRAZO * 0.95, 0.1));
        brazoPorPuntos(b, E, H, new THREE.Vector3(0, 1, 0));
      }
      if (a.t > a.dur) {
        for (const b of [m.partes.brazoD, m.partes.brazoI]) { b.rotation.set(0, 0, 0); b.codo.rotation.set(0, 0, 0); }
        this.siguiente();
      }
    } else if (a.tipo === 'corregir') {
      a.t += dt;
      const j = a.jugador.pos;
      this.mirarA(Math.atan2(j.x - c.pos.x, j.z - c.pos.z), dt);
      m.animar(dt, 0, true);
      // Te señala mientras te explica.
      if (a.t < 4) {
        m.grupo.updateMatrixWorld(true);
        brazoA(m.partes.brazoD, m.partes.cuerpo.worldToLocal(new THREE.Vector3(j.x, F + 3.6, j.z)), new THREE.Vector3(1, -1, 0));
      } else {
        m.partes.brazoD.rotation.set(0, 0, 0);
        m.partes.brazoD.codo.rotation.set(0, 0, 0);
      }
      if (a.t > 6) this.siguiente();
    }
  }

  mirarA(objetivo, dt) {
    const c = this.cosa;
    let d = objetivo - c.contenedor.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    c.contenedor.rotation.y += d * Math.min(1, dt * 6);
    c.angulo = c.contenedor.rotation.y;
  }

  llegar() {
    const a = this.accion;
    a.enCamino = false;
    if (a.tipo === 'maquina') {
      if (this.gym.entrenando?.id === a.id) { this.siguiente(); return; }
      this.estacion = a.id;
      if (a.id === 'curl') {
        // Mancuernas de 20 en cada mano.
        this.mancuernas = [this.cosa.modelo.partes.brazoI, this.cosa.modelo.partes.brazoD].map((b) => {
          const mc = crearMancuerna(20);
          mc.position.set(0, -LARGO_ANTEBRAZO, 0);
          b.codo.add(mc);
          return mc;
        });
      }
    } else if (a.tipo === 'corregir') {
      // Si ya dejaste de entrenar, no te dice nada.
      if (this.gym.entrenando?.id === a.id) this.hablar(a.texto, 6);
      else this.siguiente();
    }
  }
}

// El Shileno en el segundo pec dec: sentado, con el celu en la mano y la cabeza gacha mirándolo.
function sentarShileno(cosa) {
  const m = cosa.modelo;
  const { cuerpo, cabeza, brazoI, brazoD, fondoTorso } = m.partes;
  const x = EST.pecdec2.x;
  const z = ZT + 1.5 + fondoTorso / 2 + 0.05;
  cosa.contenedor.position.set(x, F + 1.5 + 0.45 - 2, z);
  piernas(m, -1.5, 1.5, 0.12);
  cabeza.rotation.x = 0.4;
  const zc = fondoTorso / 2 + 0.68;
  // Con una mano levanta el celu a la altura de la cara; la otra, apoyada en la pierna.
  brazoA(brazoD, new THREE.Vector3(0.36, 1.86, zc + 0.45), new THREE.Vector3(0.7, -1, -0.3));
  brazoA(brazoI, new THREE.Vector3(-0.75, 0.3, 1.25), new THREE.Vector3(-1, 0, -0.4));
  // El celu: funda azul (como el de la foto) y la pantalla prendida mirando a la cara.
  const pantalla = document.createElement('canvas');
  pantalla.width = 48;
  pantalla.height = 96;
  const g = pantalla.getContext('2d');
  g.fillStyle = '#f4f6f8';
  g.fillRect(0, 0, 48, 96);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = ['#e1306c', '#3b82f6', '#f59e0b'][i];
    g.fillRect(4, 8 + i * 30, 40, 20);
    g.fillStyle = '#9aa3ad';
    g.fillRect(4, 30 + i * 30, 26, 3);
  }
  const funda = mat('#24467a');
  const celu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.95, 0.08), [funda, funda, funda, funda, funda, new THREE.MeshBasicMaterial({ map: texturaDeCanvas(pantalla) })]);
  celu.position.set(0.3, 2.22, zc + 0.5);
  celu.rotation.x = 0.3;
  cuerpo.add(celu);
}
