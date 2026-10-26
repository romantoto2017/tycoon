import * as THREE from 'three';
import { PANTALLA_KARAOKE, portadaKaraoke } from './muebles.js';

// Sonido con WebAudio: efectos generados (sin archivos) y la canción del juego en loop (assets/especiales/vecicoon.mp3).
let ctx = null;
let maestro = null;
let busMusica = null;
let busEfectos = null;
let busRadio = null; // la radio de Lourdes: suena filtrada, como una radio vieja
let radio = false;
const volumenes = { general: 0.8, musica: 0.5, efectos: 0.8, musicaOn: true };
const CANCION = 'assets/especiales/vecicoon.mp3';
let ganCancion = null; // la canción pasa por acá para poder bajarla cuando suena la radio
let busKaraoke = null; // la pista del karaoke (Karaoke, abajo): suena aunque la música esté apagada
let karaoke = false;

export function iniciarAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      maestro = ctx.createGain();
      busMusica = ctx.createGain();
      busEfectos = ctx.createGain();
      busMusica.connect(maestro);
      const banda = ctx.createBiquadFilter();
      banda.type = 'bandpass';
      banda.frequency.value = 1100;
      banda.Q.value = 0.9;
      busRadio = ctx.createGain();
      busRadio.gain.value = 1.6;
      busRadio.connect(banda).connect(busMusica);
      busEfectos.connect(maestro);
      maestro.connect(ctx.destination);
      ganCancion = ctx.createGain();
      ganCancion.gain.value = radio ? 0 : 1.2;
      ganCancion.connect(busMusica);
      aplicarVolumenes();
      cargarCancion();
      setInterval(programarRadio, 100);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function setVolumenes(v) {
  Object.assign(volumenes, v);
  aplicarVolumenes();
}

function aplicarVolumenes() {
  if (!ctx) return;
  maestro.gain.value = volumenes.general;
  busMusica.gain.value = volumenes.musicaOn ? volumenes.musica * 0.35 : 0;
  busEfectos.gain.value = volumenes.efectos;
  if (busKaraoke) busKaraoke.gain.value = Math.max(0.15, volumenes.musica) * 0.5;
}

// Con la radio o el karaoke sonando, la canción del juego se baja.
function ajustarCancion() {
  if (ganCancion) ganCancion.gain.setTargetAtTime(radio || karaoke ? 0 : 1.2, ctx.currentTime, 0.3);
}

// En el restaurante suena la radio de Lourdes en vez de la música del juego.
export function setRadio(v) {
  if (v === radio) return;
  radio = v;
  paso = 0;
  ajustarCancion();
}

// Para el Karaoke (abajo): el reloj y la salida de audio (null si el audio todavía no arrancó).
export function audioKaraoke() {
  if (!ctx) return null;
  if (!busKaraoke) {
    busKaraoke = ctx.createGain();
    busKaraoke.connect(maestro);
    aplicarVolumenes();
  }
  return { ctx, destino: busKaraoke };
}

export function setKaraoke(v) {
  karaoke = v;
  ajustarCancion();
}

// Loop sin cortes: un AudioBuffer con loop (el <audio loop> del navegador deja un hueco con los mp3).
// El final se recorta donde termina el sonido, para saltear el silencio y el relleno del mp3.
async function cargarCancion() {
  try {
    const datos = await (await fetch(CANCION)).arrayBuffer();
    const buffer = await ctx.decodeAudioData(datos);
    const canal = buffer.getChannelData(0);
    let fin = canal.length - 1;
    while (fin > 0 && Math.abs(canal[fin]) < 0.001) fin--;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    fuente.loopEnd = (fin + 1) / buffer.sampleRate;
    fuente.connect(ganCancion);
    fuente.start();
  } catch {
    // Sin canción (sin red o archivo roto): el juego sigue con los efectos.
  }
}

export function pausarAudio(pausa) {
  if (!ctx) return;
  if (pausa) ctx.suspend();
  else ctx.resume();
}

function tono(frecuencia, cuando, duracion, tipo, volumen, destino) {
  const osc = ctx.createOscillator();
  const gan = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, cuando);
  gan.gain.setValueAtTime(volumen, cuando);
  gan.gain.exponentialRampToValueAtTime(0.0001, cuando + duracion);
  osc.connect(gan).connect(destino);
  osc.start(cuando);
  osc.stop(cuando + duracion + 0.02);
}

function efecto(notas) {
  if (!ctx || volumenes.efectos <= 0) return;
  const t = ctx.currentTime;
  for (const [f, inicio, dur, tipo = 'square', vol = 0.06] of notas) tono(f, t + inicio, dur, tipo, vol, busEfectos);
}

export const sfx = {
  comprar() { efecto([523, 659, 784, 1047].map((f, i) => [f, i * 0.07, 0.15])); },
  cobrar() { efecto([[988, 0, 0.08, 'square', 0.05], [1319, 0.07, 0.25, 'square', 0.05]]); },
  error() { efecto([[160, 0, 0.25, 'sawtooth', 0.05]]); },
  salto() { efecto([[330, 0, 0.12, 'triangle', 0.05], [500, 0.04, 0.1, 'triangle', 0.04]]); },
  gol() { efecto([392, 523, 659, 784, 1047, 1319].map((f, i) => [f, i * 0.09, 0.3, 'square', 0.05])); },
  brillo() { efecto([1568, 2093, 2637, 3136].map((f, i) => [f, 0.05 + i * 0.05, 0.25, 'sine', 0.035])); },
  lechuga() { efecto([[240, 0, 0.07, 'triangle', 0.06], [180, 0.05, 0.1, 'triangle', 0.05]]); },
  susto() { efecto([[1200, 0, 0.1, 'square', 0.035], [900, 0.08, 0.1, 'square', 0.035], [1300, 0.16, 0.18, 'square', 0.035]]); },
  disparo() { efecto([[150, 0, 0.06, 'square', 0.05], [70, 0.01, 0.08, 'sawtooth', 0.05]]); },
  microondas() { efecto([[120, 0, 3.4, 'sawtooth', 0.012]]); },
  pip() { efecto([[1760, 0, 0.18, 'sine', 0.06], [1760, 0.3, 0.18, 'sine', 0.06], [1760, 0.6, 0.18, 'sine', 0.06]]); },
  comer() { efecto([[300, 0, 0.08, 'triangle', 0.05], [260, 0.15, 0.08, 'triangle', 0.05], [320, 0.3, 0.08, 'triangle', 0.05]]); },
  moto() { efecto([[70, 0, 0.5, 'sawtooth', 0.04], [95, 0.12, 0.6, 'sawtooth', 0.04], [120, 0.3, 0.7, 'sawtooth', 0.035]]); },
  robo() { efecto([[660, 0, 0.12, 'square', 0.05], [440, 0.1, 0.12, 'square', 0.05], [220, 0.2, 0.3, 'square', 0.05]]); },
  choque() { efecto([[180, 0, 0.07, 'triangle', 0.09], [2400, 0, 0.04, 'square', 0.035], [1600, 0.01, 0.05, 'square', 0.03]]); },
  pesa() { efecto([[196, 0, 0.14, 'square', 0.035], [784, 0.01, 0.22, 'triangle', 0.03], [1568, 0.01, 0.12, 'sine', 0.02]]); },
  final() { efecto([523, 659, 784, 1047, 784, 1047, 1319, 1568].map((f, i) => [f, i * 0.14, 0.4, 'square', 0.06])); },
};

// ---------- Radio de Lourdes: cumbia vieja (Am - Dm - G - C) con güiro ----------
const CORCHEA_RADIO = 60 / 96 / 2;
const ACORDES_RADIO = [
  [110.0, [220.0, 261.63, 329.63]],
  [146.83, [293.66, 349.23, 440.0]],
  [98.0, [196.0, 246.94, 293.66]],
  [130.81, [261.63, 329.63, 392.0]],
];
const MELODIA = [4, 3, 2, 3, 4, 4, 2, 0, 1, 2, 3, 2, 1, 0, 1, 2];
const ESCALA = [220, 246.94, 261.63, 293.66, 329.63];
function tocarRadio() {
  const [bajo, notas] = ACORDES_RADIO[Math.floor(paso / 8) % ACORDES_RADIO.length];
  const p = paso % 8;
  if (p === 0 || p === 3 || p === 4 || p === 7) tono(p % 4 === 0 ? bajo : bajo * 1.5, proximo, CORCHEA_RADIO * 0.9, 'triangle', 0.3, busRadio);
  if (p % 2 === 1) for (const n of notas) tono(n, proximo, CORCHEA_RADIO * 0.6, 'square', 0.025, busRadio);
  if (paso % 2 === 0) tono(ESCALA[MELODIA[(paso / 2) % MELODIA.length]] * 2, proximo, CORCHEA_RADIO * 1.7, 'sawtooth', 0.03, busRadio);
  tono(4800, proximo, 0.02, 'square', p % 2 ? 0.02 : 0.008, busRadio);
  tono(3600, proximo + CORCHEA_RADIO / 2, 0.015, 'square', 0.008, busRadio);
}

let proximo = 0;
let paso = 0;

function programarRadio() {
  if (!ctx || ctx.state !== 'running' || !radio || !volumenes.musicaOn || volumenes.musica <= 0) {
    if (ctx) proximo = ctx.currentTime + 0.1;
    return;
  }
  if (proximo < ctx.currentTime) proximo = ctx.currentTime + 0.05;
  while (proximo < ctx.currentTime + 0.3) {
    tocarRadio();
    proximo += CORCHEA_RADIO;
    paso++;
  }
}

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
const ESCALA_KARAOKE = [196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25]; // la menor pentatónica, con algo más
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
      notas.push({ t, f: ESCALA_KARAOKE[FORMAS[n % FORMAS.length][s % 14]] });
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
