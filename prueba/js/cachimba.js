import * as THREE from 'three';
import { CACHIMBA as CA, AUTOPISTA as AU } from './constantes.js';
import { Constructor, dibujarCara } from './ciudad.js';
import { crearPersonaje } from './personaje.js';
import { cargarCabeza, crearEtiqueta, liberarAlSubir } from './texturas.js';
import { crearAK } from './arma.js';
import { crearPerro, SCHWEPA } from './ladron.js';
import { MANU } from './manu.js';
import { HUMANO } from './humano.js';
import { aleatorio, caja, formato } from './util.js';
import { sfx } from './sfx.js';

// La Cachimba del Piojo: el barrio de El Humano (humano.js). Existe solo después de que te invita:
// bien apartada, al norte de la autopista, con un camino de tierra que sale de ella. Calles de barro
// con charcos, casillas de chapa y de ladrillo sin revocar (algunas a medio hacer, con los hierros
// para arriba), cables, basura, un auto quemado, tachos con fuego, villeros (tatuados, armados, sin
// remera o con la ropa rota), perros flacos y lastimados, El Humano en la entrada y a veces la
// Schwepa y Manu Mendez. Cada vez que entrás hay un 30% de que te roben toda la plata.
const ROBO = 0.3;
const HUMANO_PAGA = 1.5; // lo que paga El Humano por cada bolsita de tanzania (veces lo que vale)
const CALLE_X = CA.entrada; // la calle principal (de barro), sigue al camino de tierra
const CRUCES = [CA.z0 + 55, CA.z0 + 120]; // las dos calles que la cruzan
const enCalle = (x0, z0, x1, z1) => (x1 > CALLE_X - 7 && x0 < CALLE_X + 7) || CRUCES.some((z) => z1 > z - 6 && z0 < z + 6);

// Textura de un solo dibujo (se sube a la placa de video y se libera el canvas).
function textura(w, h, dibujar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = liberarAlSubir(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Chapa acanalada (rayas verticales, con óxido): una canaleta cada 1/16 del canvas.
const texChapa = () => textura(64, 64, (g, w, h) => {
  for (let x = 0; x < w; x += 4) {
    g.fillStyle = '#e6e6e6'; g.fillRect(x, 0, 2, h);
    g.fillStyle = '#9a9a9a'; g.fillRect(x + 2, 0, 2, h);
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(${120 + i * 2},${60 + i},30,0.35)`;
    g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 2 + Math.random() * 10);
  }
});
// Ladrillo sin revocar (u, v en unidades / 4): hiladas desparejas con mezcla que chorrea.
const texLadrillo = () => textura(64, 64, (g, w, h) => {
  g.fillStyle = '#b8b0a2';
  g.fillRect(0, 0, w, h);
  for (let f = 0; f < 8; f++) {
    for (let k = -1; k < 4; k++) {
      const x = k * 18 + (f % 2) * 9;
      const t = 205 + ((f * 7 + k * 13) % 5) * 10;
      g.fillStyle = `rgb(${t},${t - 90},${t - 140})`;
      g.fillRect(x + 1, f * 8 + 1, 16, 6);
    }
  }
});

// Los villeros: piel, remera (null: sin remera), pantalón, arma (ak, fierro o nada) y si tiene la
// ropa rota. Cada uno con dónde está (relativo a la calle principal / la primera cruzada).
const VILLEROS = [
  { piel: '#8d5524', remera: null, pantalon: '#3a3f4a', arma: 'ak', x: -5, z: 30, a: 0.4 },
  { piel: '#c68642', remera: '#5b5f3a', pantalon: '#1e1e1e', arma: 'fierro', rota: true, x: 5, z: 26, a: -2.4 },
  { piel: '#e0ac69', remera: null, pantalon: '#e2e2e2', arma: null, x: -3, z: -15, a: 1.2 },
  { piel: '#8d5524', remera: '#7a2a2a', pantalon: '#2b2b2b', arma: 'ak', rota: true, x: 20, z: 3, a: -1.6 },
  { piel: '#a86b45', remera: '#c9c4b0', pantalon: '#4b3a2a', arma: null, rota: true, x: 24, z: -3, a: -1.1 },
  { piel: '#c68642', remera: null, pantalon: '#24324a', arma: 'fierro', x: -22, z: 68, a: 2.6 },
  { piel: '#e0ac69', remera: '#2f4f2f', pantalon: '#1b1b1b', arma: null, rota: true, x: -26, z: 62, a: 1.0 },
  { piel: '#8d5524', remera: null, pantalon: '#5d4037', arma: null, x: 4, z: 92, a: 3.0 },
  { piel: '#a86b45', remera: '#1f2a44', pantalon: '#2d2d2d', arma: 'ak', x: 30, z: 66, a: -2.0 },
  { piel: '#c68642', remera: '#8a7f6a', pantalon: '#3a3a3a', arma: null, rota: true, x: -40, z: -2, a: 0.6 },
  { piel: '#e0ac69', remera: null, pantalon: '#202020', arma: 'fierro', x: 3, z: 118, a: 3.4 },
  { piel: '#8d5524', remera: '#4a3a5a', pantalon: '#1b1b1b', arma: null, rota: true, x: -6, z: 120, a: 2.8 },
];
// Perros de la calle: flacos, sucios y lastimados (manchas peladas y heridas).
const PERRO = { panza: '#9b8a70', ojos: '#2b1a10', largo: 1.9, alto: 0.95, ancho: 0.62, cabeza: 0.8, hocico: 0.5, orejas: 0.45, cola: 0.8, gordura: 0 };
const PERROS = [['#6d5a42', 6, 10], ['#3b342c', -6, 44], ['#8a7a5c', 12, 70], ['#55483a', -10, 104], ['#7a6a52', 30, 58]];

// Un pibe de la villa con su ropa (o sin), tatuajes y heridas, y el arma en la mano.
function detallesVillero(v) {
  return ({ cuerpo, brazoI, brazoD, anchoTorso: A, fondoTorso: D, grosorBrazo: Gb }) => {
    const tinta = '#24303a';
    // Tatuajes tumberos: bandas en los brazos y marcas en el pecho, la panza y la espalda.
    for (const b of [brazoI, brazoD]) {
      b.add(caja(Gb + 0.05, 0.22, Gb + 0.05, tinta, 0, -0.55, 0));
      b.add(caja(Gb + 0.05, 0.08, Gb + 0.05, tinta, 0, -0.85, 0));
    }
    if (!v.remera) {
      cuerpo.add(caja(0.5, 0.42, 0.03, tinta, -A * 0.22, 1.42, D / 2 + 0.03)); // la virgen en el pecho
      cuerpo.add(caja(0.1, 0.5, 0.03, tinta, A * 0.25, 1.4, D / 2 + 0.03)); // la cruz
      cuerpo.add(caja(0.36, 0.1, 0.03, tinta, A * 0.25, 1.5, D / 2 + 0.03));
      cuerpo.add(caja(A * 0.7, 0.16, 0.03, tinta, 0, 0.75, D / 2 + 0.03)); // el nombre en la panza
      cuerpo.add(caja(A * 0.55, 0.6, 0.03, tinta, 0, 1.35, -D / 2 - 0.03)); // la espalda
    }
    // Ropa rota y sucia: agujeros (se ve la piel), manchas y un roto en la manga.
    if (v.rota) {
      for (const [x, y, w, h] of [[-0.35, 0.9, 0.34, 0.26], [0.42, 1.55, 0.22, 0.3], [0.1, 0.55, 0.4, 0.14]]) cuerpo.add(caja(w, h, 0.03, v.piel, x * A, y, D / 2 + 0.02));
      cuerpo.add(caja(0.5, 0.36, 0.03, '#4a3d2c', -0.15 * A, 1.25, D / 2 + 0.025));
      cuerpo.add(caja(0.4, 0.5, 0.03, '#3a3024', 0.2 * A, 1.0, -D / 2 - 0.025));
    }
  };
}

function fierro() {
  const g = new THREE.Group();
  g.add(caja(0.16, 0.22, 0.75, '#1a1a1c', 0, 0, 0.25)); // caño
  g.add(caja(0.16, 0.5, 0.24, '#2a2420', 0, -0.25, -0.05)); // culata
  return g;
}

export class Cachimba {
  // colisiones: la lista de choques de afuera de la ciudad (main.js).
  constructor({ escena, estado, ui, guardar, colisiones }) {
    Object.assign(this, { escena, estado, ui, guardar, colisiones });
    this.grupo = null;
    this.adentro = false;
    this.robo = 0; // segundos hasta que te roban (si te toca)
    this.gente = [];
    this.perros = [];
  }

  get invitado() { return !!this.estado.cachimba; }

  dentro(p, m = 0) { return p.x > CA.x0 - m && p.x < CA.x1 + m && p.z > CA.z0 - m && p.z < CA.z1 + m; }

  armar() {
    if (this.grupo || !this.invitado) return;
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    const rnd = aleatorio(4141);
    const c = new Constructor();
    const solido = (x0, y0, z0, x1, y1, z1) => this.colisiones.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
    // El piso: tierra, barro más oscuro en las calles y charcos.
    c.piso(CA.x0, CA.z0, CA.x1, CA.z1, 0.04, '#7a5c3c');
    c.piso(CALLE_X - 6, CA.z0, CALLE_X + 6, CA.z1, 0.06, '#5a4029');
    for (const z of CRUCES) c.piso(CA.x0 + 8, z - 5, CA.x1 - 8, z + 5, 0.06, '#5a4029');
    // El camino de tierra desde la autopista, con las huellas de las ruedas.
    const z1 = AU.z - AU.medioAncho;
    c.piso(CALLE_X - 4.5, CA.z1, CALLE_X + 4.5, z1, 0.05, '#8a6a45');
    for (const s of [-1.6, 1.6]) c.piso(CALLE_X + s - 0.4, CA.z1, CALLE_X + s + 0.4, z1, 0.07, '#6e5236');
    const charco = (x, z, r, color = '#3b3a34') => {
      const g = new THREE.CircleGeometry(r, 12).rotateX(-Math.PI / 2);
      g.scale(1, 1, 0.55 + rnd() * 0.5);
      g.translate(x, 0.09, z);
      c.forma('liso', g, color);
    };
    for (let i = 0; i < 26; i++) charco(CALLE_X + (rnd() - 0.5) * 10, CA.z0 + rnd() * (CA.z1 - CA.z0), 1 + rnd() * 2.4, rnd() < 0.5 ? '#3b3a34' : '#4a3a28');
    for (const z of CRUCES) for (let i = 0; i < 8; i++) charco(CA.x0 + 10 + rnd() * (CA.x1 - CA.x0 - 20), z + (rnd() - 0.5) * 8, 0.8 + rnd() * 2);
    for (let i = 0; i < 10; i++) charco(CALLE_X + (rnd() - 0.5) * 7, CA.z1 + rnd() * (z1 - CA.z1), 0.8 + rnd() * 1.6, '#4f4232');

    // Las casillas, en los terrenos que no son calle.
    const CHAPAS = ['#9aa0a6', '#8a5a3a', '#6f8796', '#a3672f', '#7d7f6a', '#9c4f3a', '#5f6e7a'];
    for (let x = CA.x0 + 4; x < CA.x1 - 8; x += 13) {
      for (let z = CA.z0 + 4; z < CA.z1 - 8; z += 12) {
        const w = 7 + rnd() * 4;
        const d = 6 + rnd() * 3.5;
        const x0 = x + rnd() * 2;
        const z0 = z + rnd() * 2;
        const x1 = x0 + w;
        const zz1 = z0 + d;
        if (enCalle(x0, z0, x1, zz1) || rnd() < 0.12) continue;
        const alto = 2.8 + rnd() * 1.4;
        const ladrillo = rnd() < 0.38;
        const pared = ladrillo ? '#ffffff' : CHAPAS[Math.floor(rnd() * CHAPAS.length)];
        c.caja(x0, 0, z0, x1, alto, zz1, pared, { lados: ladrillo ? 'ladrillo' : 'chapa', arriba: '#6b6b6b' });
        // Una chapa del techo inclinada, que sobresale (con cubiertas arriba para que no se vuele).
        const techo = new THREE.BoxGeometry(w + 1.2, 0.08, d + 1.2);
        techo.rotateX((rnd() - 0.5) * 0.18);
        techo.rotateZ((rnd() - 0.5) * 0.14);
        techo.translate((x0 + x1) / 2, alto + 0.25, (z0 + zz1) / 2);
        c.forma('chapa', techo, CHAPAS[Math.floor(rnd() * CHAPAS.length)]);
        for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
          const cub = new THREE.TorusGeometry(0.5, 0.2, 6, 10).rotateX(Math.PI / 2);
          cub.translate(x0 + 1 + rnd() * (w - 2), alto + 0.45, z0 + 1 + rnd() * (d - 2));
          c.forma('liso', cub, '#151515');
        }
        // La puerta (una cortina o una chapa) y un agujero de ventana, hacia la calle principal.
        const lado = (x0 + x1) / 2 < CALLE_X ? x1 : x0;
        const s = lado === x1 ? 1 : -1;
        const pz = z0 + 1 + rnd() * (d - 3);
        c.caja(lado - 0.05 * s, 0, pz, lado + 0.06 * s, 2.2, pz + 1.1, rnd() < 0.5 ? '#2a1f18' : ['#7b1f2a', '#1f4f7b', '#c9a227'][Math.floor(rnd() * 3)]);
        if (d > 7) c.caja(lado - 0.05 * s, 1.2, pz + 2.2 > zz1 - 0.8 ? z0 + 0.6 : pz + 2.2, lado + 0.06 * s, 2, (pz + 2.2 > zz1 - 0.8 ? z0 + 0.6 : pz + 2.2) + 1, '#101010');
        solido(x0, 0, z0, x1, alto + 0.4, zz1);
        // A medio hacer: un piso de arriba con las columnas y los hierros para arriba.
        if (ladrillo && rnd() < 0.55) {
          c.caja(x0, alto, z0, x1, alto + 0.3, zz1, '#9a9a94');
          for (const [cx, cz] of [[x0 + 0.3, z0 + 0.3], [x1 - 0.3, z0 + 0.3], [x0 + 0.3, zz1 - 0.3], [x1 - 0.3, zz1 - 0.3]]) {
            const h = 0.8 + rnd() * 1.8;
            c.caja(cx - 0.25, alto + 0.3, cz - 0.25, cx + 0.25, alto + 0.3 + h, cz + 0.25, '#a0a09a');
            for (const [hx, hz] of [[-0.12, -0.12], [0.12, 0.12], [-0.12, 0.12], [0.12, -0.12]]) c.caja(cx + hx - 0.025, alto + 0.3 + h, cz + hz - 0.025, cx + hx + 0.025, alto + 1.4 + h, cz + hz + 0.025, '#5a3a24');
          }
          c.caja(x0, alto + 0.3, z0, x0 + w * 0.6, alto + 1.5, z0 + 0.25, '#ffffff', { lados: 'ladrillo' }); // una pared empezada
        }
      }
    }
    // Postes de luz de madera con los cables colgando (y alguno "colgado" de otro).
    const postes = [];
    for (let z = CA.z1 - 6; z > CA.z0; z -= 24) postes.push([CALLE_X + (postes.length % 2 ? 6.5 : -6.5), z]);
    for (const [x, z] of postes) {
      c.cil(0.16, 0.2, 7.5, '#5b4330', x, 0, z, 6);
      c.caja(x - 1, 7, z - 0.08, x + 1, 7.15, z + 0.08, '#4a3626');
    }
    for (let i = 1; i < postes.length; i++) {
      const [ax, az] = postes[i - 1];
      const [bx, bz] = postes[i];
      for (const h of [6.9, 6.4, 5.8]) {
        const largo = Math.hypot(bx - ax, bz - az);
        const g = new THREE.CylinderGeometry(0.03, 0.03, largo, 4).rotateX(Math.PI / 2);
        g.rotateY(Math.atan2(bx - ax, bz - az));
        g.translate((ax + bx) / 2, h - 0.5, (az + bz) / 2);
        c.forma('liso', g, '#111111');
      }
    }
    // Basura, cubiertas tiradas, un colchón viejo, tachos con fuego y un auto quemado.
    const BASURA = ['#2b2b2b', '#4a6b3a', '#8a8a8a', '#c9c2a8', '#3a4a6b', '#6b3a3a'];
    for (let i = 0; i < 40; i++) {
      const x = CALLE_X + (rnd() < 0.5 ? -1 : 1) * (5 + rnd() * 2);
      const z = CA.z0 + rnd() * (CA.z1 - CA.z0);
      const t = 0.3 + rnd() * 0.6;
      c.caja(x - t, 0, z - t * 0.7, x + t, t * 0.8, z + t * 0.7, BASURA[Math.floor(rnd() * BASURA.length)]);
    }
    for (let i = 0; i < 6; i++) {
      const g = new THREE.TorusGeometry(0.55, 0.22, 6, 10).rotateX(Math.PI / 2);
      g.translate(CALLE_X + (rnd() - 0.5) * 12, 0.22, CA.z0 + 10 + rnd() * (CA.z1 - CA.z0 - 20));
      c.forma('liso', g, '#141414');
    }
    c.caja(CALLE_X + 7.5, 0, CRUCES[0] + 8, CALLE_X + 9.5, 0.35, CRUCES[0] + 12, '#8c8270');
    this.fuegos = [];
    for (const [x, z] of [[CALLE_X - 4, CRUCES[0] - 3], [CALLE_X + 3.5, CRUCES[1] + 3], [CALLE_X - 2, CA.z1 - 14]]) {
      c.cil(0.55, 0.55, 1.3, '#6b3a1e', x, 0, z, 10);
      c.cil(0.5, 0.05, 1.1, '#ff8a1e', x, 1.3, z, 7, 'luz');
      c.cil(0.3, 0.02, 1.5, '#ffd34a', x, 1.3, z, 6, 'luz');
      this.fuegos.push([x, z]);
    }
    const ax = CALLE_X - 4.5;
    const az = CRUCES[1] - 18;
    c.caja(ax - 1.1, 0.5, az - 2.4, ax + 1.1, 1.3, az + 2.4, '#2a2420');
    c.caja(ax - 1, 1.3, az - 1.2, ax + 1, 2, az + 1, '#1a1715');
    for (const [rx, rz] of [[-1.1, -1.5], [1.1, -1.5], [-1.1, 1.5], [1.1, 1.5]]) c.caja(ax + rx - 0.15, 0, az + rz - 0.4, ax + rx + 0.15, 0.6, az + rz + 0.4, '#5a3a24'); // sin ruedas, sobre ladrillos
    solido(ax - 1.1, 0, az - 2.4, ax + 1.1, 2, az + 2.4);
    // Una soga con ropa colgada entre dos casillas.
    for (const z of [CRUCES[0] + 18, CRUCES[1] + 20]) {
      c.caja(CALLE_X - 6, 2.6, z - 0.02, CALLE_X + 6, 2.64, z + 0.02, '#d8d8d8');
      for (let k = 0; k < 6; k++) c.caja(CALLE_X - 5 + k * 1.8, 1.7, z - 0.03, CALLE_X - 4.2 + k * 1.8, 2.6, z + 0.03, BASURA[(k + 2) % BASURA.length]);
    }
    const materiales = {
      liso: new THREE.MeshLambertMaterial({ vertexColors: true }),
      luz: new THREE.MeshBasicMaterial({ vertexColors: true }),
      chapa: new THREE.MeshLambertMaterial({ vertexColors: true, map: texChapa(), side: THREE.DoubleSide }),
      ladrillo: new THREE.MeshLambertMaterial({ vertexColors: true, map: texLadrillo() }),
    };
    this.grupo.add(c.armar(materiales));
    this.cartel();
    this.poblar(rnd);
  }

  // El cartel de la entrada, pintado a mano en una madera.
  cartel() {
    const t = textura(512, 160, (g, w, h) => {
      g.fillStyle = '#7a5434';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < h; y += 40) g.fillRect(0, y, w, 3);
      g.fillStyle = '#f2ead8';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '800 42px "Comic Sans MS", Arial, sans-serif';
      g.fillText('LA CACHIMBA', w / 2, 52);
      g.fillText('DEL PIOJO', w / 2, 108);
      g.fillStyle = '#c0281f';
      g.font = '800 26px Arial, sans-serif';
      g.fillText('NO ENTRAR SI NO SOS DE ACÁ', w / 2, 146);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
    placa.position.set(CALLE_X + 7.5, 3.4, CA.z1 + 6);
    placa.rotation.set(0, 0.25, 0.05);
    this.grupo.add(placa);
    for (const dx of [-2.6, 2.6]) this.grupo.add(caja(0.2, 3.6, 0.2, '#5b4330', CALLE_X + 7.5 + dx * Math.cos(0.25), 1.8, CA.z1 + 6 - dx * Math.sin(0.25)));
  }

  async persona(p, x, z, a, extra) {
    const cab = await cargarCabeza(p);
    if (p.sinFoto && !cab.dibujada) {
      dibujarCara(cab.frente, p.piel, p.pelo);
      cab.dibujada = true;
    }
    const m = crearPersonaje(p, cab);
    m.grupo.position.set(x, 0.05, z);
    m.grupo.rotation.y = a;
    extra?.(m);
    this.grupo.add(m.grupo);
    this.gente.push(m);
    return m;
  }

  async poblar(rnd) {
    const z0 = CRUCES[0];
    for (const [n, v] of VILLEROS.entries()) {
      const p = {
        id: `villero${n % 6}`, nombre: ' ', sinFoto: true, sinCara: true, piel: v.piel, pelo: '#151010', peinado: n % 3 ? 'liso' : 'rulos',
        remera: v.remera || v.piel, pantalon: v.pantalon, cuerpo: n === 7 ? 'gordo' : undefined, detallar: detallesVillero(v),
      };
      await this.persona(p, CALLE_X + v.x, z0 + v.z - 30, v.a, (m) => {
        if (v.arma === 'ak') { const ak = crearAK(); ak.position.set(0, -1.9, 0); ak.rotation.x = Math.PI / 2; m.manoD.add(ak); m.apuntar = true; }
        if (v.arma === 'fierro') { const f = fierro(); f.position.set(0, -1.95, 0.1); m.manoD.add(f); }
      });
    }
    // El Humano, en la entrada, esperándote.
    this.humano = await this.persona(HUMANO, CALLE_X + 3, CA.z1 - 4, Math.PI, (m) => {
      const et = crearEtiqueta([{ texto: HUMANO.nombre, tam: 60, color: '#ffffff' }], 4);
      et.sprite.position.y = 6.6;
      m.grupo.add(et.sprite);
    });
    // La Schwepa y Manu (a veces: se tira cada vez que entrás).
    const conAK = (m) => { const ak = crearAK(); ak.position.set(0, -1.9, 0); ak.rotation.x = Math.PI / 2; m.manoD.add(ak); m.apuntar = true; };
    this.schwepa = await this.persona(SCHWEPA, CALLE_X - 9, CRUCES[1] + 4, 1.2, conAK);
    this.manu = await this.persona(MANU, CALLE_X - 11, CRUCES[1] + 1, 1.6, conAK);
    this.manu.grupo.scale.setScalar(1.12);
    for (const [pelo, x, z] of PERROS) {
      const perro = crearPerro({ ...PERRO, pelo });
      const g = perro.grupo;
      // Lastimados: peladas rosadas y una herida.
      g.add(caja(0.35, 0.3, 0.4, '#c98f86', 0.32, 0.75, -0.2));
      g.add(caja(0.25, 0.2, 0.3, '#7a1c18', -0.3, 0.9, 0.1));
      g.position.set(CALLE_X + x, 0.05, z0 + z - 30);
      g.rotation.y = rnd() * Math.PI * 2;
      this.grupo.add(g);
      this.perros.push(perro);
    }
    this.sortear();
  }

  // Quién está esta vez (la Schwepa y Manu, a veces).
  sortear() {
    if (this.schwepa) this.schwepa.grupo.visible = Math.random() < 0.5;
    if (this.manu) this.manu.grupo.visible = Math.random() < 0.4;
  }

  actualizar(dt, jugador, jugando) {
    const p = jugador.pos;
    // Se arma recién cuando venís para este lado (no al cargar la partida: pico de memoria del iPhone).
    if (!this.grupo && this.dentro(p, 1000)) this.armar();
    if (!this.grupo) return;
    const cerca = this.dentro(p, 150);
    this.grupo.visible = this.dentro(p, 700); // desde la autopista se ve; más lejos, no se dibuja
    if (cerca) {
      this.t = (this.t || 0) + dt;
      for (const m of this.gente) if (m.grupo.visible) m.animar(dt, 0, true);
      for (const [i, perro] of this.perros.entries()) perro.cola.rotation.y = Math.sin(this.t * 3 + i) * 0.25;
      if (this.humano) {
        const g = this.humano.grupo;
        g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z);
      }
    }
    const ahora = jugando && this.dentro(p);
    if (ahora && !this.adentro) this.entrar();
    if (!this.dentro(p, 40)) this.adentro = false;
    if (ahora && this.robo > 0 && (this.robo -= dt) <= 0) this.robar();
  }

  // Venderle tanzania a El Humano (la que llevás encima: tanzania.js). Paga más que el galpón.
  accion(jugador) {
    const h = this.humano?.grupo;
    if (!h || jugador.conduciendo || !((this.tanzania?.datos.encima || 0) > 0)) return '';
    return Math.hypot(jugador.pos.x - h.position.x, jugador.pos.z - h.position.z) < 5 ? 'Venderle tanzania a El Humano (E)' : '';
  }

  async hacer() {
    const n = this.tanzania.datos.encima;
    const cara = (await cargarCabeza(HUMANO)).frente.toDataURL();
    const decir = (lineas, opciones) => new Promise((res) => this.ui.dialogo({ nombre: HUMANO.nombre, cara, remera: HUMANO.remera, lineas, opciones, alElegir: res, alTerminar: () => res(-1) }));
    this.pausar?.(true);
    const r = await decir(['¿Qué traés ahí, amigo? …¿Eso es tanzania? ¡La puta madre, amigo!', `Acá en la Cachimba esto vuela. Te compro las ${n} bolsitas, ya mismo.`], ['Dale, vendelas', 'No, después']);
    if (r === 0) {
      this.tanzania.vender(HUMANO_PAGA);
      await decir(['Sos un capo, amigo. Volvé cuando quieras, que acá siempre hay quien compre.']);
    }
    this.pausar?.(false);
  }

  entrar() {
    this.adentro = true;
    this.sortear();
    const c = this.estado.cachimba;
    if (!c.visitada) {
      c.visitada = true;
      this.guardar();
      this.ui.toast('El Humano: "¡Viniste, amigo! Bienvenido a La Cachimba del Piojo"', 'info', 5000);
    }
    this.robo = Math.random() < ROBO ? 5 + Math.random() * 10 : 0;
  }

  robar() {
    const plata = this.estado.plata;
    if (plata <= 0) return;
    this.estado.plata = 0;
    this.guardar();
    sfx.robo();
    this.ui.toast(`¡Dame todo, gil! Te robaron toda la plata en La Cachimba del Piojo (-$${formato(plata)})`, 'error', 6000);
  }
}
