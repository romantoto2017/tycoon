import * as THREE from 'three';
import { caja, GEO_CAJA } from './util.js';
import { texturaDeCanvas, recorteCanvas, liberarAlSubir } from './texturas.js';
import { crearZapatilla, LARGO as LARGO_ZAPA } from './zapatillas.js';

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

// Pasamontañas de Lucca Bossio x TussiWarriors (como el de la foto): tejido negro, los agujeros
// de los ojos y de la boca donde los tiene cada uno (personajes.js: ojos y boca), el logo blanco
// arriba del ojo derecho, "TU$$i" bordado en el cachete y las costuras a los costados de la boca.
const LOGO_LB = typeof Image !== 'undefined' ? Object.assign(new Image(), { src: 'assets/especiales/luccabossio_logo_blanco.png' }) : null;
function canvasTejido(n = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = '#151515';
  g.fillRect(0, 0, n, n);
  for (let x = 0; x < n; x += 4) { g.fillStyle = x % 8 ? '#1d1d1d' : '#0e0e0e'; g.fillRect(x, 0, 2, n); }
  return c;
}
function canvasPasamontanas(p, c = canvasTejido(256)) {
  const s = c.width;
  const g = c.getContext('2d');
  const [oy, ox0, ox1] = p.ojos || [0.45, 0.33, 0.67];
  const by = Math.min(0.93, p.boca ?? oy + 0.38);
  // Bordados (antes de los agujeros, así no tapan la cara).
  if (LOGO_LB?.complete && LOGO_LB.naturalWidth) g.drawImage(LOGO_LB, (ox1 - 0.02) * s, (oy - 0.17) * s, s * 0.2, s * 0.088);
  g.fillStyle = '#f2f2f2';
  g.font = `700 ${Math.round(s * 0.075)}px Arial, sans-serif`;
  g.textAlign = 'center';
  g.fillText('TU$$i', ox0 * s, Math.min(by - 0.06, oy + 0.17) * s);
  g.strokeStyle = '#f2f2f2';
  g.lineWidth = s * 0.012;
  for (const lado of [-1, 1]) {
    const x0 = 0.5 + lado * 0.11;
    const x1 = 0.5 + lado * 0.3;
    g.beginPath(); g.moveTo(x0 * s, by * s); g.lineTo(x1 * s, by * s);
    for (let k = 0; k < 4; k++) { const x = x0 + (x1 - x0) * (0.15 + k * 0.25); g.moveTo(x * s, (by - 0.035) * s); g.lineTo(x * s, (by + 0.035) * s); }
    g.stroke();
  }
  // Agujeros: transparentes (atrás se ve la cara).
  g.globalCompositeOperation = 'destination-out';
  for (const x of [ox0, ox1]) {
    g.beginPath();
    g.ellipse(x * s, oy * s, s * 0.125, s * 0.075, x < 0.5 ? 0.12 : -0.12, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath(); g.ellipse(0.5 * s, by * s, s * 0.075, s * 0.065, 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  return c;
}

// Muñeco de bloques. Mira hacia +Z. Los pies están en y = 0 (alto total ~5.4).
// cabeza: lo que devuelve cargarCabeza() (las 6 texturas y el color de piel de la foto).
// vestido: (opcional) la ropa de las tiendas puesta, como la arma vestir.js:
// { torso, piernas, pies, cabeza } con los canvas de cada prenda.
export function crearPersonaje(p, cabezaTex, vestido = null) {
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

  const tex = (c) => { const t = texturaDeCanvas(c); extras.push(t); return t; };
  // Canvas armados solo para este muñeco (recortes de la ropa): se vacían al subirse (texturas.js).
  const texUnica = (c) => liberarAlSubir(tex(c));
  const lambert = (t) => { const m = new THREE.MeshLambertMaterial(t.isTexture ? { map: t } : { color: t }); extras.push(m); return m; };
  // Remera con foto: frente con el diseño y el resto (costados, mangas y la espalda, si no
  // tiene foto propia) con la tela.
  let remera = p.remera;
  let torso;
  let panzaFrente = null;
  let mangaArriba = null;
  let mangaAbajo = null;
  let mangasLargas = p.mangasLargas;
  let mangaLarga = null; // { arriba, medio, abajo }: manga larga con foto (y la mano asoma)
  let capucha = p.capucha;
  let cuelloAlto = p.cuelloAlto;
  let cuello = p.cuello;
  const vt = vestido?.torso;
  if (vt) {
    // Prenda de la tienda: el frente se arma a la medida del torso (con la tela a los costados,
    // así el estampado no se deforma de más), la tela atrás y en los costados, y las mangas.
    const pr = vt.prenda;
    const tela = lambert(tex(vt.tela));
    const alto = 512;
    const ancho = Math.round((alto * anchoTorso) / 2);
    const c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    const g = c.getContext('2d');
    g.fillStyle = g.createPattern(vt.tela, 'repeat');
    g.fillRect(0, 0, ancho, alto);
    const w = Math.min(ancho, alto * (pr.aspecto || 0.7) * 1.45);
    g.drawImage(vt.frente, (ancho - w) / 2, 0, w, alto);
    const u0 = (anchoTorso / 2 - anchoPanza / 2) / anchoTorso;
    torso = [tela, tela, tela, tela, lambert(texUnica(c)), tela];
    panzaFrente = [tela, tela, tela, tela, lambert(texUnica(recorteCanvas(c, u0, 1 - (3.45 - 2) / 2, 1 - u0, 1 - (2.05 - 2) / 2))), tela];
    remera = tela;
    mangasLargas = !!pr.largas;
    if (vt.manga && mangasLargas) {
      // Manga larga sacada de la foto, del hombro al puño: cada pedazo del brazo lleva su parte
      // (así el dibujo sigue continuo) y abajo asoma la mano. Con rayas (rayas: true), solo
      // del lado de afuera del brazo.
      const corte = (v0, v1) => lambert(texUnica(recorteCanvas(vt.manga, 0, v0, 1, v1)));
      const cara = (m) => (lado) => (pr.rayas
        ? (lado < 0 ? [tela, m, tela, tela, tela, tela] : [m, tela, tela, tela, tela, tela])
        : [m, m, tela, tela, m, m]);
      const L = 1.8;
      mangaLarga = { arriba: cara(corte(0, 0.8 / L)), medio: cara(corte(0.8 / L, 1 / L)), abajo: cara(corte(1 / L, 1)) };
    } else if (pr.mangas) { mangaArriba = lambert(pr.mangas[0]); mangaAbajo = lambert(pr.mangas[1]); }
    capucha = pr.capucha ? (typeof pr.capucha === 'string' ? pr.capucha : pr.tela) : null;
    cuelloAlto = pr.cuello ? pr.tela : null;
    cuello = null;
  } else if (cabezaTex.ropa) {
    const tela = lambert(tex(cabezaTex.ropa.tela));
    const espalda = cabezaTex.ropa.espalda ? lambert(tex(cabezaTex.ropa.espalda)) : tela;
    torso = [tela, tela, tela, tela, lambert(tex(cabezaTex.ropa.frente)), espalda];
    if (cabezaTex.ropa.manga) mangaArriba = lambert(tex(cabezaTex.ropa.manga));
    // La panza muestra la parte del frente que tapa, así el diseño sigue continuo.
    const u0 = (anchoTorso / 2 - anchoPanza / 2) / anchoTorso;
    const frentePanza = lambert(texUnica(recorteCanvas(cabezaTex.ropa.frente, u0, 1 - (3.45 - 2) / 2, 1 - u0, 1 - (2.05 - 2) / 2)));
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
  // colorArriba / colorAbajo: color, material o una función (lado) => materiales por cara.
  const extremidad = (padre, x, y, colorArriba, colorAbajo, largoArriba, grosor = 0.95, manga = null) => {
    const pivote = new THREE.Group();
    pivote.position.set(x, y, 0);
    const deLado = (c) => (typeof c === 'function' ? c(x) : c);
    pivote.add(bloque(grosor, largoArriba, grosor, deLado(manga ? manga.arriba : colorArriba), 0, -largoArriba / 2, 0));
    pivote.add(bloque(grosor, 1 - largoArriba, grosor, deLado(manga ? manga.medio : colorAbajo), 0, -largoArriba - (1 - largoArriba) / 2, 0));
    const codo = new THREE.Group();
    codo.position.y = -1;
    if (manga) {
      // Antebrazo con la manga hasta el puño y la mano abajo.
      codo.add(bloque(grosor * 0.97, 0.8, grosor * 0.97, deLado(manga.abajo), 0, -0.4, 0));
      codo.add(bloque(grosor * 0.9, 0.2, grosor * 0.9, matPiel, 0, -0.9, 0));
    } else {
      codo.add(bloque(grosor * 0.97, 1, grosor * 0.97, deLado(colorAbajo), 0, -0.5, 0));
    }
    pivote.add(codo);
    pivote.codo = codo;
    padre.add(pivote);
    return pivote;
  };
  const bloque = (w, h, d, material, x, y, z) => {
    if (!Array.isArray(material)) return caja(w, h, d, material, x, y, z);
    const m = new THREE.Mesh(GEO_CAJA, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    return m;
  };
  // Pantalón de la tienda: cada pierna lleva adelante su mitad de la foto (el muslo la parte
  // de arriba y abajo de la rodilla el resto) y la tela en los costados y atrás.
  const vp = vestido?.piernas;
  const telaPantalon = vp ? lambert(tex(vp.tela)) : null;
  const frentePierna = (x, arriba) => {
    if (!vp) return p.pantalon;
    const u0 = x < 0 ? 0 : 0.5;
    const f = lambert(texUnica(recorteCanvas(vp.piernas, u0, arriba ? 0 : 0.5, u0 + 0.5, arriba ? 0.5 : 1)));
    return [telaPantalon, telaPantalon, telaPantalon, telaPantalon, f, telaPantalon];
  };
  // Zapatillas de la tienda: modelos 3D (zapatillas.js) a la medida del pie.
  const vz = vestido?.pies;
  const zapatilla = (rodilla, grosor) => {
    const z = crearZapatilla(vz.prenda.id);
    if (!z) return;
    z.scale.set(grosor * 1.02, 1, (grosor + 0.75) / LARGO_ZAPA);
    z.position.set(0, -1, 0.2);
    rodilla.add(z);
  };
  // Pierna con rodilla: muslo desde la cadera y la parte de abajo desde la rodilla.
  const pierna = (x, grosor) => {
    const muslo = new THREE.Group();
    muslo.position.set(x, CADERA, 0);
    muslo.add(bloque(grosor, 1, grosor, frentePierna(x, true), 0, -0.5, 0));
    const rodilla = new THREE.Group();
    rodilla.position.y = -1;
    rodilla.add(bloque(grosor * 0.98, 1, grosor * 0.98, frentePierna(x, false), 0, -0.5, 0));
    if (vz) zapatilla(rodilla, grosor);
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
  const arribaBrazo = mangaArriba || remera;
  const abajoBrazo = mangasLargas ? (mangaAbajo || remera) : matPiel;
  const brazoI = extremidad(cuerpo, -xBrazo, 4 - CADERA, arribaBrazo, abajoBrazo, 0.8, grosorBrazo, mangaLarga);
  const brazoD = extremidad(cuerpo, xBrazo, 4 - CADERA, arribaBrazo, abajoBrazo, 0.8, grosorBrazo, mangaLarga);
  const torsoMalla = bloque(anchoTorso, 2, fondoTorso, torso || p.remera, 0, 3 - CADERA, 0);
  cuerpo.add(torsoMalla);
  if (gordura > 0.05) {
    const fondoPanza = 0.45 * gordura;
    cuerpo.add(bloque(anchoPanza, segun(0.9, 1.4), fondoPanza, panzaFrente || p.remera, 0, 2.75 - CADERA, fondoTorso / 2 + fondoPanza / 2 - 0.025));
  }
  if (musculo > 0.05 && !p.detallar) {
    // Hombros (van con el brazo) y pectorales marcados.
    for (const brazo of [brazoI, brazoD]) {
      brazo.add(bloque(grosorBrazo + 0.3 * musculo, 0.8, grosorBrazo + 0.3 * musculo, (mangaLarga ? mangaLarga.arriba(brazo.position.x) : arribaBrazo), 0, -0.3, 0));
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
  const vg = vestido?.cabeza;
  const pasamontanas = !!vt?.prenda?.pasamontanas;
  if (p.kipa && !vg && !pasamontanas) {
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
  // Pasamontañas (viene con el hoodie de Lucca Bossio x TussiWarriors): tapa la cabeza entera
  // menos los ojos y la boca; con él no se ven el pelo largo, la colita, la kipá ni los lentes.
  if (pasamontanas) {
    const frente = canvasPasamontanas(p);
    const texFrente = tex(frente);
    if (LOGO_LB && !LOGO_LB.complete) {
      // El logo todavía no cargó: cuando llega, se vuelve a dibujar con el logo.
      LOGO_LB.addEventListener('load', () => {
        const g = frente.getContext('2d');
        g.clearRect(0, 0, frente.width, frente.height);
        g.drawImage(canvasTejido(256), 0, 0);
        canvasPasamontanas(p, frente);
        texFrente.needsUpdate = true;
      }, { once: true });
    }
    const lado = lambert(tex(canvasTejido()));
    const cara = new THREE.MeshLambertMaterial({ map: texFrente, transparent: true, alphaTest: 0.5 });
    extras.push(cara);
    cuerpo.add(bloque(1.37, 1.37, 1.37, [lado, lado, lado, lado, cara, lado], 0, cabeza.position.y + 0.01, 0));
  }
  // Lentes (lentes: color del marco): marco rectangular, puente y patillas.
  if (p.lentes && !pasamontanas) {
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
  if (p.colita && !pasamontanas) {
    const colorPelo = p.pelo || cabezaTex.pelo || '#1b1411';
    const yc = cabeza.position.y;
    cuerpo.add(caja(0.42, 0.42, 0.3, colorPelo, 0, yc + 0.25, -0.78));
    cuerpo.add(caja(0.26, 0.12, 0.26, '#7b1fa2', 0, yc + 0.05, -0.84));
    const cola = caja(0.3, 1.25, 0.26, colorPelo, 0, yc - 0.6, -0.92);
    cola.rotation.x = 0.18;
    cuerpo.add(cola);
  }
  // Remera de otro color abajo de una campera abierta (cuello: color).
  if (cuello) {
    const z = fondoTorso / 2 + 0.01 + 0.42 * gordura;
    cuerpo.add(caja(0.7, 0.55, 0.04, cuello, 0, 1.72, fondoTorso / 2 + 0.01));
    cuerpo.add(caja(0.06, segun(1.6, 1.3), 0.03, '#c9ced3', 0.04, segun(0.9, 0.8), z));
  }
  // Cuello alto subido hasta la pera (cuelloAlto: color), como un buzo de entrenamiento con
  // el cierre hasta arriba: la cabeza queda "pegada" al cuerpo.
  if (cuelloAlto) {
    const yc = cabeza.position.y;
    const c = cuelloAlto;
    cuerpo.add(caja(1.42, 0.34, 0.12, c, 0, yc - 0.52, 0.66)); // adelante (tapa la pera)
    cuerpo.add(caja(1.42, 0.5, 0.12, c, 0, yc - 0.45, -0.66)); // atrás
    for (const lado of [-1, 1]) cuerpo.add(caja(0.12, 0.46, 1.42, c, lado * 0.66, yc - 0.47, 0));
    cuerpo.add(caja(0.05, 0.3, 0.02, '#c9ced3', 0, yc - 0.53, 0.73)); // el cierre
  }
  // Buzo con capucha (capucha: color): la capucha caída en la espalda y los cordones.
  if (capucha) {
    cuerpo.add(caja(1.5, 0.8, 0.5, capucha, 0, cabeza.position.y - 0.62, -fondoTorso / 2 - 0.12));
    for (const lado of [-1, 1]) cuerpo.add(caja(0.06, 0.65, 0.04, '#e6e6e6', lado * 0.24, 1.62, fondoTorso / 2 + 0.03));
  }
  // Gorra de la tienda: copa con el logo adelante y visera.
  if (vg) {
    const yc = cabeza.position.y;
    const tela = lambert(tex(vg.tela));
    cuerpo.add(bloque(1.4, 0.46, 1.4, [tela, tela, tela, tela, lambert(tex(vg.frente)), tela], 0, yc + 0.65 + 0.06, -0.01));
    cuerpo.add(bloque(1.36, 0.07, 0.68, tela, 0, yc + 0.47, 0.65 + 0.3));
  }
  // Aritos plateados.
  if (p.aros) for (const lado of [-1, 1]) cuerpo.add(caja(0.08, 0.14, 0.08, '#d9dde2', lado * 0.69, cabeza.position.y - 0.2, 0.05));
  // Pelo largo (data/personajes.js: peloLargo): cae por la espalda y a los costados de la cara.
  if (p.peloLargo && !pasamontanas) {
    const colorPelo = cabezaTex.pelo || p.pelo || '#3b2a20';
    const yc = cabeza.position.y;
    cuerpo.add(caja(1.42, 2.4, 0.3, colorPelo, 0, yc - 0.55, -0.72));
    for (const lado of [-1, 1]) cuerpo.add(caja(0.22, 1.9, 1.1, colorPelo, lado * 0.72, yc - 0.45, -0.15));
  }

  // Cuerpo hecho a mano (el profe del gym, gimnasio.js): recibe las piezas y las medidas, y
  // cambia o agrega lo que quiera (sus texturas y materiales van a extras, para liberarlos).
  if (p.detallar) p.detallar({ cuerpo, cabeza, brazoI, brazoD, torso: torsoMalla, anchoTorso, fondoTorso, grosorBrazo, xBrazo, matPiel, extras });

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
    herramienta: false, // algo en la mano derecha (como las herramientas de Roblox): brazo al frente
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
      if (modelo.herramienta) {
        brazoD.rotation.x = -1.35;
        brazoD.rotation.z = 0;
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
