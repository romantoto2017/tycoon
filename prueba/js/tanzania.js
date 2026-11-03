import * as THREE from 'three';
import { COSTA as CO } from './constantes.js';
import { Constructor, dibujarCara } from './ciudad.js';
import { crearPersonaje } from './personaje.js';
import { crearEtiqueta, liberarAlSubir, cargarCabeza } from './texturas.js';
import { GEO_ARO, GEO_BOTON, GEO_HAZ, MAT_VERDE, MAT_ROJO, MAT_HAZ } from './tycoon.js';
import { AutoComprado } from './auto.js';
import { ITEMS_TZ, ingresoTz, precioBolsa, CICLO, PLANTAS_POR_MESA } from '../data/tanzania.js';
import { aleatorio, formato, mat } from './util.js';
import { sfx } from './sfx.js';

// El tycoon de la tanzania (la planta inventada del juego), en la cima del cerro de la costa.
// Como el de la mansión: botones en el piso con el nombre y el precio (verde si te alcanza), que
// se pisan para comprar. Primero el galpón (como los warehouse de verdad: chapa verde, detrás de un
// muro de ladrillo con pilares y portón corredizo; adentro oscuro, con entrepiso, estanterías,
// lámparas colgantes, macetas bajo luz violeta, mesas de laboratorio, ollas humeando); adentro, la
// cadena plantar → cultivar → cosechar → procesar → vender (data/tanzania.js). Cada botón aparece
// donde va a quedar lo que comprás; se ven los dos siguientes de la lista. Lo comprado va en
// estado.tanzania (aparte de las compras de la mansión), con el depósito y las bolsitas que llevás
// encima (para fumar o vender a Francis y en la Cachimba).
const G = CO.galpon;
const Y = CO.meseta.alto;
const AN = G.ancho / 2;
const FO = G.fondo / 2;
const ALTO = 14;
const PUERTA = 7; // medio ancho del portón (entra la camioneta)
const loc = (x, z) => [G.x + x, Y, G.z + z]; // de coordenadas del galpón al mundo
const MESAS = [-26, -12, 2, 16].flatMap((x) => [[x, -11], [x, 3]]); // las 8 camas de cultivo
const ESTACION = {
  tz_galpon: [-AN - 20, 0],
  tz_cosecha: [32, 18], tz_secadero: [-6, 20], tz_picadora: [8, 20], tz_prensa: [20, 20], tz_laboratorio: [34, -8],
  tz_contacto: [-24, -22], tz_furgoneta: [-26, 17],
  tz_luz1: [-19, -4], tz_luz2: [-5, -4], tz_luz3: [9, -4], tz_luz4: [23, -4],
};
const COBRAR = [-35, -12];
const RESERVA = 50; // bolsitas que el contacto deja en el depósito
const DEPOSITO = [-38, -22];
ITEMS_TZ.forEach((it) => {
  if (it.tipo === 'mesa') ESTACION[it.id] = MESAS[Number(it.id.slice(7) || 1) - 1];
});
// La camioneta de reparto (Chevrolet 2003, herramientas/autos.mjs): se maneja.
export const CAMIONETA = { id: 'camioneta', nombre: 'Camioneta de reparto', archivo: 'chevrolet_camioneta.glb', largo: 5.3, vmax: 175, cero100: 10.5, agarre: 0.85 };
// Los que trabajan adentro (traje amarillo y máscara), que aparecen con el secadero y el laboratorio.
const TRABAJADOR = { id: 'trabajador_tz', nombre: ' ', sinFoto: true, sinCara: true, piel: '#e0ac69', pelo: '#2b2b2b', remera: '#e8c21c', pantalon: '#e8c21c', mangasLargas: true };
const TRABAJAN = { tz_secadero: [-6, 15.5, Math.PI], tz_laboratorio: [31, -3, -Math.PI / 2] };

// La planta de tanzania: tallo, hojas aserradas en abanico (como de cannabis, pero con las
// puntas y los cogollos violeta, del color de la tanzanita). Una sola geometría con colores.
function geoPlanta() {
  const partes = [];
  const color = (g, c) => {
    const col = new THREE.Color(c);
    const n = g.attributes.position.count;
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => col.toArray()[i % 3]), 3));
    return g;
  };
  partes.push(color(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 5).translate(0, 0.8, 0), '#4f7a2e'));
  for (let piso = 0; piso < 3; piso++) {
    const y = 0.55 + piso * 0.42;
    const largo = 0.75 - piso * 0.16;
    for (let h = 0; h < 7; h++) {
      const a = (h / 7) * Math.PI * 2 + piso * 0.4;
      const hoja = new THREE.BufferGeometry();
      // Hoja angosta con dientes: un rombo largo partido en tramos que se abren y cierran.
      const v = [];
      const tramos = 5;
      for (let k = 0; k < tramos; k++) {
        const z0 = (k / tramos) * largo;
        const z1 = ((k + 1) / tramos) * largo;
        const w0 = Math.sin((k / tramos) * Math.PI) * 0.09 + 0.01;
        const w1 = Math.sin(((k + 1) / tramos) * Math.PI) * 0.09 + 0.01;
        v.push(-w0, 0, z0, w0, 0, z0, w1 * 1.4, 0, z1, -w0, 0, z0, w1 * 1.4, 0, z1, -w1 * 1.4, 0, z1);
      }
      hoja.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      hoja.computeVertexNormals();
      hoja.rotateX(-0.35 - piso * 0.12);
      hoja.rotateY(a);
      hoja.translate(0, y, 0);
      partes.push(color(hoja, piso === 2 ? '#3f8a3a' : '#2f7a34'));
    }
    // Cogollo violeta en cada piso.
    partes.push(color(new THREE.DodecahedronGeometry(0.13 - piso * 0.02, 0).translate(0, y + 0.08, 0), '#7b4fc9'));
  }
  partes.push(color(new THREE.DodecahedronGeometry(0.17, 0).scale(1, 1.6, 1).translate(0, 1.72, 0), '#8e5ee0'));
  const pos = [];
  const col = [];
  for (const g of partes) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...ng.attributes.position.array);
    col.push(...(ng.attributes.color?.array || []));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

// Chapa acanalada para las paredes del galpón (canvas de un solo dibujo).
function texChapa() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let x = 0; x < 64; x += 4) {
    g.fillStyle = '#ffffff'; g.fillRect(x, 0, 2, 64);
    g.fillStyle = '#b8bcc0'; g.fillRect(x + 2, 0, 2, 64);
  }
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class Tanzania {
  constructor({ escena, estado, ui, guardar, colisiones }) {
    Object.assign(this, { escena, estado, ui, guardar, colisiones });
    this.grupo = null;
    this.botones = [];
    this.piezas = {};
    this.reloj = 0;
    this.fase = 0; // 0 a 1: cuánto crecieron las plantas de esta tanda
    this.autos = []; // la camioneta (se maneja: main.js la suma a los autos)
    this.humos = [];
    this.alComprar = null;
  }

  get datos() { return (this.estado.tanzania ??= { compras: [], deposito: 0, encima: 0, producido: 0, vendido: 0, entregas: 0 }); }
  // Cuenta lo vendido (en gramos: una bolsita = 1 g) para el contador del galpón.
  anotarVenta(plata) { this.datos.vendido = (this.datos.vendido || 0) + plata / this.bolsa; }
  tiene(id) { return this.datos.compras.includes(id); }
  get ingresoPorSegundo() { return ingresoTz(this.datos.compras); }
  get bolsa() { return precioBolsa(this.datos.compras); }
  dentro(p) { return !!this.piezas.tz_galpon && Math.abs(p.x - G.x) < AN && Math.abs(p.z - G.z) < FO && p.y > Y - 2 && p.y < Y + ALTO; }

  armar() {
    if (this.grupo) return;
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    this.predio();
    // Las plantas (todas en una malla instanciada).
    this.plantas = new THREE.InstancedMesh(geoPlanta(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), MESAS.length * PLANTAS_POR_MESA);
    this.plantas.count = 0;
    this.plantas.frustumCulled = false; // las instancias están en el galpón, no en el origen
    this.grupo.add(this.plantas);
    this.dummy = new THREE.Object3D();
    for (const id of this.datos.compras) this.construir(id);
    this.refrescar();
  }

  // El predio: tierra apisonada, el muro de ladrillo con pilares (con el portón corredizo abierto
  // hacia el camino), el buzón, el cartel de "se vende", los contenedores y el poste de luz.
  predio() {
    const c = new Constructor();
    const [x0, x1, z0, z1] = [G.x - AN - 16, G.x + AN + 14, G.z - FO - 14, G.z + FO + 14];
    c.piso(x0, z0, x1, z1, Y + 0.25, '#77705f'); // arriba del pasto del cerro
    const ladrillo = '#8e4a33';
    const tramo = (a, b, z, eje) => {
      if (eje === 'x') { c.caja(a, Y, z - 0.4, b, Y + 3.2, z + 0.4, ladrillo); this.solido(a, Y, z - 0.4, b, Y + 3.2, z + 0.4); }
      else { c.caja(z - 0.4, Y, a, z + 0.4, Y + 3.2, b, ladrillo); this.solido(z - 0.4, Y, a, z + 0.4, Y + 3.2, b); }
    };
    tramo(x0, x1, z0, 'x');
    tramo(x0, x1, z1, 'x');
    tramo(z0, z1, x1, 'z');
    tramo(z0, G.z - 10, x0, 'z');
    tramo(G.z + 10, z1, x0, 'z');
    const pilar = (x, z) => {
      c.caja(x - 0.75, Y, z - 0.75, x + 0.75, Y + 3.8, z + 0.75, '#9a5038');
      c.caja(x - 0.95, Y + 3.8, z - 0.95, x + 0.95, Y + 4.2, z + 0.95, '#d8cfc0');
    };
    for (let x = x0; x <= x1; x += 9) { pilar(x, z0); pilar(x, z1); }
    for (let z = z0; z <= z1; z += 9) { pilar(x1, z); if (Math.abs(z - G.z) > 10) pilar(x0, z); }
    pilar(x0, G.z - 10.5); pilar(x0, G.z + 10.5);
    // El portón corredizo (abierto, corrido contra el muro de adentro).
    c.caja(x0 + 1, Y + 0.2, G.z - 10 - 18, x0 + 1.3, Y + 3.6, G.z - 10, '#2d3134');
    for (let z = G.z - 27; z < G.z - 10; z += 1.2) c.caja(x0 + 0.95, Y + 0.3, z, x0 + 1.35, Y + 3.5, z + 0.15, '#1b1e20');
    // Buzón azul, cartel de "SE VENDE" en el muro, contenedores verdes y el poste de luz.
    c.caja(x0 - 3, Y, G.z - 13.5, x0 - 2.4, Y + 1.8, G.z - 12.9, '#555555');
    c.caja(x0 - 3.4, Y + 1.8, G.z - 14, x0 - 2, Y + 3.1, G.z - 12.4, '#1e4fa8');
    this.cartel(x0 - 0.45, G.z + 15, 'SE VENDE', 'consultar en el lugar');
    for (const dz of [0, 4.6]) c.caja(x1 - 7 - dz, Y, z0 + 1.2, x1 - 3 - dz, Y + 3.2, z0 + 4.6, '#2f6b3a');
    c.cil(0.3, 0.38, 13, '#6b4a2e', x0 - 8, Y, G.z + 24, 6);
    c.caja(x0 - 10, Y + 12, G.z + 23.8, x0 - 6, Y + 12.3, G.z + 24.2, '#5b3d25');
    this.grupo.add(c.armar(this.materiales()));
  }

  cartel(x, z, titulo, sub) {
    const e = crearEtiqueta([{ texto: titulo, tam: 56, color: '#ff3b30' }, { texto: sub, tam: 30, color: '#333333' }], 4);
    e.sprite.position.set(x, Y + 2, z);
    this.grupo.add(e.sprite);
  }

  // ---------- Lo que se ve de cada compra ----------
  construir(id) {
    const it = ITEMS_TZ.find((i) => i.id === id);
    if (!it || this.piezas[id]) return;
    const c = new Constructor();
    const [ex, ez] = ESTACION[id];
    const [x, , z] = loc(ex, ez);
    if (it.tipo === 'galpon') this.galpon(c);
    if (it.tipo === 'mesa') {
      // Cama de cultivo: seis macetas negras en dos filas, dentro de un marco de caños (la carpa).
      for (let k = 0; k < PLANTAS_POR_MESA; k++) {
        const [px, pz] = [x - 4 + (k % 3) * 4, z + (k < 3 ? -1.8 : 1.8)];
        c.cil(1, 0.8, 1.3, '#1b1c1e', px, Y, pz, 10);
        c.cil(0.9, 0.9, 0.08, '#3b2a1c', px, Y + 1.25, pz, 10);
      }
      for (const lx of [-6.5, 6.5]) for (const lz of [-3.6, 3.6]) c.caja(x + lx - 0.08, Y, z + lz - 0.08, x + lx + 0.08, Y + 6.5, z + lz + 0.08, '#9ea3a8');
      for (const lz of [-3.6, 3.6]) c.caja(x - 6.5, Y + 6.4, z + lz - 0.08, x + 6.5, Y + 6.55, z + lz + 0.08, '#9ea3a8');
      this.solido(x - 6, Y, z - 3.4, x + 6, Y + 1.3, z + 3.4);
    }
    if (it.tipo === 'luz') {
      // Barras de luz violeta colgando sobre las dos filas de camas de esa columna.
      for (const dz of [-11, 3]) {
        c.caja(x - 6, Y + 6.1, G.z + dz - 1.2, x + 6, Y + 6.35, G.z + dz + 1.2, '#d6a8ff', { lados: 'luz', abajo: true });
        c.caja(x - 7, Y + 0.33, G.z + dz - 4.4, x + 7, Y + 0.36, G.z + dz + 4.4, '#5b2d8a', { lados: 'luz' }); // el resplandor en el piso
      }
    }
    if (it.tipo === 'cosecha') {
      c.caja(x - 5, Y, z - 2.5, x + 5, Y + 1.1, z + 2.5, '#c9ccd0');
      c.caja(x - 4, Y + 1.1, z - 1.5, x - 1, Y + 1.4, z + 1.5, '#7b4fc9'); // lo cosechado
      c.caja(x + 1, Y + 1.1, z - 0.2, x + 3, Y + 1.18, z + 0.2, '#c0c0c0'); // la tijera
      this.solido(x - 5, Y, z - 2.5, x + 5, Y + 1.1, z + 2.5);
    }
    if (it.tipo === 'proceso') this.proceso(c, id, x, z);
    if (it.tipo === 'venta') {
      if (it.auto) {
        // El escritorio del contacto: notebook prendida y un celular viejo.
        c.caja(x - 3, Y, z - 1.5, x + 3, Y + 1.2, z + 1.5, '#4a3a2a');
        c.caja(x - 1, Y + 1.2, z - 0.7, x + 1, Y + 1.3, z + 0.7, '#222428');
        c.caja(x - 1, Y + 1.3, z + 0.5, x + 1, Y + 2.3, z + 0.6, '#6fa8ff', { lados: 'luz' });
        this.solido(x - 3, Y, z - 1.5, x + 3, Y + 1.2, z + 1.5);
      } else {
        // La camioneta de reparto, estacionada adentro al lado del portón: se maneja.
        const a = new AutoComprado(this.escena, CAMIONETA, x, z, Math.PI / 2);
        a.pos.y = Y;
        a.colocar?.();
        this.colisiones.push(a.caja);
        this.autos.push(a);
      }
    }
    if (TRABAJAN[id]) this.trabajador(...TRABAJAN[id]);
    const g = c.armar(this.materiales());
    this.grupo.add(g);
    this.piezas[id] = g;
  }

  // Las estaciones de procesar: estantería de secado, picadora, prensa con bolsitas y el laboratorio
  // (cuarto de vidrio con mesa, frascos y dos ollas al fuego que largan humo).
  proceso(c, id, x, z) {
    if (id === 'tz_secadero') {
      for (const y of [1.5, 3.2, 4.9]) c.caja(x - 5, Y + y, z - 1.5, x + 5, Y + y + 0.15, z + 1.5, '#8a6a4a');
      for (const lx of [-5, 5]) c.caja(x + lx - 0.15, Y, z - 1.5, x + lx + 0.15, Y + 5.2, z + 1.5, '#5b4330');
      for (let k = 0; k < 8; k++) c.caja(x - 4.4 + k * 1.2, Y + 2.2, z - 0.2, x - 4 + k * 1.2, Y + 3.15, z + 0.2, '#5f8a3e');
    } else if (id === 'tz_laboratorio') {
      c.caja(x - 6, Y, z - 5, x + 6, Y + 6, z + 5, '#e8f4f8', { lados: 'cristal' });
      c.caja(x - 4.5, Y, z - 1.2, x + 4.5, Y + 1.2, z + 1.2, '#d9dcdf');
      for (let k = 0; k < 5; k++) c.cil(0.22, 0.28, 0.7, '#a07de0', x - 3.6 + k * 1.8, Y + 1.2, z, 8, 'luz');
      for (const dz of [-3.2, 3.2]) {
        c.cil(0.9, 1, 1.2, '#2b2d30', x + 3, Y, z + dz, 10); // el anafe
        c.cil(0.25, 0.25, 0.1, '#ff6a1e', x + 3, Y + 1.2, z + dz, 8, 'luz');
        c.cil(0.85, 0.75, 1.1, '#9ea3a8', x + 3, Y + 1.3, z + dz, 12); // la olla
        this.humos.push({ x: x + 3, y: Y + 2.5, z: z + dz });
      }
    } else {
      const col = id === 'tz_picadora' ? '#c84b31' : '#3a6ea5';
      c.caja(x - 4, Y, z - 2, x + 4, Y + 1.1, z + 2, '#c9ccd0'); // mesa de acero
      c.caja(x - 2.2, Y + 1.1, z - 1.2, x + 1, Y + 3, z + 1.2, col);
      c.caja(x - 1.6, Y + 3, z - 0.6, x + 0.4, Y + 3.6, z + 0.6, '#2b2d30');
      for (let k = 0; k < (id === 'tz_prensa' ? 6 : 0); k++) c.caja(x + 1.6 + (k % 3) * 0.7, Y + 1.1, z - 1 + Math.floor(k / 3) * 0.9, x + 2.1 + (k % 3) * 0.7, Y + 1.5, z - 0.4 + Math.floor(k / 3) * 0.9, '#e9e3f5');
    }
    this.solido(x - 5, Y, z - 2.5, x + 5, Y + 3, z + 2.5);
  }

  async trabajador(ex, ez, ang) {
    const cab = await cargarCabeza(TRABAJADOR);
    if (!cab.dibujada) { dibujarCara(cab.frente, TRABAJADOR.piel, TRABAJADOR.pelo); cab.dibujada = true; }
    const m = crearPersonaje(TRABAJADOR, cab);
    // La máscara (negra, con los dos filtros) tapándole la boca.
    const mascara = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.2), mat('#1b1c1e'));
    mascara.position.set(0, -0.25, 0.7);
    m.partes.cabeza.add(mascara);
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8).rotateX(Math.PI / 2), mat('#3a3d40'));
      f.position.set(s * 0.42, -0.3, 0.8);
      m.partes.cabeza.add(f);
    }
    const [x, , z] = loc(ex, ez);
    m.grupo.position.set(x, Y + 0.05, z);
    m.grupo.rotation.y = ang;
    this.grupo.add(m.grupo);
    (this.gente ??= []).push(m);
  }

  materiales() {
    this.mats ??= {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      cristal: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false }),
      chapa: new THREE.MeshLambertMaterial({ vertexColors: true, map: texChapa(), side: THREE.DoubleSide }),
      pozo: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    return this.mats;
  }

  solido(x0, y0, z0, x1, y1, z1) {
    this.colisiones.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
  }

  // El galpón: chapa verde por fuera y forrado oscuro por dentro, el portón grande abierto hacia el
  // camino, techo a dos aguas, el entrepiso con baranda y escalera (con estanterías y cajas), las
  // lámparas colgantes con su charco de luz, el pad de VENDER y el depósito.
  galpon(c) {
    const [x0, x1, z0, z1] = [G.x - AN, G.x + AN, G.z - FO, G.z + FO];
    const verde = '#57a64c';
    const forro = '#2c3a31';
    c.piso(x0, z0, x1, z1, Y + 0.32, '#55585b'); // piso de cemento
    const pared = (a0, a1, b0, b1, eje) => {
      // eje 'x': pared a lo largo de x en z = b; 'z': a lo largo de z en x = b.
      if (eje === 'x') {
        c.caja(a0, Y, b0, a1, Y + ALTO, b0 + 0.25, verde, { lados: 'chapa' });
        c.caja(a0, Y, b1 - 0.2, a1, Y + ALTO, b1, forro);
      } else {
        c.caja(b0, Y, a0, b0 + 0.25, Y + ALTO, a1, verde, { lados: 'chapa' });
        c.caja(b1 - 0.2, Y, a0, b1, Y + ALTO, a1, forro);
      }
    };
    pared(x0, x1, z0 - 0.25, z0 + 0.2, 'x');
    pared(x0, x1, z1 + 0.25, z1 - 0.2, 'x');
    pared(z0, z1, x1 + 0.25, x1 - 0.2, 'z');
    pared(z0, G.z - PUERTA, x0 - 0.25, x0 + 0.2, 'z');
    pared(G.z + PUERTA, z1, x0 - 0.25, x0 + 0.2, 'z');
    c.caja(x0 - 0.25, Y + 10, G.z - PUERTA, x0 + 0.2, Y + ALTO, G.z + PUERTA, verde, { lados: 'chapa' });
    c.caja(x0 - 0.6, Y + 9.5, G.z - PUERTA - 0.3, x0 - 0.1, Y + 10.2, G.z + PUERTA + 0.3, '#3a3d40'); // la cortina enrollada
    this.solido(x0 - 0.3, Y, z0, x0 + 0.3, Y + ALTO, G.z - PUERTA);
    this.solido(x0 - 0.3, Y, G.z + PUERTA, x0 + 0.3, Y + ALTO, z1);
    this.solido(x0, Y, z0 - 0.3, x1, Y + ALTO, z0 + 0.3);
    this.solido(x0, Y, z1 - 0.3, x1, Y + ALTO, z1 + 0.3);
    this.solido(x1 - 0.3, Y, z0, x1 + 0.3, Y + ALTO, z1);
    // Techo a dos aguas (verde por fuera), el cielorraso oscuro y las cabriadas.
    for (const s of [-1, 1]) {
      const t = new THREE.BoxGeometry(x1 - x0 + 2, 0.25, FO + 2.5);
      t.rotateX(s * 0.2);
      t.translate(G.x, Y + ALTO + 2.6, G.z + s * (FO / 2 + 0.2));
      c.forma('chapa', t, '#4c9a43');
    }
    for (const s of [-1, 1]) c.forma('liso', new THREE.BoxGeometry(x1 - x0, 0.1, FO).rotateX(s * 0.2).translate(G.x, Y + ALTO + 2.3, G.z + s * (FO / 2)), forro);
    for (let x = x0 + 6; x < x1 - 3; x += 10) c.caja(x - 0.2, Y + ALTO - 0.6, z0, x + 0.2, Y + ALTO - 0.2, z1, '#1b1e20');
    // Los triángulos de arriba de las paredes de los costados (cerrando el techo).
    for (const xx of [x0, x1]) {
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([xx, Y + ALTO, z0, xx, Y + ALTO, z1, xx, Y + ALTO + 5.6, G.z], 3));
      tri.computeVertexNormals();
      c.forma('liso', tri, verde);
      const tri2 = tri.clone();
      tri2.setAttribute('position', new THREE.Float32BufferAttribute([xx, Y + ALTO, z1, xx, Y + ALTO, z0, xx, Y + ALTO + 5.6, G.z], 3));
      tri2.computeVertexNormals();
      c.forma('liso', tri2, verde);
    }
    // El entrepiso a lo largo de la pared del fondo: losa, baranda negra, escalera y estanterías.
    const [ez0, ez1, ey] = [z0 + 0.2, z0 + 11, Y + 8];
    c.caja(x0 + 10, ey - 0.4, ez0, x1 - 0.2, ey, ez1, '#3a3d40', { abajo: true });
    for (let x = x0 + 10; x < x1; x += 6) c.caja(x - 0.15, Y, ez1 - 0.3, x + 0.15, ey, ez1, '#1b1e20');
    for (let x = x0 + 10; x < x1 - 1; x += 1.5) c.caja(x - 0.04, ey, ez1 - 0.1, x + 0.04, ey + 2.2, ez1, '#1b1e20');
    c.caja(x0 + 10, ey + 2.2, ez1 - 0.15, x1 - 0.2, ey + 2.35, ez1 + 0.05, '#1b1e20');
    for (let k = 0; k < 16; k++) c.caja(x0 + 1 + k * 0.6, Y + k * 0.5, ez0 + 1, x0 + 1.6 + k * 0.6, Y + k * 0.5 + 0.5, ez0 + 4, '#4a4d50'); // escalones
    for (let x = x0 + 13; x < x1 - 8; x += 11) {
      for (const y of [0.1, 2, 3.9]) c.caja(x, ey + y, ez0 + 0.6, x + 8, ey + y + 0.15, ez0 + 3, '#c9701f');
      for (const lx of [0, 8]) c.caja(x + lx - 0.1, ey, ez0 + 0.6, x + lx + 0.1, ey + 5.6, ez0 + 3, '#2a4f8a');
      for (let k = 0; k < 6; k++) {
        const y = [0.25, 2.15, 4.05][k % 3];
        const cx = x + 0.8 + (k % 4) * 1.8;
        c.caja(cx, ey + y, ez0 + 1, cx + 1.4, ey + y + 1.3, ez0 + 2.6, k % 2 ? '#b98a5a' : '#2b6cb0');
      }
    }
    // Lámparas colgantes (pantalla oscura, foco prendido) con el charco de luz en el piso.
    for (let x = x0 + 12; x < x1 - 4; x += 16) {
      for (const zz of [G.z - 4, G.z + 13]) {
        c.caja(x - 0.03, Y + 10.6, zz - 0.03, x + 0.03, Y + ALTO - 0.6, zz + 0.03, '#111111');
        c.forma('liso', new THREE.CylinderGeometry(0.5, 1.6, 1.1, 12, 1, true).translate(x, Y + 10.2, zz), '#1b1e20');
        c.cil(0.45, 0.45, 0.25, '#fff1c9', x, Y + 9.6, zz, 10, 'luz');
        c.forma('pozo', new THREE.CircleGeometry(5.5, 20).rotateX(-Math.PI / 2).translate(x, Y + 0.36, zz), '#ffd99a');
      }
    }
    // Pad de VENDER y el depósito (cajas con lo procesado), cerca del portón.
    const [cx, , cz] = loc(...COBRAR);
    c.cil(1.7, 1.7, 0.2, '#ffd23f', cx, Y + 0.3, cz, 20, 'luz');
    const [dx, , dz] = loc(...DEPOSITO);
    for (let k = 0; k < 4; k++) c.caja(dx - 2.5 + (k % 2) * 2.6, Y + Math.floor(k / 2) * 1.6, dz - 1.8, dx - 0.1 + (k % 2) * 2.6, Y + 1.5 + Math.floor(k / 2) * 1.6, dz + 1.8, '#b98a5a');
    this.etiquetaDeposito = crearEtiqueta([{ texto: 'DEPÓSITO', tam: 44 }, { texto: formato(0), tam: 70, color: '#ffd23f', moneda: true }], 6);
    this.etiquetaDeposito.sprite.position.set(dx, Y + 5.5, dz);
    this.grupo.add(this.etiquetaDeposito.sprite);
    // El contador, colgado en la pared del fondo arriba del entrepiso.
    this.contador = crearEtiqueta([{ texto: 'TANZANIA', tam: 46 }, { texto: ' ', tam: 48 }, { texto: ' ', tam: 48 }], 9);
    this.contador.sprite.position.set(x0 + 18, Y + 11.6, z0 + 11.6); // colgado de la baranda del entrepiso, se ve desde el portón
    this.grupo.add(this.contador.sprite);
    const vender = crearEtiqueta([{ texto: 'VENDER', tam: 56, color: '#ffd23f' }, { texto: 'pisá para cobrar', tam: 32 }], 5);
    vender.sprite.position.set(cx, Y + 3.4, cz);
    this.grupo.add(vender.sprite);
  }

  // ---------- Botones (como los de la mansión) ----------
  refrescar(avisar = false) {
    const faltan = ITEMS_TZ.filter((i) => !this.tiene(i.id)).slice(0, this.tiene('tz_galpon') ? 2 : 1);
    for (const b of [...this.botones]) if (!faltan.includes(b.item)) this.quitar(b);
    for (const it of faltan) {
      if (this.botones.some((b) => b.item === it)) continue;
      const [ex, ez] = ESTACION[it.id];
      // En el pasillo de adelante de cada cosa (las luces y las camas, en el pasillo del medio).
      const [x, y, z] = it.tipo === 'luz' ? loc(ex, 10) : it.tipo === 'mesa' ? loc(ex, ez < 0 ? ez - 5.5 : ez + 5.5) : it.tipo === 'galpon' ? loc(ex, ez) : loc(ex, ez - 4.5);
      const grupo = new THREE.Group();
      grupo.position.set(x, y, z);
      const aro = new THREE.Mesh(GEO_ARO, mat('#2a2a2a'));
      aro.position.y = 0.08;
      const disco = new THREE.Mesh(GEO_BOTON, MAT_ROJO);
      disco.position.y = 0.2;
      const haz = new THREE.Mesh(GEO_HAZ, MAT_HAZ);
      haz.position.y = 20;
      haz.visible = false;
      const etiqueta = crearEtiqueta([{ texto: it.nombre, tam: 56, color: '#d9b3ff' }, { texto: formato(it.precio), tam: 60, color: '#8dff6a', moneda: true }], 6);
      etiqueta.sprite.position.y = 3.6;
      grupo.add(aro, disco, haz, etiqueta.sprite);
      this.grupo.add(grupo);
      this.botones.push({ item: it, grupo, disco, haz, etiqueta, x, y, z, armado: false, pisado: false, alcanza: null });
      if (avisar) this.ui.toast(`Nuevo botón: ${it.nombre}`, 'info');
    }
  }

  quitar(b) {
    this.grupo.remove(b.grupo);
    b.etiqueta.sprite.material.map.dispose();
    b.etiqueta.sprite.material.dispose();
    this.botones.splice(this.botones.indexOf(b), 1);
  }

  comprar(b) {
    const it = b.item;
    if (this.estado.plata < it.precio) return false;
    this.estado.plata -= it.precio;
    this.datos.compras.push(it.id);
    this.quitar(b);
    this.construir(it.id);
    this.refrescar(true);
    sfx.comprar();
    this.ui.toast(`¡${it.nombre}!`, 'ok');
    if (it.id === 'tz_mesa1' && !this.tiene('tz_cosecha')) this.ui.toast('Las plantas crecen, pero falta quien las coseche', 'info', 4000);
    if (it.id === 'tz_cosecha') this.ui.toast('En el depósito podés agarrar bolsitas: para fumar o para vender', 'info', 5000);
    this.alComprar?.(it);
    this.guardar();
    return true;
  }

  // ---------- Las bolsitas ----------
  // Del depósito te llevás hasta 50 (cada una vale lo que se pagaría por ella procesada).
  cercaDeposito(p) {
    const [dx, , dz] = loc(...DEPOSITO);
    return this.piezas.tz_galpon && Math.hypot(p.x - dx, p.z - dz) < 5 && Math.abs(p.y - Y) < 2;
  }

  accion(jugador) {
    if (jugador.conduciendo || !this.cercaDeposito(jugador.pos)) return '';
    return this.datos.deposito >= this.bolsa ? 'Agarrar bolsitas de tanzania (E)' : '';
  }

  hacer() {
    const d = this.datos;
    const k = Math.min(50, Math.floor(d.deposito / this.bolsa));
    if (k <= 0) return;
    d.deposito -= k * this.bolsa;
    d.encima = (d.encima || 0) + k;
    sfx.cobrar();
    this.ui.toast(`Agarraste ${k} bolsitas de tanzania (llevás ${d.encima})`, 'plata');
    this.guardar();
  }

  // Vender lo que llevás encima a `veces` lo que vale cada una (Francis, la Cachimba).
  vender(veces, tope = Infinity) {
    const d = this.datos;
    const n = Math.min(d.encima || 0, tope);
    const monto = Math.floor(n * this.bolsa * veces);
    d.encima -= n;
    d.vendido = (d.vendido || 0) + n;
    this.estado.plata += monto;
    this.guardar();
    sfx.cobrar();
    this.ui.toast(`Vendiste ${n} bolsitas: +${formato(monto)}`, 'plata', 4000);
    return monto;
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador) {
    const p = jugador.pos;
    const cerca = Math.abs(p.x - G.x) < 650 && p.z < 120;
    if (cerca && !this.grupo && this.estado.costa) this.armar();
    // Lo que rinde corre aunque no estés (como la mansión): va al depósito. El contacto vende solo
    // todo menos una reserva de RESERVA bolsitas (para agarrar y fumar o vender por tu cuenta).
    const d = this.datos;
    d.deposito += this.ingresoPorSegundo * dt;
    d.producido = (d.producido || 0) + (this.ingresoPorSegundo * dt) / this.bolsa;
    const sobra = Math.floor(d.deposito - RESERVA * this.bolsa);
    if (this.tiene('tz_contacto') && sobra >= 1) {
      this.estado.plata += sobra;
      d.deposito -= sobra;
      this.anotarVenta(sobra);
    }
    if (!this.grupo) return;
    this.grupo.visible = cerca;
    if (!cerca) return;
    this.reloj += dt;
    this.crecer(dt);
    for (const m of this.gente || []) m.animar(dt, 0, true);
    this.humear(dt);
    // Botones.
    for (const b of [...this.botones]) {
      const alcanza = this.estado.plata >= b.item.precio;
      if (alcanza !== b.alcanza) {
        b.alcanza = alcanza;
        b.disco.material = alcanza ? MAT_VERDE : MAT_ROJO;
        b.haz.visible = alcanza;
      }
      const encima = !jugador.conduciendo && (p.x - b.x) ** 2 + (p.z - b.z) ** 2 < 1.7 * 1.7 && Math.abs(p.y - b.y) < 1;
      if (!encima) b.armado = true;
      if (encima && b.armado && !this.comprar(b) && !b.pisado) {
        sfx.error();
        this.ui.toast(`Te faltan ${formato(b.item.precio - this.estado.plata)}`, 'error');
      }
      b.pisado = encima;
    }
    // Vender: pisando el pad de VENDER.
    if (this.piezas.tz_galpon) {
      const [cx, , cz] = loc(...COBRAR);
      const encima = !jugador.conduciendo && (p.x - cx) ** 2 + (p.z - cz) ** 2 < 1.7 * 1.7 && Math.abs(p.y - Y) < 1;
      if (encima && !this.cobrando && d.deposito >= 1) {
        const monto = Math.floor(d.deposito);
        this.estado.plata += monto;
        d.deposito -= monto;
        this.anotarVenta(monto);
        sfx.cobrar();
        this.ui.toast(`+${formato(monto)}`, 'plata');
      }
      this.cobrando = encima;
      const mostrado = Math.floor(d.deposito);
      if (mostrado !== this.mostrado && this.reloj - (this.ultimoCartel || 0) > 0.25) {
        this.mostrado = mostrado;
        this.ultimoCartel = this.reloj;
        this.etiquetaDeposito.actualizar([{ texto: 'DEPÓSITO', tam: 44 }, { texto: formato(mostrado), tam: 70, color: '#ffd23f', moneda: true }]);
      }
      // El contador de la pared: gramos producidos y vendidos (una vez por segundo).
      if (this.reloj - (this.ultimoContador || -9) > 1) {
        this.ultimoContador = this.reloj;
        this.contador.actualizar([{ texto: 'TANZANIA', tam: 46, color: '#d9b3ff' }, { texto: `Producida: ${formato(d.producido || 0)} g`, tam: 48, color: '#8dff6a' }, { texto: `Vendida: ${formato(d.vendido || 0)} g`, tam: 48, color: '#ffd23f' }]);
      }
    }
  }

  // El humo de las ollas del laboratorio: bocanadas que suben, se agrandan y se van.
  humear(dt) {
    if (!this.humos.length) return;
    if (!this.nubes) {
      this.nubes = [];
      const m = new THREE.MeshBasicMaterial({ color: '#d8d8d8', transparent: true, opacity: 0.3, depthWrite: false });
      for (let i = 0; i < this.humos.length * 5; i++) {
        const n = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), m.clone());
        n.userData = { o: this.humos[i % this.humos.length], t: (i / 5) % 1 };
        this.grupo.add(n);
        this.nubes.push(n);
      }
    }
    for (const n of this.nubes) {
      const u = n.userData;
      u.t = (u.t + dt * 0.25) % 1;
      n.position.set(u.o.x + Math.sin(u.t * 9) * 0.4, u.o.y + u.t * 6, u.o.z + Math.cos(u.t * 7) * 0.4);
      n.scale.setScalar(0.6 + u.t * 2.2);
      n.material.opacity = 0.32 * (1 - u.t);
    }
  }

  // Las plantas de cada cama crecen durante la tanda; con la mesa de cosecha, al terminar se cortan
  // y arranca otra (sin cosecha quedan grandes, esperando).
  crecer(dt) {
    const mesas = ITEMS_TZ.filter((i) => i.tipo === 'mesa' && this.tiene(i.id));
    const vel = ITEMS_TZ.reduce((v, i) => v * (this.tiene(i.id) ? i.vel || 1 : 1), 1);
    this.fase += (dt * vel) / CICLO;
    if (this.fase >= 1) this.fase = this.tiene('tz_cosecha') ? this.fase % 1 : 1;
    const rnd = aleatorio(5);
    let n = 0;
    const o = this.dummy;
    for (const m of mesas) {
      const [x, , z] = loc(...ESTACION[m.id]);
      for (let k = 0; k < PLANTAS_POR_MESA; k++) {
        const s = (0.25 + 0.95 * Math.min(1, this.fase * (0.9 + rnd() * 0.2))) * 2.4;
        o.position.set(x - 4 + (k % 3) * 4, Y + 1.25, z + (k < 3 ? -1.8 : 1.8));
        o.rotation.set(0, rnd() * 6, 0);
        o.scale.setScalar(s);
        o.updateMatrix();
        this.plantas.setMatrixAt(n++, o.matrix);
      }
    }
    this.plantas.count = n;
    this.plantas.instanceMatrix.needsUpdate = true;
  }
}
