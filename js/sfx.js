// Sonidos generados con WebAudio (sin archivos).
let ctx = null;

export function iniciarAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tono(frecuencia, inicio, duracion, tipo = 'square', volumen = 0.06) {
  if (!ctx) return;
  const t = ctx.currentTime + inicio;
  const osc = ctx.createOscillator();
  const gan = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, t);
  gan.gain.setValueAtTime(volumen, t);
  gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  osc.connect(gan).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duracion);
}

export const sfx = {
  comprar() { [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.07, 0.15)); },
  cobrar() { tono(988, 0, 0.08, 'square', 0.05); tono(1319, 0.07, 0.25, 'square', 0.05); },
  error() { tono(160, 0, 0.25, 'sawtooth', 0.05); },
};
