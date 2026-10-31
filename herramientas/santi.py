"""La cara de Santi para la estatua griega del patio. Se procesa acá, sin servicios externos.

De la foto (assets/caras/santi.png) sale solo la cara, de la frente al mentón, pasada a mármol:
en blanco y negro, suavizada (como piedra pulida, sin el grano de la foto), con el contraste
bajado (en el mármol las cejas y los ojos no son oscuros: se notan por la sombra) y teñida de
marfil, con vetas finitas. Los bordes se funden con la cabeza de la estatua (alfa suave).

    python3 herramientas/santi.py
"""
import numpy as np
from PIL import Image, ImageFilter

im = Image.open('assets/caras/santi.png').convert('RGB').crop((31, 19, 81, 75))
W, H = 256, 286
im = im.resize((W, H), Image.LANCZOS)
im = im.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
L = np.asarray(im.convert('L'), np.float32) / 255
lo, hi = np.percentile(L, 3), np.percentile(L, 99)
L = np.clip((L - lo) / (hi - lo), 0, 1)
# Contraste de piedra: las sombras se quedan, lo oscuro (cejas, ojos, pelo) se aclara.
L = 0.46 + 0.54 * L ** 0.8
oscuro = np.array([150, 143, 131], np.float32)
claro = np.array([252, 248, 238], np.float32)
a = oscuro + (claro - oscuro) * L[..., None]
# Vetas del mármol: líneas finas y suaves en diagonal.
rng = np.random.default_rng(4)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
ruido = np.asarray(Image.fromarray((rng.random((H // 16, W // 16)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
veta = np.exp(-np.abs(ruido - 0.5) * 40)  # líneas suaves donde el ruido cruza el medio
a -= veta[..., None] * np.array([4, 4, 3])
a += rng.normal(0, 1.6, (H, W, 1))
# Alfa: un óvalo con el borde suave (la frente arriba se funde con los rulos de la estatua).
u = (xx / W - 0.49) / 0.45
v = (yy / H - 0.47) / 0.45
d = np.sqrt(u * u + v * v)
alfa = np.clip((1 - d) / 0.16, 0, 1)
alfa *= np.clip((yy / H - 0.06) / 0.12, 0, 1)
out = np.dstack([a.clip(0, 255), alfa * 255]).astype(np.uint8)
Image.fromarray(out, 'RGBA').filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=1)).save('assets/especiales/santi_marmol.png')
print('listo: assets/especiales/santi_marmol.png')
