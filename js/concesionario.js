import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { AUTOS } from '../data/autos.js';
import { CONCESIONARIO as CO, AUTOPISTA as AU, GALPON_LUGARES } from './constantes.js';
import { Auto } from './auto.js';
import { crearEtiqueta } from './texturas.js';
import { formato } from './util.js';
import { sfx } from './sfx.js';

// Vecibanda Motors (el concesionario a la salida de la ciudad, como la foto de referencia:
// caja de paneles gris oscuro con la vidriera de punta a punta, el nombre en la franja de
// arriba, cielorraso blanco con tiras de luz, escalones con luces y canteros con plantas) y
// los autos que se compran ahí, que quedan en el Galpón Vecibanda y se pueden manejar.

export const ESCALA_AUTO = 2.47; // 1 m (la misma escala que el Auto Deportivo)
export const AUTOS_POR_ID = Object.fromEntries(AUTOS.map((a) => [a.id, a]));

// ---------- Modelos ----------
// Se cargan una sola vez (y recién cuando hacen falta); cada uso es un clon que comparte la
// geometría y los materiales. Los materiales pasan a Lambert (más livianos que los PBR del
// archivo) y la pintura a Phong, para que brille como un auto.
const cargador = new GLTFLoader();
cargador.setMeshoptDecoder(MeshoptDecoder);
const plantillas = new Map();

function aliviar(m) {
  const brilla = /paint|body|carpaint|chrome|glass/i.test(m.name) || (m.metalness > 0.5 && !m.map);
  const opts = {
    color: m.color, map: m.map, transparent: m.transparent, opacity: m.opacity,
    side: m.side, alphaTest: m.alphaTest, depthWrite: !m.transparent,
  };
  const nuevo = brilla ? new THREE.MeshPhongMaterial({ ...opts, specular: '#ffffff', shininess: 70 }) : new THREE.MeshLambertMaterial(opts);
  if (m.emissive && m.emissive.getHex()) nuevo.emissive = m.emissive;
  return nuevo;
}

export function cargarAuto(def) {
  if (!plantillas.has(def.id)) {
    plantillas.set(def.id, cargador.loadAsync(`assets/autos/${def.archivo}`).then((gltf) => {
      const modelo = gltf.scene;
      const cambiados = new Map();
      modelo.traverse((o) => {
        if (!o.isMesh) return;
        // El script que los achica les saca las normales a las piezas sin textura: se
        // recalculan respetando los bordes duros.
        if (!o.geometry.attributes.normal) o.geometry = toCreasedNormals(o.geometry, 0.6);
        const lista = Array.isArray(o.material) ? o.material : [o.material];
        const nuevos = lista.map((m) => {
          if (!cambiados.has(m)) cambiados.set(m, aliviar(m));
          return cambiados.get(m);
        });
        o.material = Array.isArray(o.material) ? nuevos : nuevos[0];
      });
      // A la escala del juego: el largo de verdad, centrado, apoyado en el piso, trompa a +z.
      modelo.updateMatrixWorld(true);
      const caja = new THREE.Box3().setFromObject(modelo, true);
      const tam = caja.getSize(new THREE.Vector3());
      const k = (def.largo * ESCALA_AUTO) / tam.z;
      const g = new THREE.Group();
      modelo.scale.multiplyScalar(k);
      const centro = caja.getCenter(new THREE.Vector3()).multiplyScalar(k);
      modelo.position.set(-centro.x, -caja.min.y * k, -centro.z);
      g.add(modelo);
      g.userData.medio = [(tam.x * k) / 2, (tam.z * k) / 2];
      return g;
    }));
  }
  return plantillas.get(def.id).then((g) => {
    const copia = g.clone();
    copia.userData.medio = g.userData.medio;
    return copia;
  });
}

// ---------- Auto comprado (manejable) ----------
// Igual que el Auto Deportivo (auto.js), pero con el modelo del concesionario y su potencia.
export class AutoComprado extends Auto {
  constructor(escena, def, x, z, angulo = 0) {
    super(escena, x, z, angulo);
    this.def = def;
    this.potencia = def.potencia || 1;
    // Hasta que carga el modelo, la caja se estima con el largo.
    this.medio = [def.largo * ESCALA_AUTO * 0.23, (def.largo * ESCALA_AUTO) / 2];
    this.colocar();
    this.listo = cargarAuto(def).then((m) => {
      this.grupo.add(m);
      this.medio = m.userData.medio;
      this.colocar();
    }).catch(() => {});
  }

  armar() {} // el modelo llega después (cargarAuto)
}

// Los autos que tenés, estacionados en el galpón (uno por lugar, en el orden en que se compraron).
export class Flota {
  constructor(escena, colisiones, estado) {
    this.escena = escena;
    this.colisiones = colisiones;
    this.estado = estado;
    this.autos = [];
  }

  // Crea los que falten (al cargar la partida o al comprar uno). Sin galpón no hay dónde ponerlos.
  actualizar() {
    if (!this.estado.compras.includes('galpon')) return;
    const tengo = this.estado.autos || [];
    for (let i = this.autos.length; i < tengo.length; i++) {
      const def = AUTOS_POR_ID[tengo[i]];
      if (!def) continue;
      const lugar = GALPON_LUGARES[i % GALPON_LUGARES.length];
      // Si hay más autos que lugares, los que sobran van adelante, cerca de la boca.
      const fila = Math.floor(i / GALPON_LUGARES.length);
      const auto = new AutoComprado(this.escena, def, lugar.x, lugar.z + fila * 14, 0);
      this.colisiones.push(auto.caja);
      this.autos.push(auto);
    }
  }
}

// ---------- Concesionario ----------
const LOCAL = { x: CO.x0, z: CO.z0 }; // las medidas de adentro van desde la esquina de adelante
const ANCHO = CO.x1 - CO.x0;
const FONDO = CO.z1 - CO.z0;
// Lugar de cada auto en el salón (u: de izquierda a derecha, v: hacia el fondo) y hacia dónde
// mira. El más caro, adelante en el medio, sobre la plataforma que gira.
const EXHIBICION = [[12, 27, 0.5], [30, 27, 0], [48, 27, -0.5], [12, 11.5, 0.6], [48, 11.5, -0.6], [30, 12, 0]];
const PUERTA = [17, 24]; // hueco de la vidriera para entrar
const CERCA = 7.5; // a cuánto se puede comprar

export class Concesionario {
  constructor({ escena, colisiones, kit, estado, ui, guardar }) {
    this.escena = escena;
    this.kit = kit;
    this.estado = estado;
    this.ui = ui;
    this.guardar = guardar;
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.armar(colisiones);
    // Los autos, ordenados del más barato al más caro (el último va en la plataforma).
    const corrido = EXHIBICION.length - Math.min(AUTOS.length, EXHIBICION.length);
    this.exhibidos = [...AUTOS].sort((a, b) => a.precio - b.precio).slice(-EXHIBICION.length).map((def, i) => {
      const [u, v, a] = EXHIBICION[i + corrido];
      const x = LOCAL.x + u;
      const z = LOCAL.z + v;
      const soporte = new THREE.Group();
      soporte.position.set(x, 0.3, z);
      soporte.rotation.y = Math.PI + a; // mirando a la vidriera
      this.grupo.add(soporte);
      const etiqueta = crearEtiqueta(this.lineas(def), 7);
      etiqueta.sprite.position.set(x, 8.2, z);
      this.grupo.add(etiqueta.sprite);
      // Caja de choque (para no atravesarlo caminando).
      const m = (def.largo * ESCALA_AUTO) / 2;
      const caja = new THREE.Box3(new THREE.Vector3(x - m * 0.75, 0, z - m * 0.75), new THREE.Vector3(x + m * 0.75, 3.4, z + m * 0.75));
      caja.camara = false;
      colisiones.push(caja);
      return { def, x, z, soporte, etiqueta, cargado: false, gira: i + corrido === EXHIBICION.length - 1 };
    });
    this.plataforma = this.exhibidos.find((e) => e.gira);
  }

  lineas(def) {
    const tuyo = (this.estado.autos || []).includes(def.id);
    return [
      { texto: def.nombre, tam: 52, color: '#ffffff' },
      tuyo ? { texto: '¡Es tuyo! (en el galpón)', tam: 44, color: '#8dff6a' } : { texto: formato(def.precio), tam: 58, color: '#8dff6a', moneda: true },
      { texto: `De verdad: ${def.real}`, tam: 34, color: '#cfd8dc' },
    ];
  }

  // Coordenadas de adentro (u desde la izquierda de la vidriera, v hacia el fondo) al mundo.
  armar(colisiones) {
    const k = this.kit;
    const g = new THREE.Group();
    const X = (u) => LOCAL.x + u;
    const Z = (v) => LOCAL.z + v;
    const A = CO.alto;
    const caja = (u0, y0, v0, u1, y1, v1, c, solido = true) => {
      const m = k.cajaDe(X(u0), y0, Z(v0), X(u1), y1, Z(v1), c);
      g.add(m);
      if (solido) colisiones.push(new THREE.Box3().setFromObject(m));
      return m;
    };
    const panel = k.tex('panel', '#3d4045', 3);
    const oscuro = '#26282c';
    const blanco = '#f3f3f1';
    const negro = '#16171a';
    const luz = k.brillo('#fbfdff');
    // Explanada de adoquines desde la autopista y el piso del salón (un poco más alto).
    const explanada = AU.z + AU.medioAncho + 1.6;
    caja(-8, 0, explanada - LOCAL.z, ANCHO + 8, 0.06, 0, k.tex('baldosa', '#8e9196', 3), false);
    caja(0, 0, 0, ANCHO, 0.3, FONDO, k.tex('baldosa', '#e9e9e7', 4), false);
    // Escalones con luz abajo, a todo lo ancho de la vidriera.
    caja(4, 0, -2.2, ANCHO - 4, 0.1, 0, '#d9d9d6', false);
    caja(4, 0.1, -1.1, ANCHO - 4, 0.2, 0, '#e2e2df', false);
    caja(4, 0.02, -2.25, ANCHO - 4, 0.08, -2.15, luz, false);
    caja(4, 0.12, -1.15, ANCHO - 4, 0.18, -1.05, luz, false);
    // Fondo y costado izquierdo: paneles oscuros. Costado derecho: vidrio, como la esquina de la foto.
    caja(0, 0, FONDO - 0.5, ANCHO, A, FONDO, panel);
    caja(0, 0, 0, 0.6, A, FONDO, panel);
    caja(ANCHO - 0.3, 0, 0, ANCHO, 0.6, FONDO, negro);
    caja(ANCHO - 0.25, 0.6, 0.5, ANCHO - 0.05, 9.5, FONDO - 0.5, k.vidrio);
    for (let v = 0; v <= FONDO; v += FONDO / 4) caja(ANCHO - 0.4, 0, v - 0.15, ANCHO, 9.5, v + 0.15, negro, false);
    // Vidriera de adelante con parantes negros y el hueco de la puerta.
    caja(0.6, 0.3, -0.1, PUERTA[0], 9.5, 0.1, k.vidrio);
    caja(PUERTA[1], 0.3, -0.1, ANCHO - 0.3, 9.5, 0.1, k.vidrio);
    for (let u = 0.6; u <= ANCHO; u += 6.5) caja(u - 0.15, 0.3, -0.2, u + 0.15, 9.5, 0.2, negro, false);
    for (const u of PUERTA) caja(u - 0.2, 0.3, -0.25, u + 0.2, 9.5, 0.25, negro);
    caja(0.6, 0.3, -0.2, ANCHO, 0.55, 0.2, negro, false);
    // Franja de arriba (paneles gris oscuro con juntas) y techo.
    caja(-1, 9.5, -1.2, ANCHO + 1, A, 0.4, panel);
    caja(-1, A - 0.4, -1.2, ANCHO + 1, A, FONDO + 0.6, oscuro, false);
    // Portal curvo de la izquierda (en la foto, con el logo): una pared inclinada de paneles.
    const portal = k.cajaDe(-1.6, 0, -0.6, 1.6, A + 0.6, 0.6, panel);
    portal.position.set(X(-1.2), (A + 0.6) / 2, Z(1));
    portal.rotation.z = 0.18;
    g.add(k.noSolido(portal));
    colisiones.push(new THREE.Box3(new THREE.Vector3(X(-2.6), 0, Z(0)), new THREE.Vector3(X(0.6), A, Z(2))));
    // Cielorraso blanco con tiras de luz en diagonal (como en la foto).
    caja(0.6, A - 0.6, 0.4, ANCHO - 0.3, A - 0.4, FONDO - 0.5, blanco, false);
    for (let u = 4; u < ANCHO - 2; u += 5) {
      const tira = k.cajaDe(-0.15, -0.06, -FONDO * 0.42, 0.15, 0, FONDO * 0.42, luz);
      tira.position.set(X(u), A - 0.62, Z(FONDO / 2));
      tira.rotation.y = 0.35;
      g.add(k.noSolido(tira));
    }
    // Nombre en la franja y el logo grande en el portal.
    const cartel = k.cartel('VECIBANDA MOTORS', 17, 2.2, '#ffffff', '#3d4045');
    cartel.position.set(X(ANCHO - 12), 11.3, Z(-1.25));
    cartel.rotation.y = Math.PI;
    g.add(cartel);
    const logo = k.cartel('VM', 3.4, 2, '#ffffff', '#3d4045');
    logo.position.set(X(3.6), 6.5, Z(-0.66));
    logo.rotation.y = Math.PI;
    g.add(logo);
    // Plataforma que gira (el auto más caro) y alfombra de la entrada.
    const [pu, pv] = EXHIBICION[EXHIBICION.length - 1];
    this.disco = k.cilindro(7.4, 7.4, 0.3, '#cfd2d6', X(pu), 0.45, Z(pv), 40);
    g.add(this.disco);
    g.add(k.cilindro(7.6, 7.6, 0.06, luz, X(pu), 0.32, Z(pv), 40));
    caja(PUERTA[0], 0.3, 0.2, PUERTA[1], 0.34, 4, '#2b2d31', false);
    // Mostrador del vendedor, al fondo.
    caja(ANCHO / 2 - 5, 0.3, FONDO - 6, ANCHO / 2 + 5, 3.4, FONDO - 4.2, blanco);
    caja(ANCHO / 2 - 5.2, 3.4, FONDO - 6.2, ANCHO / 2 + 5.2, 3.6, FONDO - 4, negro, false);
    // Canteros con plantas adelante y una palmera a la izquierda (como en la foto).
    for (const [u0, u1] of [[-7, 3], [ANCHO - 3, ANCHO + 7]]) {
      caja(u0, 0, -6.5, u1, 0.9, -3, '#5d6168');
      for (let u = u0 + 1.2; u < u1 - 0.5; u += 2.2) g.add(k.noSolido(k.esfera(1.1, '#2e7d32', X(u), 1.5, Z(-4.75))));
    }
    g.add(k.cilindro(0.45, 0.6, 9, '#8d6e4f', X(-5), 4.5, Z(-8)));
    colisiones.push(new THREE.Box3(new THREE.Vector3(X(-5.6), 0, Z(-8.6)), new THREE.Vector3(X(-4.4), 9, Z(-7.4))));
    for (let i = 0; i < 7; i++) {
      const hoja = k.cajaDe(-0.35, -0.08, 0, 0.35, 0.08, 4.2, '#388e3c');
      hoja.position.set(X(-5), 9, Z(-8));
      hoja.rotation.set(-0.5, (i / 7) * Math.PI * 2, 0, 'YXZ');
      g.add(k.noSolido(hoja));
    }
    this.grupo.add(g);
  }

  cerca(jugador) {
    if (jugador.pos.y > 3) return null;
    let mejor = null;
    let dMejor = CERCA;
    for (const e of this.exhibidos) {
      const d = Math.hypot(jugador.pos.x - e.x, jugador.pos.z - e.z);
      if (d < dMejor) { dMejor = d; mejor = e; }
    }
    return mejor;
  }

  accion(jugador) {
    const e = this.cerca(jugador);
    if (!e || (this.estado.autos || []).includes(e.def.id)) return '';
    return `Comprar ${e.def.nombre} (E)`;
  }

  hacer(jugador) {
    const e = this.cerca(jugador);
    if (!e || (this.estado.autos || []).includes(e.def.id)) return;
    if (!this.estado.compras.includes('galpon')) {
      sfx.error();
      this.ui.toast('Primero comprá el Galpón Vecibanda (al lado de la mansión): ahí se guardan los autos', 'error');
      return;
    }
    if (this.estado.plata < e.def.precio) {
      sfx.error();
      this.ui.toast(`Te falta plata: el ${e.def.nombre} sale ${formato(e.def.precio)}`, 'error');
      return;
    }
    this.estado.plata -= e.def.precio;
    this.estado.autos = [...(this.estado.autos || []), e.def.id];
    e.etiqueta.actualizar(this.lineas(e.def));
    sfx.comprar();
    this.ui.toast(`¡${e.def.nombre}! Te espera en el Galpón Vecibanda`, 'ok');
    this.alComprar?.(e.def);
    this.guardar();
  }

  actualizar(dt, jugador) {
    const d = Math.hypot(jugador.pos.x - (CO.x0 + CO.x1) / 2, jugador.pos.z - (CO.z0 + CO.z1) / 2);
    // Solo se dibuja de cerca (está a 20 km de la mansión); los autos se cargan al acercarse.
    this.grupo.visible = d < 900;
    if (d < 600) {
      for (const e of this.exhibidos) {
        if (e.cargado) continue;
        e.cargado = true;
        cargarAuto(e.def).then((m) => e.soporte.add(m)).catch(() => {});
      }
    }
    if (this.grupo.visible) {
      this.disco.rotation.y += dt * 0.3;
      if (this.plataforma) this.plataforma.soporte.rotation.y += dt * 0.3;
    }
  }
}
