// Achica los autos del concesionario (modelos de Sketchfab, cientos de miles de triángulos)
// para que anden en la Chromebook:
// - saca lo que no se ve (motor y todo lo de abajo del capó) y las piezas diminutas;
// - a las piezas sin textura les saca normales y UV (así se pueden soldar y simplificar; las
//   normales se recalculan al cargar, respetando los bordes duros);
// - simplifica: la carrocería, los vidrios y las luces con poca tolerancia (que no se deformen)
//   y el interior y las piezas oscuras con mucha, hasta acercarse a la meta de triángulos;
// - deja solo la textura de color (256 px, webp) y comprime la geometría con meshopt.
//
//   Copiarlo a una carpeta con: npm i @gltf-transform/cli@4.5.1   (ahí se resuelven los imports)
//   node autos.mjs <scene.gltf> <salida.glb> [triangulos]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, flatten, join, prune, resample, simplifyPrimitive, textureCompress, weld, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [entrada, salida, meta = '30000'] = process.argv.slice(2);
const OBJETIVO = Number(meta);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(entrada);
const raiz = doc.getRoot();

const triangulos = () => raiz.listMeshes().flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
console.log('triángulos al empezar:', Math.round(triangulos()));

// Solo la textura de color: fuera normales, rugosidad, oclusión, clearcoat, etc.
for (const mat of raiz.listMaterials()) {
  mat.setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null);
  for (const ext of mat.listExtensions()) ext.dispose();
}
await doc.transform(prune(), dedup(), flatten(), resample());

// Lo de abajo del capó y del piso: con el capó cerrado no se ve.
const ESCONDIDO = /engine|engbay|motor|radiator|intercooler|coilover|suspension|fueltank|radio_|washers|pedal|battery|airbox|_fan_/i;
// Lo que se mira de afuera: se simplifica con cuidado.
const CUIDAR = /paint|body|glass|light|chrome|badge|lamp|window|plate/i;

// Tamaño del auto, para saber qué es "diminuto".
const caja = getBounds(raiz.listScenes()[0]);
const largo = Math.max(...caja.max.map((v, i) => v - caja.min[i]));
for (const nodo of raiz.listNodes()) {
  const malla = nodo.getMesh();
  if (!malla) continue;
  const b = getBounds(nodo);
  const tam = Math.max(...b.max.map((v, i) => v - b.min[i]));
  if (tam < largo * 0.012) { nodo.setMesh(null); continue; } // tornillos, botoncitos, letritas
  if (ESCONDIDO.test(nodo.getName())) { nodo.setMesh(null); continue; }
  for (const prim of malla.listPrimitives()) {
    const mat = prim.getMaterial();
    if (!mat?.getBaseColorTexture()) {
      for (const sem of prim.listSemantics()) if (sem !== 'POSITION') prim.setAttribute(sem, null);
    } else {
      for (const sem of prim.listSemantics()) if (!['POSITION', 'NORMAL', 'TEXCOORD_0'].includes(sem)) prim.setAttribute(sem, null);
    }
  }
}
await doc.transform(prune(), weld(), join({ keepNamed: false }), weld());
const antes = triangulos();
console.log('sin piezas diminutas:', Math.round(antes));
// Simplifica hasta acercarse a la meta, subiendo de a poco la tolerancia (la carrocería, menos).
for (const error of [0.0005, 0.001, 0.002, 0.004, 0.008, 0.015]) {
  const total = triangulos();
  if (total <= OBJETIVO) break;
  for (const prim of raiz.listMeshes().flatMap((m) => m.listPrimitives())) {
    const cuidar = CUIDAR.test(prim.getMaterial()?.getName() || '');
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: OBJETIVO / total, error: cuidar ? Math.min(error, 0.002) : error, lockBorder: cuidar });
  }
}
console.log('simplificado:', Math.round(triangulos()));
await doc.transform(
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256], quality: 80 }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(salida, doc);
console.log('listo:', salida);
