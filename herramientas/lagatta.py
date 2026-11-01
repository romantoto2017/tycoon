"""Lagatta, el bartender del bar de la ciudad: el traje (saco negro, camisa blanca y corbata).
La cara sale directo de assets/caras/lagatta.png (recorte en js/bar.js). Todo acá, sin servicios externos.

    python3 herramientas/lagatta.py
"""
import numpy as np
from PIL import Image, ImageDraw

W, H = 512, 380
rng = np.random.default_rng(3)
SACO = (24, 24, 28)


def ruido(im, s=2.5):
    a = np.asarray(im, np.float32) + rng.normal(0, s, (im.height, im.width, 1))
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


f = Image.new('RGB', (W, H), SACO)
d = ImageDraw.Draw(f)
# Camisa blanca en V, con las solapas del saco y la corbata negra.
d.polygon([(176, 0), (336, 0), (256, 250)], fill=(244, 244, 240))
d.polygon([(176, 0), (210, 0), (256, 250), (232, 250)], fill=(14, 14, 16))  # solapa izquierda
d.polygon([(336, 0), (302, 0), (256, 250), (280, 250)], fill=(14, 14, 16))  # solapa derecha
d.polygon([(244, 18), (268, 18), (276, 40), (236, 40)], fill=(20, 20, 24))  # nudo
d.polygon([(240, 40), (272, 40), (262, 210), (256, 224), (250, 210)], fill=(26, 26, 30))
for y in (275, 325):
    d.ellipse((248, y - 6, 264, y + 6), fill=(10, 10, 12))
d.rectangle((90, 120, 150, 126), fill=(40, 40, 46))  # bolsillo
d.polygon([(380, 112), (420, 104), (424, 110), (384, 118)], fill=(236, 236, 232))  # pañuelito
ruido(f).save('assets/ropa/lagatta_frente.jpg', quality=90)
ruido(Image.new('RGB', (W, H), SACO)).save('assets/ropa/lagatta_espalda.jpg', quality=90)
ruido(Image.new('RGB', (128, 256), SACO)).save('assets/ropa/lagatta_manga.jpg', quality=90)
ruido(Image.new('RGB', (256, 256), SACO)).save('assets/ropa/lagatta_tela.jpg', quality=90)
print('listo: traje de Lagatta')
