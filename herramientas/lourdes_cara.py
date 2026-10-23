"""Cara de Lourdes para el juego (se procesa acá, sin servicios externos).

Recorta un cuadrado de la foto de frente con los ojos donde van los lentes 3D del muñeco
(centros de los lentes a 0,231 del ancho a cada lado del medio y a 0,392 desde arriba) y
pinta el fondo naranja que asoma a los costados de la cara con el color del pelo.

    python3 herramientas/lourdes_cara.py
"""
from PIL import Image, ImageFilter
import numpy as np

ORIGEN = 'assets/caras/lourdes_cara.jpeg'
DESTINO = 'assets/caras/lourdes_juego.jpeg'
OJOS = ((288, 198), (368, 197))  # centro de cada lente en la foto
LADO = 180
PELO = np.array([22, 17, 14], dtype=np.float32)  # el mismo pelo de LOURDES en restaurante.js

im = Image.open(ORIGEN).convert('RGB')
cx = 322  # un poco a la izquierda del medio de los lentes: tiene la cabeza apenas girada
cy = (OJOS[0][1] + OJOS[1][1]) / 2
x0 = int(round(cx - LADO / 2))
y0 = int(round(cy - 0.392 * LADO))
cara = im.crop((x0, y0, x0 + LADO, y0 + LADO))

a = np.asarray(cara).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# Fondo: naranja saturado (la pared de atrás). La piel tiene mucho menos rojo-azul.
fondo = (r > 185) & (r - b > 105) & (g > 95)
mascara = Image.fromarray((fondo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
m = np.asarray(mascara).astype(np.float32)[..., None] / 255
salida = a * (1 - m) + PELO * m
Image.fromarray(salida.clip(0, 255).astype(np.uint8)).save(DESTINO, quality=92)
print(DESTINO, cara.size, f'{fondo.mean():.1%} de fondo pintado')
