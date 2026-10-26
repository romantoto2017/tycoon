import * as THREE from 'three';
import { audioKaraoke, setKaraoke } from './sfx.js';
import { PANTALLA_KARAOKE, portadaKaraoke } from './muebles.js';

// Karaoke del tercer piso: "Poner el karaoke (E)" al lado de la pantalla de letras. Suena una
// cumbia hecha con WebAudio (bajo, acordes, güiro, bombo y palmas) con la melodía guía, y la
// letra se va pintando de amarillo sílaba por sílaba al ritmo, en la pantalla y abajo en el HUD,
// como en un video de karaoke. El reloj es el del audio, así letra y música no se separan.

const LETRA = [
  'De pronto llegan los guaranguitos',
  'llega il Piojo con la Shepa Maní',
  'hola Patito, hola Llorens',
  'hola Bustamante, hola Extravirgen',
  'llegó mi mano Bauti Dabin',
  'me dijo: es posta que lo violaron, ya fue',
  'estamos por pasar al rancho',
  'noche de fama, noche de alcohol',
  'leche de Manu, Manu Méndez',
  'yo soy la Shepa, vos Lazarillo',
  'yo soy el negro, vos sos la IB',
];

const BPM = 100;
const CORCHEA = 60 / BPM / 2;
const COMPAS = CORCHEA * 8;
const INTRO = 2; // compases antes de la primera línea (con la cuenta 3, 2, 1)
const POR_LINEA = 2; // compases por línea: cada sílaba es una corchea y la última se estira
const FINAL = 2;
export const DURACION = (INTRO + LETRA.length * POR_LINEA + FINAL) * COMPAS;
const CERCA = 13; // a cuánto de la pantalla se puede poner (y se ve la letra en el HUD)

// Sílabas aproximadas: grupos de vocales (alcanza para repartir el tiempo de cada palabra).
const silabas = (p) => Math.max(1, (p.toLowerCase().match(/[aeiouáéíóúü]+/g) || []).length);

// Cada línea: sus palabras con el momento (en segundos desde que arranca) en que empieza y
// termina cada una, y la nota de cada sílaba para la melodía.
const ESCALA = [196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25]; // la menor pentatónica, con algo más
const FORMAS = [[2, 2, 3, 4, 3, 2, 3, 2, 1, 2, 3, 2, 2, 1], [4, 4, 5, 4, 3, 4, 5, 6, 5, 4, 3, 4, 3, 2], [3, 3, 2, 3, 4, 4, 3, 2, 2, 3, 4, 3, 2, 2], [5, 5, 4, 5, 6, 5, 4, 3, 4, 5, 4, 3, 2, 2]];
export const LINEAS = LETRA.map((texto, n) => {
  const inicio = (INTRO + n * POR_LINEA) * COMPAS;
  let t = inicio;
  let s = 0;
  const notas = [];
  const palabras = texto.split(' ').map((p) => {
    const cuantas = silabas(p);
    const desde = t;
    for (let i = 0; i < cuantas; i++) {
      notas.push({ t, f: ESCALA[FORMAS[n % FORMAS.length][s % 14]] });
      t += CORCHEA;
      s++;
    }
    return { texto: p, desde, hasta: t };
  });
  palabras[palabras.length - 1].hasta += CORCHEA; // la última sílaba se estira
  return { texto, inicio, fin: inicio + POR_LINEA * COMPAS, palabras, notas };
});

const NOTAS = LINEAS.flatMap((l) => l.notas);
const ADELANTO = 0.5; // segundos que se programan por adelantado

// Acordes de cumbia (un compás cada uno): La menor, Re menor, Sol, Do.
const ACORDES = [[110, [220, 261.63, 329.63]], [146.83, [293.66, 349.23, 440]], [98, [196, 246.94, 293.66]], [130.81, [261.63, 329.63, 392]]];

export class Karaoke {
  constructor(ui) {
    this.ui = ui;
    this.sonando = false;
    this.inicio = 0; // ctx.currentTime en que arrancó
    this.proximo = 0; // próxima corchea por programar
    this.paso = 0;
    this.nota = 0;
    this.redibujo = 0;
    this.pos = new THREE.Vector3();
  }

  // Dónde está la pantalla (null si todavía no la compraste).
  dondePantalla() {
    const m = PANTALLA_KARAOKE.malla;
    if (!m || !m.parent) return null;
    return m.getWorldPosition(this.pos);
  }

  cerca(jugador) {
    const p = this.dondePantalla();
    return p && Math.abs(jugador.pos.y - (p.y - 4.6)) < 4 && Math.hypot(jugador.pos.x - p.x, jugador.pos.z - p.z) < CERCA;
  }

  accion(jugador) {
    if (!this.cerca(jugador)) return '';
    return this.sonando ? 'Parar el karaoke (E)' : 'Poner el karaoke (E)';
  }

  hacer(jugador) {
    if (!this.cerca(jugador)) return;
    if (this.sonando) this.parar();
    else this.empezar();
  }

  // Segundos desde que arrancó la canción (según el reloj del audio).
  tiempo() {
    const a = audioKaraoke();
    return a ? a.ctx.currentTime - this.inicio : 0;
  }

  empezar() {
    const a = audioKaraoke();
    if (!a) return;
    this.sonando = true;
    this.inicio = a.ctx.currentTime + 0.15;
    this.proximo = this.inicio;
    this.paso = 0;
    this.nota = 0;
    setKaraoke(true);
  }

  parar(aplausos = false) {
    this.sonando = false;
    setKaraoke(false);
    this.ui.ocultarKaraoke();
    this.dibujar(null);
    if (aplausos) this.ui.toast('¡Aplausos! 👏 Cantaste Los Guaranguitos', 'plata');
  }

  // ---------- Música ----------
  tono(f, t, dur, tipo, vol, destino, ctx) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  ruido(t, dur, vol, frec, destino, ctx) {
    if (!this.blanco || this.blanco.sampleRate !== ctx.sampleRate) {
      this.blanco = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = this.blanco.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.blanco;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = frec;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filtro).connect(g).connect(destino);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // Programa lo que viene en el próximo medio segundo (bajo, acordes, percusión y melodía). Si
  // la compu se trabó y quedaron notas atrasadas, se saltean (no se amontonan todas juntas).
  programar() {
    const { ctx, destino } = audioKaraoke();
    const total = Math.round(DURACION / CORCHEA);
    const ahora = ctx.currentTime;
    while (this.proximo < ahora - 0.05 && this.paso < total) { this.proximo += CORCHEA; this.paso++; }
    while (this.proximo < ahora + ADELANTO && this.paso < total) {
      const t = this.proximo;
      const p = this.paso % 8;
      const compas = Math.floor(this.paso / 8);
      const [bajo, notas] = ACORDES[compas % ACORDES.length];
      const ultimo = this.paso >= total - 8;
      if (!ultimo || p === 0) {
        // Bajo de cumbia (1, 2+ y 3) y acordes a contratiempo.
        if (p === 0 || p === 3 || p === 4) this.tono(p === 3 ? bajo * 1.5 : bajo, t, CORCHEA * 1.6, 'triangle', 0.32, destino, ctx);
        if (p % 2 === 1) for (const n of notas) this.tono(n, t, CORCHEA * 0.7, 'square', 0.022, destino, ctx);
        // Bombo en 1 y 3, palmas en 2 y 4, güiro en cada corchea.
        if (p === 0 || p === 4) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.setValueAtTime(130, t);
          osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
          g.gain.setValueAtTime(0.45, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(g).connect(destino);
          osc.start(t);
          osc.stop(t + 0.2);
        }
        if (p === 2 || p === 6) this.ruido(t, 0.12, 0.22, 1200, destino, ctx);
        this.ruido(t, p % 2 ? 0.05 : 0.08, p % 2 ? 0.05 : 0.08, 5000, destino, ctx);
      }
      this.proximo += CORCHEA;
      this.paso++;
    }
    // La melodía guía (cada sílaba, con el mismo reloj que la letra).
    while (this.nota < NOTAS.length && this.inicio + NOTAS[this.nota].t < ahora - 0.05) this.nota++;
    while (this.nota < NOTAS.length && this.inicio + NOTAS[this.nota].t < ahora + ADELANTO) {
      const n = NOTAS[this.nota];
      const t = this.inicio + n.t;
      this.tono(n.f * 2, t, CORCHEA * 0.95, 'triangle', 0.09, destino, ctx);
      this.tono(n.f * 2, t, CORCHEA * 0.6, 'square', 0.018, destino, ctx);
      this.nota++;
    }
  }

  // ---------- Letra ----------
  // La línea de ahora (o la primera, durante la intro) y la que sigue, con cuánto de cada
  // palabra ya se cantó (0 a 1).
  letra(t) {
    let i = LINEAS.findIndex((l) => t < l.fin);
    if (i < 0) i = LINEAS.length - 1;
    const linea = LINEAS[i];
    const palabras = linea.palabras.map((p) => ({ texto: p.texto, avance: THREE.MathUtils.clamp((t - p.desde) / (p.hasta - p.desde), 0, 1) }));
    return { i, palabras, siguiente: LINEAS[i + 1]?.texto || '', cuenta: t < LINEAS[0].inicio ? Math.ceil((LINEAS[0].inicio - t) / (COMPAS / 2)) : 0 };
  }

  // Dibuja la pantalla (estado = lo que devuelve letra(), o null para la portada).
  dibujar(estado) {
    const m = PANTALLA_KARAOKE.malla;
    if (!m) return;
    const tex = m.material.map;
    const c = tex.image;
    const g = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    if (!estado) {
      portadaKaraoke(g, w, h);
      tex.needsUpdate = true;
      return;
    }
    const d = g.createLinearGradient(0, 0, w, h);
    d.addColorStop(0, '#1b2a6b');
    d.addColorStop(1, '#5b1a6e');
    g.fillStyle = d;
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    g.font = '700 26px Fredoka, Arial, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillText('♪ LOS GUARANGUITOS ♪', w / 2, 44);
    if (estado.cuenta) {
      g.font = '700 120px Fredoka, Arial, sans-serif';
      g.fillStyle = '#ffd23f';
      g.fillText(String(estado.cuenta), w / 2, 190);
    }
    // La línea de ahora, partida en dos renglones si no entra; lo cantado, en amarillo.
    g.font = '700 46px Fredoka, Arial, sans-serif';
    const renglones = [[]];
    for (const p of estado.palabras) {
      const r = renglones[renglones.length - 1];
      const prueba = [...r, p].map((x) => x.texto).join(' ');
      if (r.length && g.measureText(prueba).width > w - 60) renglones.push([p]);
      else r.push(p);
    }
    const y0 = estado.cuenta ? 290 : 190 - (renglones.length - 1) * 30;
    g.textAlign = 'left';
    renglones.forEach((r, k) => {
      const ancho = g.measureText(r.map((x) => x.texto).join(' ')).width;
      let x = (w - ancho) / 2;
      const y = y0 + k * 60;
      for (const p of r) {
        const pw = g.measureText(p.texto).width;
        g.fillStyle = '#ffffff';
        g.fillText(p.texto, x, y);
        if (p.avance > 0) {
          g.save();
          g.beginPath();
          g.rect(x, y - 50, pw * p.avance, 64);
          g.clip();
          g.fillStyle = '#ffd23f';
          g.fillText(p.texto, x, y);
          g.restore();
        }
        x += pw + g.measureText(' ').width;
      }
    });
    if (estado.siguiente && !estado.cuenta) {
      g.textAlign = 'center';
      g.font = '700 30px Fredoka, Arial, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillText(estado.siguiente, w / 2, h - 50, w - 40);
    }
    tex.needsUpdate = true;
  }

  actualizar(dt, jugador) {
    if (!this.sonando) return;
    if (!this.dondePantalla()) { this.parar(); return; }
    this.programar();
    const t = this.tiempo();
    if (t > DURACION) { this.parar(true); return; }
    const estado = this.letra(Math.max(0, t));
    // La pantalla, unas 15 veces por segundo (alcanza y es liviano).
    this.redibujo -= dt;
    if (this.redibujo <= 0) {
      this.redibujo = 1 / 15;
      this.dibujar(estado);
    }
    // En el HUD, solo si estás en la sala del karaoke.
    if (this.cerca(jugador)) this.ui.letraKaraoke(estado.palabras, estado.cuenta ? `${estado.cuenta}...` : estado.siguiente);
    else this.ui.ocultarKaraoke();
  }
}
