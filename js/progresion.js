import * as THREE from 'three';
import { DROPPERS } from '../data/objetos.js';
import { MANSION } from './mundo.js';

// Orden de compra. Cada ítem es un botón en el piso.
// - precio:   costo (0 = gratis)
// - requiere: ids que tienen que estar comprados para que aparezca el botón
// - boton:    [x, y, z] donde aparece el botón
// - tipo:     'dropper' (agrega una máquina), 'mejora' (multiplica valor/velocidad)
//             o 'construccion' (usa construir() para armar la pieza)
export const ITEMS = [
  {
    id: 'dropper1', nombre: DROPPERS[0].nombre, precio: 0, requiere: [],
    boton: [-8, 0, 20], tipo: 'dropper', dropper: 0,
  },
  {
    id: 'piso_pb', nombre: 'Piso Planta Baja', precio: 20, requiere: ['dropper1'],
    boton: [0, 0, 6], tipo: 'construccion', construir: pisoPlantaBaja,
  },
  {
    id: 'monedas_x2', nombre: 'Monedas x2', precio: 50, requiere: ['dropper1'],
    boton: [-18, 0, 20], tipo: 'mejora', valor: 2,
  },
];

export const ITEMS_POR_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ---------- Constructores de piezas ----------
// Reciben { caja, mat } y devuelven un THREE.Group en coordenadas del mundo.

function pisoPlantaBaja({ caja }) {
  const g = new THREE.Group();
  const M = MANSION;
  const ancho = M.x1 - M.x0;
  const largo = M.z1 - M.z0;
  const cx = (M.x0 + M.x1) / 2;
  const cz = (M.z0 + M.z1) / 2;
  g.add(caja(ancho, 0.4, largo, '#d7b48a', cx, 0.2, cz));
  // Franjas tipo tablones (decorativas, no chocan).
  for (let i = 1; i < 7; i++) {
    const franja = caja(ancho - 0.2, 0.02, 0.12, '#b89067', cx, 0.41, M.z0 + (largo / 7) * i);
    franja.userData.noSolido = true;
    g.add(franja);
  }
  return g;
}
