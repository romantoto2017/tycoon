import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GEO_CAJA } from './util.js';

// Muebles con modelos del "Furniture Kit" de Kenney (CC0, en assets/muebles).
// Cada modelo se junta en pocas geometrías según el material original:
//   cuerpo: madera, metal, loza... con el color pintado en los vértices (un solo material),
//   tela:   tapizados y frazadas, del color que pida cada habitación,
//   vidrio y luz (pantallas de lámparas).
// Así el lote los agrupa como cualquier otra pieza y la placa dibuja muy poco.

// Colores más realistas que los originales (que son de juguete).
const COLORES = {
  wood: '#c29a6e',
  woodDark: '#6b4a35',
  carpetWhite: '#f3f1ec',
  carpetDarker: '#5b5f64',
  fur: '#8a6446',
  metal: '#c9ced3',
  metalLight: '#eceef0',
  metalMedium: '#8e959b',
  metalDark: '#2b2f34',
  plant: '#4a8a3a',
  _defaultMat: '#e6e6e6',
};
// Retoques por modelo: pantallas apagadas en negro y cocina de frentes blancos.
const PANTALLA = { metal: '#15191d' };
const COCINA = { wood: '#f1efea', woodDark: '#d8d3cb' };
const RETOQUES = {
  televisionModern: PANTALLA, computerScreen: PANTALLA, laptop: PANTALLA,
  kitchenCabinet: COCINA, kitchenCabinetDrawer: COCINA, kitchenCabinetUpper: COCINA,
  kitchenCabinetUpperDouble: COCINA, kitchenSink: COCINA, kitchenStove: COCINA, kitchenBar: { wood: '#f1efea', woodDark: '#4a3528' },
};
const TELA = new Set(['carpet', 'carpetBlue']);
const PARTE = (nombre) => (TELA.has(nombre) ? 'tela' : nombre === 'glass' ? 'vidrio' : nombre === 'lamp' ? 'luz' : 'cuerpo');

const MAT_CUERPO = new THREE.MeshLambertMaterial({ vertexColors: true });
const MAT_INVISIBLE = new THREE.MeshBasicMaterial({ visible: false });

// El kit está hecho todo a la misma escala: por 5,5 queda a medida real del juego
// (el jugador mide unas 5 unidades; una silla, 2,6; una heladera, 5).
const ESCALA = 5.5;

// Los que se usan (se cargan todos al empezar).
export const MODELOS = [
  'bathroomCabinetDrawer', 'bathroomMirror', 'bathtub', 'bear', 'bedDouble', 'bedSingle',
  'bookcaseClosedWide', 'bookcaseOpen', 'books', 'cabinetBedDrawerTable', 'cabinetTelevisionDoors',
  'chairCushion', 'chairDesk', 'chairModernCushion', 'coatRackStanding', 'computerKeyboard',
  'computerScreen', 'desk', 'hoodModern', 'kitchenBar', 'kitchenCabinet', 'kitchenCabinetDrawer',
  'kitchenCabinetUpper', 'kitchenCabinetUpperDouble', 'kitchenCoffeeMachine', 'kitchenFridgeLarge',
  'kitchenMicrowave', 'kitchenSink', 'kitchenStove', 'lampRoundFloor', 'lampRoundTable', 'loungeChair',
  'loungeChairRelax', 'loungeDesignSofa', 'loungeSofa', 'loungeSofaOttoman', 'plantSmall1', 'pottedPlant',
  'rugRectangle', 'shower', 'speaker', 'speakerSmall', 'stoolBar', 'table', 'tableCoffeeGlass', 'tableRound',
  'televisionModern', 'toaster', 'toiletSquare', 'trashcan', 'washerDryerStacked',
];

const modelos = new Map(); // nombre -> { partes: {cuerpo, tela, vidrio, luz}, tam: Vector3 }

function prepararGeometria(geo, matriz, color) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const nombre of Object.keys(g.attributes)) if (nombre !== 'position' && nombre !== 'normal') g.deleteAttribute(nombre);
  g.applyMatrix4(matriz);
  if (color) {
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
}

function procesar(nombre, escena) {
  escena.updateMatrixWorld(true);
  const piezas = { cuerpo: [], tela: [], vidrio: [], luz: [] };
  escena.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const grupos = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
    for (const gr of grupos) {
      const m = mats[gr.materialIndex] || mats[0];
      const parte = PARTE(m.name);
      let geo = o.geometry;
      if (o.geometry.groups.length > 1) {
        geo = o.geometry.clone();
        geo.clearGroups();
        geo.setDrawRange(0, Infinity);
        const idx = geo.index.array.slice(gr.start, gr.start + gr.count);
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
      }
      const hex = RETOQUES[nombre]?.[m.name] || COLORES[m.name] || `#${m.color.getHexString()}`;
      const color = parte === 'cuerpo' ? new THREE.Color(hex) : null;
      piezas[parte].push(prepararGeometria(geo, o.matrixWorld, color));
    }
  });
  const partes = {};
  const caja = new THREE.Box3();
  for (const [parte, lista] of Object.entries(piezas)) {
    if (!lista.length) continue;
    partes[parte] = mergeGeometries(lista);
    partes[parte].computeBoundingBox();
    caja.union(partes[parte].boundingBox);
  }
  // Base en el piso, centrado en x/z, y a la medida pedida.
  const tam = caja.getSize(new THREE.Vector3());
  const s = ESCALA;
  const centro = caja.getCenter(new THREE.Vector3());
  const ajuste = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-centro.x, -caja.min.y, -centro.z));
  for (const g of Object.values(partes)) {
    g.applyMatrix4(ajuste);
    g.computeBoundingBox();
    g.userData.loteable = true;
  }
  modelos.set(nombre, { partes, tam: tam.multiplyScalar(s) });
}

// Carga todos los modelos de una vez al inicio. Si alguno falla, ese mueble no aparece.
export async function cargarModelos(nombres) {
  const cargador = new GLTFLoader();
  await Promise.all(nombres.map((n) => cargador.loadAsync(`assets/muebles/${n}.glb`)
    .then((gltf) => procesar(n, gltf.scene))
    .catch((e) => console.warn('No se pudo cargar el mueble', n, e))));
}

// Escala por eje: con ancho, alto o fondo se ajusta a esa medida (y las otras siguen
// proporcionales, salvo que también se pidan); si no, se usa `escala`.
function escalaDe(t, { ancho, alto, fondo, escala = 1 }) {
  const u = ancho ? ancho / t.x : alto ? alto / t.y : fondo ? fondo / t.z : escala;
  return new THREE.Vector3(ancho ? ancho / t.x : u, alto ? alto / t.y : u, fondo ? fondo / t.z : u);
}

// Medida final (x ancho, y alto, z fondo) que tendría el modelo con esas opciones.
export function medidaModelo(nombre, opts = {}) {
  const m = modelos.get(nombre);
  if (!m) return new THREE.Vector3();
  return m.tam.clone().multiply(escalaDe(m.tam, opts));
}

// Arma un mueble listo para ubicar (grupo con origen en el centro de su base, frente hacia +z).
// opts: tela (color del tapizado), ancho/alto/fondo o escala, solido (false = no choca),
// material (color -> material), vidrio y luz (materiales).
export function crearModelo(nombre, opts = {}) {
  const { tela = '#8a8f94', solido = true, material, vidrio, luz } = opts;
  const g = new THREE.Group();
  const m = modelos.get(nombre);
  if (!m) return g;
  const mats = { cuerpo: MAT_CUERPO, tela: material(tela), vidrio, luz };
  for (const [parte, geo] of Object.entries(m.partes)) {
    const malla = new THREE.Mesh(geo, mats[parte]);
    malla.userData.noSolido = true;
    g.add(malla);
  }
  // Un solo bloque invisible para chocar (todo el mueble), que no pasa al lote.
  if (solido) {
    const c = new THREE.Mesh(GEO_CAJA, MAT_INVISIBLE);
    c.scale.copy(m.tam);
    c.position.y = m.tam.y / 2;
    c.userData.dinamico = true;
    g.add(c);
  }
  g.scale.copy(escalaDe(m.tam, opts));
  return g;
}
