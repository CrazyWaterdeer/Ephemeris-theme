"""The chart's glyphs as ink on every device: subset three Google fonts (OFL) to exactly the
characters the theme and the Almanac dashboard print, so phones without Segoe UI Symbol do not fall
back to the colour-emoji font (the zodiac signs, ♈–♓, are default-emoji code points and came out as
purple stickers on Android). Writes three small woff2 files next to the other cached faces:

  fonts/sky-symbols.woff2    Noto Sans Symbols    ☽ ☾ ☿ ♀ ♁ ♂ ♃ ♄  ♈ … ♓  ⤢
  fonts/sky-symbols-2.woff2  Noto Sans Symbols 2  ☉ ★ ☆ ☞ ✦ ✧
  fonts/moon-marks.woff2     Noto Emoji           🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘  (the monochrome one)

make_theme.py embeds each with a unicode-range of just those code points, after the local alias
face, so the embedded glyph wins wherever the ranges overlap."""
import io, os, urllib.request, urllib.parse
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
SETS = [
    ('sky-symbols.woff2', 'Noto Sans Symbols', '☽☾☿♀♁♂♃♄♈♉♊♋♌♍♎♏♐♑♒♓⤢'),
    ('sky-symbols-2.woff2', 'Noto Sans Symbols 2', '☉★☆☞✦✧'),
    ('moon-marks.woff2', 'Noto Emoji', '🌑🌒🌓🌔🌕🌖🌗🌘'),
]

def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode('utf-8')

def ranges(chars):
    """U+2648-2653 style list for a set of characters."""
    cps = sorted({ord(c) for c in chars}); out = []; i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1: j += 1
        out.append(f'U+{cps[i]:04X}' + (f'-{cps[j]:04X}' if j > i else '')); i = j + 1
    return ', '.join(out)

for fn, fam, chars in SETS:
    css = get('https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(fam) + '&text=' + urllib.parse.quote(chars))
    url = css[css.index('url(') + 4:css.index(')', css.index('url('))]
    raw = get(url, binary=True)
    f = TTFont(io.BytesIO(raw))
    cmap = f.getBestCmap()
    missing = [c for c in chars if ord(c) not in cmap]
    assert not missing, f'{fam} lacks {missing!r}'
    out = os.path.join(HERE, 'fonts', fn)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'wb').write(raw)
    print(f'{fn}: {fam}, {len(chars)} glyphs, {len(raw)} bytes, unicode-range: {ranges(chars)}')
