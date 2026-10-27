"""Lucca Bossio: el logo (blanco para el cartel de afuera y negro para la pared del fondo, con
transparencia) y la mascota recortada para que flote por el local. Todo acá, sin servicios externos.
La ropa sale de herramientas/ropa.py (las prendas lb_*, con fotos de luccabossio.com).

    python3 herramientas/lucca.py
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

E = 'assets/especiales'

# ---------- Logo: lo negro pasa a ser la forma (blanca o negra) y el blanco, transparente ----------
logo = Image.open(f'{E}/logoluccabossio.png').convert('L')
alfa = Image.fromarray(255 - np.asarray(logo)).filter(ImageFilter.GaussianBlur(0.6))
for nombre, color in (('blanco', 255), ('negro', 12)):
    im = Image.new('RGBA', logo.size, (color, color, color, 0))
    im.putalpha(alfa)
    im.crop(alfa.getbbox()).save(f'{E}/luccabossio_logo_{nombre}.png', optimize=True)

# ---------- Mascota ----------
# Lo oscuro grande (contornos y relleno), sin los puntitos sueltos del sombreado de alrededor; los
# huecos con pupila (los ojos) y los chicos se rellenan.
im = Image.open(f'{E}/luccabossiobichito.png').convert('RGB').resize((894, 894), Image.NEAREST)
L = np.asarray(im).astype(np.int16).mean(axis=2)
oscuro = ndimage.binary_opening(L < 150, iterations=1)
lab, n = ndimage.label(oscuro)
tam = ndimage.sum(oscuro, lab, range(1, n + 1))
forma = ndimage.binary_closing(np.isin(lab, 1 + np.where(tam > 400)[0]), iterations=3)
huecos = ndimage.binary_fill_holes(forma) & ~forma
hl, hn = ndimage.label(huecos)
for k in range(1, hn + 1):
    m = hl == k
    if m.sum() < 1500 or L[m].min() < 40:
        forma |= m
forma = ndimage.binary_dilation(forma, iterations=2)
alfa = Image.fromarray((forma * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
out = im.convert('RGBA')
out.putalpha(alfa)
out = out.crop(alfa.getbbox())
out.thumbnail((512, 512), Image.LANCZOS)
out.save(f'{E}/luccabossio_mascota.png', optimize=True)
print('listo: logos y mascota de Lucca Bossio')
