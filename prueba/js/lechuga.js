import * as THREE from 'three';

// Lechuga de pocos polígonos: el cogollo claro y dos vueltas de hojas alrededor.
// Una sola geometría con colores por vértice (sirve para la mano y para las que se ponen
// en el piso, todas en una InstancedMesh). Base en y = 0, unas 1,4 de ancho.
export function geoLechuga() {
  const pos = [];
  const nor = [];
  const col = [];
  const c = new THREE.Color();
  const m = new THREE.Matrix4();
  const pieza = (geo, color, x, y, z, sx, sy, sz, ry = 0, rx = 0) => {
    const g = geo.toNonIndexed();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(m);
    g.computeVertexNormals();
    c.set(color);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
    }
  };
  // Cogollo apretado y claro, una vuelta de hojas medianas y otra de hojas grandes de afuera,
  // más oscuras y abiertas (como una lechuga de verdad, no una pelota).
  pieza(new THREE.IcosahedronGeometry(0.3, 1), '#d4ec9e', 0, 0.42, 0, 1, 1.05, 1);
  const medianas = ['#a6d45e', '#9bcc55', '#b0db68', '#a1d05a', '#97c851'];
  const hojaM = new THREE.IcosahedronGeometry(0.3, 1);
  medianas.forEach((color, i) => {
    const a = (i / medianas.length) * Math.PI * 2 + 0.3;
    pieza(hojaM, color, Math.sin(a) * 0.22, 0.38, Math.cos(a) * 0.22, 0.95, 0.95, 0.42, a, -0.25);
  });
  const grandes = ['#4f9a2c', '#5ea935', '#6cb33a', '#4a8f28', '#62ad37', '#57a031', '#539d2e'];
  const hojaG = new THREE.IcosahedronGeometry(0.36, 1);
  grandes.forEach((color, i) => {
    const a = (i / grandes.length) * Math.PI * 2;
    pieza(hojaG, color, Math.sin(a) * 0.4, 0.27, Math.cos(a) * 0.4, 1.15, 0.8, 0.36, a, -0.75);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

export const matLechuga = () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

// Montoncito de tierra donde queda plantada.
export function geoTierra() {
  const g = new THREE.CylinderGeometry(0.62, 0.8, 0.16, 10);
  g.translate(0, 0.06, 0);
  return g;
}
