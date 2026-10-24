"""El pelado con la camiseta de La Dosis, recortado para ponerlo arriba de la montaña.
Se recorta acá con rembg (local, no se manda a ningún servicio) y se deja solo la parte
más grande (el pelado), sin manchitas sueltas.

    pip install rembg onnxruntime
    python3 herramientas/pelado_montana.py
"""
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

im = Image.open('assets/especiales/peladomontaña.jpeg').convert('RGB')
recorte = remove(im.crop((420, 600, 1050, 1560)), session=new_session('isnet-general-use'))
a = np.asarray(recorte).copy()
partes, n = ndimage.label(a[..., 3] > 40)
if n > 1:
    tam = ndimage.sum(np.ones_like(partes), partes, range(1, n + 1))
    a[..., 3][partes != (1 + int(np.argmax(tam)))] = 0
out = Image.fromarray(a)
out = out.crop(out.getbbox())
out.thumbnail((640, 900), Image.LANCZOS)
out.save('assets/especiales/pelado_cima.png', optimize=True)
print('listo: assets/especiales/pelado_cima.png', out.size)
