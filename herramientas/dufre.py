"""Ropa de Dufre: el buzo negro de entrenamiento de la foto (franjas blancas en los hombros,
el logo de la marca y el escudo del club). Se hace acá, sin servicios externos.

    python3 herramientas/dufre.py
"""
import numpy as np
from PIL import Image, ImageDraw

foto = Image.open('assets/caras/dufre.jpeg').convert('RGB')
rng = np.random.default_rng(5)

def tela(w, h):
    base = np.full((h, w, 3), 20, dtype=np.float32) + rng.normal(0, 3, (h, w, 1))
    return Image.fromarray(base.clip(0, 255).astype(np.uint8))

tela(256, 256).save('assets/ropa/dufre_tela.jpg', quality=90)
frente = tela(512, 380)
d = ImageDraw.Draw(frente)
# Franjas blancas que bajan de los hombros (como en la foto).
for lado in (1, -1):
    x0 = 60 if lado > 0 else 452
    d.polygon([(x0 - 26 * lado, 0), (x0 + 6 * lado, 0), (x0 + 30 * lado, 150), (x0 + 2 * lado, 150)], fill=(230, 230, 230))
# El logo de la marca y el escudo del club, recortados del pecho de la foto.
for (caja, pos, alto) in [((80, 200, 112, 232), (150, 95), 54), ((158, 178, 197, 220), (318, 70), 92)]:
    recorte = foto.crop(caja)
    recorte = recorte.resize((int(recorte.width * alto / recorte.height), alto), Image.LANCZOS)
    frente.paste(recorte, pos)
frente.save('assets/ropa/dufre_frente.jpg', quality=90)
print('listo: assets/ropa/dufre_frente.jpg y dufre_tela.jpg')
