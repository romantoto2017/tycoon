import * as THREE from 'three';
import { caja, aleatorio } from './util.js';
import { texturaBaseplate } from './texturas.js';

// Terreno del jugador: de -35 a 35 en X y Z. La mansión mira hacia +Z (la calle).
export const TERRENO = 35;
export const MANSION = { x0: -14, x1: 14, z0: -20, z1: 0 };
const CALLE_Z = 48;

export function crearMundo(escena) {
  const horizonte = new THREE.Color('#cdeeff');
  escena.fog = new THREE.Fog(horizonte, 110, 260);

  // Cielo: esfera con degradé por vértice.
  const geoCielo = new THREE.SphereGeometry(400, 16, 8);
  const colores = [];
  const arriba = new THREE.Color('#3f9dff');
  const pos = geoCielo.attributes.position;
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, pos.getY(i) / 400);
    tmp.copy(horizonte).lerp(arriba, Math.pow(k, 0.6));
    colores.push(tmp.r, tmp.g, tmp.b);
  }
  geoCielo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  escena.add(new THREE.Mesh(geoCielo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  })));

  // Luces: una hemisférica + un sol, sin sombras.
  escena.add(new THREE.HemisphereLight('#ffffff', '#7a9a6a', 1.5));
  const sol = new THREE.DirectionalLight('#fff4dd', 1.6);
  sol.position.set(40, 80, 30);
  escena.add(sol);

  // Pasto general y baseplate del terreno.
  const pasto = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: '#6cc04a' }));
  pasto.rotation.x = -Math.PI / 2;
  escena.add(pasto);

  const texBase = texturaBaseplate();
  texBase.repeat.set(TERRENO, TERRENO);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(TERRENO * 2, TERRENO * 2), new THREE.MeshLambertMaterial({ map: texBase }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.02;
  escena.add(base);

  // Cordón del terreno y contorno de la mansión.
  const borde = new THREE.Group();
  const T = TERRENO;
  borde.add(caja(T * 2 + 1, 0.3, 0.5, '#e8e8e8', 0, 0.15, -T));
  borde.add(caja(T * 2 + 1, 0.3, 0.5, '#e8e8e8', 0, 0.15, T));
  borde.add(caja(0.5, 0.3, T * 2, '#e8e8e8', -T, 0.15, 0));
  borde.add(caja(0.5, 0.3, T * 2, '#e8e8e8', T, 0.15, 0));
  const M = MANSION;
  const anchoM = M.x1 - M.x0;
  const largoM = M.z1 - M.z0;
  const cxM = (M.x0 + M.x1) / 2;
  const czM = (M.z0 + M.z1) / 2;
  borde.add(caja(anchoM, 0.06, 0.35, '#ffffff', cxM, 0.05, M.z0));
  borde.add(caja(anchoM, 0.06, 0.35, '#ffffff', cxM, 0.05, M.z1));
  borde.add(caja(0.35, 0.06, largoM, '#ffffff', M.x0, 0.05, czM));
  borde.add(caja(0.35, 0.06, largoM, '#ffffff', M.x1, 0.05, czM));
  escena.add(borde);

  crearCalle(escena);
  crearCasasVecinas(escena);
  crearArboles(escena);
  const nubes = crearNubes(escena);

  return {
    actualizar(dt) { nubes.actualizar(dt); },
  };
}

function crearCalle(escena) {
  const g = new THREE.Group();
  g.add(caja(600, 0.1, 12, '#4d4f55', 0, 0.05, CALLE_Z));
  g.add(caja(600, 0.25, 2.5, '#c9c9c9', 0, 0.125, CALLE_Z - 7.25));
  g.add(caja(600, 0.25, 2.5, '#c9c9c9', 0, 0.125, CALLE_Z + 7.25));
  g.add(caja(6, 0.08, 6, '#bdbdbd', 0, 0.04, TERRENO + 3)); // caminito al terreno
  escena.add(g);

  // Líneas amarillas punteadas: un solo InstancedMesh.
  const n = 50;
  const lineas = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.12, 0.35), new THREE.MeshLambertMaterial({ color: '#ffd23f' }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-245 + i * 10, 0.08, CALLE_Z);
    lineas.setMatrixAt(i, m);
  }
  escena.add(lineas);
}

function crearCasasVecinas(escena) {
  const techoGeo = new THREE.ConeGeometry(1, 1, 4);
  techoGeo.rotateY(Math.PI / 4);
  const colores = ['#f4a261', '#90caf9', '#f48fb1', '#fff59d', '#a5d6a7', '#ce93d8'];
  const techos = ['#8d3b2f', '#455a64', '#6d4c41'];
  const z = CALLE_Z + 20;
  for (let i = 0; i < 6; i++) {
    const x = -75 + i * 30;
    const g = new THREE.Group();
    g.add(caja(14, 8, 11, colores[i], 0, 4, 0));
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
  while (puntos.length < 60) {
    const x = (rnd() - 0.5) * 300;
    const z = (rnd() - 0.5) * 300;
    if (Math.abs(x) < TERRENO + 6 && Math.abs(z) < TERRENO + 6) continue; // terreno
    if (z > CALLE_Z - 10 && z < CALLE_Z + 32) continue;                   // calle y casas
    puntos.push([x, z, 0.8 + rnd() * 0.6]);
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
  for (let i = 0; i < 14; i++) {
    const partes = [];
    const n = 3 + Math.floor(rnd() * 2);
    for (let j = 0; j < n; j++) {
      partes.push({ dx: (j - n / 2) * 6 + rnd() * 2, dy: rnd() * 2, dz: (rnd() - 0.5) * 5, w: 8 + rnd() * 6, h: 3 + rnd() * 2, d: 6 + rnd() * 4 });
    }
    nubes.push({ x: (rnd() - 0.5) * 400, y: 55 + rnd() * 25, z: (rnd() - 0.5) * 400, vel: 1.5 + rnd() * 1.5, partes });
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
      if (n.x > 220) n.x = -220;
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
  return { actualizar };
}
