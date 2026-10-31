"""Arma la canción del juego para que dé la vuelta natural (assets/especiales/vecicoon.mp3).

La original (vecicoon_original.mp3) termina con un golpe fuerte y unos ecos. El loop corta un
tiempo después del golpe (a 38,575 s: la intro vuelve a entrar justo en el tiempo siguiente),
y el eco del golpe sigue sonando encima del arranque de la intro, apagándose en 1 segundo. El
volumen se iguala al de la canción anterior. sfx.js la reproduce en loop sin cortes.

    python3 herramientas/musica.py      (necesita ffmpeg)
"""
import subprocess
import numpy as np

SR = 44100
ORIGINAL = 'assets/especiales/vecicoon_original.mp3'
SALIDA = 'assets/especiales/vecicoon.mp3'
INI, FIN, COLA = 0.030, 38.575, 1.0  # arranque de la intro, la vuelta y el eco que se superpone
RMS_OBJETIVO = 0.1286  # el de la canción anterior (x 1,1)

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ORIGINAL, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
s = np.frombuffer(raw, np.float32).reshape(-1, 2)
a, b = int(INI * SR), int(FIN * SR)
cuerpo = s[a:b].copy()
f = int(0.003 * SR)
cuerpo[:f] *= np.linspace(0, 1, f)[:, None]  # sin clic al arrancar la intro
cola = s[b:b + int(COLA * SR)] * (np.linspace(1, 0, int(COLA * SR)) ** 1.5)[:, None]
cuerpo[:len(cola)] += cola
cuerpo *= min(RMS_OBJETIVO / np.sqrt((cuerpo ** 2).mean()), 0.98 / np.abs(cuerpo).max())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '192k', SALIDA],
               input=cuerpo.astype(np.float32).tobytes(), check=True)
print('listo:', SALIDA, f'{len(cuerpo) / SR:.2f} s')
