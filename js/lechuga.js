import * as THREE from 'three';

// Lechuga de pocos polígonos: el cogollo claro y hojas de afuera más oscuras alrededor.
// Una sola geometría con colores por vértice (sirve para la mano y para las que se ponen
// en el piso, todas en una InstancedMesh). Base en y = 0, unas 1,2 de ancho.
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
  pieza(new THREE.IcosahedronGeometry(0.36, 1), '#b9dc72', 0, 0.36, 0, 1, 0.9, 1);
  const hojas = ['#4f9a2c', '#5ea935', '#6cb33a', '#4a8f28', '#62ad37', '#57a031'];
  const hoja = new THREE.IcosahedronGeometry(0.32, 0);
  hojas.forEach((color, i) => {
    const a = (i / hojas.length) * Math.PI * 2;
    pieza(hoja, color, Math.sin(a) * 0.3, 0.3, Math.cos(a) * 0.3, 1.05, 0.85, 0.5, a, -0.35);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

export const matLechuga = () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
