// Personajes de la Vecibanda.
// - foto:     archivo en assets/caras/ (si no existe, se muestra la inicial)
// - recorte:  [centroX, centroY, tamaño] para encuadrar la cara dentro de la foto.
//             centroX/centroY van de 0 a 1 (0.5 = medio de la foto).
//             tamaño: 1 = el lado más corto entero; más chico = más zoom.
// - fotoAtras: (opcional) imagen de la nuca en assets/caras/, por ejemplo 'toto_atras.jpeg'.
//             Si no está, la nuca, los costados y la parte de arriba se dibujan solos
//             con el color de pelo y de piel de la foto.
// - piel / pelo: (opcional) color de piel y de pelo. Si no se ponen, se sacan de la foto.
// - peinado: 'liso', 'ondulado' o 'rulos'
// - cuerpo:  (opcional) 'gordo'
// - velocidad: (opcional) 1 = normal, 0.5 = la mitad de rápido
// - barba: (opcional) { color, boca: [x0, y0, x1, y1] de los labios en la foto recortada, de 0 a 1 }
// - kipa: (opcional) true = lleva kipá en la coronilla
// - ojos: (opcional) [y, x izquierdo, x derecho] de los ojos y boca: y de la boca, en la cara recortada (0 a 1):
//   ahí van los agujeros del pasamontañas de Lucca Bossio x TussiWarriors
// - alto: (opcional) 1 = normal; más alto no entra por las puertas y tiene el botón de agacharse
// - remera / pantalon: color de la ropa
// - remeraFotos: (opcional) remera con imágenes en assets/: { frente: con el diseño, tela: espalda y mangas }

export const PERSONAJES = [
  { id: 'toto',   nombre: 'Toto',   foto: 'toto.jpeg', ojos: [0.36, 0.35, 0.65], boca: 0.78,   recorte: [0.5, 0.53, 0.52],   piel: '#f3d3bd',                    remera: '#e53935', pantalon: '#1e3a8a', kipa: true },
  { id: 'nico',   nombre: 'Nico',   foto: 'nico.jpeg', ojos: [0.14, 0.18, 0.78], boca: 0.9,   recorte: [0.5, 0.54, 1],                                         remera: '#1e88e5', pantalon: '#37474f' },
  { id: 'val',    nombre: 'Val',    foto: 'val.jpeg', ojos: [0.2, 0.22, 0.66], boca: 0.85,    recorte: [0.55, 0.61, 0.68], piel: '#fbe3d4', pelo: '#e3bd62', peinado: 'rulos', remera: '#8e24aa', pantalon: '#263238', kipa: true },
  { id: 'juanma', nombre: 'Juanma', foto: 'juanma.jpeg', ojos: [0.33, 0.3, 0.72], boca: 0.8, recorte: [0.5, 0.49, 0.62],                                      remera: '#43a047', pantalon: '#5d4037', barba: { color: '#2a1d16', boca: [0.37, 0.74, 0.82, 0.92] } },
  { id: 'jeipi',  nombre: 'Jeipi',  foto: 'jeipi.jpeg', ojos: [0.48, 0.3, 0.66], boca: 0.86,  recorte: [0.5, 0.55, 0.72], piel: '#f3d6c4', pelo: '#17110d', peinado: 'rulos', remera: '#fb8c00', pantalon: '#283593', alto: 1.35 },
  { id: 'tepho',  nombre: 'Tepho',  foto: 'tepho.jpeg', ojos: [0.34, 0.25, 0.78], boca: 0.83,  recorte: [0.5, 0.5, 0.47],  pelo: '#6b4423', peinado: 'ondulado', remera: '#00acc1', pantalon: '#212121', kipa: true },
  { id: 'mateo',  nombre: 'Mateo',  foto: 'mateo.jpeg', ojos: [0.53, 0.3, 0.7], boca: 0.93,  recorte: [0.5, 0.45, 1],    piel: '#8a5a3c',                     remera: '#fdd835', pantalon: '#1565c0', kipa: true },
  { id: 'negro',  nombre: 'Negro',  foto: 'negro.jpeg', ojos: [0.2, 0.27, 0.75], boca: 0.6,  recorte: [0.5, 0.46, 0.45],                                      remera: '#212121', pantalon: '#c62828' },
  { id: 'joaco',  nombre: 'Joaco',  foto: 'joaco.jpeg',  recorte: [0.5, 0.45, 0.7],  piel: '#f1c27d',                     remera: '#d81b60', pantalon: '#424242' },
  { id: 'bauti',  nombre: 'Bauti',  foto: 'bauti.jpeg', ojos: [0.18, 0.16, 0.6], boca: 0.66,  recorte: [0.43, 0.32, 0.34], piel: '#f5d7c3', pelo: '#5c3a21', peinado: 'liso', cuerpo: 'gordo', velocidad: 0.5, remera: '#2e2e2e', pantalon: '#3e2723',
    remeraFotos: { frente: 'ropa/glassy_frente.jpg', tela: 'ropa/glassy_tela.jpg' } },
];
