import * as THREE from 'three';
import { caja, matTex, aleatorio } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TERRENO as T, CALLE_Z, RESTO as R, PARRILLA as PA, GYM, MONTANA as MO, BOSQUE_CUSI as BO, CUSI_ESCONDIDO as CU } from './constantes.js';
import { crearCielo } from './cielo.js';

// Largo del barrio (en x): llega del gym (-455) al restaurante (+160) con margen.
const LARGO = 1300;

export function crearMundo(escena) {
  // Cielo, sol, luna, estrellas, luces y el dirigible: cambian con la hora (cielo.js).
  const cielo = crearCielo(escena);

  // Pasto general (el baseplate del terreno es la primera compra). Llega hasta el gym.
  const pasto = new THREE.Mesh(new THREE.PlaneGeometry(LARGO, 800), matTex('pastoLibre', '#79b957', 6));
  pasto.rotation.x = -Math.PI / 2;
  escena.add(pasto);

  // Bloques quietos del barrio: main.js los pasa al lote para dibujarlos juntos.
  const estaticos = new THREE.Group();
  escena.add(estaticos);

  crearCalle(estaticos);
  crearCasasVecinas(estaticos);
  const montana = crearMontana(escena);
  crearArboles(escena, montana.altura);
  const nubes = crearNubes(escena);

  return {
    estaticos,
    choques: montana.choques, // la piedra de la cima
    altura: montana.altura, // piso de la montaña en (x, z) (0 fuera de ella)
    // t: segundos jugados (para la hora del día). farolas: cuánta luz de farolas hay (0 a 1).
    // centro: dónde está la cámara (el cielo la sigue).
    // interior: 0 a 1, adentro de un lugar con luces fuertes (ver cielo.js).
    actualizar(dt, t = 0, farolas = false, centro = null, interior = 0) {
      nubes.actualizar(dt);
      cielo.actualizar(dt, t, farolas, nubes.material.color, centro, interior);
    },
  };
}

function crearCalle(escena) {
  const g = new THREE.Group();
  g.add(caja(LARGO, 0.1, 12, '#4d4f55', 0, 0.05, CALLE_Z));
  g.add(caja(LARGO, 0.25, 2.5, '#c9c9c9', 0, 0.125, CALLE_Z - 7.25));
  g.add(caja(LARGO, 0.25, 2.5, '#c9c9c9', 0, 0.125, CALLE_Z + 7.25));
  g.add(caja(6, 0.08, CALLE_Z - 7 - T.z1, '#bdbdbd', 0, 0.04, (T.z1 + CALLE_Z - 6) / 2)); // vereda al terreno
  escena.add(g);

  // Líneas amarillas punteadas: un solo InstancedMesh.
  const n = Math.floor(LARGO / 10) - 1;
  const lineas = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.12, 0.35), new THREE.MeshLambertMaterial({ color: '#ffd23f' }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-LARGO / 2 + 10 + i * 10, 0.08, CALLE_Z);
    lineas.setMatrixAt(i, m);
  }
  escena.add(lineas);
}

function crearCasasVecinas(escena) {
  const techoGeo = new THREE.ConeGeometry(1, 1, 4);
  techoGeo.rotateY(Math.PI / 4);
  const colores = ['#f4a261', '#90caf9', '#f48fb1', '#fff59d', '#a5d6a7', '#ce93d8'];
  const techos = ['#8d3b2f', '#455a64', '#6d4c41'];
  const z = CALLE_Z + 22;
  // Seis frente a la mansión y algunas más por la cuadra del gym.
  const xs = [-75, -45, -15, 15, 45, 75, -395, -425, -455, -485];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const g = new THREE.Group();
    g.add(caja(14, 8, 11, colores[i % colores.length], 0, 4, 0));
    const techo = new THREE.Mesh(techoGeo, new THREE.MeshLambertMaterial({ color: techos[i % 3] }));
    techo.scale.set(14 / Math.SQRT2 * 1.1, 4.5, 11 / Math.SQRT2 * 1.1);
    techo.position.y = 10.25;
    g.add(techo);
    g.add(caja(2.4, 4, 0.3, '#6d4c41', 0, 2, -5.6));
    g.add(caja(2.6, 2, 0.3, '#bfe7ff', -4, 4.5, -5.6));
    g.add(caja(2.6, 2, 0.3, '#bfe7ff', 4, 4.5, -5.6));
    g.position.set(x, 0, z);
    escena.add(g);
  }
}

function crearArboles(escena, altura = () => 0) {
  const rnd = aleatorio(7);
  const puntos = [];
  // Árboles alrededor de la mansión y, más desparramados, por todo el camino hasta el gym.
  for (const [cuantos, anchoX] of [[70, 440], [90, LARGO - 80]]) {
    let n = 0;
    while (n < cuantos) {
      const x = (rnd() - 0.5) * anchoX;
      const z = (rnd() - 0.5) * 360;
      if (x > T.x0 - 6 && x < T.x1 + 6 && z > T.z0 - 6 && z < T.z1 + 6) continue; // terreno
      if (z > CALLE_Z - 10 && z < CALLE_Z + 34) continue;                          // calle y casas
      if (x > R.x0 - 8 && x < PA.x + 14 && z > R.z0 - 8 && z < CALLE_Z) continue;    // restaurante y parrilla
      if (x > GYM.x0 - 8 && x < GYM.x1 + 8 && z > GYM.z0 - 8 && z < CALLE_Z) continue; // gym
      if (Math.hypot(x - MO.x, z - MO.z) < MO.r + 6) continue;                      // montaña
      puntos.push([x, z, 0.8 + rnd() * 0.6]);
      n++;
    }
  }
  // Bosque tupido al pie de la montaña (ahí se esconde el Cusi): árboles grandes y juntos,
  // dejando un huequito para él.
  let enBosque = 0;
  while (enBosque < 46) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * BO.r;
    const x = BO.x + Math.cos(a) * r;
    const z = BO.z + Math.sin(a) * r;
    if (Math.hypot(x - CU.x, z - CU.z) < 3.2) continue;
    puntos.push([x, z, 1.05 + rnd() * 0.55]);
    enBosque++;
  }
  const n = puntos.length;
  const troncos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#7a5230' }), n);
  const copas = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshLambertMaterial({ color: '#ffffff' }), n * 2);
  const o = new THREE.Object3D();
  const color = new THREE.Color();
  const verdes = ['#2e7d32', '#388e3c', '#43a047', '#1b5e20'];
  puntos.forEach(([x, z, s], i) => {
    o.position.set(x, 2 * s + altura(x, z) - 0.3, z);
    o.scale.set(1.1 * s, 4 * s, 1.1 * s);
    o.updateMatrix();
    troncos.setMatrixAt(i, o.matrix);
    color.set(verdes[i % verdes.length]);
    o.position.set(x, 5.5 * s + altura(x, z) - 0.3, z);
    o.scale.set(4 * s, 5 * s, 4 * s);
    o.updateMatrix();
    copas.setMatrixAt(i * 2, o.matrix);
    copas.setColorAt(i * 2, color);
    o.position.set(x, 8.3 * s + altura(x, z) - 0.3, z);
    o.scale.set(2.8 * s, 4 * s, 2.8 * s);
    o.updateMatrix();
    copas.setMatrixAt(i * 2 + 1, o.matrix);
    copas.setColorAt(i * 2 + 1, color);
  });
  escena.add(troncos, copas);
}

function crearNubes(escena) {
  const rnd = aleatorio(42);
  const nubes = [];
  for (let i = 0; i < 26; i++) {
    const partes = [];
    const n = 3 + Math.floor(rnd() * 2);
    for (let j = 0; j < n; j++) {
      partes.push({ dx: (j - n / 2) * 6 + rnd() * 2, dy: rnd() * 2, dz: (rnd() - 0.5) * 5, w: 8 + rnd() * 6, h: 3 + rnd() * 2, d: 6 + rnd() * 4 });
    }
    nubes.push({ x: (rnd() - 0.5) * LARGO, y: 55 + rnd() * 25, z: (rnd() - 0.5) * 400, vel: 1.5 + rnd() * 1.5, partes });
  }
  const total = nubes.reduce((a, n) => a + n.partes.length, 0);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), total);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  escena.add(mesh);
  const o = new THREE.Object3D();

  function actualizar(dt) {
    let k = 0;
    for (const n of nubes) {
      n.x += n.vel * dt;
      if (n.x > LARGO / 2) n.x = -LARGO / 2;
      for (const p of n.partes) {
        o.position.set(n.x + p.dx, n.y + p.dy, n.z + p.dz);
        o.scale.set(p.w, p.h, p.d);
        o.updateMatrix();
        mesh.setMatrixAt(k++, o.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  actualizar(0);
  return { actualizar, material: mesh.material };
}

// Montaña del pelado: colinas verdes redondeadas (como las de la foto) con piedras grises y,
// en la cima de la grande, el pelado con la camiseta de La Dosis (siempre de frente). No les
// afecta la niebla, así se ven desde lejos. Se pueden subir caminando: altura(x, z) da el
// piso exacto de lo que se dibuja (los mismos triángulos), así nada flota ni se hunde.
function crearMontana(escena) {
  const rnd = aleatorio(23);
  const g = new THREE.Group();
  const colinas = [];
  const verde = new THREE.Color('#a6e070');
  const seco = new THREE.Color('#cfd486');
  const roca = new THREE.Color('#b4b6b3');
  const c = new THREE.Color();
  const ANILLOS = 30;
  const LADOS = 56;
  const colina = (cx, cz, R, H, semilla) => {
    // Grilla polar: un punto en la cima y anillos alrededor. El ruido se apaga hacia la cima
    // (si no, la punta queda llena de picos).
    const forma = (r, a) => {
      const t = r / R;
      const base = H * Math.pow(Math.max(0, 1 - t * t), 1.35);
      const ruido = Math.sin(a * 3 + semilla) * 0.05 + Math.sin(a * 7 + semilla * 2) * 0.025 + Math.sin(t * 9 + a * 2) * 0.03;
      return Math.max(0, base * (1 + ruido * Math.min(1, t * 3) * (1 - t * 0.5)));
    };
    const pos = [cx, forma(0, 0), cz];
    const col = [];
    const idx = [];
    const pinta = (i) => {
      c.copy(verde).lerp(seco, 0.1 + 0.3 * (i / ANILLOS) * rnd());
      if (rnd() < 0.08 + 0.12 * (1 - i / ANILLOS)) c.lerp(roca, 0.7);
      col.push(c.r, c.g, c.b);
    };
    pinta(0);
    for (let i = 1; i <= ANILLOS; i++) {
      const r = (i / ANILLOS) * R;
      for (let j = 0; j < LADOS; j++) {
        const a = (j / LADOS) * Math.PI * 2;
        pos.push(cx + Math.cos(a) * r, forma(r, a), cz + Math.sin(a) * r);
        pinta(i);
      }
    }
    const v = (i, j) => (i === 0 ? 0 : 1 + (i - 1) * LADOS + (((j % LADOS) + LADOS) % LADOS));
    for (let j = 0; j < LADOS; j++) idx.push(0, v(1, j + 1), v(1, j));
    for (let i = 1; i < ANILLOS; i++) {
      for (let j = 0; j < LADOS; j++) idx.push(v(i, j), v(i, j + 1), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1), v(i + 1, j));
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    m.setIndex(idx);
    m.computeVertexNormals();
    g.add(new THREE.Mesh(m, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, flatShading: true, emissive: '#1c2a12' })));
    colinas.push({ cx, cz, R, pos, v });
  };
  // Altura de la superficie dibujada en (x, z): busca el triángulo que lo contiene.
  const enTriangulo = (pos, ia, ib, ic, x, z) => {
    const ax = pos[ia * 3]; const az = pos[ia * 3 + 2];
    const bx = pos[ib * 3]; const bz = pos[ib * 3 + 2];
    const cx = pos[ic * 3]; const cz = pos[ic * 3 + 2];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
    const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) return null;
    return l1 * pos[ia * 3 + 1] + l2 * pos[ib * 3 + 1] + l3 * pos[ic * 3 + 1];
  };
  const alturaColina = (k, x, z) => {
    const dx = x - k.cx;
    const dz = z - k.cz;
    const r = Math.hypot(dx, dz);
    if (r >= k.R) return 0;
    let a = Math.atan2(dz, dx);
    if (a < 0) a += Math.PI * 2;
    const i = Math.floor((r / k.R) * ANILLOS);
    const j = Math.floor((a / (Math.PI * 2)) * LADOS);
    // Revisa los triángulos de esta celda y los vecinos (los bordes son rectos, no curvos).
    for (const di of [0, -1, 1]) {
      const ii = i + di;
      if (ii < 0 || ii >= ANILLOS) continue;
      for (const dj of [0, -1, 1]) {
        const jj = j + dj;
        const tris = ii === 0
          ? [[0, k.v(1, jj + 1), k.v(1, jj)]]
          : [[k.v(ii, jj), k.v(ii, jj + 1), k.v(ii + 1, jj)], [k.v(ii, jj + 1), k.v(ii + 1, jj + 1), k.v(ii + 1, jj)]];
        for (const [ta, tb, tc] of tris) {
          const h = enTriangulo(k.pos, ta, tb, tc, x, z);
          if (h !== null) return h;
        }
      }
    }
    return 0;
  };
  const altura = (x, z) => {
    let h = 0;
    for (const k of colinas) h = Math.max(h, alturaColina(k, x, z));
    return h;
  };
  colina(MO.x, MO.z, MO.r, MO.alto, 1.3);
  colina(MO.x + 105, MO.z - 70, MO.r * 0.75, MO.alto * 0.62, 4.1);
  colina(MO.x - 120, MO.z - 85, MO.r * 0.6, MO.alto * 0.45, 2.2);
  // Piedras grises por las laderas, enterradas en la superficie (una sola malla). Se apoyan
  // en el punto más bajo de debajo de ellas, así del lado de abajo de la pendiente no flotan.
  const piedras = [];
  for (let n = 0; n < 90; n++) {
    const a = rnd() * Math.PI * 2;
    const r = (0.12 + rnd() * 0.8) * MO.r;
    const x = MO.x + Math.cos(a) * r;
    const z = MO.z + Math.sin(a) * r;
    const tam = 1.2 + rnd() * 2.6;
    const alto = 0.6 + rnd() * 0.4;
    let piso = Infinity;
    for (let k = 0; k < 8; k++) {
      const b = (k / 8) * Math.PI * 2;
      piso = Math.min(piso, altura(x + Math.cos(b) * tam * 1.2, z + Math.sin(b) * tam));
    }
    const p = new THREE.DodecahedronGeometry(tam, 0);
    p.scale(1.2, alto, 1);
    p.rotateY(rnd() * 3);
    p.translate(x, piso + tam * alto * 0.15, z);
    piedras.push(p);
  }
  g.add(new THREE.Mesh(mergeGeometries(piedras), new THREE.MeshLambertMaterial({ color: '#b9bbb8', fog: false, flatShading: true })));
  // El pelado en la cima, parado arriba de una piedra grande (la piedra choca: no se lo atraviesa).
  const cima = altura(MO.x, MO.z);
  const base = new THREE.DodecahedronGeometry(5.5, 0);
  base.scale(1.25, 0.55, 1.1);
  base.translate(MO.x, cima + 0.6, MO.z);
  g.add(new THREE.Mesh(base, new THREE.MeshLambertMaterial({ color: '#a9aba8', fog: false, flatShading: true })));
  const tex = new THREE.TextureLoader().load('assets/especiales/pelado_cima.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  const pelado = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, alphaTest: 0.4 }));
  const altoPelado = 40;
  pelado.scale.set(altoPelado * 519 / 843, altoPelado, 1);
  pelado.center.set(0.5, 0.02);
  pelado.position.set(MO.x, cima + 3, MO.z);
  g.add(pelado);
  escena.add(g);
  const piedraCima = new THREE.Box3(new THREE.Vector3(MO.x - 5.5, cima - 2, MO.z - 5), new THREE.Vector3(MO.x + 5.5, cima + 3.4, MO.z + 5));
  return { choques: [piedraCima], altura };
}
