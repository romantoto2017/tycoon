// Los dueños de las mansiones de lujo de la costa (js/costa.js). Tocás el timbre, sale y charla.
// En esta actualización todavía no compran: solo dejan la pista de que más adelante van a querer
// hacer negocios (sin nombrar la tanzania). Cada uno ya es un "comprador" con sus datos de compra
// preparados para la próxima (VENTAS_COMPRADORES = true y un sistema que lea `compra`):
//   compra.cantidad: bolsitas por pedido; compra.paga: cuánto paga cada una (veces lo que vale
//   procesada); compra.cada: segundos entre pedidos.
// Los ids no se renombran ni se borran (más adelante pueden ir en la partida guardada).
export const VENTAS_COMPRADORES = false;

export const COMPRADORES = [
  {
    id: 'rulo', nombre: 'Don Rulo Ferrando', personalidad: 'Viejo zorro de los casinos, desconfiado y elegante.',
    look: { piel: '#e6b894', pelo: '#d8d8d8', peinado: 'liso', remera: '#1d2a44', pantalon: '#e8e2d2', cuerpo: 'gordo' },
    sinGalpon: ['¿Quién toca a esta hora? …Ah, un pibe nuevo del barrio.', 'Mirá, yo no compro rifas ni nada. Andá a saber… capaz que más adelante hacemos negocios, eh. Cuando tengas algo serio.'],
    conGalpon: ['Vos sos el del galpón de allá arriba, ¿no? Se ven las luces de noche, eh.', 'Yo no pregunto qué hacés. Pero cuando quieras hablar de negocios, la puerta está abierta.'],
    compra: { cantidad: 40, paga: 1.3, cada: 900 },
  },
  {
    id: 'brenda', nombre: 'Brenda Lavalleja', personalidad: 'Influencer de las de millones de seguidores; todo es contenido.',
    look: { piel: '#f1c9a8', pelo: '#e9c46a', peinado: 'ondulado', remera: '#ff7eb6', pantalon: '#ffffff' },
    sinGalpon: ['¡Hola, hola! Perdón, estaba en vivo. ¿Me seguís? Bueno, no importa.', 'Me encanta tu energía, eh. Andá a saber… capaz que más adelante hacemos un collab. O negocios. Lo que pinte.'],
    conGalpon: ['¡Ay, sos vos! El del galpón del acantilado. Mis amigas no paran de preguntar qué hay ahí arriba.', 'Avisame cuando tengas algo para las fiestas, eh. Yo muevo mucha gente.'],
    compra: { cantidad: 25, paga: 1.6, cada: 600 },
  },
  {
    id: 'turco', nombre: 'El Turco Haddad', personalidad: 'Importador de autos, canchero, siempre apurado y con dos celulares.',
    look: { piel: '#c99a73', pelo: '#1b1411', peinado: 'liso', remera: '#f5f5f5', pantalon: '#2b2f36' },
    sinGalpon: ['¡Hermano! Un segundo que tengo al de la aduana en el otro teléfono.', 'Lindo auto el que andás trayendo, eh. Andá a saber… capaz que más adelante hacemos negocios. Yo de todo sé un poco.'],
    conGalpon: ['Me contaron que arrancaste algo arriba del acantilado. Bien ahí, el que no arriesga no gana.', 'Cuando tengas volumen, hablame. Yo tengo los contactos y los camiones.'],
    compra: { cantidad: 80, paga: 1.1, cada: 1200 },
  },
  {
    id: 'vale', nombre: 'Valentina Ocampo', personalidad: 'Heredera aburrida de la plata de la familia; busca emociones.',
    look: { piel: '#f3d3bd', pelo: '#2b1d14', peinado: 'ondulado', remera: '#2e7d6b', pantalon: '#d9c7a8' },
    sinGalpon: ['Ah… otro vecino. Pensé que era el delivery.', 'Acá es todo muy aburrido, ¿viste? Andá a saber… capaz que más adelante hacemos negocios y esto se pone interesante.'],
    conGalpon: ['¿Así que el galpón de arriba es tuyo? Qué misterioso. Me gusta.', 'Si un día tenés algo exclusivo, de lo que no consigue nadie… ya sabés dónde vivo.'],
    compra: { cantidad: 15, paga: 2, cada: 1500 },
  },
];
