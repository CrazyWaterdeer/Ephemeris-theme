"""Status marks as ink with a breath after them: subset Noto Emoji (OFL, monochrome) to the six
status glyphs and widen each glyph's advance so "📜Final" renders as "📜 Final" without touching
the data. Writes fonts/status-marks.woff2 next to the other cached faces."""
import os, io, urllib.request, urllib.parse
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'fonts', 'status-marks.woff2')
MARKS = '📚✏📖📗📜💀'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode('utf-8')

css = get('https://fonts.googleapis.com/css2?family=Noto+Emoji&text=' + urllib.parse.quote(MARKS))
url = css[css.index('url(') + 4:css.index(')', css.index('url('))]
raw = get(url, binary=True)
f = TTFont(io.BytesIO(raw))
upm = f['head'].unitsPerEm
cmap = f.getBestCmap()
hmtx = f['hmtx']
gap = round(upm * 0.4)          # about a thin space after the mark
for ch in MARKS:
    g = cmap.get(ord(ch))
    assert g, 'missing glyph for %r' % ch
    adv, lsb = hmtx[g]
    hmtx[g] = (adv + gap, lsb)
    print(ch, g, adv, '->', adv + gap)
f.flavor = 'woff2'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
f.save(OUT)
print('wrote', OUT, os.path.getsize(OUT), 'bytes; upm', upm)
