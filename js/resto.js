// Restaurante "Lo de Lourdes": edificio, mesas, microondas, el rincón de Lourdes y la
// decoración. Todo en coordenadas del mundo (ver RESTO en constantes.js). No importa three:
// lo usa también la simulación de balance (a través de progresion.js).
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
const DOOR = { a: -58, b: -52 };
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
  const huecos = [
    { a: -68, b: -60, y0: 1.6, y1: 5.6 },
    { ...DOOR, y0: 0, y1: 6.2 },
    { a: -50, b: -42, y0: 1.6, y1: 5.6 },
  ];
  pared(k, g, 'x', R.z1 - t / 2, R.x0, R.x1, 0, alto, t, ladrillo, huecos);
  pared(k, g, 'x', R.z0 + t / 2, R.x0, R.x1, 0, alto, t, ladrillo);
  pared(k, g, 'z', R.x0 + t / 2, R.z0 + t, R.z1 - t, 0, alto, t, ladrillo, [{ a: -80, b: -72, y0: 2, y1: 5.4 }]);
  pared(k, g, 'z', R.x1 - t / 2, R.z0 + t, R.z1 - t, 0, alto, t, ladrillo, [{ a: -80, b: -72, y0: 2, y1: 5.4 }]);
  // Adentro: zócalo de madera y revoque crema (fondo y costados).
  const xi0 = R.x0 + t;
  const xi1 = R.x1 - t;
  const zi0 = R.z0 + t;
  const forro = (x0, z0, x1, z1, y0, y1, m) => g.add(k.noSolido(k.cajaDe(x0, y0, z0, x1, y1, z1, m)));
  const zocalo = k.tex('listones', P.madera, 2);
  const revoque = k.tex('estuco', P.crema, 3);
  forro(xi0, zi0, xi1, zi0 + 0.05, F, 2.6, zocalo);
  forro(xi0, zi0, xi1, zi0 + 0.05, 2.6, alto, revoque);
  for (const [x0, x1] of [[xi0, xi0 + 0.05], [xi1 - 0.05, xi1]]) {
    forro(x0, zi0, x1, -80, F, 2.6, zocalo);
    forro(x0, -72, x1, R.z1 - t, F, 2.6, zocalo);
    forro(x0, zi0, x1, -80, 2.6, alto, revoque);
    forro(x0, -72, x1, R.z1 - t, 2.6, alto, revoque);
    forro(x0, -80, x1, -72, F, 2, zocalo);
    forro(x0, -80, x1, -72, 5.4, alto, revoque);
  }
  g.add(k.noSolido(k.cajaDe(xi0, 2.55, zi0 + 0.05, xi1, 2.7, zi0 + 0.12, P.verde)));
  // Vidrieras con marco verde botella y ventanas de los costados.
  const marco = (x0, y0, z0, x1, y1, z1) => g.add(k.noSolido(k.cajaDe(x0, y0, z0, x1, y1, z1, P.verde)));
  for (const h of [huecos[0], huecos[2]]) {
    g.add(k.cajaDe(h.a, h.y0, R.z1 - 0.35, h.b, h.y1, R.z1 - 0.25, k.vidrio));
    marco(h.a - 0.15, h.y0 - 0.15, R.z1 - 0.65, h.b + 0.15, h.y0, R.z1 + 0.05);
    marco(h.a - 0.15, h.y1, R.z1 - 0.65, h.b + 0.15, h.y1 + 0.15, R.z1 + 0.05);
    for (let x = h.a; x <= h.b + 0.01; x += (h.b - h.a) / 4) marco(x - 0.07, h.y0, R.z1 - 0.4, x + 0.07, h.y1, R.z1 - 0.2);
  }
  for (const x of [R.x0 + t / 2, R.x1 - t / 2]) {
    g.add(k.cajaDe(x - 0.05, 2, -80, x + 0.05, 5.4, -72, k.vidrio));
    for (let z = -80; z <= -71.99; z += 2.66) marco(x - 0.4, 2, z - 0.07, x + 0.4, 5.4, z + 0.07);
  }
  // Puerta: marco verde y dos hojas de vidrio abiertas hacia afuera.
  marco(DOOR.a - 0.3, 0, R.z1 - 0.65, DOOR.a, 6.5, R.z1 + 0.05);
  marco(DOOR.b, 0, R.z1 - 0.65, DOOR.b + 0.3, 6.5, R.z1 + 0.05);
  marco(DOOR.a - 0.3, 6.2, R.z1 - 0.65, DOOR.b + 0.3, 6.5, R.z1 + 0.05);
  g.add(k.noSolido(k.cajaDe(DOOR.a, F, R.z1, DOOR.a + 0.1, 6.1, R.z1 + 2.8, k.vidrio)));
  g.add(k.noSolido(k.cajaDe(DOOR.b - 0.1, F, R.z1, DOOR.b, 6.1, R.z1 + 2.8, k.vidrio)));
  // Techo con cornisa crema.
  g.add(k.cajaDe(R.x0 - 0.3, alto, R.z0 - 0.3, R.x1 + 0.3, alto + 0.5, R.z1 + 0.3, k.tex('estuco', '#e9e2d6', 3)));
  g.add(k.noSolido(k.cajaDe(R.x0 - 0.5, alto + 0.5, R.z1 - 0.2, R.x1 + 0.5, alto + 1.4, R.z1 + 0.5, k.tex('estuco', P.crema, 3))));
  g.add(k.noSolido(k.cajaDe(R.x0 - 0.5, alto - 0.6, R.z1 + 0.05, R.x1 + 0.5, alto - 0.3, R.z1 + 0.45, P.verde)));
  // Toldos a rayas sobre las vidrieras.
  for (const h of [huecos[0], huecos[2]]) {
    const n = 10;
    const w = (h.b - h.a + 1) / n;
    for (let i = 0; i < n; i++) {
      const x = h.a - 0.5 + w * (i + 0.5);
      const raya = k.noSolido(k.caja(w, 0.08, 2.4, i % 2 ? '#ffffff' : P.rojo, x, 6.35, R.z1 + 1.05));
      raya.rotation.x = 0.42;
      g.add(raya);
      g.add(k.noSolido(k.cajaDe(x - w / 2, 5.55, R.z1 + 2.05, x + w / 2, 5.95, R.z1 + 2.15, i % 2 ? '#ffffff' : P.rojo)));
    }
  }
  // Cartel de neón y faroles de la puerta.
  const cartel = k.cartel('LO DE LOURDES', 10, 1.7, '#ffe14d', P.rojo);
  cartel.position.set((DOOR.a + DOOR.b) / 2, 7.1, R.z1 + 0.5);
  g.add(cartel);
  const abierto = k.cartel('ABIERTO', 2.4, 0.7, '#7cff5a', '#1d1f22');
  abierto.position.set(-59.4, 4.2, R.z1 + 0.06);
  g.add(abierto);
  for (const x of [DOOR.a - 1, DOOR.b + 1]) {
    g.add(k.noSolido(k.cajaDe(x - 0.25, 4.6, R.z1, x + 0.25, 5.3, R.z1 + 0.5, '#24282c')));
    g.add(k.noSolido(k.cajaDe(x - 0.18, 4.7, R.z1 + 0.5, x + 0.18, 5.2, R.z1 + 0.55, k.brillo('#ffe3a8'))));
  }
  for (const x of [DOOR.a - 2.2, DOOR.b + 2.2]) {
    const pl = k.modelo('pottedPlant', { alto: 3.4 });
    pl.position.set(x, 0.12, R.z1 + 1.2);
    g.add(pl);
  }
  // Mesita de afuera con sombrilla.
  const mesa = k.modelo('tableRound', { ancho: 2.6 });
  mesa.position.set(-66, 0.12, R.z1 + 2.6);
  g.add(mesa);
  g.add(k.noSolido(k.cajaDe(-66.05, 2, R.z1 + 2.55, -65.95, 6, R.z1 + 2.65, '#e0e0e0')));
  g.add(k.noSolido(k.cono(2.4, 1, P.rojo, -66, 6.4, R.z1 + 2.6, 8)));
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
    g.add(k.noSolido(k.cajaDe(x - 0.03, 6.2, z - 0.03, x + 0.03, R.alto, z + 0.03, '#24282c')));
    g.add(k.noSolido(k.cono(0.75, 0.6, P.verde, x, 6.0, z, 10)));
    g.add(k.noSolido(k.cilindro(0.35, 0.35, 0.05, k.brillo('#fff1c4'), x, 5.72, z, 10)));
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

// ---------- Rincón de Lourdes: su mesita, su silla y la radio grande y vieja ----------
export function rinconLourdes(k, g) {
  const [mx, mz] = RESTO_LOURDES.mesa;
  const [sx, sz] = RESTO_LOURDES.silla;
  const mesa = k.modelo('table', { ancho: 2.4, fondo: 1.9, alto: 2.2 });
  mesa.position.set(mx, F, mz);
  g.add(mesa);
  g.add(k.noSolido(k.cajaDe(mx - 1.2, F + 2.2, mz - 0.95, mx + 1.2, F + 2.22, mz + 0.95, '#f3e5c0')));
  const silla = k.modelo('chairCushion', { tela: P.verde });
  silla.position.set(sx, F, sz);
  silla.rotation.y = -Math.PI / 2;
  g.add(silla);
  // Radio grande y vieja (contra la pared, mirando al salón): caja de madera, parlante de
  // tela, dial y perillas, con antena.
  const y = F + 2.22;
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
  radio.position.set(mx - 0.15, y, mz + 0.45);
  radio.scale.setScalar(1.35);
  g.add(radio);
  // Termo y mate.
  g.add(k.noSolido(k.cilindro(0.15, 0.15, 0.9, '#1b5e20', mx - 0.7, y + 0.45, mz - 0.45, 10)));
  g.add(k.noSolido(k.cilindro(0.14, 0.11, 0.3, '#5d4037', mx + 0.1, y + 0.15, mz - 0.5, 10)));
  g.add(k.noSolido(k.cilindro(0.02, 0.02, 0.3, '#c9ced3', mx + 0.15, y + 0.4, mz - 0.5, 4)));
  // Cartelito.
  const cartel = k.cartel('LOURDES', 2.2, 0.55, '#ffffff', '#1f4d3a');
  cartel.position.set(mx, F + 4.6, R.z1 - R.pared - 0.08);
  cartel.rotation.y = Math.PI;
  g.add(cartel);
}

// ---------- Decoración: pizarrón con el menú, cuadros, plantas y reloj ----------
export function decoracion(k, g) {
  const xi = R.x0 + R.pared + 0.08;
  const pizarra = k.pizarra('MENÚ DEL DÍA', PLATOS.map((p) => p.nombre), 6.4, 4.4);
  pizarra.position.set(xi, F + 4.4, -66.2);
  pizarra.rotation.y = Math.PI / 2;
  g.add(pizarra);
  const cuadro = k.pintura('cafe_noche.jpg', 2.8);
  cuadro.position.set(R.x1 - R.pared - 0.12, F + 4.6, -66.5);
  cuadro.rotation.y = -Math.PI / 2;
  g.add(cuadro);
  const cuadro2 = k.pintura('grande_jatte.jpg', 2.4);
  cuadro2.position.set(-55, F + 5.4, R.z0 + R.pared + 0.12);
  g.add(cuadro2);
  // Reloj de pared.
  const reloj = k.cilindro(0.55, 0.55, 0.08, '#ffffff', R.x0 + R.pared + 0.1, F + 6.6, -83, 20);
  reloj.rotation.z = Math.PI / 2;
  g.add(k.noSolido(reloj));
  g.add(k.noSolido(k.cajaDe(R.x0 + R.pared + 0.12, F + 6.55, -83.03, R.x0 + R.pared + 0.16, F + 6.95, -82.97, '#111111')));
  g.add(k.noSolido(k.cajaDe(R.x0 + R.pared + 0.12, F + 6.57, -83.03, R.x0 + R.pared + 0.16, F + 6.63, -82.7, '#111111')));
  for (const [x, z] of [[R.x0 + 1.6, -84], [R.x0 + 1.6, -64], [-41.6, -77]]) {
    const pl = k.modelo('pottedPlant', { alto: 3.6 });
    pl.position.set(x, F, z);
    g.add(pl);
  }
  // Guirnalda de lamparitas en el techo.
  for (let i = 0; i < 24; i++) {
    const x = R.x0 + 2 + i * 1.12;
    const y = R.alto - 0.6 - Math.sin((i / 23) * Math.PI) * 0.5;
    g.add(k.noSolido(k.esfera(0.12, k.brillo(['#ffe082', '#ff8a80', '#a5d6a7'][i % 3]), x, y, -73.5)));
  }
}
