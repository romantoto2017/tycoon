# Prepara las imágenes de los objetos especiales a partir de las fotos subidas
# (assets/cuadros/originales/). Uso: python3 herramientas/especiales.py <nico_sin_fondo.png>
# El recorte de Nico sin fondo se hace aparte, en la computadora (rembg, modelo u2net_human_seg).
import random
import sys
from PIL import Image, ImageDraw, ImageFilter

ORIG = 'assets/cuadros/originales/'
ESP = 'assets/especiales/'
CUA = 'assets/cuadros/'


def achicar(im, lado):
    im = im.copy()
    im.thumbnail((lado, lado), Image.LANCZOS)
    return im


# ---------- Nico de cartón: frente (foto con borde blanco) y dorso (cartón) ----------
nico = Image.open(sys.argv[1]).convert('RGBA')
nico = nico.crop(nico.getbbox())
alto = 600
nico = nico.resize((round(nico.width * alto / nico.height), alto), Image.LANCZOS)
borde = 10
lienzo = (nico.width + borde * 2, nico.height + borde)
mascara = Image.new('L', lienzo, 0)
mascara.paste(nico.split()[3].point(lambda a: 255 if a > 110 else 0), (borde, borde))
gruesa = mascara.filter(ImageFilter.MaxFilter(borde * 2 + 1))
frente = Image.new('RGBA', lienzo, (255, 255, 255, 0))
frente.paste((255, 255, 255, 255), (0, 0), gruesa)
frente.alpha_composite(nico, (borde, borde))
frente.putalpha(gruesa)
frente.save(ESP + 'nico_frente.png', optimize=True)
random.seed(3)
dorso = Image.new('RGB', lienzo, (176, 136, 92))
d = ImageDraw.Draw(dorso)
for x in range(0, lienzo[0], 6):
    d.line([(x, 0), (x, lienzo[1])], fill=(163, 124, 82), width=2)
for _ in range(400):
    x, y = random.randrange(lienzo[0]), random.randrange(lienzo[1])
    d.point((x, y), fill=(150, 112, 72))
dorso = dorso.convert('RGBA')
dorso.putalpha(gruesa)
dorso.transpose(Image.FLIP_LEFT_RIGHT).save(ESP + 'nico_dorso.png', optimize=True)

# ---------- La Dosis: escudo redondo y banderín ----------
esc = Image.open(ORIG + 'ladosisescudo.jpeg').convert('RGB')
cx, cy, r = 473, 366, 312
esc = esc.crop((cx - r, cy - r, cx + r, cy + r)).resize((512, 512), Image.LANCZOS)
m = Image.new('L', (512 * 2, 512 * 2), 0)
ImageDraw.Draw(m).ellipse((4, 4, 1020, 1020), fill=255)
esc.putalpha(m.resize((512, 512), Image.LANCZOS))
esc.save(ESP + 'ladosis_escudo.png', optimize=True)

ban = Image.open(ORIG + 'ladosisbanderin.jpeg').convert('RGB')
k = ban.width / 381
pts = [(36, 104), (350, 104), (350, 124), (214, 552), (202, 552), (36, 124)]
m = Image.new('L', ban.size, 0)
ImageDraw.Draw(m).polygon([(x * k, y * k) for x, y in pts], fill=255)
ban.putalpha(m)
ban = ban.crop(m.getbbox())
achicar(ban, 384).save(ESP + 'ladosis_banderin.png', optimize=True)

# ---------- Se busca (Negro bebé) ----------
cartel = Image.open(ORIG + 'negrobebe.jpeg').convert('RGB').crop((170, 40, 905, 1015))
achicar(cartel, 512).save(ESP + 'se_busca.jpg', quality=85)

# ---------- Cuadros ----------
def cuadro(origen, destino, caja=None, lado=640):
    im = Image.open(ORIG + origen).convert('RGB')
    if caja:
        im = im.crop(caja)
    achicar(im, lado).save(CUA + destino, quality=85)

cuadro('alonso.jpeg', 'alonso.jpg', (0, 0, 1125, 1540))
cuadro('bautipateado.jpeg', 'bautipateado.jpg', (0, 100, 411, 650))
cuadro('grefg.jpeg', 'grefg.jpg')
cuadro('kirk.jpeg', 'kirk.jpg', (0, 0, 1125, 660))
cuadro('nicopereira.jpeg', 'nicopereira.jpg')
cuadro('puedeser(no hay q recortar nada).jpeg', 'puedeser.jpg')
cuadro('samubarber.jpeg', 'samubarber.jpg')
cuadro('tosi.jpeg', 'tosi.jpg')
