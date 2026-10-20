// Personajes de la Vecibanda.
// - foto:     archivo en assets/caras/ (si no existe, se muestra la inicial)
// - recorte:  [centroX, centroY, tamaño] para encuadrar la cara dentro de la foto.
//             centroX/centroY van de 0 a 1 (0.5 = medio de la foto).
//             tamaño: 1 = el lado más corto entero; más chico = más zoom.
// - fotoAtras: (opcional) imagen de la nuca en assets/caras/, por ejemplo 'toto_atras.jpeg'.
//             Si no está, la nuca, los costados y la parte de arriba se dibujan solos
//             con el color de pelo y de piel de la foto.
// - remera / pantalon: color de la ropa
// - piel: color de piel si no hay foto

export const PERSONAJES = [
  { id: 'toto',   nombre: 'Toto',   foto: 'toto.jpeg',   recorte: [0.5, 0.53, 0.52],   remera: '#e53935', pantalon: '#1e3a8a', piel: '#e8b48f' },
  { id: 'nico',   nombre: 'Nico',   foto: 'nico.jpeg',   recorte: [0.5, 0.54, 1],    remera: '#1e88e5', pantalon: '#37474f', piel: '#c99a78' },
  { id: 'val',    nombre: 'Val',    foto: 'val.jpeg',    recorte: [0.55, 0.61, 0.68], remera: '#8e24aa', pantalon: '#263238', piel: '#d9a083' },
  { id: 'juanma', nombre: 'Juanma', foto: 'juanma.jpeg', recorte: [0.5, 0.49, 0.62], remera: '#43a047', pantalon: '#5d4037', piel: '#d3a07e' },
  { id: 'jeipi',  nombre: 'Jeipi',  foto: 'jeipi.jpeg',  recorte: [0.5, 0.55, 0.72], remera: '#fb8c00', pantalon: '#283593', piel: '#b98b6e' },
  { id: 'tepho',  nombre: 'Tepho',  foto: 'tepho.jpeg',  recorte: [0.5, 0.5, 0.47],  remera: '#00acc1', pantalon: '#212121', piel: '#e3b394' },
  { id: 'mateo',  nombre: 'Mateo',  foto: 'mateo.jpeg',  recorte: [0.5, 0.45, 1],    remera: '#fdd835', pantalon: '#1565c0', piel: '#e2ad8e' },
  { id: 'negro',  nombre: 'Negro',  foto: 'negro.jpeg',  recorte: [0.5, 0.46, 0.45], remera: '#212121', pantalon: '#c62828', piel: '#c8946f' },
  { id: 'joaco',  nombre: 'Joaco',  foto: 'joaco.jpeg',  recorte: [0.5, 0.45, 0.7],  remera: '#d81b60', pantalon: '#424242', piel: '#f1c27d' },
  { id: 'bauti',  nombre: 'Bauti',  foto: 'bauti.jpeg',  recorte: [0.43, 0.32, 0.34], remera: '#5e35b1', pantalon: '#3e2723', piel: '#e6b294' },
];
