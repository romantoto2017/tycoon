#!/bin/sh
# Pasa la actualización probada en prueba/ al juego de verdad (lo de prueba/ reemplaza al original).
#   sh herramientas/pasar_prueba.sh
set -e
cd "$(dirname "$0")/.."
[ -d prueba ] || { echo "no hay prueba/"; exit 1; }
rm -rf css js data
cp -r prueba/css prueba/js prueba/data .
cp -r prueba/assets/. assets/ # se suman (las fotos originales que hay solo acá no se borran)
cp prueba/index.html prueba/manifest.webmanifest .
echo "listo: el juego quedó igual a prueba/"
