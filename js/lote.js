import * as THREE from 'three';
import { GEO_CAJA } from './util.js';

// Junta todas las piezas quietas en pocos InstancedMesh: por forma, y dentro de cada forma
// las de color liso van juntas (con color por instancia); vidrio, agua, etc. van aparte.
// Con cientos de piezas compradas, la placa de video dibuja unas pocas cosas en vez de miles.
const LAMBERT = new THREE.MeshLambertMaterial({ color: '#ffffff' });
const BASICO = new THREE.MeshBasicMaterial({ color: '#ffffff' });

function claveDe(material) {
  const liso = !material.transparent && !material.map;
  if (liso && material.isMeshLambertMaterial && material.emissive.getHex() === 0) return LAMBERT;
  if (liso && material.isMeshBasicMaterial) return BASICO;
  return material;
}

export class Lote {
  constructor(escena) {
    this.escena = escena;
    this.grupos = new Map(); // 'forma|material' -> { matrices, colores, malla, geometria, material }
  }

  // Pasa las piezas del grupo al lote (las saca del grupo): bloques y también cilindros,
  // conos y esferas de geometría compartida. Ignora lo dinámico y lo que gira.
  absorber(grupo) {
    grupo.updateMatrixWorld(true);
    const bloques = [];
    const recorrer = (o) => {
      if (o.userData.dinamico || o.userData.girar) return;
      const forma = o.isMesh && !o.isInstancedMesh && (o.geometry === GEO_CAJA || o.geometry.userData.loteable);
      if (forma && !Array.isArray(o.material)) bloques.push(o);
      o.children.forEach(recorrer);
    };
    recorrer(grupo);
    const tocados = new Set();
    for (const b of bloques) {
      const material = claveDe(b.material);
      const clave = `${b.geometry.uuid}|${material.uuid}`;
      let e = this.grupos.get(clave);
      if (!e) {
        e = { matrices: [], colores: [], malla: null, geometria: b.geometry, material };
        this.grupos.set(clave, e);
      }
      e.matrices.push(b.matrixWorld.clone());
      e.colores.push(b.material.color.clone());
      b.parent.remove(b);
      tocados.add(clave);
    }
    for (const m of tocados) this.reconstruir(m);
  }

  reconstruir(clave) {
    const e = this.grupos.get(clave);
    const { material } = e;
    const n = e.matrices.length;
    const conColor = material === LAMBERT || material === BASICO;
    if (!e.malla || e.malla.instanceMatrix.count < n) {
      if (e.malla) {
        this.escena.remove(e.malla);
        e.malla.dispose();
      }
      e.malla = new THREE.InstancedMesh(e.geometria, material, Math.ceil(n * 1.5) + 16);
      e.malla.frustumCulled = false;
      if (material.transparent) e.malla.renderOrder = 1;
      this.escena.add(e.malla);
    }
    for (let i = 0; i < n; i++) {
      e.malla.setMatrixAt(i, e.matrices[i]);
      if (conColor) e.malla.setColorAt(i, e.colores[i]);
    }
    e.malla.count = n;
    e.malla.instanceMatrix.needsUpdate = true;
    if (conColor) e.malla.instanceColor.needsUpdate = true;
  }
}
