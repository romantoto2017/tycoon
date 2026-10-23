import * as THREE from 'three';
import { caja, matTex, aleatorio } from './util.js';
import { TERRENO as T, CALLE_Z, RESTO as R, PARRILLA as PA, GYM } from './constantes.js';
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
  const nubes = crearNubes(escena);

  return {
    estaticos,
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
      puntos.push([x, z, 0.8 + rnd() * 0.6]);
      n++;
    }
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
