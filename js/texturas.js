import * as THREE from 'three';

const FUENTE = "Fredoka, 'Arial Black', Arial, sans-serif";

// Recorte de un canvas (fracciones de 0 a 1), para texturas que continúan un dibujo.
export function recorteCanvas(canvas, u0, v0, u1, v1) {
  const w = Math.round(canvas.width * (u1 - u0));
  const h = Math.round(canvas.height * (v1 - v0));
  const c = nuevoCanvas(w, h);
  c.getContext('2d').drawImage(canvas, canvas.width * u0, canvas.height * v0, w, h, 0, 0, w, h);
  return c;
}

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
  if (p.sinFoto) return null; // gente inventada (la de la ciudad): cara dibujada
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

// Textura del pelo según el peinado: 'liso' (mechones rectos), 'ondulado', 'rulos' o
// 'rapado' (pelito cortito: puntitos, y la piel se transparenta un poco).
function mechones(g, s, y0, y1, semilla, peinado = 'liso') {
  let a = semilla;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  const tono = () => (rnd() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.16)');
  g.lineCap = 'round';
  if (peinado === 'rapado') {
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = tono();
      g.fillRect(rnd() * s, y0 + rnd() * (y1 - y0), 1.5, 1.5);
    }
    return;
  }
  if (peinado === 'rulos') {
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = tono();
      g.lineWidth = 2 + rnd() * 2;
      g.beginPath();
      g.arc(rnd() * s, y0 + rnd() * (y1 - y0), 4 + rnd() * 7, rnd() * 6, rnd() * 6 + 4);
      g.stroke();
    }
    return;
  }
  const n = peinado === 'ondulado' ? 45 : 70;
  for (let i = 0; i < n; i++) {
    const x = rnd() * s;
    const ya = y0 + rnd() * (y1 - y0) * 0.5;
    const largo = (y1 - y0) * (0.3 + rnd() * 0.6);
    g.strokeStyle = tono();
    g.lineWidth = 2 + rnd() * 5;
    g.beginPath();
    if (peinado === 'ondulado') {
      const fase = rnd() * 6;
      for (let y = ya; y <= Math.min(y1, ya + largo); y += 4) {
        const xx = x + Math.sin(y * 0.09 + fase) * 7;
        if (y === ya) g.moveTo(xx, y); else g.lineTo(xx, y);
      }
    } else {
      g.moveTo(x, ya);
      g.quadraticCurveTo(x + (rnd() - 0.5) * 30, ya + largo / 2, x + (rnd() - 0.5) * 20, Math.min(y1, ya + largo));
    }
    g.stroke();
  }
}

// Bultitos de rulos a lo largo del borde del pelo.
function bordeRulos(g, s, puntos, pelo) {
  g.fillStyle = pelo;
  for (const [x, y] of puntos) {
    g.beginPath();
    g.arc(x * s, y * s, s * 0.075, 0, Math.PI * 2);
    g.fill();
  }
}

// Costado derecho de la cabeza (en la textura, el frente queda a la izquierda).
function dibujarCostado(g, s, pelo, piel, peinado) {
  g.fillStyle = piel;
  g.fillRect(0, 0, s, s);
  g.fillStyle = pelo;
  g.globalAlpha = peinado === 'rapado' ? 0.82 : 1;
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
  g.globalAlpha = 1;
  if (peinado === 'rulos') bordeRulos(g, s, [[0.05, 0.28], [0.15, 0.32], [0.38, 0.38], [0.55, 0.42], [0.62, 0.55], [0.66, 0.68], [0.75, 0.8], [0.88, 0.84], [1, 0.84]], pelo);
  mechones(g, s, 0, s * 0.85, 7, peinado);
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

function dibujarAtras(g, s, pelo, piel, peinado) {
  g.fillStyle = piel;
  g.fillRect(0, 0, s, s);
  g.fillStyle = pelo;
  g.globalAlpha = peinado === 'rapado' ? 0.82 : 1;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(s, 0);
  g.lineTo(s, s * 0.84);
  for (let i = 8; i >= 0; i--) g.lineTo((s * i) / 8, s * (i % 2 ? 0.88 : 0.82));
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  if (peinado === 'rulos') bordeRulos(g, s, [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i / 8, 0.86]), pelo);
  mechones(g, s, 0, s * 0.9, 3, peinado);
}

// Pelitos de barba (trazos cortos semitransparentes) en los puntos donde dentro(x, y).
function barbaEn(g, s, color, dentro) {
  let a = 13;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  g.save();
  // Base pareja (sombra de barba) y después los pelitos encima.
  const base = g.createImageData(s, s);
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (!dentro(x, y)) continue;
      const k = (y * s + x) * 4;
      base.data.set([r, gg, b, 105], k);
    }
  }
  const capa = document.createElement('canvas');
  capa.width = capa.height = s;
  capa.getContext('2d').putImageData(base, 0, 0);
  g.filter = 'blur(2px)';
  g.drawImage(capa, 0, 0);
  g.filter = 'none';
  g.strokeStyle = color;
  g.lineCap = 'round';
  for (let i = 0; i < 4200; i++) {
    const x = rnd() * s;
    const y = rnd() * s;
    if (!dentro(x, y)) continue;
    g.globalAlpha = 0.25 + rnd() * 0.4;
    g.lineWidth = 1 + rnd() * 1.6;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 3, y + 2 + rnd() * 4);
    g.stroke();
  }
  g.restore();
}

// Barba sobre la foto: bigote arriba de la boca, mandíbula a los costados y debajo de los
// labios. boca: [x0, y0, x1, y1] de los labios en proporción de la textura (0 a 1).
function dibujarBarba(g, s, color, [bx0, by0, bx1, by1]) {
  const mx = (bx0 + bx1) / 2;
  const labios = (x, y) => ((x / s - mx) / ((bx1 - bx0) / 2)) ** 2 + ((y / s - (by0 + by1) / 2) / ((by1 - by0) / 2)) ** 2 < 1;
  const bigote = (x, y) => y / s > by0 - 0.06 && y / s < by0 + 0.015 && Math.abs(x / s - mx) < (bx1 - bx0) * 0.55;
  const mandibula = (x, y) => {
    const u = Math.abs(x / s - 0.5); // 0 en el centro, 0.5 en el borde
    const desde = 0.95 - u * 0.9; // más alto hacia los costados (patillas)
    return y / s > desde && !labios(x, y);
  };
  barbaEn(g, s, color, (x, y) => bigote(x, y) || mandibula(x, y));
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
      let piel = '#f1c27d';
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
        dibujarCaraPlaceholder(gf, s, { ...p, piel: p.piel || piel });
      }
      // Lo que diga personajes.js manda sobre lo que se saca de la foto.
      pelo = p.pelo || pelo;
      piel = p.piel || piel;
      const peinado = p.peinado || 'liso';
      const [der, gd] = lienzo();
      dibujarCostado(gd, s, pelo, piel, peinado);
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
        dibujarAtras(ga, s, pelo, piel, peinado);
      }
      const [arriba, gar] = lienzo();
      gar.fillStyle = piel;
      gar.fillRect(0, 0, s, s);
      gar.fillStyle = pelo;
      gar.globalAlpha = peinado === 'rapado' ? 0.82 : 1;
      gar.fillRect(0, 0, s, s);
      gar.globalAlpha = 1;
      mechones(gar, s, 0, s, 11, peinado);
      const [abajo, gab] = lienzo();
      gab.fillStyle = piel;
      gab.fillRect(0, 0, s, s);
      // Remera con foto (opcional): { frente, tela, espalda?, manga? } en assets/.
      let ropa = null;
      if (p.remeraFotos) {
        const [imgFrente, imgTela, imgEspalda, imgManga] = await Promise.all([
          cargarImagen(`assets/${p.remeraFotos.frente}`),
          cargarImagen(`assets/${p.remeraFotos.tela}`),
          p.remeraFotos.espalda ? cargarImagen(`assets/${p.remeraFotos.espalda}`) : null,
          p.remeraFotos.manga ? cargarImagen(`assets/${p.remeraFotos.manga}`) : null,
        ]);
        if (imgFrente && imgTela) {
          const aCanvas = (img) => {
            const c = nuevoCanvas(img.naturalWidth, img.naturalHeight);
            c.getContext('2d').drawImage(img, 0, 0);
            return c;
          };
          ropa = { frente: aCanvas(imgFrente), tela: aCanvas(imgTela), espalda: imgEspalda ? aCanvas(imgEspalda) : null, manga: imgManga ? aCanvas(imgManga) : null };
        }
      }
      if (p.barba) {
        const b = p.barba;
        dibujarBarba(gf, s, b.color, b.boca);
        // Costados: patillas y mandíbula del lado de la cara (en la textura, a la izquierda).
        barbaEn(gd, s, b.color, (x, y) => x < s * 0.45 && y > s * (0.55 + 0.25 * (x / (s * 0.45))));
        gi.setTransform(1, 0, 0, 1, 0, 0);
        gi.clearRect(0, 0, s, s);
        gi.translate(s, 0);
        gi.scale(-1, 1);
        gi.drawImage(der, 0, 0);
        gab.fillStyle = b.color;
        gab.fillRect(0, 0, s, s * 0.55);
        barbaEn(gab, s, b.color, (x, y) => y < s * 0.7);
      }
      return { frente, der, izq, atras, arriba, abajo, piel, pelo, ropa };
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
// Cartel: chapa con degradé, borde claro con esquinas redondeadas, tornillitos y el texto
// con contorno, sombra y un poco de brillo de su color (tipo neón si el color es claro).
export function canvasCartel(texto, ancho, alto, color, fondo) {
  const h = 192;
  const w = Math.min(2048, Math.round((h * ancho) / alto));
  const c = nuevoCanvas(w, h);
  const g = c.getContext('2d');
  const base = new THREE.Color(fondo);
  const claro = base.clone().lerp(new THREE.Color('#ffffff'), 0.22).getStyle();
  const oscuro = base.clone().multiplyScalar(0.55).getStyle();
  const r = Math.min(h * 0.18, w * 0.08);
  const rect = (x, y, ww, hh, rr) => {
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + ww, y, x + ww, y + hh, rr);
    g.arcTo(x + ww, y + hh, x, y + hh, rr);
    g.arcTo(x, y + hh, x, y, rr);
    g.arcTo(x, y, x + ww, y, rr);
    g.closePath();
  };
  // Fondo y marco.
  g.fillStyle = oscuro;
  g.fillRect(0, 0, w, h);
  const borde = Math.max(6, h * 0.06);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, claro);
  grad.addColorStop(0.55, fondo);
  grad.addColorStop(1, oscuro);
  rect(borde, borde, w - borde * 2, h - borde * 2, r);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = borde * 0.55;
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  rect(borde * 1.6, borde * 1.6, w - borde * 3.2, h - borde * 3.2, r * 0.8);
  g.stroke();
  // Brillo de arriba.
  const brillo = g.createLinearGradient(0, borde, 0, h * 0.5);
  brillo.addColorStop(0, 'rgba(255,255,255,0.22)');
  brillo.addColorStop(1, 'rgba(255,255,255,0)');
  rect(borde * 2, borde * 2, w - borde * 4, h * 0.42, r * 0.7);
  g.fillStyle = brillo;
  g.fill();
  // Tornillos en las esquinas.
  g.fillStyle = 'rgba(230,230,235,0.9)';
  for (const [x, y] of [[borde * 3, borde * 3], [w - borde * 3, borde * 3], [borde * 3, h - borde * 3], [w - borde * 3, h - borde * 3]]) {
    if (w < h * 2.2 && x > borde * 3 && x < w - borde * 3) continue;
    g.beginPath();
    g.arc(x, y, borde * 0.45, 0, Math.PI * 2);
    g.fill();
  }
  // Texto.
  let tam = h * 0.56;
  g.font = `700 ${tam}px ${FUENTE}`;
  while (g.measureText(texto).width > w - borde * 9 && tam > 10) {
    tam -= 4;
    g.font = `700 ${tam}px ${FUENTE}`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const yt = h * 0.53;
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillText(texto, w / 2 + tam * 0.04, yt + tam * 0.07);
  g.lineWidth = tam * 0.16;
  g.strokeStyle = '#111';
  g.strokeText(texto, w / 2, yt);
  g.save();
  g.shadowColor = color;
  g.shadowBlur = tam * 0.35;
  g.fillStyle = color;
  g.fillText(texto, w / 2, yt);
  g.restore();
  g.fillStyle = color;
  g.fillText(texto, w / 2, yt);
  return c;
}

// Agua cayendo: celeste con chorros blancos verticales (se repite hacia abajo).
export function texturaCascada() {
  const w = 64;
  const h = 128;
  const c = nuevoCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(110, 195, 245, 0.8)';
  g.fillRect(0, 0, w, h);
  let a = 5;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`;
    const x = rnd() * w;
    const y = rnd() * h;
    g.fillRect(x, y, 1 + rnd() * 3, 20 + rnd() * 50);
    g.fillRect(x, y - h, 1 + rnd() * 3, 20 + rnd() * 50);
  }
  const t = texturaDeCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- Materiales de construcción ----------
// Texturas en escala de grises claros (se tiñen con el color del material) que se
// repiten en coordenadas del mundo: 1 unidad del juego = 1/escala de la textura.

function ruido(g, w, h, cantidad, alfa, semilla) {
  let a = semilla;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  for (let i = 0; i < cantidad; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${alfa * rnd()})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return rnd;
}

const DIBUJOS = {
  // Piso de goma de gimnasio: gris casi negro con pintitas claras.
  goma(g, s) {
    g.fillStyle = '#323438';
    g.fillRect(0, 0, s, s);
    let semilla = 7;
    const rnd = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
    for (let i = 0; i < s * 3; i++) {
      const v = 70 + Math.floor(rnd() * 90);
      g.fillStyle = `rgba(${v},${v},${v + 4},${0.35 + rnd() * 0.5})`;
      const r = 0.6 + rnd() * 1.3;
      g.fillRect(rnd() * s, rnd() * s, r, r);
    }
  },
  // Piso de bodegón: damero blanco y negro (cada repetición tiene 2 x 2 baldosas).
  damero(g, s) {
    const m = s / 2;
    g.fillStyle = '#f2efe8';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#26272b';
    g.fillRect(0, 0, m, m);
    g.fillRect(m, m, m, m);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, s, s);
    g.beginPath(); g.moveTo(m, 0); g.lineTo(m, s); g.moveTo(0, m); g.lineTo(s, m); g.stroke();
  },
  // Alfombra de arcade: fondo violeta con figuritas de neón (estrellas, rayos, círculos).
  alfombraArcade(g, s) {
    g.fillStyle = '#3a0f4f';
    g.fillRect(0, 0, s, s);
    let a = 21;
    const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${120 + rnd() * 60},${20 + rnd() * 30},${110 + rnd() * 60},0.35)`;
      g.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
    const colores = ['#ff3d9a', '#29e7ff', '#ffe14d', '#7cff5a', '#ff8a3d'];
    for (let i = 0; i < 26; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const r = 6 + rnd() * 10;
      g.strokeStyle = colores[i % colores.length];
      g.fillStyle = colores[(i + 2) % colores.length];
      g.lineWidth = 3;
      const forma = i % 4;
      g.beginPath();
      if (forma === 0) {
        g.arc(x, y, r, 0, Math.PI * 2);
        g.stroke();
      } else if (forma === 1) {
        for (let k = 0; k < 10; k++) {
          const ang = (k / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = k % 2 ? r * 0.45 : r;
          if (k) g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
          else g.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        g.closePath();
        g.fill();
      } else if (forma === 2) {
        g.moveTo(x - r, y + r * 0.2);
        g.lineTo(x - r * 0.2, y - r * 0.4);
        g.lineTo(x + r * 0.2, y + r * 0.3);
        g.lineTo(x + r, y - r * 0.3);
        g.stroke();
      } else {
        g.moveTo(x, y - r);
        g.lineTo(x + r, y + r * 0.8);
        g.lineTo(x - r, y + r * 0.8);
        g.closePath();
        g.stroke();
      }
    }
  },
  // Estuco: casi liso con grano fino.
  estuco(g, s) {
    g.fillStyle = '#f4f4f4';
    g.fillRect(0, 0, s, s);
    ruido(g, s, s, 2500, 0.08, 1);
  },
  // Paneles con juntas verticales.
  panel(g, s) {
    g.fillStyle = '#e6e6e6';
    g.fillRect(0, 0, s, s);
    ruido(g, s, s, 1500, 0.06, 2);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, 3, s);
    g.fillRect(s / 2, 0, 3, s);
    g.fillRect(0, 0, s, 2);
  },
  // Piedra: hiladas horizontales de piezas de distinto largo y tono.
  piedra(g, s) {
    const rnd = ruido(g, s, s, 0, 0, 3);
    const filas = 6;
    for (let f = 0; f < filas; f++) {
      let x = -rnd() * 40;
      while (x < s) {
        const w = 40 + rnd() * 70;
        const t = 175 + Math.floor(rnd() * 70);
        g.fillStyle = `rgb(${t},${t},${t - 4})`;
        g.fillRect(x, (f * s) / filas, w, s / filas);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(x, (f * s) / filas, 2, s / filas);
        x += w;
      }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(0, (f * s) / filas, s, 2);
    }
    ruido(g, s, s, 2000, 0.12, 4);
  },
  // Listones verticales de madera.
  listones(g, s) {
    const rnd = ruido(g, s, s, 0, 0, 5);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t = 200 + Math.floor(rnd() * 50);
      g.fillStyle = `rgb(${t},${t},${t})`;
      g.fillRect((i * s) / n, 0, s / n, s);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect((i * s) / n, 0, 3, s);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = 'rgba(0,0,0,0.08)';
        g.fillRect((i * s) / n + 4 + rnd() * (s / n - 8), 0, 1, s);
      }
    }
  },
  // Tablas de piso: hileras horizontales con cortes desfasados y veta.
  tablas(g, s) {
    const rnd = ruido(g, s, s, 0, 0, 6);
    const filas = 8;
    for (let f = 0; f < filas; f++) {
      const y = (f * s) / filas;
      let x = -rnd() * s * 0.5;
      while (x < s) {
        const w = s * (0.45 + rnd() * 0.5);
        const t = 200 + Math.floor(rnd() * 55);
        g.fillStyle = `rgb(${t},${t},${t})`;
        g.fillRect(x, y, w, s / filas);
        for (let k = 0; k < 4; k++) {
          g.fillStyle = 'rgba(0,0,0,0.07)';
          g.fillRect(x, y + 3 + rnd() * (s / filas - 6), w, 1);
        }
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y, 2, s / filas);
        x += w;
      }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, y, s, 2);
    }
  },
  // Ladrillo visto.
  ladrillo(g, s) {
    const rnd = ruido(g, s, s, 0, 0, 7);
    g.fillStyle = '#d8d0c8';
    g.fillRect(0, 0, s, s);
    const filas = 8;
    for (let f = 0; f < filas; f++) {
      const off = f % 2 ? s / 8 : 0;
      for (let c = -1; c < 4; c++) {
        const t = 190 + Math.floor(rnd() * 60);
        g.fillStyle = `rgb(${t},${t},${t})`;
        g.fillRect(c * (s / 4) + off + 2, f * (s / filas) + 2, s / 4 - 4, s / filas - 4);
      }
    }
    ruido(g, s, s, 1500, 0.1, 8);
  },
  // Baldosas grandes.
  baldosa(g, s) {
    g.fillStyle = '#f0f0f0';
    g.fillRect(0, 0, s, s);
    ruido(g, s, s, 1200, 0.05, 9);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, s, 2);
    g.fillRect(0, 0, 2, s);
  },
  // Pasto cortado: franjas anchas claras y oscuras con briznas.
  pasto(g, s) {
    g.fillStyle = '#e0e0e0';
    g.fillRect(0, 0, s, s / 2);
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, s / 2, s, s / 2);
    ruido(g, s, s, 5000, 0.18, 10);
  },
  // Pasto sin franjas (afuera del terreno).
  pastoLibre(g, s) {
    g.fillStyle = '#d6d6d6';
    g.fillRect(0, 0, s, s);
    ruido(g, s, s, 6000, 0.2, 12);
  },
  // Hormigón para veredas y canteros.
  concreto(g, s) {
    g.fillStyle = '#e4e4e4';
    g.fillRect(0, 0, s, s);
    ruido(g, s, s, 3000, 0.1, 11);
    g.fillStyle = 'rgba(0,0,0,0.15)';
    g.fillRect(0, 0, s, 2);
  },
};

const texturasMaterial = new Map();
export function texturaMaterial(tipo) {
  if (!texturasMaterial.has(tipo)) {
    const s = 256;
    const c = nuevoCanvas(s);
    DIBUJOS[tipo](c.getContext('2d'), s);
    const t = texturaDeCanvas(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4; // pisos y paredes nítidos aunque se vean de costado
    texturasMaterial.set(tipo, t);
  }
  return texturasMaterial.get(tipo);
}
