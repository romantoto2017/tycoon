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
  // El cuerpo cuelga de la cadera (y = 2) para poder inclinarlo al agacharse.
  const cuerpo = new THREE.Group();
  cuerpo.position.y = 2;
  grupo.add(cuerpo);
  const CADERA = 2;
  const extremidad = (padre, x, y, colorArriba, colorAbajo, largoArriba, grosor = 0.95) => {
    const pivote = new THREE.Group();
    pivote.position.set(x, y, 0);
    pivote.add(caja(grosor, largoArriba, grosor, colorArriba, 0, -largoArriba / 2, 0));
    if (colorAbajo) pivote.add(caja(grosor, 2 - largoArriba, grosor, colorAbajo, 0, -largoArriba - (2 - largoArriba) / 2, 0));
    padre.add(pivote);
    return pivote;
  };
  // Pierna con rodilla: muslo desde la cadera y la parte de abajo desde la rodilla.
  const pierna = (x, grosor) => {
    const muslo = new THREE.Group();
    muslo.position.set(x, CADERA, 0);
    muslo.add(caja(grosor, 1, grosor, p.pantalon, 0, -0.5, 0));
    const rodilla = new THREE.Group();
    rodilla.position.y = -1;
    rodilla.add(caja(grosor * 0.98, 1, grosor * 0.98, p.pantalon, 0, -0.5, 0));
    muslo.add(rodilla);
    grupo.add(muslo);
    return { muslo, rodilla };
  };

  // Cuerpo normal o 'gordo' (torso más ancho y profundo, panza, extremidades más gruesas).
  const xBrazo = anchoTorso / 2 + (gordo ? 0.55 : 0.5);
  const piernaI = pierna(gordo ? -0.65 : -0.5, gordo ? 1.25 : 0.95);
  const piernaD = pierna(gordo ? 0.65 : 0.5, gordo ? 1.25 : 0.95);
  const brazoI = extremidad(cuerpo, -xBrazo, 4 - CADERA, remera, matPiel, 0.8, gordo ? 1.1 : 0.95);
  const brazoD = extremidad(cuerpo, xBrazo, 4 - CADERA, remera, matPiel, 0.8, gordo ? 1.1 : 0.95);
  const bloque = (w, h, d, material, x, y, z) => {
    if (!Array.isArray(material)) return caja(w, h, d, material, x, y, z);
    const m = new THREE.Mesh(GEO_CAJA, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    return m;
  };
  cuerpo.add(bloque(anchoTorso, 2, fondoTorso, torso || p.remera, 0, 3 - CADERA, 0));
  if (gordo) cuerpo.add(bloque(2.2, 1.4, 0.45, panzaFrente || p.remera, 0, 2.75 - CADERA, fondoTorso / 2 + 0.2));

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
  cabeza.position.y = 4.7 - CADERA;
  cuerpo.add(cabeza);
  // Kipá (data/personajes.js: kipa): disco finito en la coronilla, tamaño real (unos 13 cm
  // sobre una cabeza de 18), un poco corrido hacia atrás y siguiendo la curva de la nuca.
  if (p.kipa) {
    const tex = new THREE.TextureLoader().load('assets/especiales/kipa.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    const tela = new THREE.MeshLambertMaterial({ color: '#1c1a22' });
    const arriba = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.4 });
    extras.push(tex, tela, arriba);
    const kipa = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.43, 0.06, 24), [tela, arriba, tela]);
    kipa.position.set(0, cabeza.position.y + 0.68, -0.2);
    kipa.rotation.x = -0.18;
    extras.push(kipa.geometry);
    cuerpo.add(kipa);
  }
  // Pelo largo (data/personajes.js: peloLargo): cae por la espalda y a los costados de la cara.
  if (p.peloLargo) {
    const colorPelo = cabezaTex.pelo || p.pelo || '#3b2a20';
    const yc = cabeza.position.y;
    cuerpo.add(caja(1.42, 2.4, 0.3, colorPelo, 0, yc - 0.55, -0.72));
    for (const lado of [-1, 1]) cuerpo.add(caja(0.22, 1.9, 1.1, colorPelo, lado * 0.72, yc - 0.45, -0.15));
  }

  let fase = 0;
  let balanceo = 0;
  let agache = 0; // 0 = parado, 1 = agachado del todo

  const modelo = {
    grupo,
    manoD: brazoD, // para colgarle el arma (la mano está en y = -1.9)
    apuntar: false, // con el arma en la mano: brazos al frente
    // velocidad: unidades/seg en el plano. enSuelo: para la pose de salto.
    // agachado: rodillas dobladas, cadera abajo, torso hacia adelante y brazos al frente.
    // sentado: arriba de una moto (piernas dobladas hacia adelante, manos al manubrio).
    animar(dt, velocidad, enSuelo, agachado = false, sentado = false) {
      const objetivo = enSuelo ? Math.min(velocidad / 12, 1) : 0.35;
      balanceo += (objetivo - balanceo) * Math.min(1, dt * 10);
      agache += ((agachado ? 1 : 0) - agache) * Math.min(1, dt * 12);
      fase += dt * (enSuelo ? velocidad * (agachado ? 1.1 : 0.75) : 4);
      const a = Math.sin(fase) * 0.85 * balanceo * (1 - agache * 0.55);
      // Piernas: el muslo sube hacia adelante y la rodilla se dobla para atrás.
      const muslo = -1.35 * agache;
      const rodilla = 2.3 * agache;
      for (const [pi, signo] of [[piernaI, 1], [piernaD, -1]]) {
        pi.muslo.rotation.x = muslo + signo * a;
        pi.rodilla.rotation.x = rodilla + Math.max(0, -signo * a) * 0.6;
      }
      // La cadera baja lo que suben los pies (para que sigan apoyados en el piso).
      const alturaCadera = Math.cos(muslo) + Math.cos(muslo + rodilla);
      let yCadera = Math.min(CADERA, alturaCadera);
      if (sentado) {
        for (const pi of [piernaI, piernaD]) {
          pi.muslo.rotation.x = -1.45;
          pi.rodilla.rotation.x = 1.25;
        }
        yCadera = CADERA;
      }
      piernaI.muslo.position.y = yCadera;
      piernaD.muslo.position.y = yCadera;
      cuerpo.position.y = yCadera;
      cuerpo.rotation.x = 0.5 * agache;
      brazoI.rotation.x = sentado ? -1.2 : -a - 0.7 * agache;
      brazoD.rotation.x = sentado ? -1.2 : a - 0.7 * agache;
      if (sentado) cuerpo.rotation.x = 0.2;
      const abrir = enSuelo ? 0 : 0.5;
      brazoI.rotation.z += (-abrir - brazoI.rotation.z) * Math.min(1, dt * 10);
      brazoD.rotation.z += (abrir - brazoD.rotation.z) * Math.min(1, dt * 10);
      if (modelo.apuntar) {
        brazoD.rotation.x = -1.5;
        brazoI.rotation.x = -1.4;
        brazoI.rotation.z = 0.5;
        brazoD.rotation.z = 0;
      }
    },
    liberar() {
      texturas.forEach((t) => t.dispose());
      materiales.forEach((m) => m.dispose());
      matPiel.dispose();
      extras.forEach((e) => e.dispose());
    },
  };
  return modelo;
}
