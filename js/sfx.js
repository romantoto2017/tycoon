// Sonido generado con WebAudio (sin archivos): efectos + una musiquita en loop.
let ctx = null;
let maestro = null;
let busMusica = null;
let busEfectos = null;
let busRadio = null; // la radio de Lourdes: suena filtrada, como una radio vieja
let radio = false;
const volumenes = { general: 0.8, musica: 0.5, efectos: 0.8 };

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
      aplicarVolumenes();
      setInterval(programarMusica, 100);
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
  busMusica.gain.value = volumenes.musica * 0.35;
  busEfectos.gain.value = volumenes.efectos;
}

// En el restaurante suena la radio de Lourdes en vez de la música del juego.
export function setRadio(v) {
  if (v === radio) return;
  radio = v;
  paso = 0;
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
  disparo() { efecto([[150, 0, 0.06, 'square', 0.05], [70, 0.01, 0.08, 'sawtooth', 0.05]]); },
  microondas() { efecto([[120, 0, 3.4, 'sawtooth', 0.012]]); },
  pip() { efecto([[1760, 0, 0.18, 'sine', 0.06], [1760, 0.3, 0.18, 'sine', 0.06], [1760, 0.6, 0.18, 'sine', 0.06]]); },
  comer() { efecto([[300, 0, 0.08, 'triangle', 0.05], [260, 0.15, 0.08, 'triangle', 0.05], [320, 0.3, 0.08, 'triangle', 0.05]]); },
  moto() { efecto([[70, 0, 0.5, 'sawtooth', 0.04], [95, 0.12, 0.6, 'sawtooth', 0.04], [120, 0.3, 0.7, 'sawtooth', 0.035]]); },
  robo() { efecto([[660, 0, 0.12, 'square', 0.05], [440, 0.1, 0.12, 'square', 0.05], [220, 0.2, 0.3, 'square', 0.05]]); },
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

// ---------- Música ----------
// Progresión alegre C - Am - F - G, bajo + arpegio + percusión suave.
const NEGRA = 60 / 116;
const CORCHEA = NEGRA / 2;
const ACORDES = [
  [130.81, [261.63, 329.63, 392.0, 523.25]],
  [110.0, [220.0, 261.63, 329.63, 440.0]],
  [87.31, [174.61, 220.0, 261.63, 349.23]],
  [98.0, [196.0, 246.94, 293.66, 392.0]],
];
const PATRON = [0, 1, 2, 3, 2, 1, 2, 3];
let proximo = 0;
let paso = 0;

function programarMusica() {
  if (!ctx || ctx.state !== 'running' || volumenes.musica <= 0) {
    if (ctx) proximo = ctx.currentTime + 0.1;
    return;
  }
  if (proximo < ctx.currentTime) proximo = ctx.currentTime + 0.05;
  while (radio && proximo < ctx.currentTime + 0.3) {
    tocarRadio();
    proximo += CORCHEA_RADIO;
    paso++;
  }
  while (!radio && proximo < ctx.currentTime + 0.3) {
    const [bajo, notas] = ACORDES[Math.floor(paso / 8) % ACORDES.length];
    const p = paso % 8;
    if (p === 0 || p === 4) tono(bajo, proximo, NEGRA * 1.6, 'triangle', 0.35, busMusica);
    tono(notas[PATRON[p]] * (Math.floor(paso / 32) % 2 ? 2 : 1), proximo, CORCHEA * 0.9, 'square', 0.06, busMusica);
    if (p % 2 === 1) tono(6000, proximo, 0.03, 'square', 0.015, busMusica);
    if (p === 0 || p === 4) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(140, proximo);
      osc.frequency.exponentialRampToValueAtTime(40, proximo + 0.15);
      g.gain.setValueAtTime(0.4, proximo);
      g.gain.exponentialRampToValueAtTime(0.001, proximo + 0.18);
      osc.connect(g).connect(busMusica);
      osc.start(proximo);
      osc.stop(proximo + 0.2);
    }
    proximo += CORCHEA;
    paso++;
  }
}
