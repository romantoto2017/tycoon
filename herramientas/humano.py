"""El Humano (el fisura de la ciudad, de noche). Todo acá, sin servicios externos.

- Cara: de assets/caras/humano_foto.jpg, de las cejas al mentón, agrandada a 256.
- Ropa de fisura: saco oscuro abierto, gastado, sobre una camisa blanca sucia y manchada.

    python3 herramientas/humano.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SACO = (34, 36, 46)
CAMISA = (214, 208, 190)
rng = np.random.default_rng(13)


def ruido(im, s=6.0):
    a = np.asarray(im, np.float32) + rng.normal(0, s, (im.height, im.width, 1))
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def manchas(d, x0, y0, x1, y1, n, colores):
    for _ in range(n):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        r = rng.uniform(3, 14)
        d.ellipse((x - r, y - r * 0.7, x + r, y + r * 0.7), fill=tuple(colores[rng.integers(len(colores))]))


def gastado(im):
    # Brillos y roces del saco viejo.
    d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y = rng.uniform(0, im.width), rng.uniform(0, im.height)
        d.line([(x, y), (x + rng.uniform(-30, 30), y + rng.uniform(5, 40))], fill=(52, 54, 64), width=2)
    return im


cara = Image.open('assets/caras/humano_foto.jpg').convert('RGB').crop((80, 192, 238, 350)).resize((256, 256), Image.LANCZOS)
cara.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)).save('assets/caras/humano.jpeg', quality=92)

W, H = 512, 380
f = gastado(Image.new('RGB', (W, H), SACO))
d = ImageDraw.Draw(f)
# La camisa en el medio (el saco abierto), el cuello abierto y los botones.
d.polygon([(170, 0), (342, 0), (318, H), (194, H)], fill=CAMISA)
d.polygon([(170, 0), (230, 0), (256, 70)], fill=(232, 228, 214))
d.polygon([(342, 0), (282, 0), (256, 70)], fill=(232, 228, 214))
for y in range(110, H, 60):
    d.ellipse((252, y, 260, y + 8), fill=(170, 165, 150))
manchas(d, 200, 60, 312, H, 26, [(150, 120, 80), (110, 90, 60), (90, 70, 50), (170, 150, 110), (120, 40, 30)])
# Las solapas del saco.
d.polygon([(170, 0), (200, 0), (214, 150), (186, 190)], fill=(26, 28, 36))
d.polygon([(342, 0), (312, 0), (298, 150), (326, 190)], fill=(26, 28, 36))
ruido(f).save('assets/ropa/humano_frente.jpg', quality=88)
ruido(gastado(Image.new('RGB', (W, H), SACO))).save('assets/ropa/humano_espalda.jpg', quality=88)
ruido(gastado(Image.new('RGB', (128, 256), SACO))).save('assets/ropa/humano_manga.jpg', quality=88)
ruido(gastado(Image.new('RGB', (256, 256), SACO))).save('assets/ropa/humano_tela.jpg', quality=88)
print('listo: cara y ropa de El Humano')
