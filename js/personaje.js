import * as THREE from 'three';
import { caja, GEO_CAJA } from './util.js';
import { texturaDeCanvas, recorteCanvas } from './texturas.js';

const GEO_CABEZA = new THREE.BoxGeometry(1.3, 1.3, 1.3);

// Muñeco de bloques. Mira hacia +Z. Los pies están en y = 0 (alto total ~5.4).
// cabeza: lo que devuelve cargarCabeza() (las 6 texturas y el color de piel de la foto).
export function crearPersonaje(p, cabezaTex) {
  const grupo = new THREE.Group();
  // Manos sin iluminación, igual que la cabeza, para que el tono de piel coincida.
  const matPiel = new THREE.MeshBasicMaterial({ color: cabezaTex.piel || p.piel || '#f1c27d' });
  matPiel.color.multiplyScalar(0.87);

  const gordo = p.cuerpo === 'gordo';
  const anchoTorso = gordo ? 2.7 : 2;
  const fondoTorso = gordo ? 1.7 : 1;
  const extras = []; // texturas y materiales propios, para liberar al cambiar de personaje

  // Remera con foto: frente con el diseño y el resto (espalda, costados, mangas) con la tela.
  let remera = p.remera;
  let torso;
  let panzaFrente = null;
  if (cabezaTex.ropa) {
    const tex = (c) => { const t = texturaDeCanvas(c); extras.push(t); return t; };
    const lambert = (t) => { const m = new THREE.MeshLambertMaterial({ map: t }); extras.push(m); return m; };
    const tela = lambert(tex(cabezaTex.ropa.tela));
    torso = [tela, tela, tela, tela, lambert(tex(cabezaTex.ropa.frente)), tela];
    // La panza muestra la parte del frente que tapa, así el diseño sigue continuo.
    const u0 = (anchoTorso / 2 - 1.1) / anchoTorso;
    const frentePanza = lambert(tex(recorteCanvas(cabezaTex.ropa.frente, u0, 1 - (3.45 - 2) / 2, 1 - u0, 1 - (2.05 - 2) / 2)));
    panzaFrente = [tela, tela, tela, tela, frentePanza, tela];
    remera = tela;
  }
  const extremidad = (x, y, colorArriba, colorAbajo, largoArriba, grosor = 0.95) => {
    const pivote = new THREE.Group();
    pivote.position.set(x, y, 0);
    pivote.add(caja(grosor, largoArriba, grosor, colorArriba, 0, -largoArriba / 2, 0));
    if (colorAbajo) pivote.add(caja(grosor, 2 - largoArriba, grosor, colorAbajo, 0, -largoArriba - (2 - largoArriba) / 2, 0));
    grupo.add(pivote);
    return pivote;
  };

  // Cuerpo normal o 'gordo' (torso más ancho y profundo, panza, extremidades más gruesas).
  const xBrazo = anchoTorso / 2 + (gordo ? 0.55 : 0.5);
  const piernaI = extremidad(gordo ? -0.65 : -0.5, 2, p.pantalon, null, 2, gordo ? 1.25 : 0.95);
  const piernaD = extremidad(gordo ? 0.65 : 0.5, 2, p.pantalon, null, 2, gordo ? 1.25 : 0.95);
  const brazoI = extremidad(-xBrazo, 4, remera, matPiel, 0.8, gordo ? 1.1 : 0.95);
  const brazoD = extremidad(xBrazo, 4, remera, matPiel, 0.8, gordo ? 1.1 : 0.95);
  const bloque = (w, h, d, material, x, y, z) => {
    if (!Array.isArray(material)) return caja(w, h, d, material, x, y, z);
    const m = new THREE.Mesh(GEO_CAJA, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    return m;
  };
  grupo.add(bloque(anchoTorso, 2, fondoTorso, torso || p.remera, 0, 3, 0));
  if (gordo) grupo.add(bloque(2.2, 1.4, 0.45, panzaFrente || p.remera, 0, 2.75, fondoTorso / 2 + 0.2));

  // Sin iluminación: la foto se ve siempre con sus colores reales. Los costados y la nuca
  // van un poco más oscuros para que se note el volumen del bloque.
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z (frente), -z (nuca).
  const lados = [
    [cabezaTex.der, '#dddddd'], [cabezaTex.izq, '#dddddd'], [cabezaTex.arriba, '#ffffff'],
    [cabezaTex.abajo, '#bbbbbb'], [cabezaTex.frente, '#ffffff'], [cabezaTex.atras, '#cccccc'],
  ];
  const texturas = lados.map(([c]) => texturaDeCanvas(c));
  const materiales = lados.map(([, tono], i) => new THREE.MeshBasicMaterial({ map: texturas[i], color: tono }));
  const cabeza = new THREE.Mesh(GEO_CABEZA, materiales);
  cabeza.position.y = 4.7;
  grupo.add(cabeza);

  let fase = 0;
  let balanceo = 0;

  return {
    grupo,
    // velocidad: unidades/seg en el plano. enSuelo: para la pose de salto.
    animar(dt, velocidad, enSuelo) {
      const objetivo = enSuelo ? Math.min(velocidad / 12, 1) : 0.35;
      balanceo += (objetivo - balanceo) * Math.min(1, dt * 10);
      fase += dt * (enSuelo ? velocidad * 0.75 : 4);
      const a = Math.sin(fase) * 0.85 * balanceo;
      piernaI.rotation.x = a;
      piernaD.rotation.x = -a;
      brazoI.rotation.x = -a;
      brazoD.rotation.x = a;
      const abrir = enSuelo ? 0 : 0.5;
      brazoI.rotation.z += (-abrir - brazoI.rotation.z) * Math.min(1, dt * 10);
      brazoD.rotation.z += (abrir - brazoD.rotation.z) * Math.min(1, dt * 10);
    },
    liberar() {
      texturas.forEach((t) => t.dispose());
      materiales.forEach((m) => m.dispose());
      matPiel.dispose();
      extras.forEach((e) => e.dispose());
    },
  };
}
