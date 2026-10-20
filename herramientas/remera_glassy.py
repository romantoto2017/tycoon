# Arma las texturas de la remera Glassy Waves de Bauti a partir de la foto subida.
# Uso: python3 herramientas/remera_glassy.py
from PIL import Image, ImageOps
import numpy as np

foto = ImageOps.exif_transpose(Image.open('assets/caras/glassybauti.jpg')).convert('RGB')
px = np.asarray(foto).astype(int)

# Tela lisa (washed) de la parte de abajo de la remera, sin logo.
tela = foto.crop((300, 1150, 630, 1480)).resize((256, 256), Image.LANCZOS)
tela.save('assets/ropa/glassy_tela.jpg', quality=88)

# Frente: cuerpo de la remera con proporción 2.7 x 2 (torso del cuerpo "gordo").
x0, x1, y0 = 228, 900, 560
y1 = y0 + round((x1 - x0) / 1.35)
frente = foto.crop((x0, y0, x1, y1))
# Lo que queda afuera de la silueta (cielo, playa) se rellena con la misma tela.
fondo = tela.resize((256, 256)).resize((x1 - x0, y1 - y0))
mascara = Image.new('L', frente.size, 0)
m = np.zeros((y1 - y0, x1 - x0), dtype=np.uint8)
zona = px[y0:y1, x0:x1]
oscuro = zona.sum(2) < 250
celeste = (zona[:, :, 2] > zona[:, :, 0] + 25) & (zona.sum(2) > 300)
for fila in range(y1 - y0):
    xs = np.where(oscuro[fila])[0]
    if len(xs):
        m[fila, xs.min():xs.max() + 1] = 255
m[celeste] = 0
mascara = Image.fromarray(m)
fondo.paste(frente, (0, 0), mascara)
fondo.resize((512, 380), Image.LANCZOS).save('assets/ropa/glassy_frente.jpg', quality=88)
print('listo', (x0, y0, x1, y1))
