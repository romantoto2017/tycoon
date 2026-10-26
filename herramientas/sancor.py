"""Sponsor de las carreras (Sancor Seguros): saca el fondo blanco del logo y deja dos versiones
con transparencia, la magenta (para fondos claros) y una blanca (para fondos oscuros).

    python3 herramientas/sancor.py
"""
import numpy as np
from PIL import Image

im = np.asarray(Image.open('assets/especiales/sponsorcarreras.png').convert('RGB'), np.float32)
# Qué tan lejos del blanco está cada píxel: eso es la opacidad (bordes suaves incluidos).
alfa = np.clip((255 - im.min(axis=2)) / (255 - 120) * 255, 0, 255)
color = np.zeros((*alfa.shape, 4), np.uint8)
color[..., :3] = (166, 25, 110)  # el magenta del logo
color[..., 3] = alfa
Image.fromarray(color).save('assets/especiales/sancor.png')
blanco = color.copy()
blanco[..., :3] = 255
Image.fromarray(blanco).save('assets/especiales/sancor_blanco.png')
print('listo: assets/especiales/sancor.png y sancor_blanco.png')
