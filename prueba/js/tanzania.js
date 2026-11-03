import * as THREE from 'three';
import { COSTA as CO } from './constantes.js';
import { Constructor } from './ciudad.js';
import { crearEtiqueta, liberarAlSubir } from './texturas.js';
import { GEO_ARO, GEO_BOTON, GEO_HAZ, MAT_VERDE, MAT_ROJO, MAT_HAZ } from './tycoon.js';
import { ITEMS_TZ, ingresoTz, CICLO, PLANTAS_POR_MESA } from '../data/tanzania.js';
import { aleatorio, formato, mat } from './util.js';
import { sfx } from './sfx.js';

// El tycoon de la tanzania (la planta inventada del juego), arriba del acantilado de la costa.
// Como el de la mansión: botones en el piso con el nombre y el precio (verde si te alcanza), que
// se pisan para comprar. Primero el galpón (industrial, de chapa, estilo warehouse: luces de
// cultivo, mesas, estanterías); adentro, la cadena plantar → cultivar → cosechar → procesar →
// vender (data/tanzania.js). Cada botón aparece donde va a quedar lo que comprás; se ven los dos
// siguientes de la lista. Lo comprado va en estado.tanzania (aparte de las compras de la mansión).
const G = CO.galpon;
const Y = CO.meseta.alto;
const AN = G.ancho / 2;
const FO = G.fondo / 2;
const ALTO = 13;
const loc = (x, z) => [G.x + x, Y, G.z + z]; // de coordenadas del galpón al mundo
const MESAS = [-22, -6, 10, 26].flatMap((x) => [[x, -12], [x, 6]]); // las 8 mesas de cultivo
const ESTACION = {
  tz_galpon: [-AN - 10, 0],
  tz_cosecha: [30, 20], tz_secadero: [-22, 20], tz_picadora: [-8, 20], tz_prensa: [6, 20], tz_laboratorio: [26, -22],
  tz_contacto: [-36, -20], tz_furgoneta: [-AN - 14, 14],
  tz_luz1: [-14, -3], tz_luz2: [2, -3], tz_luz3: [18, -3], tz_luz4: [-30, -3],
};
const COBRAR = [-34, 14];
const DEPOSITO = [-38, 22];
ITEMS_TZ.forEach((it) => {
  if (it.tipo === 'mesa') ESTACION[it.id] = MESAS[Number(it.id.slice(7) || 1) - 1];
});

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
    this.alComprar = null;
  }

  get datos() { return (this.estado.tanzania ??= { compras: [], deposito: 0 }); }
  tiene(id) { return this.datos.compras.includes(id); }
  get ingresoPorSegundo() { return ingresoTz(this.datos.compras); }

  armar() {
    if (this.grupo) return;
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    // La parcela: tierra apisonada y postes de un alambrado viejo.
    const c = new Constructor();
    c.piso(G.x - AN - 24, G.z - FO - 14, G.x + AN + 14, G.z + FO + 14, Y + 0.05, '#7d6b52');
    for (let x = G.x - AN - 24; x <= G.x + AN + 14; x += 6) for (const z of [G.z - FO - 14, G.z + FO + 14]) c.caja(x - 0.12, Y, z - 0.12, x + 0.12, Y + 1.6, z + 0.12, '#6d5a44');
    this.grupo.add(c.armar({ liso: new THREE.MeshLambertMaterial({ vertexColors: true }) }));
    // Las plantas (todas en una malla instanciada).
    this.plantas = new THREE.InstancedMesh(geoPlanta(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), MESAS.length * PLANTAS_POR_MESA);
    this.plantas.count = 0;
    this.plantas.frustumCulled = false; // las instancias están en el galpón, no en el origen
    this.grupo.add(this.plantas);
    this.dummy = new THREE.Object3D();
    for (const id of this.datos.compras) this.construir(id);
    this.refrescar();
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
      c.caja(x - 6, Y, z - 2.4, x + 6, Y + 1.1, z + 2.4, '#5c5f63');
      c.caja(x - 5.8, Y + 1.1, z - 2.2, x + 5.8, Y + 1.25, z + 2.2, '#4a3524'); // la tierra
      for (const lx of [-5.6, 5.6]) for (const lz of [-2.1, 2.1]) c.caja(x + lx - 0.1, Y, z + lz - 0.1, x + lx + 0.1, Y + 1.1, z + lz + 0.1, '#2b2d30');
      this.solido(x - 6, Y, z - 2.4, x + 6, Y + 1.1, z + 2.4);
    }
    if (it.tipo === 'luz') {
      // Barras de luz violeta colgando sobre las mesas (una fila por compra).
      for (const dz of [-12, 6]) {
        c.caja(x - 7, Y + 7.2, G.z + dz - 0.6, x + 7, Y + 7.5, G.z + dz + 0.6, '#d9b3ff', { lados: 'luz', abajo: true });
        for (const dx of [-6, 6]) c.caja(x + dx - 0.04, Y + 7.5, G.z + dz - 0.04, x + dx + 0.04, Y + ALTO - 0.6, G.z + dz + 0.04, '#222222');
      }
    }
    if (it.tipo === 'cosecha') {
      c.caja(x - 5, Y, z - 2.5, x + 5, Y + 1.0, z + 2.5, '#d8d8d4');
      c.caja(x - 4, Y + 1, z - 1.5, x - 1, Y + 1.3, z + 1.5, '#7b4fc9'); // lo cosechado
      c.caja(x + 1, Y + 1, z - 0.2, x + 3, Y + 1.08, z + 0.2, '#c0c0c0'); // la tijera
      this.solido(x - 5, Y, z - 2.5, x + 5, Y + 1, z + 2.5);
    }
    if (it.tipo === 'proceso') {
      const col = { tz_secadero: '#8a6a4a', tz_picadora: '#c84b31', tz_prensa: '#3a6ea5', tz_laboratorio: '#e8f4f8' }[id];
      if (id === 'tz_secadero') {
        // Estantería de secado: estantes con plantas colgadas cabeza abajo.
        for (const y of [1.5, 3.2, 4.9]) c.caja(x - 5, Y + y, z - 1.5, x + 5, Y + y + 0.15, z + 1.5, col);
        for (const lx of [-5, 5]) c.caja(x + lx - 0.15, Y, z - 1.5, x + lx + 0.15, Y + 5.2, z + 1.5, '#5b4330');
        for (let k = 0; k < 8; k++) c.caja(x - 4.4 + k * 1.2, Y + 2.2, z - 0.2, x - 4 + k * 1.2, Y + 3.15, z + 0.2, '#5f8a3e');
      } else if (id === 'tz_laboratorio') {
        c.caja(x - 7, Y, z - 4, x + 7, Y + 5, z + 4, col, { lados: 'cristal' });
        c.caja(x - 5, Y, z - 1.2, x + 5, Y + 1.1, z + 1.2, '#f2f2f2');
        for (let k = 0; k < 5; k++) c.cil(0.25, 0.25, 0.6, '#a07de0', x - 4 + k * 2, Y + 1.1, z, 8, 'luz');
      } else {
        c.caja(x - 3, Y, z - 2, x + 3, Y + 2.6, z + 2, col);
        c.caja(x - 2, Y + 2.6, z - 1, x + 2, Y + 3.4, z + 1, '#2b2d30');
        c.caja(x + 3, Y + 1, z - 1, x + 5, Y + 1.2, z + 1, '#888888'); // la bandeja de salida
      }
      this.solido(x - 5, Y, z - 2.5, x + 5, Y + 3, z + 2.5);
    }
    if (it.tipo === 'venta') {
      if (it.auto) {
        // El escritorio del contacto: notebook y un celular viejo.
        c.caja(x - 3, Y, z - 1.5, x + 3, Y + 1.2, z + 1.5, '#4a3a2a');
        c.caja(x - 1, Y + 1.2, z - 0.7, x + 1, Y + 1.3, z + 0.7, '#222428');
        c.caja(x - 1, Y + 1.3, z + 0.5, x + 1, Y + 2.3, z + 0.6, '#6fa8ff', { lados: 'luz' });
        this.solido(x - 3, Y, z - 1.5, x + 3, Y + 1.2, z + 1.5);
      } else {
        // La furgoneta de reparto, afuera en la puerta (blanca, sin carteles).
        c.caja(x - 7, Y + 0.8, z - 2.6, x + 5, Y + 6, z + 2.6, '#f2f2ee');
        c.caja(x + 5, Y + 0.8, z - 2.5, x + 8, Y + 4.2, z + 2.5, '#f2f2ee');
        c.caja(x + 5.2, Y + 2.6, z - 2.3, x + 8.1, Y + 4, z + 2.3, '#30363d', { lados: 'cristal' });
        for (const lx of [-5, 5]) for (const lz of [-2.6, 2.6]) c.forma('liso', new THREE.CylinderGeometry(1, 1, 0.6, 12).rotateX(Math.PI / 2).translate(x + lx, Y + 1, z + lz), '#111111');
        this.solido(x - 7, Y, z - 2.6, x + 8, Y + 6, z + 2.6);
      }
    }
    const g = c.armar(this.materiales());
    this.grupo.add(g);
    this.piezas[id] = g;
  }

  materiales() {
    this.mats ??= {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      cristal: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false }),
      chapa: new THREE.MeshLambertMaterial({ vertexColors: true, map: texChapa(), side: THREE.DoubleSide }),
    };
    return this.mats;
  }

  solido(x0, y0, z0, x1, y1, z1) {
    this.colisiones.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
  }

  // El galpón: paredes de chapa, el portón abierto hacia la subida, techo a dos aguas con
  // claraboyas, estanterías con cajas y bidones, ventiladores y tubos de luz.
  galpon(c) {
    const [x0, x1, z0, z1] = [G.x - AN, G.x + AN, G.z - FO, G.z + FO];
    const pared = '#9aa3aa';
    const P = 4; // ancho de la puerta / 2
    c.piso(x0, z0, x1, z1, Y + 0.08, '#6f7275'); // piso de cemento
    c.caja(x0, Y, z0, x1, Y + ALTO, z0 + 0.4, pared, { lados: 'chapa' });
    c.caja(x0, Y, z1 - 0.4, x1, Y + ALTO, z1, pared, { lados: 'chapa' });
    c.caja(x1 - 0.4, Y, z0, x1, Y + ALTO, z1, pared, { lados: 'chapa' });
    c.caja(x0, Y, z0, x0 + 0.4, Y + ALTO, G.z - P, pared, { lados: 'chapa' });
    c.caja(x0, Y, G.z + P, x0 + 0.4, Y + ALTO, z1, pared, { lados: 'chapa' });
    c.caja(x0, Y + 8, G.z - P, x0 + 0.4, Y + ALTO, G.z + P, pared, { lados: 'chapa' });
    c.caja(x0 - 0.3, Y + 7.6, G.z - P - 0.3, x0 + 0.1, Y + 8.2, G.z + P + 0.3, '#c8a018'); // la cortina enrollada
    for (const [a, b, cc, d] of [[x0, Y, z0, G.z - P], [x0, Y, G.z + P, z1]]) this.solido(a, b, cc, a + 0.4, Y + ALTO, d);
    this.solido(x0, Y, z0, x1, Y + ALTO, z0 + 0.4);
    this.solido(x0, Y, z1 - 0.4, x1, Y + ALTO, z1);
    this.solido(x1 - 0.4, Y, z0, x1, Y + ALTO, z1);
    // Techo a dos aguas (dos chapas inclinadas) con claraboyas, y las cabriadas.
    for (const s of [-1, 1]) {
      const t = new THREE.BoxGeometry(x1 - x0 + 2, 0.2, FO + 2);
      t.rotateX(s * 0.18);
      t.translate(G.x, Y + ALTO + 2.3, G.z + s * (FO / 2));
      c.forma('chapa', t, '#8d959b');
    }
    for (let x = x0 + 6; x < x1 - 3; x += 10) c.caja(x - 0.2, Y + ALTO - 0.6, z0, x + 0.2, Y + ALTO - 0.2, z1, '#3a3d40');
    for (let x = x0 + 10; x < x1 - 6; x += 16) c.caja(x - 2, Y + ALTO + 2.5, G.z - 10, x + 2, Y + ALTO + 2.6, G.z - 6, '#e9f6ff', { lados: 'luz' });
    // Estanterías con cajas a lo largo de la pared del fondo (la de atrás, -z).
    for (let x = x0 + 4; x < x1 - 8; x += 12) {
      for (const y of [0.1, 2.2, 4.3]) c.caja(x, Y + y, z0 + 0.8, x + 9, Y + y + 0.18, z0 + 3.2, '#e07b1f');
      for (const lx of [0, 9]) c.caja(x + lx - 0.1, Y, z0 + 0.8, x + lx + 0.1, Y + 6.2, z0 + 3.2, '#2f5fa8');
      for (let k = 0; k < 6; k++) {
        const y = [0.28, 2.38, 4.48][k % 3];
        const cx = x + 1 + (k % 4) * 2;
        c.caja(cx, Y + y, z0 + 1.2, cx + 1.6, Y + y + 1.4, z0 + 2.8, k % 2 ? '#b98a5a' : '#2b6cb0');
      }
      this.solido(x, Y, z0 + 0.8, x + 9, Y + 6.2, z0 + 3.2);
    }
    // Ventiladores en la pared del este y tubos de luz blanca en el techo.
    for (const z of [G.z - 14, G.z + 14]) {
      c.caja(x1 - 1.2, Y + 6, z - 2.5, x1 - 0.4, Y + 11, z + 2.5, '#2b2d30');
      c.cil(2.1, 2.1, 0.3, '#5d6166', x1 - 1.3, Y + 8.5, z, 12);
    }
    for (let x = x0 + 8; x < x1 - 4; x += 14) c.caja(x - 3, Y + ALTO - 1.2, G.z + 16, x + 3, Y + ALTO - 1, G.z + 16.4, '#f7fbff', { lados: 'luz', abajo: true });
    // Pad de COBRAR (vender) y el depósito (cajas con lo procesado), cerca de la puerta.
    const [cx, , cz] = loc(...COBRAR);
    c.cil(1.7, 1.7, 0.2, '#ffd23f', cx, Y + 0.05, cz, 20, 'luz');
    const [dx, , dz] = loc(...DEPOSITO);
    c.caja(dx - 2.5, Y, dz - 2, dx + 2.5, Y + 2.2, dz + 2, '#b98a5a');
    this.etiquetaDeposito = crearEtiqueta([{ texto: 'DEPÓSITO', tam: 44 }, { texto: formato(0), tam: 70, color: '#ffd23f', moneda: true }], 6);
    this.etiquetaDeposito.sprite.position.set(dx, Y + 5.5, dz);
    this.grupo.add(this.etiquetaDeposito.sprite);
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
      // Las luces y el contacto se compran en el pasillo de adelante (no arriba de las mesas).
      const [x, y, z] = it.tipo === 'luz' ? loc(ex, 15) : it.tipo === 'mesa' ? loc(ex, ez + (ez < 0 ? -5.5 : 5.5)) : it.tipo === 'venta' && !it.auto ? loc(-AN - 6, 10) : loc(ex, ez + (it.tipo === 'galpon' ? 0 : 5));
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
    this.alComprar?.(it);
    this.guardar();
    return true;
  }

  // ---------- Cada cuadro ----------
  actualizar(dt, jugador) {
    const p = jugador.pos;
    const cerca = Math.abs(p.x - G.x) < 600 && p.z < 120;
    if (cerca && !this.grupo && this.estado.costa) this.armar();
    // Lo que rinde corre aunque no estés (como la mansión): va al depósito; el contacto lo vende solo.
    const d = this.datos;
    const ingreso = this.ingresoPorSegundo;
    d.deposito += ingreso * dt;
    if (this.tiene('tz_contacto') && d.deposito >= 1) {
      this.estado.plata += Math.floor(d.deposito);
      d.deposito -= Math.floor(d.deposito);
    }
    if (!this.grupo) return;
    this.grupo.visible = cerca;
    if (!cerca) return;
    this.reloj += dt;
    this.crecer(dt);
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
    // Vender: pisando el pad de COBRAR.
    if (this.piezas.tz_galpon) {
      const [cx, , cz] = loc(...COBRAR);
      const encima = !jugador.conduciendo && (p.x - cx) ** 2 + (p.z - cz) ** 2 < 1.7 * 1.7 && Math.abs(p.y - Y) < 1;
      if (encima && !this.cobrando && d.deposito >= 1) {
        const monto = Math.floor(d.deposito);
        this.estado.plata += monto;
        d.deposito -= monto;
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
    }
  }

  // Las plantas de cada mesa crecen durante la tanda; con la mesa de cosecha, al terminar se cortan
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
        const s = (0.25 + 0.95 * Math.min(1, this.fase * (0.9 + rnd() * 0.2))) * 2.2;
        o.position.set(x - 5 + k * 2, Y + 1.25, z + (k % 2 ? 0.8 : -0.8));
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
