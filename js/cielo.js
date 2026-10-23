import * as THREE from 'three';
import { aleatorio } from './util.js';

// Día y noche: 10 minutos de día, 2 de atardecer, 10 de noche y 2 de amanecer (24 en total),
// contados con el tiempo jugado (así quedan guardados con la partida). En el atardecer se
// esconde el sol y sale la luna; en el amanecer, al revés. De noche hay estrellas, y si no se
// compraron las farolas casi no se ve nada.
const DIA = 600;
const TRANSICION = 120;
const NOCHE = 600;
const CICLO = DIA + TRANSICION + NOCHE + TRANSICION;
const ARRANQUE = 60; // una partida nueva arranca a la mañana
const RADIO = 330;

const C = (c) => new THREE.Color(c);
// Colores de cada momento: [cielo arriba, horizonte, luz ambiente arriba, abajo, sol/luna].
const PALETA = {
  dia: { arriba: C('#3f9dff'), horizonte: C('#cdeeff'), hemiCielo: C('#e8f3ff'), hemiSuelo: C('#b9a98f'), luz: C('#ffeed6'), nubes: C('#ffffff') },
  ocaso: { arriba: C('#3a4d96'), horizonte: C('#ff9a5c'), hemiCielo: C('#ffc9a3'), hemiSuelo: C('#7d5a4a'), luz: C('#ff9f5a'), nubes: C('#ffc4a0') },
  noche: { arriba: C('#03061a'), horizonte: C('#0d1636'), hemiCielo: C('#5a74b8'), hemiSuelo: C('#1a1c26'), luz: C('#9fb4ff'), nubes: C('#2a2f45') },
};

function suave(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

// Segundos que faltan para la mañana (un ratito después del amanecer), para dormir.
export function hastaLaManana(t) {
  const c = ((t + ARRANQUE) % CICLO + CICLO) % CICLO;
  return (CICLO - c + 25) % CICLO;
}

// Estado del ciclo en el segundo t: noche (0 = día pleno, 1 = noche cerrada), ocaso (cuánto
// tiene de atardecer) y en qué parte de su recorrido están el sol y la luna (0 a 1).
export function momento(t) {
  const c = ((t + ARRANQUE) % CICLO + CICLO) % CICLO;
  let noche;
  if (c < DIA) noche = 0;
  else if (c < DIA + TRANSICION) noche = suave((c - DIA) / TRANSICION);
  else if (c < DIA + TRANSICION + NOCHE) noche = 1;
  else noche = 1 - suave((c - DIA - TRANSICION - NOCHE) / TRANSICION);
  const ocaso = 1 - Math.abs(noche * 2 - 1);
  // El sol está arriba desde que empieza el amanecer hasta que termina el atardecer.
  const sol = ((c + TRANSICION) % CICLO) / (DIA + 2 * TRANSICION);
  const luna = (c - DIA + CICLO) % CICLO / (NOCHE + 2 * TRANSICION);
  return { noche, ocaso, sol, luna };
}

function texturaAstro(luna) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  if (luna) {
    grad.addColorStop(0, 'rgba(240,244,255,1)');
    grad.addColorStop(0.42, 'rgba(225,232,250,1)');
    grad.addColorStop(0.5, 'rgba(180,200,255,0.35)');
    grad.addColorStop(1, 'rgba(180,200,255,0)');
  } else {
    grad.addColorStop(0, 'rgba(255,255,230,1)');
    grad.addColorStop(0.35, 'rgba(255,236,150,1)');
    grad.addColorStop(0.55, 'rgba(255,200,90,0.45)');
    grad.addColorStop(1, 'rgba(255,180,60,0)');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  if (luna) {
    g.fillStyle = 'rgba(170,180,205,0.55)';
    [[50, 52, 8], [74, 70, 6], [60, 80, 4], [80, 48, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function crearEstrellas() {
  const rnd = aleatorio(11);
  const n = 700;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const y = 0.08 + rnd() * 0.92;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
  }));
}

// Dirigible "SAYAGO IS YOURS..." (la imagen recortada va a los dos costados de un casco negro).
function crearZeppelin() {
  const g = new THREE.Group();
  const largo = 60;
  const alto = largo * 400 / 1024;
  const casco = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshLambertMaterial({ color: '#141414', fog: false }));
  casco.scale.set(25, 6.2, 5.6);
  casco.position.set(-3, 1.5, 0);
  g.add(casco);
  const tex = new THREE.TextureLoader().load('assets/especiales/zeppelin.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, fog: false });
  for (const lado of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(largo, alto), mat);
    p.position.z = lado * 5.75;
    p.rotation.set(0, lado > 0 ? 0 : Math.PI, lado * 0.155);
    g.add(p);
  }
  return g;
}

export function crearCielo(escena) {
  const p = PALETA.dia;
  escena.fog = new THREE.Fog(p.horizonte.clone(), 140, 320);

  const uniforms = { arriba: { value: p.arriba.clone() }, horizonte: { value: p.horizonte.clone() } };
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying float vY; void main() { vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 arriba; uniform vec3 horizonte; varying float vY; void main() { gl_FragColor = vec4(mix(horizonte, arriba, pow(max(vY, 0.0), 0.6)), 1.0); }',
  }));
  // Cúpula: el cielo, el sol, la luna y las estrellas siguen a la cámara (si no, yendo lejos
  // por la calle se sale de la esfera).
  const domo = new THREE.Group();
  escena.add(domo);
  domo.add(cielo);

  const hemi = new THREE.HemisphereLight(p.hemiCielo, p.hemiSuelo, 1.35);
  const luz = new THREE.DirectionalLight(p.luz, 1.9);
  escena.add(hemi, luz);

  const astro = (luna, tam) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaAstro(luna), fog: false, depthWrite: false, transparent: true }));
    s.scale.set(tam, tam, 1);
    domo.add(s);
    return s;
  };
  const sol = astro(false, 70);
  const luna = astro(true, 46);
  const estrellas = crearEstrellas();
  domo.add(estrellas);

  const zeppelin = crearZeppelin();
  escena.add(zeppelin);
  let anguloZep = 0.8;

  const tmp = new THREE.Color();
  const mezclar = (clave, m) => (m.noche < 0.5
    ? tmp.copy(PALETA.dia[clave]).lerp(PALETA.ocaso[clave], m.noche * 2)
    : tmp.copy(PALETA.ocaso[clave]).lerp(PALETA.noche[clave], m.noche * 2 - 1));
  const enArco = (s, f, alto) => {
    const a = f * Math.PI; // sale por el este (+x) y se pone por el oeste
    s.position.set(Math.cos(a) * RADIO, Math.sin(a) * RADIO * alto - 20, -120);
  };

  return {
    // t: segundos jugados. farolas: cuánta luz de farolas hay (0 a 1; true = compradas):
    // con luz, la noche se ve mucho más. interior: 0 a 1, adentro de un lugar con luces
    // fuertes prendidas (el gym): la luz ambiente sube a blanco parejo, de día y de noche.
    actualizar(dt, t, farolas, nubes, centro, interior = 0) {
      if (centro) domo.position.set(centro.x, 0, centro.z);
      const m = momento(t);
      const f = THREE.MathUtils.clamp(Number(farolas) || 0, 0, 1);
      uniforms.arriba.value.copy(mezclar('arriba', m));
      uniforms.horizonte.value.copy(mezclar('horizonte', m));
      escena.fog.color.copy(uniforms.horizonte.value);
      hemi.color.copy(mezclar('hemiCielo', m));
      hemi.groundColor.copy(mezclar('hemiSuelo', m));
      luz.color.copy(mezclar('luz', m));
      if (f > 0) hemi.color.lerp(tmp.set('#ffcf8a'), m.noche * 0.55 * f);
      const nocheHemi = THREE.MathUtils.lerp(0.2, 0.62, f);
      hemi.intensity = THREE.MathUtils.lerp(1.35, nocheHemi, m.noche);
      luz.intensity = THREE.MathUtils.lerp(1.9, THREE.MathUtils.lerp(0.22, 0.35, f), m.noche) * (1 - m.ocaso * 0.35);
      // Niebla: de noche, sin luz de farolas, se ve poquito.
      escena.fog.near = THREE.MathUtils.lerp(140, THREE.MathUtils.lerp(16, 55, f), m.noche);
      escena.fog.far = THREE.MathUtils.lerp(320, THREE.MathUtils.lerp(80, 210, f), m.noche);
      if (interior > 0) {
        hemi.color.lerp(tmp.set('#fff4e2'), interior);
        hemi.groundColor.lerp(tmp.set('#c2bcb2'), interior);
        hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, 3.3, interior);
        luz.intensity = THREE.MathUtils.lerp(luz.intensity, 0.6, interior);
        escena.fog.near = THREE.MathUtils.lerp(escena.fog.near, 140, interior);
        escena.fog.far = THREE.MathUtils.lerp(escena.fog.far, 320, interior);
      }

      sol.visible = m.sol <= 1;
      luna.visible = m.luna <= 1;
      if (sol.visible) enArco(sol, m.sol, 0.85);
      if (luna.visible) enArco(luna, m.luna, 0.7);
      const fuente = m.noche < 0.5 ? sol.position : luna.position;
      luz.position.copy(fuente).normalize().multiplyScalar(100);
      luz.position.y = Math.max(luz.position.y, 25);
      estrellas.material.opacity = THREE.MathUtils.clamp((m.noche - 0.4) / 0.6, 0, 1);
      if (nubes) nubes.copy(mezclar('nubes', m));

      // El dirigible da vueltas despacito alrededor del barrio (en el sentido en que, visto
      // desde la mansión, avanza con la trompa para adelante).
      anguloZep -= dt * 0.018;
      zeppelin.position.set(Math.cos(anguloZep) * 170, 88 + Math.sin(anguloZep * 3) * 3, -15 + Math.sin(anguloZep) * 170);
      zeppelin.rotation.y = Math.PI / 2 - anguloZep;
    },
  };
}
