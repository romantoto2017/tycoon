// Restaurante "Lo de Lourdes": edificio, mesas, microondas, el rincón de Lourdes y la
// decoración. Todo en coordenadas del mundo (ver RESTO en constantes.js). No se compra:
// abre solo cuando la mansión llega a RESTO_ABRE (ver Tycoon.abrirResto).
import { RESTO as R, RESTO_MESAS, RESTO_MICROONDAS, RESTO_LOURDES } from './constantes.js';
import { pared } from './arquitectura.js';

// Paleta (UI/UX Pro Max, "Restaurant/Food Service": rojo apetitoso + dorado cálido),
// llevada a un bodegón: ladrillo, madera, damero, verde botella y crema.
export const PALETA_RESTO = {
  ladrillo: '#b5523b',
  rojo: '#c62828',
  crema: '#fbf3e4',
  madera: '#7a4a2e',
  verde: '#1f4d3a',
  dorado: '#e0a526',
  metal: '#9aa0a6',
};
const P = PALETA_RESTO;
export const PISO_RESTO = 0.25;
const F = PISO_RESTO;
// Huecos del frente (puerta en el medio y dos vidrieras) y de las ventanas de los costados.
const DOOR = { a: -55, b: -47, alto: 9 };
const VIDRIERAS = [{ a: -67, b: -58, y0: 2, y1: 8 }, { a: -44, b: -35, y0: 2, y1: 8 }];
const LATERAL = { a: -79, b: -67, y0: 2.5, y1: 8 };
const ZOCALO = 3;
export const PLATOS = [
  { id: 'mila_pure', nombre: 'Milanesa con puré' },
  { id: 'mila_fritas', nombre: 'Milanesa con papas fritas' },
  { id: 'fideos', nombre: 'Fideos con tuco' },
  { id: 'guiso', nombre: 'Guiso de lentejas' },
  { id: 'pollo_arroz', nombre: 'Pechuga de pollo con arroz' },
  { id: 'strogonoff', nombre: 'Strogonoff con arroz' },
];

// ---------- Edificio ----------
export function edificio(k, g) {
  const ladrillo = k.tex('ladrillo', P.ladrillo, 3);
  const t = R.pared;
  const alto = R.alto;
  // Piso de damero y vereda adelante.
  g.add(k.cajaDe(R.x0, 0, R.z0, R.x1, F, R.z1, k.tex('damero', '#ffffff', 3)));
  g.add(k.noSolido(k.cajaDe(R.x0 - 1, 0, R.z1, R.x1 + 1, 0.12, R.z1 + 4, k.tex('concreto', '#d6d2cb', 3))));
  // Paredes de ladrillo: frente con puerta y dos vidrieras.
  const huecos = [VIDRIERAS[0], { ...DOOR, y0: 0, y1: DOOR.alto }, VIDRIERAS[1]];
  pared(k, g, 'x', R.z1 - t / 2, R.x0, R.x1, 0, alto, t, ladrillo, huecos);
  pared(k, g, 'x', R.z0 + t / 2, R.x0, R.x1, 0, alto, t, ladrillo);
  pared(k, g, 'z', R.x0 + t / 2, R.z0 + t, R.z1 - t, 0, alto, t, ladrillo, [LATERAL]);
  pared(k, g, 'z', R.x1 - t / 2, R.z0 + t, R.z1 - t, 0, alto, t, ladrillo, [LATERAL]);
  // Adentro: zócalo de madera y revoque crema (fondo y costados).
  const xi0 = R.x0 + t;
  const xi1 = R.x1 - t;
  const zi0 = R.z0 + t;
  const forro = (x0, z0, x1, z1, y0, y1, m) => g.add(k.noSolido(k.cajaDe(x0, y0, z0, x1, y1, z1, m)));
  const zocalo = k.tex('listones', P.madera, 2);
  const revoque = k.tex('estuco', P.crema, 3);
  const L = LATERAL;
  forro(xi0, zi0, xi1, zi0 + 0.05, F, ZOCALO, zocalo);
  forro(xi0, zi0, xi1, zi0 + 0.05, ZOCALO, alto, revoque);
  for (const [x0, x1] of [[xi0, xi0 + 0.05], [xi1 - 0.05, xi1]]) {
    forro(x0, zi0, x1, L.a, F, ZOCALO, zocalo);
    forro(x0, L.b, x1, R.z1 - t, F, ZOCALO, zocalo);
    forro(x0, zi0, x1, L.a, ZOCALO, alto, revoque);
    forro(x0, L.b, x1, R.z1 - t, ZOCALO, alto, revoque);
    forro(x0, L.a, x1, L.b, F, L.y0, zocalo);
    forro(x0, L.a, x1, L.b, L.y1, alto, revoque);
  }
  g.add(k.noSolido(k.cajaDe(xi0, ZOCALO - 0.05, zi0 + 0.05, xi1, ZOCALO + 0.1, zi0 + 0.12, P.verde)));
  // Vidrieras con marco verde botella y ventanas de los costados.
  const marco = (x0, y0, z0, x1, y1, z1) => g.add(k.noSolido(k.cajaDe(x0, y0, z0, x1, y1, z1, P.verde)));
  for (const h of VIDRIERAS) {
    g.add(k.cajaDe(h.a, h.y0, R.z1 - 0.4, h.b, h.y1, R.z1 - 0.3, k.vidrio));
    marco(h.a - 0.2, h.y0 - 0.2, R.z1 - 0.75, h.b + 0.2, h.y0, R.z1 + 0.05);
    marco(h.a - 0.2, h.y1, R.z1 - 0.75, h.b + 0.2, h.y1 + 0.2, R.z1 + 0.05);
    for (let x = h.a; x <= h.b + 0.01; x += (h.b - h.a) / 4) marco(x - 0.08, h.y0, R.z1 - 0.45, x + 0.08, h.y1, R.z1 - 0.25);
    marco(h.a, (h.y0 + h.y1) / 2 + 1, R.z1 - 0.45, h.b, (h.y0 + h.y1) / 2 + 1.12, R.z1 - 0.25);
  }
  for (const x of [R.x0 + t / 2, R.x1 - t / 2]) {
    g.add(k.cajaDe(x - 0.05, L.y0, L.a, x + 0.05, L.y1, L.b, k.vidrio));
    for (let z = L.a; z <= L.b + 0.01; z += (L.b - L.a) / 4) marco(x - 0.45, L.y0, z - 0.08, x + 0.45, L.y1, z + 0.08);
  }
  // Puerta: marco verde y dos hojas de vidrio abiertas hacia afuera.
  const d = DOOR.alto;
  marco(DOOR.a - 0.35, 0, R.z1 - 0.75, DOOR.a, d + 0.35, R.z1 + 0.05);
  marco(DOOR.b, 0, R.z1 - 0.75, DOOR.b + 0.35, d + 0.35, R.z1 + 0.05);
  marco(DOOR.a - 0.35, d, R.z1 - 0.75, DOOR.b + 0.35, d + 0.35, R.z1 + 0.05);
  g.add(k.noSolido(k.cajaDe(DOOR.a, F, R.z1, DOOR.a + 0.1, d - 0.1, R.z1 + 3.8, k.vidrio)));
  g.add(k.noSolido(k.cajaDe(DOOR.b - 0.1, F, R.z1, DOOR.b, d - 0.1, R.z1 + 3.8, k.vidrio)));
  // Techo con cornisa crema.
  g.add(k.cajaDe(R.x0 - 0.3, alto, R.z0 - 0.3, R.x1 + 0.3, alto + 0.6, R.z1 + 0.3, k.tex('estuco', '#e9e2d6', 3)));
  g.add(k.noSolido(k.cajaDe(R.x0 - 0.6, alto + 0.6, R.z1 - 0.2, R.x1 + 0.6, alto + 1.8, R.z1 + 0.6, k.tex('estuco', P.crema, 3))));
  g.add(k.noSolido(k.cajaDe(R.x0 - 0.6, alto - 0.8, R.z1 + 0.05, R.x1 + 0.6, alto - 0.4, R.z1 + 0.55, P.verde)));
  // Toldos a rayas sobre las vidrieras.
  for (const h of VIDRIERAS) {
    const n = 12;
    const w = (h.b - h.a + 1) / n;
    for (let i = 0; i < n; i++) {
      const x = h.a - 0.5 + w * (i + 0.5);
      const color = i % 2 ? '#ffffff' : P.rojo;
      const raya = k.noSolido(k.caja(w, 0.1, 3, color, x, h.y1 + 0.8, R.z1 + 1.3));
      raya.rotation.x = 0.42;
      g.add(raya);
      g.add(k.noSolido(k.cajaDe(x - w / 2, h.y1 - 0.15, R.z1 + 2.55, x + w / 2, h.y1 + 0.3, R.z1 + 2.67, color)));
    }
  }
  // Cartel de neón y faroles de la puerta.
  const cartel = k.cartel('LO DE LOURDES', 14, 2.4, '#ffe14d', P.rojo);
  cartel.position.set((DOOR.a + DOOR.b) / 2, d + 1.75, R.z1 + 0.55);
  g.add(cartel);
  const abierto = k.cartel('ABIERTO', 2.4, 0.7, '#7cff5a', '#1d1f22');
  abierto.position.set(DOOR.a - 1.5, 4.4, R.z1 + 0.06);
  g.add(abierto);
  for (const x of [DOOR.a - 1.5, DOOR.b + 1.5]) {
    g.add(k.noSolido(k.cajaDe(x - 0.3, 6.6, R.z1, x + 0.3, 7.5, R.z1 + 0.6, '#24282c')));
    g.add(k.noSolido(k.cajaDe(x - 0.22, 6.72, R.z1 + 0.6, x + 0.22, 7.38, R.z1 + 0.65, k.brillo('#ffe3a8'))));
  }
  for (const x of [DOOR.a - 2.4, DOOR.b + 2.4]) {
    const pl = k.modelo('pottedPlant', { alto: 4 });
    pl.position.set(x, 0.12, R.z1 + 1.4);
    g.add(pl);
  }
  // Mesita de afuera con sombrilla.
  const mx = R.x0 + 4.5;
  const mz = R.z1 + 2.6;
  const mesa = k.modelo('tableRound', { ancho: 2.6 });
  mesa.position.set(mx, 0.12, mz);
  g.add(mesa);
  g.add(k.noSolido(k.cajaDe(mx - 0.05, 2, mz - 0.05, mx + 0.05, 6.4, mz + 0.05, '#e0e0e0')));
  g.add(k.noSolido(k.cono(2.6, 1.1, P.rojo, mx, 6.8, mz, 8)));
}

// ---------- Mesas del comedor ----------
export function mesas(k, g) {
  for (const [x, z] of RESTO_MESAS) {
    const mesa = k.modelo('tableCloth', { ancho: 3.4, fondo: 2.2, alto: 2.3, tela: P.rojo });
    mesa.position.set(x, F, z);
    g.add(mesa);
    g.add(k.noSolido(k.cilindro(0.09, 0.09, 0.35, '#ffffff', x + 0.2, F + 2.48, z, 8)));
    g.add(k.noSolido(k.cilindro(0.09, 0.09, 0.35, '#3a3f44', x + 0.45, F + 2.48, z, 8)));
    g.add(k.noSolido(k.cajaDe(x - 0.6, F + 2.32, z - 0.15, x - 0.2, F + 2.7, z + 0.15, '#ffffff')));
    for (const lado of [-1, 1]) {
      for (const dx of [-0.85, 0.85]) {
        const silla = k.modelo('chairCushion', { tela: P.rojo });
        silla.position.set(x + dx, F, z + lado * 1.85);
        silla.rotation.y = lado > 0 ? Math.PI : 0;
        g.add(silla);
      }
    }
    // Lámpara colgante sobre la mesa.
    g.add(k.noSolido(k.cajaDe(x - 0.03, 8.2, z - 0.03, x + 0.03, R.alto, z + 0.03, '#24282c')));
    g.add(k.noSolido(k.cono(0.85, 0.7, P.verde, x, 7.95, z, 10)));
    g.add(k.noSolido(k.cilindro(0.4, 0.4, 0.05, k.brillo('#fff1c4'), x, 7.62, z, 10)));
  }
}

// ---------- Fila de microondas (en mesitas de metal contra la pared del fondo) ----------
export function microondas(k, g) {
  const z = R.z0 + R.pared + 0.85;
  for (const x of RESTO_MICROONDAS) {
    for (const dx of [-1.05, 1.05]) for (const dz of [-0.65, 0.65]) g.add(k.noSolido(k.cajaDe(x + dx - 0.05, F, z + dz - 0.05, x + dx + 0.05, F + 2.5, z + dz + 0.05, P.metal)));
    g.add(k.cajaDe(x - 1.2, F + 2.4, z - 0.8, x + 1.2, F + 2.55, z + 0.8, '#d9dde2'));
    g.add(k.noSolido(k.cajaDe(x - 1.05, F + 0.6, z - 0.65, x + 1.05, F + 0.65, z + 0.65, P.metal)));
    const m = k.modelo('kitchenMicrowave', { ancho: 2, solido: false });
    m.position.set(x, F + 2.55, z);
    g.add(m);
    g.add(k.noSolido(k.cajaDe(x - 0.02, F + 0.6, z - 0.75, x + 0.02, F + 2.4, z - 0.72, '#24282c')));
  }
  // Dispenser de agua al costado.
  const x = R.x1 - R.pared - 1.4;
  g.add(k.cajaDe(x - 0.6, F, z - 0.6, x + 0.6, F + 3, z + 0.6, '#eef0f2'));
  g.add(k.noSolido(k.cajaDe(x - 0.62, F + 2.4, z - 0.62, x + 0.62, F + 2.6, z + 0.62, '#1e88e5')));
  g.add(k.noSolido(k.cilindro(0.45, 0.45, 1.5, k.agua, x, F + 3.75, z, 12)));
  g.add(k.noSolido(k.cajaDe(x - 0.3, F + 1.9, z + 0.6, x - 0.15, F + 2.1, z + 0.7, '#e53935')));
  g.add(k.noSolido(k.cajaDe(x + 0.15, F + 1.9, z + 0.6, x + 0.3, F + 2.1, z + 0.7, '#1e88e5')));
  for (let i = 0; i < 4; i++) g.add(k.noSolido(k.cilindro(0.11, 0.11, 0.3, k.vidrio, x - 0.35 + i * 0.23, F + 3.0, z + 0.4, 8)));
}

// ---------- Rincón de Lourdes: su mesa, su silla y la radio grande y vieja ----------
// Mesa y silla grandes, separadas: sentada (y gordita) no se mete en la mesa ni en la radio.
export function rinconLourdes(k, g) {
  const [mx, mz] = RESTO_LOURDES.mesa;
  const [sx, sz] = RESTO_LOURDES.silla;
  const mesa = k.modelo('table', { ancho: 3.6, fondo: 2.8, alto: 2.3 });
  mesa.position.set(mx, F, mz);
  g.add(mesa);
  g.add(k.noSolido(k.cajaDe(mx - 1.8, F + 2.3, mz - 1.4, mx + 1.8, F + 2.32, mz + 1.4, '#f3e5c0')));
  const silla = k.modelo('chairCushion', { tela: P.verde, ancho: 2.2, fondo: 2.0, alto: 2.9 });
  silla.position.set(sx, F, sz);
  silla.rotation.y = -Math.PI / 2;
  g.add(silla);
  // Radio (del lado de la mesa que no da a Lourdes, mirando al salón): caja de madera,
  // parlante de tela, dial y perillas, con antena.
  const y = F + 2.32;
  const radio = k.grupo();
  radio.add(k.cajaDe(-0.75, 0, -0.35, 0.75, 1.0, 0.35, '#6d3f22'));
  radio.add(k.noSolido(k.cajaDe(-0.65, 0.12, -0.36, 0.05, 0.88, -0.34, '#c9b48a')));
  for (let i = 0; i < 6; i++) radio.add(k.noSolido(k.cajaDe(-0.6, 0.18 + i * 0.12, -0.37, 0, 0.21 + i * 0.12, -0.36, '#8a6a3c')));
  radio.add(k.noSolido(k.cajaDe(0.15, 0.55, -0.37, 0.65, 0.85, -0.36, k.brillo('#ffcc66'))));
  radio.add(k.noSolido(k.cajaDe(0.38, 0.58, -0.38, 0.41, 0.82, -0.37, '#c62828')));
  for (const dx of [0.25, 0.55]) {
    const p = k.cilindro(0.09, 0.09, 0.08, '#2b2b2b', dx, 0.32, -0.38, 10);
    p.rotation.x = Math.PI / 2;
    radio.add(k.noSolido(p));
  }
  const antena = k.noSolido(k.caja(0.04, 1.6, 0.04, '#c9ced3', 0.6, 1.7, 0));
  antena.rotation.z = -0.4;
  radio.add(antena);
  radio.position.set(mx - 0.55, y, mz + 0.62);
  radio.scale.setScalar(1.45);
  g.add(radio);
  // Termo y mate, a mano de Lourdes.
  g.add(k.noSolido(k.cilindro(0.15, 0.15, 0.9, '#1b5e20', mx + 0.5, y + 0.45, mz - 0.85, 10)));
  g.add(k.noSolido(k.cilindro(0.14, 0.11, 0.3, '#5d4037', mx + 1.2, y + 0.15, mz - 0.35, 10)));
  g.add(k.noSolido(k.cilindro(0.02, 0.02, 0.3, '#c9ced3', mx + 1.25, y + 0.4, mz - 0.35, 4)));
  // Cartelito arriba de la vidriera.
  const cartel = k.cartel('LOURDES', 2.6, 0.65, '#ffffff', '#1f4d3a');
  cartel.position.set(mx + 1.5, F + 9.3, R.z1 - R.pared - 0.08);
  cartel.rotation.y = Math.PI;
  g.add(cartel);
}

// ---------- Decoración: pizarrón con el menú, cuadros, plantas y reloj ----------
export function decoracion(k, g) {
  const xi = R.x0 + R.pared + 0.08;
  const pizarra = k.pizarra('MENÚ DEL DÍA', PLATOS.map((p) => p.nombre), 6.4, 4.4);
  pizarra.position.set(xi, F + 5.6, -62.5);
  pizarra.rotation.y = Math.PI / 2;
  g.add(pizarra);
  const cuadro = k.pintura('cafe_noche.jpg', 3.4);
  cuadro.position.set(R.x1 - R.pared - 0.12, F + 6.4, -61.5);
  cuadro.rotation.y = -Math.PI / 2;
  g.add(cuadro);
  const cuadro2 = k.pintura('grande_jatte.jpg', 3.2);
  cuadro2.position.set(-56, F + 7.6, R.z0 + R.pared + 0.12);
  g.add(cuadro2);
  // Reloj de pared.
  const xr = R.x0 + R.pared;
  const reloj = k.cilindro(0.7, 0.7, 0.08, '#ffffff', xr + 0.1, F + 8.4, -82, 20);
  reloj.rotation.z = Math.PI / 2;
  g.add(k.noSolido(reloj));
  g.add(k.noSolido(k.cajaDe(xr + 0.12, F + 8.35, -82.03, xr + 0.16, F + 8.85, -81.97, '#111111')));
  g.add(k.noSolido(k.cajaDe(xr + 0.12, F + 8.37, -82.03, xr + 0.16, F + 8.43, -81.6, '#111111')));
  for (const [x, z] of [[R.x0 + 1.8, R.z0 + 2.2], [R.x0 + 1.8, R.z1 - 2.2], [R.x1 - 2, -76]]) {
    const pl = k.modelo('pottedPlant', { alto: 4.2 });
    pl.position.set(x, F, z);
    g.add(pl);
  }
  // Guirnalda de lamparitas en el techo.
  const n = 30;
  const zc = (R.z0 + R.z1) / 2;
  for (let i = 0; i < n; i++) {
    const x = R.x0 + 2 + (i * (R.x1 - R.x0 - 4)) / (n - 1);
    const y = R.alto - 0.7 - Math.sin((i / (n - 1)) * Math.PI) * 0.8;
    g.add(k.noSolido(k.esfera(0.14, k.brillo(['#ffe082', '#ff8a80', '#a5d6a7'][i % 3]), x, y, zc)));
  }
}
