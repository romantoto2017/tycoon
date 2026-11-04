"""El Extravirgen (el preso que conocés en el C.O.M.C.A.R.): la cara de su foto de frente (la blanco y
negro, assets/caras/extravirgen2.jpeg), de las cejas al mentón, coloreada con su tono de piel (el de
la otra foto). Todo acá, sin servicios externos.

    python3 herramientas/extravirgen.py [carpeta de salida, por defecto prueba/assets]
"""
import sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter

SAL = sys.argv[1] if len(sys.argv) > 1 else 'prueba/assets'
g = ImageOps.grayscale(Image.open('assets/caras/extravirgen2.jpeg')).crop((136, 70, 312, 246)).resize((256, 256), Image.LANCZOS)
L = np.asarray(ImageOps.autocontrast(g, cutoff=1), np.float32) / 255
# Del negro (pelo, sombras) al tono de su piel en las luces.
sombra = np.array([28, 20, 16], np.float32)
piel = np.array([224, 178, 150], np.float32)
rgb = sombra + (piel - sombra) * L[..., None] ** 0.9
Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(2, 50, 2)).save(f'{SAL}/caras/extravirgen.jpeg', quality=92)
print('listo: cara del Extravirgen')
