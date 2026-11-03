#!/bin/sh
# Copia exacta del juego a prueba/ (se publica en .../prueba/ con sus propias partidas y su propio
# server: js/entorno.js). Para probar una actualización: hacerla en prueba/ y, cuando ande, pasarla
# al juego con herramientas/pasar_prueba.sh.
#   sh herramientas/copiar_prueba.sh
set -e
cd "$(dirname "$0")/.."
rm -rf prueba
mkdir prueba
cp -r index.html manifest.webmanifest css js data assets prueba/
echo "prueba/ lista ($(du -sh prueba | cut -f1))"
