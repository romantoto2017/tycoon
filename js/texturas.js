import * as THREE from 'three';

const FUENTE = "Fredoka, 'Arial Black', Arial, sans-serif";

export function texturaDeCanvas(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Devuelve la imagen o null si no existe (sin romper nada).
export function cargarImagen(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function nuevoCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- Moneda ----------

let imagenMoneda = null;

// Si existe assets/moneda.png se usa esa; si no, se dibuja la moneda "VB".
export async function prepararMoneda() {
  imagenMoneda = await cargarImagen('assets/moneda.png');
}

function dibujarMonedaVB(g, s) {
  const c = s / 2;
  const r = s * 0.46;
  const grad = g.createRadialGradient(c - r * 0.35, c - r * 0.35, r * 0.1, c, c, r);
  grad.addColorStop(0, '#fff6b0');
  grad.addColorStop(0.5, '#ffcc2e');
  grad.addColorStop(1, '#d08a00');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = s * 0.05;
  g.strokeStyle = '#9c6200';
  g.stroke();
  g.lineWidth = s * 0.025;
  g.strokeStyle = '#e09a00';
  g.beginPath();
  g.arc(c, c, r * 0.78, 0, Math.PI * 2);
  g.stroke();
  // "VB" grabado: brillo abajo a la derecha y letra oscura encima.
  g.font = `700 ${Math.round(s * 0.38)}px ${FUENTE}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff3b8';
  g.fillText('VB', c + s * 0.018, c + s * 0.045);
  g.fillStyle = '#8f5700';
  g.fillText('VB', c, c + s * 0.025);
}

// fondo=true: cuadrado dorado (para las caras de los bloques de moneda).
export function canvasMoneda(s = 128, fondo = false) {
  const c = nuevoCanvas(s);
  const g = c.getContext('2d');
  if (fondo) {
    g.fillStyle = '#e8a800';
    g.fillRect(0, 0, s, s);
    g.lineWidth = s * 0.08;
    g.strokeStyle = '#b07400';
    g.strokeRect(0, 0, s, s);
  }
  if (imagenMoneda) g.drawImage(imagenMoneda, 0, 0, s, s);
  else dibujarMonedaVB(g, s);
  return c;
}

// ---------- Caras ----------

const caras = new Map();

function dibujarCaraPlaceholder(g, s, p) {
  g.fillStyle = p.piel;
  g.fillRect(0, 0, s, s);
  g.font = `700 ${Math.round(s * 0.72)}px ${FUENTE}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = s * 0.06;
  g.strokeStyle = '#ffffff';
  g.strokeText(p.nombre[0].toUpperCase(), s / 2, s * 0.55);
  g.fillStyle = p.remera;
  g.fillText(p.nombre[0].toUpperCase(), s / 2, s * 0.55);
}

// Busca la foto: primero el archivo indicado en personajes.js, después id.jpg/.jpeg/.png.
async function cargarFoto(p) {
  const nombres = [p.foto, `${p.id}.jpg`, `${p.id}.jpeg`, `${p.id}.png`].filter(Boolean);
  for (const n of [...new Set(nombres)]) {
    const img = await cargarImagen(`assets/caras/${n}`);
    if (img) return img;
  }
  return null;
}

// Promedio de color de una zona de la imagen. oscuros=true usa solo la mitad más oscura
// (el pelo suele ser más oscuro que la pared de atrás).
function colorPromedio(img, x, y, w, h, oscuros = false) {
  const c = nuevoCanvas(16);
  const g = c.getContext('2d');
  g.drawImage(img, x, y, Math.max(1, w), Math.max(1, h), 0, 0, 16, 16);
  const d = g.getImageData(0, 0, 16, 16).data;
  let px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  if (oscuros) px = px.sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2])).slice(0, px.length / 2);
  const m = [0, 1, 2].map((k) => Math.round(px.reduce((a, p) => a + p[k], 0) / px.length));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

// Mechones: trazos finos más claros y más oscuros sobre el color del pelo.
function mechones(g, s, y0, y1, semilla) {
  let a = semilla;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * s;
    const ya = y0 + rnd() * (y1 - y0) * 0.5;
    const largo = (y1 - y0) * (0.3 + rnd() * 0.6);
    g.strokeStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)';
    g.lineWidth = 2 + rnd() * 5;
    g.beginPath();
    g.moveTo(x, ya);
    g.quadraticCurveTo(x + (rnd() - 0.5) * 30, ya + largo / 2, x + (rnd() - 0.5) * 20, Math.min(y1, ya + largo));
    g.stroke();
  }
}

// Costado derecho de la cabeza (en la textura, el frente queda a la izquierda).
function dibujarCostado(g, s, pelo, piel) {
  g.fillStyle = piel;
  g.fillRect(0, 0, s, s);
  g.fillStyle = pelo;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(s, 0);
  g.lineTo(s, s * 0.82);
  g.quadraticCurveTo(s * 0.62, s * 0.78, s * 0.6, s * 0.42);
  g.lineTo(s * 0.34, s * 0.36);
  g.lineTo(s * 0.3, s * 0.56);
  g.lineTo(s * 0.22, s * 0.56);
  g.lineTo(s * 0.2, s * 0.3);
  g.lineTo(0, s * 0.26);
  g.closePath();
  g.fill();
  mechones(g, s, 0, s * 0.8, 7);
  // Oreja.
  g.fillStyle = 'rgba(120,60,40,0.25)';
  g.beginPath();
  g.ellipse(s * 0.47, s * 0.56, s * 0.07, s * 0.12, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = piel;
  g.beginPath();
  g.ellipse(s * 0.47, s * 0.56, s * 0.045, s * 0.09, 0, 0, Math.PI * 2);
  g.fill();
}

function dibujarAtras(g, s, pelo, piel) {
  g.fillStyle = piel;
  g.fillRect(0, 0, s, s);
  g.fillStyle = pelo;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(s, 0);
  g.lineTo(s, s * 0.84);
  for (let i = 8; i >= 0; i--) g.lineTo((s * i) / 8, s * (i % 2 ? 0.88 : 0.82));
  g.closePath();
  g.fill();
  mechones(g, s, 0, s * 0.86, 3);
}

// Las 6 caras de la cabeza: frente con la foto y el resto dibujado con los colores
// de pelo y piel sacados de la misma foto. Si existe p.fotoAtras, se usa para la nuca.
export function cargarCabeza(p) {
  if (!caras.has(p.id)) {
    caras.set(p.id, (async () => {
      const img = await cargarFoto(p);
      const s = 256;
      const lienzo = () => {
        const c = nuevoCanvas(s);
        return [c, c.getContext('2d')];
      };
      const [frente, gf] = lienzo();
      let pelo = '#3e2723';
      let piel = p.piel;
      if (img) {
        const [cx, cy, t] = p.recorte || [0.5, 0.5, 1];
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const lado = Math.min(w, h) * Math.min(1, t);
        const x0 = Math.min(Math.max(cx * w - lado / 2, 0), w - lado);
        const y0 = Math.min(Math.max(cy * h - lado / 2, 0), h - lado);
        gf.drawImage(img, x0, y0, lado, lado, 0, 0, s, s);
        // Pelo: arriba del recorte (o la franja de arriba si el recorte toca el borde).
        const arribaY = Math.max(0, y0 - lado * 0.3);
        const altoPelo = Math.max(y0 + lado * 0.06 - arribaY, lado * 0.12);
        pelo = colorPromedio(img, x0 + lado * 0.25, arribaY, lado * 0.5, altoPelo, true);
        // Piel: los cachetes.
        piel = colorPromedio(frente, s * 0.22, s * 0.56, s * 0.56, s * 0.1);
      } else {
        dibujarCaraPlaceholder(gf, s, p);
      }
      const [der, gd] = lienzo();
      dibujarCostado(gd, s, pelo, piel);
      const [izq, gi] = lienzo();
      gi.translate(s, 0);
      gi.scale(-1, 1);
      gi.drawImage(der, 0, 0);
      const [atras, ga] = lienzo();
      const imgAtras = p.fotoAtras ? await cargarImagen(`assets/caras/${p.fotoAtras}`) : null;
      if (imgAtras) {
        const l = Math.min(imgAtras.naturalWidth, imgAtras.naturalHeight);
        ga.drawImage(imgAtras, (imgAtras.naturalWidth - l) / 2, (imgAtras.naturalHeight - l) / 2, l, l, 0, 0, s, s);
      } else {
        dibujarAtras(ga, s, pelo, piel);
      }
      const [arriba, gar] = lienzo();
      gar.fillStyle = pelo;
      gar.fillRect(0, 0, s, s);
      mechones(gar, s, 0, s, 11);
      const [abajo, gab] = lienzo();
      gab.fillStyle = piel;
      gab.fillRect(0, 0, s, s);
      return { frente, der, izq, atras, arriba, abajo, piel, pelo };
    })());
  }
  return caras.get(p.id);
}

// Canvas cuadrado con la cara (para la pantalla de selección).
export async function obtenerCara(p) {
  return (await cargarCabeza(p)).frente;
}

// ---------- Etiquetas flotantes ----------

function rectRedondeado(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

let iconoEtiqueta = null;

// lineas: [{ texto, color, tam, moneda }]
function dibujarEtiqueta(c, lineas) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const maxAncho = c.width - 70;
  const medidas = lineas.map((l) => {
    let tam = l.tam || 60;
    const icono = l.moneda ? tam : 0;
    g.font = `700 ${tam}px ${FUENTE}`;
    let ancho = g.measureText(l.texto).width + icono;
    while (ancho > maxAncho && tam > 20) {
      tam -= 4;
      g.font = `700 ${tam}px ${FUENTE}`;
      ancho = g.measureText(l.texto).width + (l.moneda ? tam : 0);
    }
    return { tam, ancho };
  });
  const alto = medidas.reduce((a, m) => a + m.tam * 1.15, 0);
  const anchoFondo = Math.max(...medidas.map((m) => m.ancho)) + 50;
  let y = (c.height - alto) / 2;
  g.fillStyle = 'rgba(0, 0, 0, 0.5)';
  rectRedondeado(g, (c.width - anchoFondo) / 2, y - 12, anchoFondo, alto + 24, 26);
  g.fill();

  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  lineas.forEach((l, i) => {
    const { tam, ancho } = medidas[i];
    const cy = y + tam * 0.575;
    let x = (c.width - ancho) / 2;
    if (l.moneda) {
      if (!iconoEtiqueta) iconoEtiqueta = canvasMoneda(64);
      g.drawImage(iconoEtiqueta, x, cy - tam * 0.45, tam * 0.9, tam * 0.9);
      x += tam;
    }
    g.font = `700 ${tam}px ${FUENTE}`;
    g.lineWidth = tam * 0.18;
    g.strokeStyle = '#000';
    g.strokeText(l.texto, x, cy);
    g.fillStyle = l.color || '#fff';
    g.fillText(l.texto, x, cy);
    y += tam * 1.15;
  });
}

// Cartel que siempre mira a la cámara. Devuelve { sprite, actualizar(lineas) }.
export function crearEtiqueta(lineas, ancho = 5) {
  const c = nuevoCanvas(512, 256);
  const tex = texturaDeCanvas(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(ancho, ancho / 2, 1);
  const etiqueta = {
    sprite,
    actualizar(nuevas) {
      dibujarEtiqueta(c, nuevas);
      tex.needsUpdate = true;
    },
  };
  etiqueta.actualizar(lineas);
  return etiqueta;
}

// ---------- Texturas de entorno ----------

export function texturaBaseplate() {
  const s = 64;
  const c = nuevoCanvas(s);
  const g = c.getContext('2d');
  g.fillStyle = '#4fae45';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(0, 0, 0, 0.13)';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, s - 3, s - 3);
  const t = texturaDeCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function texturaCinta() {
  const s = 64;
  const c = nuevoCanvas(s);
  const g = c.getContext('2d');
  g.fillStyle = '#2b2b2b';
  g.fillRect(0, 0, s, s);
  g.fillStyle = '#4a4a4a';
  g.fillRect(0, 0, s, s * 0.35);
  g.fillStyle = '#f5c400';
  g.fillRect(0, 0, s * 0.08, s);
  g.fillRect(s * 0.92, 0, s * 0.08, s);
  const t = texturaDeCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function texturaSombra() {
  const s = 64;
  const c = nuevoCanvas(s);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

// Cartel con texto (letras grandes con borde), para paredes y carteles.
export function canvasCartel(texto, ancho, alto, color, fondo) {
  const h = 128;
  const w = Math.min(2048, Math.round((h * ancho) / alto));
  const c = nuevoCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = fondo;
  g.fillRect(0, 0, w, h);
  let tam = h * 0.7;
  g.font = `700 ${tam}px ${FUENTE}`;
  while (g.measureText(texto).width > w * 0.92 && tam > 10) {
    tam -= 4;
    g.font = `700 ${tam}px ${FUENTE}`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = tam * 0.14;
  g.strokeStyle = '#000';
  g.strokeText(texto, w / 2, h * 0.54);
  g.fillStyle = color;
  g.fillText(texto, w / 2, h * 0.54);
  return c;
}

// Cuadro: placeholder colorido y, si existe, la imagen de assets/cuadros/ recortada a 4:3.
export function texturaCuadro(archivo, i) {
  const w = 256;
  const h = 192;
  const c = nuevoCanvas(w, h);
  const g = c.getContext('2d');
  const fondos = ['#ff7043', '#29b6f6', '#ab47bc', '#66bb6a', '#ffca28', '#ec407a', '#26c6da', '#8d6e63'];
  g.fillStyle = fondos[i % fondos.length];
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  for (let k = 0; k < 6; k++) g.fillRect((k * 53) % w, (k * 37) % h, 40, 40);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 34px ${FUENTE}`;
  g.lineWidth = 6;
  g.strokeStyle = '#000';
  g.strokeText('VECIBANDA', w / 2, h * 0.42);
  g.fillStyle = '#fff';
  g.fillText('VECIBANDA', w / 2, h * 0.42);
  g.font = `700 28px ${FUENTE}`;
  g.strokeText(`Cuadro ${i + 1}`, w / 2, h * 0.68);
  g.fillText(`Cuadro ${i + 1}`, w / 2, h * 0.68);
  const tex = texturaDeCanvas(c);
  cargarImagen(`assets/cuadros/${archivo}`).then((img) => {
    if (!img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const k = Math.min(iw / w, ih / h);
    g.drawImage(img, (iw - w * k) / 2, (ih - h * k) / 2, w * k, h * k, 0, 0, w, h);
    tex.needsUpdate = true;
  });
  return tex;
}
