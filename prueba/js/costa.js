import * as THREE from 'three';
import { COSTA as CO, CALLE_Z, PLAYA as P } from './constantes.js';
import { Constructor, dibujarCara } from './ciudad.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta } from './texturas.js';
import { cargarAuto, AUTOS_POR_ID } from './auto.js';
import { texArena, texMojada, texEspuma, Y_AGUA } from './playa.js';
import { COMPRADORES } from '../data/compradores.js';
import { aleatorio } from './util.js';

// La costa (la habilita Nico Baraja, nico.js): la calle del barrio sigue hacia el este y, pasando
// la barrera, se abre en dos. El ramal recto sigue por abajo, junto a la arena de cuatro mansiones
// de lujo frente al mar (modernas, con pileta, palmeras y autos caros); cada una tiene timbre y
// sale su dueño (data/compradores.js). El ramal en curva sube al acantilado: arriba, la parcela del
// galpón de tanzania (tanzania.js), escondido y mirando al mar. El mar y las olas son los de la
// playa (playa.js), que siguen hasta acá.
//
// Liviano: se arma recién cuando te acercás con la costa abierta, todo lo quieto va en pocas mallas
// (Constructor: suelta la copia de JavaScript al subirse) y los autos son los del concesionario.
const M = CO.meseta;
const CALLE = { z0: CALLE_Z - 6, z1: CALLE_Z + 6 };
const ANCHO_RAMPA = 12;
const Z_CURVA = -150; // a qué altura (z) la subida llega a la meseta
const MANSIONES = [140, 340, 540, 740].map((x, i) => ({ x: CO.playa.x0 + x, ...COMPRADORES[i], auto: ['ferrari_f40', 'mclaren_p1', 'gtr', 'mclaren_p1'][i], color: ['#d9b48a', '#9fb7c9', '#2f3437', '#c9d6c3'][i] }));
const PUERTA_Z = 80; // el frente de las mansiones (hacia la calle)

// La subida: curva (cuadrática) del desvío al borde de la meseta, con su altura en cada punto.
const P0 = new THREE.Vector2(CO.bif, CALLE_Z);
const P1 = new THREE.Vector2(CO.bif, Z_CURVA);
const P2 = new THREE.Vector2(M.x0 + 1, Z_CURVA);
const RAMPA = Array.from({ length: 61 }, (_, i) => {
  const t = i / 60;
  const u = 1 - t;
  const x = u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x;
  const z = u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y;
  const s = THREE.MathUtils.clamp((t - 0.12) / 0.86, 0, 1);
  return { x, z, y: M.alto * s * s * (3 - 2 * s) };
});

// Piso en (x, z): la meseta arriba del acantilado y la subida (lo demás, 0).
export function alturaCosta(x, z) {
  if (x < CO.x0 || x > CO.x1 + 40) return 0;
  if (x >= M.x0 && x <= M.x1 && z >= M.z0 && z <= M.z1) return M.alto;
  let mejor = Infinity;
  let y = 0;
  for (const q of RAMPA) {
    const d = (q.x - x) ** 2 + (q.z - z) ** 2;
    if (d < mejor) { mejor = d; y = q.y; }
  }
  return mejor < (ANCHO_RAMPA / 2 + 0.5) ** 2 ? y : 0;
}

// Una palmera: tronco curvo de tramos y un penacho de hojas.
function palmera(c, x, z, alto, rnd) {
  const inc = (rnd() - 0.5) * 0.5;
  let px = x;
  for (let k = 0; k < 6; k++) {
    c.cil(0.42 - k * 0.04, 0.5 - k * 0.04, alto / 6 + 0.05, k % 2 ? '#8a6a4a' : '#7a5c3e', px, (k * alto) / 6, z, 7);
    px += inc * 0.6;
  }
  for (let h = 0; h < 8; h++) {
    const a = (h / 8) * Math.PI * 2 + rnd();
    const g = new THREE.BoxGeometry(0.9, 0.08, 5.2);
    g.translate(0, 0, 2.4);
    g.rotateX(0.5 + rnd() * 0.3);
    g.rotateY(a);
    g.translate(px, alto, z);
    c.forma('liso', g, h % 2 ? '#3f8f3a' : '#4fa244');
  }
}

export class Costa {
  constructor({ escena, estado, ui, guardar, colisiones, pausar }) {
    Object.assign(this, { escena, estado, ui, guardar, colisiones, pausar });
    this.grupo = null;
    this.duenos = {}; // id -> { m, cara, t } (el dueño en la puerta)
    this.reloj = 0;
  }

  get abierta() { return !!this.estado.costa; }

  armar() {
    if (this.grupo || !this.abierta) return;
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    const rnd = aleatorio(777);
    const c = new Constructor();
    const solido = (x0, y0, z0, x1, y1, z1) => this.colisiones.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));

    // La calle que sigue (asfalto, la línea amarilla cortada y las veredas).
    c.piso(CO.x0 - 60, CALLE.z0, CO.x1, CALLE.z1, 0.045, '#3e4046');
    for (let x = CO.x0 - 56; x < CO.x1 - 4; x += 8) c.piso(x, CALLE_Z - 0.15, x + 4, CALLE_Z + 0.15, 0.055, '#f5c518');
    c.piso(CO.x0 - 60, CALLE.z0 - 2.5, CO.x1, CALLE.z0, 0.12, '#bdbab2');

    // La subida en curva: una cinta de asfalto con su terraplén de tierra a los costados.
    const pos = [];
    const lado = (i) => {
      const a = RAMPA[Math.max(0, i - 1)];
      const b = RAMPA[Math.min(RAMPA.length - 1, i + 1)];
      const d = new THREE.Vector2(b.x - a.x, b.z - a.z).normalize();
      return new THREE.Vector2(-d.y, d.x).multiplyScalar(ANCHO_RAMPA / 2);
    };
    const quad = (a, b, cc, d) => pos.push(...a, ...b, ...cc, ...a, ...cc, ...d);
    const tierra = [];
    const quadT = (a, b, cc, d) => tierra.push(...a, ...b, ...cc, ...a, ...cc, ...d);
    for (let i = 0; i < RAMPA.length - 1; i++) {
      const [q, r] = [RAMPA[i], RAMPA[i + 1]];
      const [nq, nr] = [lado(i), lado(i + 1)];
      const y0 = q.y + 0.06;
      const y1 = r.y + 0.06;
      quad([q.x - nq.x, y0, q.z - nq.y], [q.x + nq.x, y0, q.z + nq.y], [r.x + nr.x, y1, r.z + nr.y], [r.x - nr.x, y1, r.z - nr.y]);
      for (const s of [-1, 1]) quadT([q.x + s * nq.x, 0, q.z + s * nq.y], [r.x + s * nr.x, 0, r.z + s * nr.y], [r.x + s * nr.x, y1 - 0.05, r.z + s * nr.y], [q.x + s * nq.x, y0 - 0.05, q.z + s * nq.y]);
    }
    const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    c.forma('liso', geo(pos), '#44464c');
    // El terraplén se ve de los dos lados: los mismos triángulos con el orden al revés.
    const reves = [];
    for (let i = 0; i < tierra.length; i += 9) reves.push(...tierra.slice(i, i + 3), ...tierra.slice(i + 6, i + 9), ...tierra.slice(i + 3, i + 6));
    c.forma('liso', geo(tierra), '#8a6f52');
    c.forma('liso', geo(reves), '#8a6f52');

    // El acantilado: la meseta de roca con pasto arriba y vetas en la cara que da al mar.
    c.caja(M.x0, 0, M.z0, M.x1, M.alto, M.z1, '#8b7560', { arriba: '#5f8a3e' });
    for (let y = 3; y < M.alto - 1; y += 3.2 + rnd() * 1.5) {
      c.caja(M.x0 - 0.3, y, M.z1 - 0.2, M.x1 + 0.3, y + 0.5 + rnd() * 0.6, M.z1 + 0.35, rnd() < 0.5 ? '#6f5c4a' : '#a08a72');
    }
    solido(M.x0, 0, M.z0, M.x1, M.alto - 0.6, M.z1);
    // Piedras al pie y en el borde de arriba (una malla instanciada).
    const rocas = [];
    for (let x = M.x0 - 6; x < M.x1 + 6; x += 3 + rnd() * 4) {
      rocas.push([x, 0.6, M.z1 + 1.5 + rnd() * 3, 1.5 + rnd() * 2.5]);
      if (rnd() < 0.5) rocas.push([x, M.alto + 0.2, M.z1 - 1 - rnd() * 2, 0.6 + rnd()]);
    }
    for (let z = M.z0; z < M.z1; z += 4 + rnd() * 4) rocas.push([M.x1 + 1.5 + rnd() * 2, 0.6, z, 1.5 + rnd() * 2.5]);
    const piedras = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#8a8378' }), rocas.length);
    const o = new THREE.Object3D();
    rocas.forEach(([x, y, z, s], i) => {
      o.position.set(x, y, z);
      o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      o.scale.set(s, s * 0.7, s);
      o.updateMatrix();
      piedras.setMatrixAt(i, o.matrix);
    });
    this.grupo.add(piedras);
    // Arbustos y algún pino arriba, para que el galpón quede escondido.
    for (let k = 0; k < 40; k++) {
      const x = M.x0 + 8 + rnd() * (M.x1 - M.x0 - 16);
      const z = M.z0 + 8 + rnd() * (M.z1 - M.z0 - 16);
      if (Math.abs(x - CO.galpon.x) < CO.galpon.ancho / 2 + 22 && Math.abs(z - CO.galpon.z) < CO.galpon.fondo / 2 + 22) continue;
      c.cil(1.6 + rnd() * 1.4, 0.05, 6 + rnd() * 5, '#2f6b33', x, M.alto, z, 7);
      c.cil(0.35, 0.35, 1.2, '#5b4330', x, M.alto - 0.1, z, 5);
    }

    // La playa de las mansiones: arena, la franja mojada, y las olas (el mar es el de playa.js).
    const PZ = CALLE.z1;
    const ancho = CO.playa.x1 - CO.playa.x0;
    const xm = (CO.playa.x0 + CO.playa.x1) / 2;
    const arena = new THREE.Mesh(new THREE.PlaneGeometry(ancho, P.orilla + 3 - PZ), new THREE.MeshLambertMaterial({ map: texArena() }));
    arena.material.map.repeat.set(ancho / 14, (P.orilla + 3 - PZ) / 14);
    arena.rotation.x = -Math.PI / 2;
    arena.position.set(xm, 0.06, (PZ + P.orilla + 3) / 2);
    const mojada = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 9), new THREE.MeshBasicMaterial({ map: texMojada(), transparent: true, depthWrite: false }));
    mojada.rotation.x = -Math.PI / 2;
    mojada.position.set(xm, 0.08, P.orilla - 3.5);
    const espuma = texEspuma();
    espuma.repeat.set(ancho / 40, 1);
    this.orilla = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 3.2), new THREE.MeshBasicMaterial({ map: espuma, transparent: true, depthWrite: false }));
    this.orilla.rotation.x = -Math.PI / 2;
    this.orilla.position.set(xm, Y_AGUA + 0.02, P.orilla);
    this.orilla.renderOrder = 2;
    this.crestas = [0, 1, 2].map((i) => {
      const t = texEspuma();
      t.repeat.set(ancho / 55, 1);
      t.offset.x = i * 0.37;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho + 100, 1.8), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(xm, Y_AGUA + 0.03, P.orilla + 20);
      m.renderOrder = 2;
      return { m, fase: i / 3 };
    });
    this.grupo.add(arena, mojada, this.orilla, ...this.crestas.map((k) => k.m));

    // Las mansiones: dos volúmenes blancos (el de arriba en voladizo), mucho vidrio, listones de
    // madera, techos planos con alero, la pileta mirando al mar, reposeras, palmeras y el auto.
    for (const ma of MANSIONES) {
      const x = ma.x;
      const z0 = PUERTA_Z + 2;
      const z1 = PUERTA_Z + 24;
      c.piso(x - 30, PZ + 0.5, x + 34, P.orilla - 8, 0.09, '#e9e4da'); // deck de piedra clara
      c.caja(x - 16, 0, z0, x + 16, 8, z1, '#f6f5f2');
      c.caja(x - 15.6, 0.4, z1 - 0.1, x + 15.6, 7.6, z1 + 0.15, '#bfe3f2', { lados: 'cristal' }); // ventanal al mar
      c.caja(x - 7, 0.4, z0 - 0.15, x - 2, 7.6, z0 + 0.1, '#bfe3f2', { lados: 'cristal' });
      c.caja(x + 2, 0.4, z0 - 0.15, x + 7, 7.6, z0 + 0.1, '#bfe3f2', { lados: 'cristal' });
      c.caja(x - 12, 8, z0 - 3, x + 20, 15, z1 - 2, '#ffffff');
      c.caja(x - 11.6, 8.4, z1 - 2.1, x + 19.6, 14.6, z1 - 1.8, '#bfe3f2', { lados: 'cristal' });
      for (let k = 0; k < 14; k++) c.caja(x - 11 + k * 1.1, 8.6, z0 - 3.25, x - 10.6 + k * 1.1, 14.6, z0 - 3, ma.color); // listones
      c.caja(x - 17, 15, z0 - 4, x + 21, 15.4, z1 - 1, '#e8e6e1'); // techo con alero
      c.caja(x - 17, 8, z0 - 1, x + 17, 8.35, z1 + 2, '#e8e6e1');
      c.caja(x - 1.6, 0, PUERTA_Z + 1.7, x + 1.6, 6.6, PUERTA_Z + 2.05, '#5a3a24'); // la puerta (madera)
      c.caja(x + 2.2, 3.2, PUERTA_Z + 1.75, x + 2.5, 3.5, PUERTA_Z + 2.05, '#d4af37'); // el timbre
      solido(x - 16, 0, z0, x + 16, 15.4, z1);
      // Pileta (borde blanco y el agua), reposeras y sombrilla.
      c.caja(x - 13, 0, z1 + 3, x + 9, 0.45, z1 + 13, '#f2f2f2');
      c.piso(x - 12.2, z1 + 3.8, x + 8.2, z1 + 12.2, 0.46, '#2ec4e8');
      for (let k = 0; k < 3; k++) {
        c.caja(x + 12 + k * 3, 0, z1 + 4, x + 13.6 + k * 3, 0.55, z1 + 9, '#ffffff');
        c.caja(x + 12 + k * 3, 0.55, z1 + 8, x + 13.6 + k * 3, 1.4, z1 + 9, '#ffffff');
      }
      c.cil(0.08, 0.08, 3, '#dddddd', x + 16, 0, z1 + 11, 5);
      c.cil(2.4, 0.1, 0.8, ma.color, x + 16, 2.8, z1 + 11, 10);
      for (const [px, pz] of [[x - 22, z0 + 2], [x - 20, z1 + 6], [x + 26, z0 + 6], [x + 24, z1 + 10]]) palmera(c, px, pz, 9 + rnd() * 4, rnd);
      solido(x - 22.6, 0, z0 + 1.4, x - 21.4, 8, z0 + 2.6);
    }
    const materiales = {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      cristal: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false }),
    };
    this.grupo.add(c.armar(materiales));

    // Autos caros estacionados al costado de cada mansión (los modelos del concesionario).
    for (const ma of MANSIONES) {
      cargarAuto(AUTOS_POR_ID[ma.auto]).then((a) => {
        a.position.set(ma.x + 25, 0.05, PUERTA_Z + 12);
        a.rotation.y = Math.PI;
        this.grupo.add(a);
        const [mx, mz] = a.userData.medio;
        solido(ma.x + 25 - mx, 0, PUERTA_Z + 12 - mz, ma.x + 25 + mx, 3, PUERTA_Z + 12 + mz);
      });
    }
  }

  // ---------- Los timbres ----------
  mansionCerca(p) {
    if (p.y > 3) return null;
    return MANSIONES.find((m) => Math.abs(p.x - m.x) < 3.5 && p.z > PUERTA_Z - 5 && p.z < PUERTA_Z + 2.5) || null;
  }

  accion(jugador) {
    return this.grupo && this.mansionCerca(jugador.pos) ? 'Tocar el timbre (E)' : '';
  }

  // Sale el dueño a la puerta y charla (distinto si ya compraste el galpón de tanzania).
  async hacer(jugador) {
    const ma = this.mansionCerca(jugador.pos);
    if (!ma) return;
    this.pausar(true);
    let d = this.duenos[ma.id];
    if (!d) {
      const p = { id: `dueno_${ma.id}`, nombre: ma.nombre, sinFoto: true, ...ma.look };
      const cab = await cargarCabeza(p);
      if (!cab.dibujada) {
        dibujarCara(cab.frente, p.piel, p.pelo);
        cab.dibujada = true;
      }
      const m = crearPersonaje(p, cab);
      const et = crearEtiqueta([{ texto: ma.nombre, tam: 56, color: '#ffffff' }], 4);
      et.sprite.position.y = 6.6;
      m.grupo.add(et.sprite);
      m.grupo.position.set(ma.x - 0.3, 0.05, PUERTA_Z + 1.1); // en el umbral
      this.grupo.add(m.grupo);
      d = this.duenos[ma.id] = { m, cara: cab.frente.toDataURL(), t: 0 };
    }
    d.m.grupo.visible = true;
    d.t = 12;
    d.m.grupo.rotation.y = Math.atan2(jugador.pos.x - d.m.grupo.position.x, jugador.pos.z - d.m.grupo.position.z);
    const lineas = this.estado.tanzania?.compras?.includes('tz_galpon') ? ma.conGalpon : ma.sinGalpon;
    await new Promise((res) => this.ui.dialogo({ nombre: ma.nombre, cara: d.cara, remera: ma.look.remera, lineas, alTerminar: res }));
    this.pausar(false);
  }

  actualizar(dt, jugador) {
    const x = jugador.pos.x;
    const cerca = x > CO.x0 - 900 && x < CO.x1 + 600;
    if (cerca && !this.grupo) this.armar();
    if (!this.grupo) return;
    this.grupo.visible = cerca;
    if (!cerca) return;
    this.reloj += dt;
    const t = this.reloj;
    this.orilla.position.z = P.orilla + Math.sin(t * 0.8) * 0.9;
    this.orilla.material.opacity = 0.7 + Math.sin(t * 0.8 + 1) * 0.25;
    for (const k of this.crestas) {
      const f = (t * 0.06 + k.fase) % 1;
      k.m.position.z = P.orilla + 2 + (1 - f) * 40;
      k.m.material.opacity = Math.sin(f * Math.PI) * 0.75;
      k.m.material.map.offset.x += dt * 0.01;
    }
    // El dueño vuelve a entrar al rato.
    for (const d of Object.values(this.duenos)) {
      if (!d.m.grupo.visible) continue;
      d.m.animar(dt, 0, true);
      if ((d.t -= dt) <= 0) d.m.grupo.visible = false;
    }
  }
}
