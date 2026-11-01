"""Hilario José para el juego (anda por la ciudad en su hoverboard). Todo acá, sin servicios externos.

- Cara: de assets/caras/hilario_foto.jpeg (la selfie), de las cejas al mentón, agrandada a 256.
- Traje de PedidosYa (como assets/especiales/hilario_pedidosya.jpeg): campera roja con el cierre
  y los vivos blancos, el logo blanco en el pecho y grande en la espalda; mangas rojas con vivo.
- La mochila de reparto (frente rojo con el logo).

    python3 herramientas/hilario.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROJO = (222, 22, 40)
BLANCO = (246, 246, 244)
rng = np.random.default_rng(8)
try:
    FUENTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    ImageFont.truetype(FUENTE, 10)
except OSError:
    FUENTE = None
fuente = lambda t: ImageFont.truetype(FUENTE, t) if FUENTE else ImageFont.load_default()


def ruido(im, s=3.0):
    a = np.asarray(im, np.float32) + rng.normal(0, s, (im.height, im.width, 1))
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def logo(d, x, y, tam):
    # "pedidosya" en blanco, con el iconito de la Y arriba (como el de la campera).
    d.text((x, y), 'pedidosya', fill=BLANCO, font=fuente(tam), anchor='mm')
    d.polygon([(x - tam * 0.25, y - tam * 1.5), (x + tam * 0.25, y - tam * 1.5), (x + tam * 0.05, y - tam * 0.95), (x - tam * 0.05, y - tam * 0.95)], fill=BLANCO)


cara = Image.open('assets/caras/hilario_foto.jpeg').convert('RGB').crop((70, 372, 240, 542)).resize((256, 256), Image.LANCZOS)
cara.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2)).save('assets/caras/hilario.jpeg', quality=92)

W, H = 512, 380
f = Image.new('RGB', (W, H), ROJO)
d = ImageDraw.Draw(f)
d.rectangle((252, 0, 260, H), fill=BLANCO)  # cierre
d.polygon([(200, 0), (312, 0), (284, 30), (228, 30)], fill=(200, 16, 34))  # cuello
for x in (36, 470):
    d.rectangle((x, 0, x + 6, H), fill=BLANCO)  # vivos de los costados
logo(d, 150, 92, 30)
d.line([(330, 210), (420, 210)], fill=(190, 14, 30), width=4)  # bolsillo
ruido(f).save('assets/ropa/hilario_frente.jpg', quality=90)
e = Image.new('RGB', (W, H), ROJO)
de = ImageDraw.Draw(e)
for x in (36, 470):
    de.rectangle((x, 0, x + 6, H), fill=BLANCO)
logo(de, 256, 190, 64)
ruido(e).save('assets/ropa/hilario_espalda.jpg', quality=90)
m = Image.new('RGB', (128, 256), ROJO)
ImageDraw.Draw(m).rectangle((58, 0, 66, 256), fill=BLANCO)
ruido(m).save('assets/ropa/hilario_manga.jpg', quality=90)
ruido(Image.new('RGB', (256, 256), ROJO)).save('assets/ropa/hilario_tela.jpg', quality=90)
# La mochila: frente con el logo grande y una banda reflectiva gris.
mo = Image.new('RGB', (256, 256), ROJO)
dm = ImageDraw.Draw(mo)
dm.rectangle((0, 196, 256, 214), fill=(196, 198, 202))
logo(dm, 128, 122, 40)
ruido(mo).save('assets/especiales/hilario_mochila.jpg', quality=90)
print('listo: cara, traje y mochila de Hilario')
