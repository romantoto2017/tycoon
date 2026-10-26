import { Paseante } from './paseante.js';

// Dufre: pasea por la vereda de la mansión o por la plaza de la ciudad (paseante.js). Siempre
// con el buzo de entrenamiento con el cierre hasta arriba (cuello pegado a la cara) y las manos
// en los bolsillos. Si te ve cerca, frena, te mira y te dice "¿Vamo a ver el interno?".
export const DUFRE = {
  id: 'dufre', nombre: 'Dufre', foto: 'dufre.jpeg', recorte: [0.46, 0.225, 0.44], pelo: '#2a1d16', peinado: 'ondulado',
  remera: '#141416', pantalon: '#e8e8e6', mangasLargas: true, cuelloAlto: '#141416',
  remeraFotos: { frente: 'ropa/dufre_frente.jpg', tela: 'ropa/dufre_tela.jpg' },
};

export class Dufre extends Paseante {
  constructor(escena, ui) {
    super(escena, ui, DUFRE, { manosBolsillo: true });
  }

  alHablar() {
    this.hablar('¿Vamo a ver el interno?');
  }
}
