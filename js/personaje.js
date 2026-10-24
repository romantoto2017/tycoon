import * as THREE from 'three';
import { caja, GEO_CAJA } from './util.js';
import { texturaDeCanvas, recorteCanvas } from './texturas.js';

const GEO_CABEZA = new THREE.BoxGeometry(1.3, 1.3, 1.3);

// Kipá vista desde arriba: satén con brillo, costuras de los gajos, estrella de David
// bordada en plateado adelante y zigzag plateado cerca del borde.
function canvasKipa() {
  const n = 256;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const m = n / 2;
  const fondo = g.createRadialGradient(m * 0.8, m * 0.75, 4, m, m, m);
  fondo.addColorStop(0, '#4a4f6e');
  fondo.addColorStop(0.45, '#262a40');
  fondo.addColorStop(1, '#14161f');
  g.fillStyle = fondo;
  g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.beginPath(); g.moveTo(m, m); g.lineTo(m + Math.cos(a) * m, m + Math.sin(a) * m); g.stroke();
  }
  g.strokeStyle = '#c9ccd6';
  g.lineWidth = 2.5;
  g.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const rr = m * (i % 2 ? 0.86 : 0.8);
    const x = m + Math.cos(a) * rr;
    const y = m + Math.sin(a) * rr;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();
  // Estrella de David (dos triángulos), hacia adelante (abajo en la textura = frente).
  const ex = m;
  const ey = m + m * 0.38;
  const er = m * 0.24;
  g.lineWidth = 6;
  g.strokeStyle = '#d6d9e2';
  for (const giro of [0, Math.PI]) {
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = giro - Math.PI / 2 + (i * 2 * Math.PI) / 3;
      const x = ex + Math.cos(a) * er;
      const y = ey + Math.sin(a) * er;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.stroke();
  }
  return c;
}

// Muñeco de bloques. Mira hacia +Z. Los pies están en y = 0 (alto total ~5.4).
// cabeza: lo que devuelve cargarCabeza() (las 6 texturas y el color de piel de la foto).
export function crearPersonaje(p, cabezaTex) {
  const grupo = new THREE.Group();
  // Manos sin iluminación, igual que la cabeza, para que el tono de piel coincida.
  const matPiel = new THREE.MeshBasicMaterial({ color: cabezaTex.piel || p.piel || '#f1c27d' });
  matPiel.color.multiplyScalar(0.87);

  // Contextura: gordura de 0 a 1 (cuerpo 'gordo' = 1) y músculo de 0 a 1 (Bauti en el gym).
  // Con gordura el torso es más ancho y profundo, con panza y extremidades gruesas; con
  // músculo, espalda y pecho más anchos, hombros y brazos grandes.
  const gordura = p.gordura ?? (p.cuerpo === 'gordo' ? 1 : 0);
  const musculo = p.musculo || 0;
  const segun = (flaco, gordo) => flaco + (gordo - flaco) * gordura;
  const anchoTorso = segun(2, 2.7) + 0.9 * musculo;
  const fondoTorso = segun(1, 1.7) + 0.35 * musculo;
  const anchoPanza = segun(1.5, 2.2);
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
    const u0 = (anchoTorso / 2 - anchoPanza / 2) / anchoTorso;
    const frentePanza = lambert(tex(recorteCanvas(cabezaTex.ropa.frente, u0, 1 - (3.45 - 2) / 2, 1 - u0, 1 - (2.05 - 2) / 2)));
    panzaFrente = [tela, tela, tela, tela, frentePanza, tela];
    remera = tela;
  }
  // El cuerpo cuelga de la cadera (y = 2) para poder inclinarlo al agacharse.
  const cuerpo = new THREE.Group();
  cuerpo.position.y = 2;
  grupo.add(cuerpo);
  const CADERA = 2;
  // Brazo con codo a la mitad (y = -1): manga arriba y piel abajo. pivote.codo dobla el
  // antebrazo (los ejercicios del gym lo usan; caminando queda derecho).
  const extremidad = (padre, x, y, colorArriba, colorAbajo, largoArriba, grosor = 0.95) => {
    const pivote = new THREE.Group();
    pivote.position.set(x, y, 0);
    pivote.add(caja(grosor, largoArriba, grosor, colorArriba, 0, -largoArriba / 2, 0));
    pivote.add(caja(grosor, 1 - largoArriba, grosor, colorAbajo, 0, -largoArriba - (1 - largoArriba) / 2, 0));
    const codo = new THREE.Group();
    codo.position.y = -1;
    codo.add(caja(grosor * 0.97, 1, grosor * 0.97, colorAbajo, 0, -0.5, 0));
    pivote.add(codo);
    pivote.codo = codo;
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

  const grosorBrazo = segun(0.95, 1.1) + 0.5 * musculo;
  const grosorPierna = segun(0.95, 1.25) + 0.15 * musculo;
  const xBrazo = anchoTorso / 2 + segun(0.5, 0.55) + 0.25 * musculo;
  const xPierna = segun(0.5, 0.65) + 0.06 * musculo;
  const piernaI = pierna(-xPierna, grosorPierna);
  const piernaD = pierna(xPierna, grosorPierna);
  // Mangas largas (mangasLargas: true): el brazo entero es del color de la remera.
  const abajoBrazo = p.mangasLargas ? remera : matPiel;
  const brazoI = extremidad(cuerpo, -xBrazo, 4 - CADERA, remera, abajoBrazo, 0.8, grosorBrazo);
  const brazoD = extremidad(cuerpo, xBrazo, 4 - CADERA, remera, abajoBrazo, 0.8, grosorBrazo);
  const bloque = (w, h, d, material, x, y, z) => {
    if (!Array.isArray(material)) return caja(w, h, d, material, x, y, z);
    const m = new THREE.Mesh(GEO_CAJA, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    return m;
  };
  cuerpo.add(bloque(anchoTorso, 2, fondoTorso, torso || p.remera, 0, 3 - CADERA, 0));
  if (gordura > 0.05) {
    const fondoPanza = 0.45 * gordura;
    cuerpo.add(bloque(anchoPanza, segun(0.9, 1.4), fondoPanza, panzaFrente || p.remera, 0, 2.75 - CADERA, fondoTorso / 2 + fondoPanza / 2 - 0.025));
  }
  if (musculo > 0.05) {
    // Hombros (van con el brazo) y pectorales marcados.
    for (const brazo of [brazoI, brazoD]) {
      brazo.add(bloque(grosorBrazo + 0.3 * musculo, 0.8, grosorBrazo + 0.3 * musculo, remera, 0, -0.3, 0));
      // Bíceps: bulto adelante del brazo, en la parte de piel.
      brazo.add(bloque(grosorBrazo * 0.7, 0.5, 0.25 * musculo, matPiel, 0, -0.9, grosorBrazo / 2 + 0.1 * musculo));
    }
    // Trapecios: del cuello a los hombros.
    cuerpo.add(bloque(anchoTorso * 0.55, 0.3 * musculo, fondoTorso * 0.7, remera, 0, 2.08, -0.05));
    const fondoPecho = 0.22 * musculo;
    for (const lado of [-1, 1]) cuerpo.add(bloque(anchoTorso * 0.4, 0.8, fondoPecho, remera, lado * anchoTorso * 0.22, 1.45, fondoTorso / 2 + fondoPecho / 2 - 0.02));
  }

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
  // Kipá (data/personajes.js: kipa): casquete de tela con forma de cúpula, tamaño real (unos
  // 14 cm sobre una cabeza de 18), en la coronilla y un poco hacia atrás: de costado se ve
  // paradita. Satén azul oscuro con la estrella bordada y el borde en zigzag plateado.
  if (p.kipa) {
    const r = 0.44;
    const geo = new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, 0, 1.15);
    geo.scale(1, 0.8, 1);
    // Textura proyectada desde arriba (así la estrella no se deforma).
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * r), 0.5 - pos.getZ(i) / (2 * r));
    const tex = texturaDeCanvas(canvasKipa());
    const tela = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
    extras.push(tex, tela, geo);
    const kipa = new THREE.Mesh(geo, tela);
    kipa.position.set(0, cabeza.position.y + 0.64 - 0.14, -0.2); // el borde apoya en la cabeza
    kipa.rotation.x = -0.25;
    cuerpo.add(kipa);
  }
  // Lentes (lentes: color del marco): marco rectangular, puente y patillas.
  if (p.lentes) {
    const yc = cabeza.position.y + 0.14;
    const zc = 0.665;
    const m = p.lentes;
    for (const lado of [-1, 1]) {
      const cx = lado * 0.3;
      cuerpo.add(caja(0.42, 0.05, 0.04, m, cx, yc + 0.13, zc));
      cuerpo.add(caja(0.42, 0.05, 0.04, m, cx, yc - 0.13, zc));
      cuerpo.add(caja(0.05, 0.3, 0.04, m, cx - 0.19, yc, zc));
      cuerpo.add(caja(0.05, 0.3, 0.04, m, cx + 0.19, yc, zc));
      cuerpo.add(caja(0.04, 0.04, 0.6, m, lado * 0.665, yc + 0.1, zc - 0.3));
    }
    cuerpo.add(caja(0.2, 0.04, 0.04, m, 0, yc + 0.06, zc));
  }
  // Pelo atado en una colita (colita: true) con la gomita.
  if (p.colita) {
    const colorPelo = p.pelo || cabezaTex.pelo || '#1b1411';
    const yc = cabeza.position.y;
    cuerpo.add(caja(0.42, 0.42, 0.3, colorPelo, 0, yc + 0.25, -0.78));
    cuerpo.add(caja(0.26, 0.12, 0.26, '#7b1fa2', 0, yc + 0.05, -0.84));
    const cola = caja(0.3, 1.25, 0.26, colorPelo, 0, yc - 0.6, -0.92);
    cola.rotation.x = 0.18;
    cuerpo.add(cola);
  }
  // Remera de otro color abajo de una campera abierta (cuello: color).
  if (p.cuello) {
    const z = fondoTorso / 2 + 0.01 + 0.42 * gordura;
    cuerpo.add(caja(0.7, 0.55, 0.04, p.cuello, 0, 1.72, fondoTorso / 2 + 0.01));
    cuerpo.add(caja(0.06, segun(1.6, 1.3), 0.03, '#c9ced3', 0.04, segun(0.9, 0.8), z));
  }
  // Cuello alto subido hasta la pera (cuelloAlto: color), como un buzo de entrenamiento con
  // el cierre hasta arriba: la cabeza queda "pegada" al cuerpo.
  if (p.cuelloAlto) {
    const yc = cabeza.position.y;
    const c = p.cuelloAlto;
    cuerpo.add(caja(1.42, 0.34, 0.12, c, 0, yc - 0.52, 0.66)); // adelante (tapa la pera)
    cuerpo.add(caja(1.42, 0.5, 0.12, c, 0, yc - 0.45, -0.66)); // atrás
    for (const lado of [-1, 1]) cuerpo.add(caja(0.12, 0.46, 1.42, c, lado * 0.66, yc - 0.47, 0));
    cuerpo.add(caja(0.05, 0.3, 0.02, '#c9ced3', 0, yc - 0.53, 0.73)); // el cierre
  }
  // Buzo con capucha (capucha: color): la capucha caída en la espalda y los cordones.
  if (p.capucha) {
    cuerpo.add(caja(1.5, 0.8, 0.5, p.capucha, 0, cabeza.position.y - 0.62, -fondoTorso / 2 - 0.12));
    for (const lado of [-1, 1]) cuerpo.add(caja(0.06, 0.65, 0.04, '#e6e6e6', lado * 0.24, 1.62, fondoTorso / 2 + 0.03));
  }
  // Aritos plateados.
  if (p.aros) for (const lado of [-1, 1]) cuerpo.add(caja(0.08, 0.14, 0.08, '#d9dde2', lado * 0.69, cabeza.position.y - 0.2, 0.05));
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
    // Articulaciones (el gym arma las poses de los ejercicios moviéndolas a mano).
    partes: { cuerpo, cabeza, brazoI, brazoD, piernaI, piernaD, xBrazo, fondoTorso },
    manoD: brazoD, // para colgarle el arma (la mano está en y = -1.9)
    apuntar: false, // con el arma en la mano: brazos al frente
    llevar: false, // llevando algo con las dos manos (un plato)
    manosBolsillo: false, // caminando con las manos en los bolsillos (Dufre)
    brazosSentado: -1.2, // sentado: -1.2 llega al manubrio de la moto; menos, manos en la falda
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
      brazoI.rotation.x = sentado ? modelo.brazosSentado : -a - 0.7 * agache;
      brazoD.rotation.x = sentado ? modelo.brazosSentado : a - 0.7 * agache;
      if (sentado) cuerpo.rotation.x = 0.2;
      const abrir = enSuelo ? 0 : 0.5;
      brazoI.rotation.z += (-abrir - brazoI.rotation.z) * Math.min(1, dt * 10);
      brazoD.rotation.z += (abrir - brazoD.rotation.z) * Math.min(1, dt * 10);
      if (modelo.llevar) {
        // Llevando un plato: los dos brazos al frente, un poco cerrados hacia el plato.
        brazoI.rotation.set(-1.45, 0, 0.45);
        brazoD.rotation.set(-1.45, 0, -0.45);
      }
      if (modelo.manosBolsillo) {
        // Manos en los bolsillos: brazos pegados al cuerpo, codos un poco para atrás y las
        // manos metidas adelante a la altura de la cadera; caminando casi no se mueven.
        brazoI.rotation.set(0.18 - a * 0.06, 0, 0.06);
        brazoD.rotation.set(0.18 + a * 0.06, 0, -0.06);
        brazoI.codo.rotation.x = -0.5;
        brazoD.codo.rotation.x = -0.5;
      }
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
