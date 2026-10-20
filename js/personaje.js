import * as THREE from 'three';
import { caja } from './util.js';
import { texturaDeCanvas } from './texturas.js';

const GEO_CABEZA = new THREE.BoxGeometry(1.3, 1.3, 1.3);

// Muñeco de bloques. Mira hacia +Z. Los pies están en y = 0 (alto total ~5.4).
// cabeza: lo que devuelve cargarCabeza() (las 6 texturas y el color de piel de la foto).
export function crearPersonaje(p, cabezaTex) {
  const grupo = new THREE.Group();
  // Manos sin iluminación, igual que la cabeza, para que el tono de piel coincida.
  const matPiel = new THREE.MeshBasicMaterial({ color: cabezaTex.piel || p.piel || '#f1c27d' });
  matPiel.color.multiplyScalar(0.87);

  const gordo = p.cuerpo === 'gordo';
  const extremidad = (x, y, colorArriba, colorAbajo, largoArriba, grosor = 0.95) => {
    const pivote = new THREE.Group();
    pivote.position.set(x, y, 0);
    pivote.add(caja(grosor, largoArriba, grosor, colorArriba, 0, -largoArriba / 2, 0));
    if (colorAbajo) pivote.add(caja(grosor, 2 - largoArriba, grosor, colorAbajo, 0, -largoArriba - (2 - largoArriba) / 2, 0));
    grupo.add(pivote);
    return pivote;
  };

  // Cuerpo normal o 'gordo' (torso más ancho y profundo, panza, extremidades más gruesas).
  const anchoTorso = gordo ? 2.7 : 2;
  const xBrazo = anchoTorso / 2 + (gordo ? 0.55 : 0.5);
  const piernaI = extremidad(gordo ? -0.65 : -0.5, 2, p.pantalon, null, 2, gordo ? 1.25 : 0.95);
  const piernaD = extremidad(gordo ? 0.65 : 0.5, 2, p.pantalon, null, 2, gordo ? 1.25 : 0.95);
  const brazoI = extremidad(-xBrazo, 4, p.remera, matPiel, 0.8, gordo ? 1.1 : 0.95);
  const brazoD = extremidad(xBrazo, 4, p.remera, matPiel, 0.8, gordo ? 1.1 : 0.95);
  grupo.add(caja(anchoTorso, 2, gordo ? 1.7 : 1, p.remera, 0, 3, 0));
  if (gordo) grupo.add(caja(2.2, 1.4, 0.45, p.remera, 0, 2.75, 1.05));

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
    },
  };
}
