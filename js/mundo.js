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
  crearArboles(escena);
  const montana = crearMontana(escena);
  const nubes = crearNubes(escena);

  return {
    estaticos,
    choques: montana.choques, // para no meterse adentro de la montaña
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

function crearArboles(escena) {
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
    o.position.set(x, 2 * s, z);
    o.scale.set(1.1 * s, 4 * s, 1.1 * s);
    o.updateMatrix();
    troncos.setMatrixAt(i, o.matrix);
    color.set(verdes[i % verdes.length]);
    o.position.set(x, 5.5 * s, z);
    o.scale.set(4 * s, 5 * s, 4 * s);
    o.updateMatrix();
    copas.setMatrixAt(i * 2, o.matrix);
    copas.setColorAt(i * 2, color);
    o.position.set(x, 8.3 * s, z);
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

// Montaña del pelado: dos colinas verdes redondeadas (como las de la foto) con piedras grises
// y, en la cima de la grande, el pelado con la camiseta de La Dosis (siempre de frente). No
// les afecta la niebla, así se ven desde lejos.
function crearMontana(escena) {
  const rnd = aleatorio(23);
  const g = new THREE.Group();
  const colina = (cx, cz, R, H, semilla) => {
    const anillos = 26;
    const lados = 48;
    // Grilla polar propia: anillos concéntricos con alturas suaves y un poco de ruido.
    const pos = [];
    const col = [];
    const idx = [];
    const verde = new THREE.Color('#a6e070');
    const seco = new THREE.Color('#cfd486');
    const roca = new THREE.Color('#b4b6b3');
    const c = new THREE.Color();
    const altura = (r, a) => {
      const t = r / R;
      const base = H * Math.pow(Math.max(0, 1 - t * t), 1.35);
      const ruido = Math.sin(a * 3 + semilla) * 0.05 + Math.sin(a * 7 + semilla * 2) * 0.025 + Math.sin(t * 9 + a * 2) * 0.03;
      return Math.max(0, base * (1 + ruido * (1 - t * 0.5)));
    };
    for (let i = 0; i <= anillos; i++) {
      const r = (i / anillos) * R;
      for (let j = 0; j < lados; j++) {
        const a = (j / lados) * Math.PI * 2;
        const y = altura(r, a);
        pos.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
        const mezcla = rnd();
        c.copy(verde).lerp(seco, 0.1 + 0.3 * (i / anillos) * mezcla);
        if (rnd() < 0.08 + 0.12 * (1 - i / anillos)) c.lerp(roca, 0.7);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < anillos; i++) {
      for (let j = 0; j < lados; j++) {
        const a = i * lados + j;
        const b = i * lados + ((j + 1) % lados);
        const a2 = a + lados;
        const b2 = b + lados;
        idx.push(a, a2, b, b, a2, b2);
      }
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    m.setIndex(idx);
    m.computeVertexNormals();
    const malla = new THREE.Mesh(m, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, flatShading: true, emissive: '#1c2a12' }));
    g.add(malla);
    return altura;
  };
  const alturaGrande = colina(MO.x, MO.z, MO.r, MO.alto, 1.3);
  colina(MO.x + 105, MO.z - 70, MO.r * 0.75, MO.alto * 0.62, 4.1);
  colina(MO.x - 120, MO.z - 85, MO.r * 0.6, MO.alto * 0.45, 2.2);
  // Piedras grises por las laderas (una sola malla).
  const piedras = [];
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const r = (0.15 + rnd() * 0.8) * MO.r;
    const y = alturaGrande(r, a);
    const p = new THREE.DodecahedronGeometry(1.2 + rnd() * 2.8, 0);
    p.scale(1.2, 0.6 + rnd() * 0.4, 1);
    p.rotateY(rnd() * 3);
    p.translate(MO.x + Math.cos(a) * r, y + 0.4, MO.z + Math.sin(a) * r);
    piedras.push(p);
  }
  const roca = new THREE.Mesh(mergeGeometries(piedras), new THREE.MeshLambertMaterial({ color: '#b9bbb8', fog: false, flatShading: true }));
  g.add(roca);
  // El pelado en la cima, bien grande para que se vea desde la mansión.
  const tex = new THREE.TextureLoader().load('assets/especiales/pelado_cima.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  const pelado = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, alphaTest: 0.4 }));
  const alto = 44;
  pelado.scale.set(alto * 519 / 843, alto, 1);
  pelado.center.set(0.5, 0.02);
  pelado.position.set(MO.x, alturaGrande(0, 0) - 0.5, MO.z);
  g.add(pelado);
  escena.add(g);
  // Choques: una cruz de cajas que cubre casi toda la base (no se puede meter adentro).
  const choques = [];
  const caja = (x0, z0, x1, z1) => {
    const b = new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, MO.alto, z1));
    b.camara = false;
    choques.push(b);
  };
  const r = MO.r * 0.8;
  for (const [w, h] of [[r, r * 0.42], [r * 0.42, r], [r * 0.72, r * 0.72]]) caja(MO.x - w, MO.z - h, MO.x + w, MO.z + h);
  return { choques };
}
