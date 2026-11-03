import * as THREE from 'three';
import { caja } from './util.js';

// AK-47 de bloques. Origen en la empuñadura, cañón hacia +z y arriba +y (unas 2,6 de largo).
// userData.boca: punta del cañón; userData.fogonazo: destello que se prende al disparar.
export function crearAK() {
  const g = new THREE.Group();
  const metal = '#2b2d30';
  const madera = '#8a4b22';
  const add = (w, h, d, c, x, y, z, rx = 0) => {
    const m = caja(w, h, d, c, x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  add(0.2, 0.5, 0.26, madera, 0, -0.18, -0.02, 0.35);   // empuñadura
  add(0.22, 0.36, 1.15, metal, 0, 0.2, 0.25);            // cajón de mecanismos
  add(0.18, 0.3, 0.85, madera, 0, 0.1, -0.68, -0.08);    // culata
  add(0.2, 0.42, 0.14, madera, 0, 0.06, -1.08);          // cantonera
  add(0.26, 0.3, 0.62, madera, 0, 0.2, 1.1);             // guardamanos
  add(0.11, 0.11, 0.55, metal, 0, 0.42, 1.05);           // tubo de gases
  add(0.09, 0.09, 0.95, metal, 0, 0.24, 1.8);            // cañón
  add(0.05, 0.18, 0.05, metal, 0, 0.36, 2.1);            // mira delantera
  add(0.17, 0.48, 0.26, metal, 0, -0.18, 0.55, -0.2);    // cargador (curvo)
  add(0.17, 0.42, 0.26, metal, 0, -0.58, 0.66, -0.5);
  const boca = new THREE.Object3D();
  boca.position.set(0, 0.24, 2.3);
  g.add(boca);
  const fogonazo = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.55), new THREE.MeshBasicMaterial({ color: '#ffd54f' }));
  fogonazo.position.z = 0.2;
  fogonazo.visible = false;
  fogonazo.userData.noSolido = true;
  boca.add(fogonazo);
  g.userData.boca = boca;
  g.userData.fogonazo = fogonazo;
  return g;
}
