"""
Genera HERO_IMG: la captura del servidor TAL CUAL, incrustada como data URI
en pano/faces.js (así la página funciona con doble clic, sin servidor).

Uso: hero.py [indice]
  0 = edificio (/tp 270 0)   1 = /tp 0 0   2 = portal (/tp 90 0)   3 = /tp 180 0
"""
import os, glob, sys, base64
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "pano", "_source"))
PANO = os.path.normpath(os.path.join(HERE, "..", "pano"))
f = sorted(glob.glob(os.path.join(SRC, "*.png")))
IDX = int(sys.argv[1]) if len(sys.argv) > 1 else 2

im = Image.open(f[IDX]).convert("RGB")
print("hero:", os.path.basename(f[IDX]), im.size)

bg = os.path.join(PANO, "hero.jpg")
im.save(bg, quality=90)

def uri(path, mime):
    return "data:%s;base64,%s" % (mime, base64.b64encode(open(path, "rb").read()).decode())

with open(os.path.join(PANO, "faces.js"), "w", encoding="utf-8") as fh:
    fh.write("/* Captura del servidor incrustada (funciona con doble clic, file://). */\n")
    fh.write('window.HERO_IMG = "%s";\n' % uri(bg, "image/jpeg"))

print("-> hero.jpg %d KB, faces.js %d KB" % (
    os.path.getsize(bg) // 1024,
    os.path.getsize(os.path.join(PANO, "faces.js")) // 1024))
