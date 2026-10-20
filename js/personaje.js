import * as THREE from 'three';
import { caja, mat } from './util.js';
import { texturaDeCanvas } from './texturas.js';

const GEO_CABEZA = new THREE.BoxGeometry(1.3, 1.3, 1.3);

// Muñeco de bloques. Mira hacia +Z. Los pies están en y = 0 (alto total ~5.4).
export function crearPersonaje(p, caraCanvas) {
  const grupo = new THREE.Group();

  const extremidad = (x, y, colorArriba, colorAbajo, largoArriba) => {
    const pivote = new THREE.Group();
    pivote.position.set(x, y, 0);
    pivote.add(caja(0.95, largoArriba, 0.95, colorArriba, 0, -largoArriba / 2, 0));
    if (colorAbajo) pivote.add(caja(0.95, 2 - largoArriba, 0.95, colorAbajo, 0, -largoArriba - (2 - largoArriba) / 2, 0));
    grupo.add(pivote);
    return pivote;
  };

  const piernaI = extremidad(-0.5, 2, p.pantalon, null, 2);
  const piernaD = extremidad(0.5, 2, p.pantalon, null, 2);
  const brazoI = extremidad(-1.5, 4, p.remera, p.piel, 0.8);
  const brazoD = extremidad(1.5, 4, p.remera, p.piel, 0.8);
  grupo.add(caja(2, 2, 1, p.remera, 0, 3, 0));

  const texCara = texturaDeCanvas(caraCanvas);
  // Sin iluminación: la foto se ve siempre con sus colores reales.
  const matCara = new THREE.MeshBasicMaterial({ map: texCara });
  const piel = mat(p.piel);
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z (frente), -z
  const cabeza = new THREE.Mesh(GEO_CABEZA, [piel, piel, piel, piel, matCara, piel]);
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
      texCara.dispose();
      matCara.dispose();
    },
  };
}
