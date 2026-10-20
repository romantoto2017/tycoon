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

// Canvas cuadrado con la cara (recortada según p.recorte) o la inicial si no hay foto.
// p.recorte = [centroX, centroY, tamaño]: centro en fracción del ancho/alto de la foto
// y tamaño del cuadrado en fracción del lado más corto.
export function obtenerCara(p) {
  if (!caras.has(p.id)) {
    caras.set(p.id, (async () => {
      const img = await cargarFoto(p);
      const s = 256;
      const c = nuevoCanvas(s);
      const g = c.getContext('2d');
      if (img) {
        const [cx, cy, t] = p.recorte || [0.5, 0.5, 1];
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const lado = Math.min(w, h) * Math.min(1, t);
        const x0 = Math.min(Math.max(cx * w - lado / 2, 0), w - lado);
        const y0 = Math.min(Math.max(cy * h - lado / 2, 0), h - lado);
        g.drawImage(img, x0, y0, lado, lado, 0, 0, s, s);
      } else {
        dibujarCaraPlaceholder(g, s, p);
      }
      return c;
    })());
  }
  return caras.get(p.id);
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
