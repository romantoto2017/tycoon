# Deja solo el boxer Supreme de la foto: saca el paquete que lo tapa (rellena con el blanco
# del boxer), saca el fondo negro y lo guarda con transparencia. Todo local.
# Uso: python3 herramientas/boxer_supreme.py <foto.jpeg> <salida.png>
import sys
import numpy as np
from PIL import Image, ImageFilter

im = Image.open(sys.argv[1]).convert('RGB')
a = np.asarray(im).astype(int)
H, W = a.shape[:2]
ys, xs = np.mgrid[0:H, 0:W]
# Borde izquierdo del boxer (el paquete lo tapa): recta de la cintura al pie de la pierna.
x_borde = 129 + (96 - 129) * (ys - 98) / (350 - 98)
derecha = xs >= x_borde
# Zona donde estaba el paquete encima del boxer: se pinta del blanco de la tela.
tapado = derecha & (ys >= 119) & (ys <= 346) & (xs <= 182)
blanco = np.median(a[200:300, 200:300].reshape(-1, 3), axis=0)
sombra = np.median(a[200:300, 175:185].reshape(-1, 3), axis=0)
out = a.astype(float).copy()
# Tela: un poco más oscura contra el borde (como el resto del boxer) y se funde con la foto
# en los últimos 14 píxeles para que no se note el corte.
tela = sombra + (blanco - sombra) * np.clip((xs - x_borde) / 40, 0, 1)[..., None]
mezcla = np.clip((182 - xs) / 14, 0, 1)[..., None]
out = np.where(tapado[..., None], tela * mezcla + out * (1 - mezcla), out)
# Fondo negro afuera: transparente.
claro = a.max(axis=2) > 60
alfa = ((claro & derecha) | tapado).astype(np.uint8) * 255
m = Image.fromarray(alfa).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).convert('RGBA')
res.putalpha(m)
res = res.crop(m.point(lambda v: 255 if v > 20 else 0).getbbox())
res.save(sys.argv[2], optimize=True)
print(res.size)
