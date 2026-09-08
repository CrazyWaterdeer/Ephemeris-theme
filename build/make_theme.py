"""Build the Ephemeris Obsidian theme: embed Latin fonts (woff2, base64) + theme.css + manifest.json + README.
Usage: make_theme.py <repo_dir> <vault_dir> [vault-name-selector]"""
import base64, json, os, re, sys, urllib.request

repo, vault = sys.argv[1], sys.argv[2]
COVER_SEL = sys.argv[3] if len(sys.argv) > 3 else '.workspace-sidedock-vault-profile .vault-name'
os.makedirs(repo, exist_ok=True)
cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts'); os.makedirs(cache, exist_ok=True)

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
CSS_URL = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'

def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode('utf-8')

css = get(CSS_URL)
found = {}
for m in re.finditer(r'/\* (\w[\w-]*) \*/\s*@font-face \{(.*?)\}', css, re.S):
    subset, body = m.group(1), m.group(2)
    if subset != 'latin':
        continue
    fam = re.search(r"font-family: '([^']+)'", body).group(1)
    sty = re.search(r'font-style: (\w+)', body).group(1)
    wgt = int(re.search(r'font-weight: (\d+)', body).group(1))
    url = re.search(r'url\((https://[^)]+)\)', body).group(1)
    found.setdefault((fam, sty, url), []).append(wgt)
faces = []
for (fam, sty, url), ws in found.items():  # EB Garamond is served as one variable file -> one face with a weight range
    fn = os.path.join(cache, re.sub(r'\W+', '_', f'{fam}-{sty}-{min(ws)}') + '.woff2')
    if not os.path.exists(fn):
        open(fn, 'wb').write(get(url, binary=True))
    b64 = base64.b64encode(open(fn, 'rb').read()).decode('ascii')
    wr = f'{min(ws)} {max(ws)}' if len(ws) > 1 else str(ws[0])
    faces.append(f"@font-face {{ font-family: '{fam}'; font-style: {sty}; font-weight: {wr}; font-display: swap; src: url(data:font/woff2;base64,{b64}) format('woff2'); }}")
    print('font', fam, sty, wr, os.path.getsize(fn), 'bytes')
assert len(faces) >= 3, len(faces)

SVG = {
    'star': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z'/></svg>\")",
    'feather': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M20.5 3.5c-6.5 0-13 5.5-16 15.5 9.5-2.5 15.5-8.5 16-15.5z'/><path d='M4.5 19l16-15.5'/><path d='M9.5 14.5L9 10.5M13 11.5l-.5-4.5M16.5 8l-.5-3'/><path d='M3 21l1.5-2'/></svg>\")",
    'stars': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='300' viewBox='0 0 1600 300'><circle cx='813' cy='5' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.232'/><circle cx='1324' cy='75' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.177'/><circle cx='1304' cy='233' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.051'/><circle cx='1227' cy='111' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.129'/><circle cx='899' cy='236' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.033'/><circle cx='1255' cy='6' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.196'/><circle cx='596' cy='128' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.169'/><circle cx='549' cy='26' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.205'/><circle cx='596' cy='192' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.063'/><circle cx='199' cy='133' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.168'/><circle cx='795' cy='158' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.092'/><circle cx='271' cy='117' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.059'/><circle cx='33' cy='14' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.117'/><circle cx='1137' cy='126' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.14'/><circle cx='444' cy='157' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.106'/><circle cx='141' cy='7' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.265'/><circle cx='1313' cy='31' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.238'/><circle cx='240' cy='93' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.195'/><circle cx='1569' cy='225' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.061'/><circle cx='1333' cy='123' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.124'/><circle cx='209' cy='48' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.199'/><circle cx='1104' cy='176' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.065'/><circle cx='1066' cy='80' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.216'/><circle cx='809' cy='123' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.114'/><circle cx='1544' cy='150' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.051'/><circle cx='1044' cy='194' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.059'/><circle cx='1548' cy='136' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.152'/><circle cx='712' cy='156' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.124'/><circle cx='260' cy='155' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.14'/><circle cx='1350' cy='210' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.059'/><circle cx='405' cy='178' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.059'/><circle cx='541' cy='88' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.204'/><circle cx='1471' cy='219' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.036'/><circle cx='1038' cy='31' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.137'/><circle cx='1120' cy='99' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.151'/><circle cx='592' cy='91' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.201'/><circle cx='482' cy='134' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.054'/><circle cx='1054' cy='69' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.228'/><circle cx='1327' cy='56' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.174'/><circle cx='215' cy='27' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.114'/><circle cx='423' cy='138' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.061'/><circle cx='1508' cy='92' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.146'/><circle cx='446' cy='182' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.1'/><circle cx='686' cy='174' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.06'/><circle cx='777' cy='15' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.254'/><circle cx='381' cy='113' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.144'/><circle cx='5' cy='30' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.207'/><circle cx='375' cy='205' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.083'/><circle cx='475' cy='4' r='1.6' fill='rgb(230,226,210)' fill-opacity='0.166'/><circle cx='310' cy='170' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.07'/><circle cx='131' cy='177' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.077'/><circle cx='573' cy='170' r='0.8' fill='rgb(230,226,210)' fill-opacity='0.102'/><circle cx='1475' cy='112' r='1.3' fill='rgb(230,226,210)' fill-opacity='0.185'/><circle cx='746' cy='58' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.099'/><circle cx='959' cy='81' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.09'/><circle cx='1408' cy='197' r='0.6' fill='rgb(230,226,210)' fill-opacity='0.032'/><circle cx='661' cy='17' r='1.0' fill='rgb(230,226,210)' fill-opacity='0.223'/></svg>\")",
    'grain': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch' seed='11'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 .5'/></feComponentTransfer></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>\")",
}

def mode_block(cls, P, A, F, S, comment, C):
    return f"""{cls} {{
  /* page: {comment} */
  --background-primary: {P['bg']};
  --background-primary-alt: {P['bg2']};
  --background-modifier-border: {P['hair']};
  --background-modifier-hover: {P['hover']};
  --text-normal: {P['ink']};
  --text-muted: {P['ink2']};
  --text-faint: {P['ink3']};
  --text-on-accent: {C['bg']};
  --text-selection: {P['sel']};
  --text-highlight-bg: {F}40;
  --code-background: {P['bg3']};
  --code-normal: {P['ink']};
  --metadata-background: {P['bg2']};
  --table-header-background: transparent;
  --table-header-border-color: {F};
  --table-border-color: {P['hair']};
  --table-row-alt-background: {P['bg2']};
  /* inks: bronze for links and rules, blue-black for seals */
  --interactive-accent: {F};
  --interactive-accent-hover: {A};
  --text-accent: {A};
  --text-accent-hover: {F};
  --link-color: {A};
  --link-color-hover: {F};
  --link-external-color: {A};
  --link-unresolved-color: {S};
  --tag-color: {A};
  --tag-border-color: {A}66;
  --hr-color: {F};
  --blockquote-border-color: {S};
  --h3-color: {S};
  --checkbox-color: {F};
  --checkbox-marker-color: {C['bg']};
  --ephemeris-seal: {S};
  /* the frame: {C['name']} */
  --background-secondary: {C['bg']};
  --background-secondary-alt: {C['bg2']};
  --titlebar-background: {C['deep']};
  --titlebar-background-focused: {C['deep']};
  --titlebar-text-color: {C['ink2']};
  --titlebar-text-color-focused: {C['ink']};
  --tab-text-color: {C['ink2']};
  --tab-text-color-focused: {C['ink2']};
  --tab-text-color-focused-active: {C['ink']};
  --tab-text-color-focused-active-current: {C['ink']};
  --tab-background-active: {C['bg2']};
  --tab-outline-color: {C['hair']};
  --nav-item-color: {C['ink2']};
  --nav-item-color-hover: {C['ink']};
  --nav-item-color-active: {C['ink']};
  --nav-item-background-active: {C['on']};
  --nav-item-background-hover: {C['hover']};
  --nav-collapse-icon-color: {C['ink2']};
  --icon-color: {C['ink2']};
  --icon-color-hover: {C['ink']};
  --icon-color-active: {A};
  --ribbon-background: {C['deep']};
  --status-bar-background: {C['deep']};
  --status-bar-text-color: {C['ink2']};
  --status-bar-border-color: {C['hair']};
  --divider-color: {C['hair']};
  --scrollbar-thumb-bg: {C['sb']};
  --scrollbar-active-thumb-bg: {C['sb2']};
}}"""

DARK = dict(bg='#141A2A', bg2='#1C2336', bg3='#242C42', ink='#D9D5C8', ink2='#A6A398', ink3='#7B7969',
            hair='rgba(217,213,200,.14)', hover='rgba(217,213,200,.06)', sel='rgba(142,108,60,.33)')
LIGHT = dict(bg='#EFE8D6', bg2='#E6DEC9', bg3='#DCD3BC', ink='#2A211A', ink2='#5A4E40', ink3='#7F7461',
             hair='rgba(42,33,26,.16)', hover='rgba(42,33,26,.06)', sel='rgba(169,138,74,.33)')
LEATHER = dict(name='leather (light mode keeps the book cover)', bg='#1C140F', bg2='#261A13', deep='#120C09', ink='#D9CBAE', ink2='#9C8B6E',
               hair='rgba(217,203,174,.12)', on='rgba(217,203,174,.10)', hover='rgba(217,203,174,.06)', sb='rgba(217,203,174,.18)', sb2='rgba(217,203,174,.32)')
CLOTH = dict(name='navy book cloth — deeper than the page, so the sidebar recedes', bg='#0C1019', bg2='#131829', deep='#080B12', ink='#C9CBCC', ink2='#868A94',
             hair='rgba(201,203,204,.12)', on='rgba(201,203,204,.10)', hover='rgba(201,203,204,.06)', sb='rgba(201,203,204,.18)', sb2='rgba(201,203,204,.32)')
KR = '"Noto Serif KR"'
SYM = '"Ephemeris Symbols"'
HEAD = f'{SYM}, "IM Fell English", {KR}, Georgia, serif'
SC = f'{SYM}, "IM Fell English SC", "IM Fell English", {KR}, Georgia, serif'

STATUS = os.path.join(cache, 'status-marks.woff2')
status_face = ''
if os.path.exists(STATUS):
    status_face = ('@font-face { font-family: "Ephemeris Symbols"; src: url(data:font/woff2;base64,'
                   + base64.b64encode(open(STATUS, 'rb').read()).decode('ascii')
                   + ") format('woff2'); unicode-range: U+1F4DA, U+270F, U+1F4D6, U+1F4D7, U+1F4DC, U+1F480; }")
    print('status marks embedded', os.path.getsize(STATUS), 'bytes')
# The chart's glyphs as ink on every device (build/sky_subset.py): the zodiac signs are default-emoji
# code points, so a phone without Segoe UI Symbol printed them as coloured stickers. Each face covers
# only its own code points and is defined after the local alias, so the embedded glyph wins.
SKY_FACES = [('sky-symbols.woff2', 'U+263D-2644, U+2648-2653, U+2922'),          # Noto Sans Symbols: ☽ ☾ ☿ ♀ ♁ ♂ ♃ ♄ ♈–♓ ⤢
             ('sky-symbols-2.woff2', 'U+2605-2606, U+2609, U+261E, U+2726-2727'),   # Noto Sans Symbols 2: ★ ☆ ☉ ☞ ✦ ✧
             ('moon-marks.woff2', 'U+1F311-1F318')]                               # Noto Emoji (monochrome): 🌑–🌘
sky_faces = ''
for fn, ur in SKY_FACES:
    p = os.path.join(cache, fn)
    if not os.path.exists(p):
        print('missing', fn, '- run build/sky_subset.py'); continue
    sky_faces += ('@font-face { font-family: "Ephemeris Symbols"; src: url(data:font/woff2;base64,'
                  + base64.b64encode(open(p, 'rb').read()).decode('ascii') + f") format('woff2'); unicode-range: {ur}; }}\n")
    print('embedded', fn, os.path.getsize(p), 'bytes')
theme = f"""/* =====================================================================
   Ephemeris — a Hogwarts student's notebook, as wizarding-world dark academia.
   Built for Jin's vault "Jinome" (Korean prose, Dataview dashboards).
   Dark page: Midnight #141A2A with bronze & blue-black inks.
   Light page: Parchment #EFE8D6, iron-gall ink.  Frame: leather in both modes.
   Type: IM Fell English (headings) + EB Garamond (Latin) are embedded below;
   Noto Serif KR (body) must be installed on the machine.
   Settings → Appearance → Text font / Interface font must be EMPTY, or they
   override --font-*-theme.  Callout colours are bare R, G, B on purpose.
   ===================================================================== */

/* ---- monochrome emoji: status marks (📚 ✏ 📖 📗 📜 💀) drawn as ink, not stickers.
   An alias face scoped to symbol/emoji code points, resolved from a LOCAL font, so it
   never touches Korean or Latin text. Windows: Segoe UI Symbol; elsewhere install
   Google's Noto Emoji (the monochrome one). ---------------------------------------- */
@font-face {{ font-family: "Ephemeris Symbols"; src: local("Segoe UI Symbol"), local("Noto Emoji"); unicode-range: U+2600-27BF, U+2B00-2BFF, U+1F300-1F5FF, U+1F600-1F64F, U+1F680-1F6FF, U+1F900-1F9FF; }}
/* the six status marks come from a Noto Emoji subset (OFL) whose advances are widened, so
   "📜Final" reads as "📜 Final" while the data stays untouched — defined last, so it wins */
{status_face}
/* the chart's glyphs — planets, zodiac, Sun, the manicule, the ornament star, the Moon's phases —
   from Noto Sans Symbols / Symbols 2 / Noto Emoji subsets (OFL), so a phone draws them as ink too */
{sky_faces}
/* ---- embedded Latin faces (Google Fonts, OFL) ------------------------ */
{chr(10).join(faces)}

/* ---- type & shape ---------------------------------------------------- */
body {{
  --font-text-theme: {SYM}, "EB Garamond", {KR}, Georgia, serif;
  --font-interface-theme: {SYM}, "EB Garamond", {KR}, Georgia, serif;
  --font-monospace-theme: "Fira Code", ui-monospace, Consolas, monospace;
  --font-text-size: 17px;
  --line-height-normal: 1.85;
  --file-line-width: 46.5rem;
  --bold-weight: 600;
  --inline-title-font: {HEAD};
  --inline-title-weight: 400;
  --inline-title-size: 2.05em;
  --h1-font: {HEAD}; --h2-font: {HEAD}; --h3-font: {HEAD}; --h4-font: {HEAD}; --h5-font: {HEAD}; --h6-font: {HEAD};
  --h1-weight: 400; --h2-weight: 400; --h3-weight: 400; --h4-weight: 400; --h5-weight: 400; --h6-weight: 400;
  --h1-size: 1.45em; --h2-size: 1.25em; --h3-size: 1.05em; --h4-size: 1em; --h5-size: .95em; --h6-size: .9em;
  --h1-line-height: 1.25;
  --heading-spacing: 2.2em;
  --metadata-label-font: "EB Garamond", {KR}, serif;
  --radius-s: 2px; --radius-m: 3px; --radius-l: 4px;
  --checkbox-radius: 2px;
  --tag-border-width: 1px; --tag-background: transparent;
  --tag-size: .78em; --tag-weight: 500;
  --hr-thickness: 1px;
  --blockquote-border-thickness: 3px;
  --callout-radius: 0; --callout-border-width: 1px;
}}

/* ---- the two papers -------------------------------------------------- */
{mode_block('.theme-dark', DARK, '#C89A5E', '#8E6C3C', '#9DB1DC', 'Midnight — navy-black, moon-silver ink', CLOTH)}

{mode_block('.theme-light', LIGHT, '#7C5B2B', '#A98A4A', '#26345F', 'Parchment — aged paper, iron-gall ink', LEATHER)}

/* ---- lists: the bullet is a short rule, not a dot ----------------------
   Reading view: the marker carries the dash; since 1.14 core also draws its dot on .list-bullet::after,
   so that is hidden wherever markdown is rendered. Live Preview: the dash replaces the dot on the same
   pseudo-element. Collapsed items keep their signal colour in both views. */
.markdown-rendered ul > li:not(.task-list-item)::marker {{ content: "—\\2002"; color: var(--list-marker-color, var(--text-faint)); font-family: "EB Garamond", {KR}, serif; }}
.markdown-rendered ul > li.is-collapsed::marker {{ color: var(--list-marker-color-collapsed); }}
.markdown-rendered .list-bullet::after {{ display: none; }}
.cm-s-obsidian .HyperMD-list-line .list-bullet::after {{
  content: "—"; position: static; width: auto; height: auto; border: 0; border-radius: 0; transform: none; background: none; box-shadow: none;
  font-family: "EB Garamond", {KR}, serif; color: var(--list-marker-color, var(--text-faint)); line-height: 1;
}}
.cm-s-obsidian .is-collapsed ~ .cm-formatting-list .list-bullet::after {{ color: var(--list-marker-color-collapsed); }}

/* ---- Korean prose ---------------------------------------------------- */
.markdown-preview-view, .markdown-source-view .cm-content {{ word-break: keep-all; overflow-wrap: anywhere; }}
.markdown-rendered em, .cm-em {{ font-style: italic; }}

/* ---- callouts: a sealed note, marked with a manicule ------------------- */
.theme-dark  .callout {{ --callout-color: 157, 177, 220; }}
.theme-light .callout {{ --callout-color: 38, 52, 95; }}
.callout {{ border-left-width: 3px; background: var(--background-primary-alt); }}
.callout-title {{ font-family: {SC}; font-weight: 400; letter-spacing: .06em; text-transform: none; font-size: .95em; }}
.callout-icon svg {{ display: none; }}
.callout-icon::before {{ content: "☞"; font-family: {SYM}, "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", serif; font-size: 1.35em; line-height: 1; color: rgb(var(--callout-color)); }}

/* ---- headings: fading bronze rule under H1 and the inline title -------- */
.markdown-rendered h1, .inline-title, .cm-line.HyperMD-header-1 {{
  background: linear-gradient(90deg, var(--interactive-accent) 0, var(--interactive-accent) 36%, transparent 100%) no-repeat 0 100% / 100% 1px;
  padding-bottom: .3em;
}}

/* ---- section rule: a single star on the hairline — Reading view and Live Preview.
   The gradient carries its own gap for the star, so nothing is painted over the paper grain.
   In Live Preview the rule is an <hr> inside the line; core gives it flex: 1 0 0, hence the flex reset. */
.markdown-rendered hr, .markdown-source-view.mod-cm6 .cm-line hr {{ border: 0; height: 1px; width: 60%; flex: 0 0 60%; margin: 2.6em auto; position: relative; overflow: visible;
  background: linear-gradient(90deg, transparent 0, var(--hr-color) 44%, transparent 47%, transparent 53%, var(--hr-color) 56%, transparent 100%); }}
.markdown-rendered hr::after, .markdown-source-view.mod-cm6 .cm-line hr::after {{ content: ""; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 11px; height: 11px; background: var(--text-accent);
  -webkit-mask: {SVG['star']} center / contain no-repeat; mask: {SVG['star']} center / contain no-repeat; }}

/* ---- cover: one feather beside the vault name -------------------------- */
{COVER_SEL}::before {{ content: ""; display: inline-block; width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px; background: var(--text-accent);
  -webkit-mask: {SVG['feather']} center / contain no-repeat; mask: {SVG['feather']} center / contain no-repeat; }}

/* ---- drop cap — Reading view only (Live Preview has no per-paragraph wrapper) */
.markdown-reading-view .markdown-preview-section > div:nth-child(2) > p::first-letter {{
  float: left; font-family: {HEAD}; font-weight: 400;
  font-size: 3.2em; line-height: .82; padding: .08em .12em 0 0; color: var(--text-accent); }}

/* ---- properties: a ruled colophon — hairline dividers, values as bordered labels, a double rule below ---- */
.metadata-container {{ --metadata-border-radius: 0; --metadata-divider-color: var(--background-modifier-border); --metadata-divider-color-hover: var(--background-modifier-border);
  border-bottom: 3px double var(--hr-color); padding-bottom: .6em; }}
.metadata-property-value .multi-select-pill {{ --pill-border-width: 1px; --pill-padding-x: 7px; --pill-padding-y: 1px; --pill-radius: 2px; --pill-weight: 400;
  --pill-background: transparent; --pill-background-hover: var(--background-modifier-hover); --pill-border-color: var(--tag-border-color); --pill-border-color-hover: var(--text-accent); }}

/* ---- hover preview: the same sealed card as a callout, square-cornered ---------- */
.popover.hover-popover {{ background-color: var(--background-primary-alt); border: 1px solid color-mix(in srgb, var(--ephemeris-seal) 50%, transparent); border-radius: 0; box-shadow: 0 10px 28px rgba(0, 0, 0, .35); }}
.popover.hover-popover .markdown-preview-view, .popover.hover-popover .markdown-source-view {{ background-color: transparent; }}

/* ---- embeds: a tipped-in plate — a hairline mount around images and transcluded notes ---- */
body {{ --ephemeris-mount: color-mix(in srgb, var(--hr-color) 55%, transparent); --image-radius: 0;
  --embed-background: var(--background-primary-alt); --embed-padding: .5em 1em .7em;
  --embed-border-top: 1px solid var(--ephemeris-mount); --embed-border-bottom: 1px solid var(--ephemeris-mount);
  --embed-border-start: 1px solid var(--ephemeris-mount); --embed-border-end: 1px solid var(--ephemeris-mount); }}
.markdown-embed-title {{ font-family: {HEAD}; font-weight: 400; font-size: .8em; letter-spacing: .1em; text-transform: uppercase; color: var(--text-accent); }}
.image-embed img {{ box-sizing: border-box; padding: 6px; border: 1px solid var(--ephemeris-mount); background: var(--background-primary-alt); }}

/* ---- tables: the three-line table of a journal — a rule above the head, under it, and under the last row ---- */
body {{ --table-border-width: 0; --table-column-first-border-width: 0; --table-column-last-border-width: 0; --table-row-last-border-width: 1px; --table-header-border-width: 1px; }}
.markdown-rendered th {{ border-bottom: 1px solid var(--table-header-border-color); }}
.markdown-rendered tbody tr:last-child > td {{ border-bottom-color: var(--table-header-border-color); }}

/* ---- date and time fields: written into the ledger, not a form widget. Core boxes them with
   --background-modifier-form-field and a border; here they are an underlined figure in the text face. */
.markdown-rendered input[type="date"], .markdown-rendered input[type="datetime-local"], .markdown-rendered input[type="time"] {{
  appearance: none; -webkit-appearance: none; font-family: "EB Garamond", {KR}, serif; font-size: .95em; font-variant-numeric: tabular-nums;
  color: var(--text-muted); background: transparent; border: 0; border-bottom: 1px solid var(--background-modifier-border); border-radius: 0; box-shadow: none;
  height: auto; line-height: 1.5; padding: 0 2px 1px var(--size-4-6); }}
.markdown-rendered input[type="date"]:hover, .markdown-rendered input[type="date"]:focus, .markdown-rendered input[type="date"]:active,
.markdown-rendered input[type="datetime-local"]:hover, .markdown-rendered input[type="datetime-local"]:focus, .markdown-rendered input[type="datetime-local"]:active,
.markdown-rendered input[type="time"]:hover, .markdown-rendered input[type="time"]:focus, .markdown-rendered input[type="time"]:active {{
  color: var(--text-normal); background: transparent; border-bottom-color: var(--interactive-accent); box-shadow: none; outline: none; }}
.markdown-rendered input[type="date"]::-webkit-calendar-picker-indicator, .markdown-rendered input[type="datetime-local"]::-webkit-calendar-picker-indicator {{ opacity: .4; }}
.markdown-rendered input[type="date"]::-webkit-datetime-edit-text, .markdown-rendered input[type="datetime-local"]::-webkit-datetime-edit-text {{ color: var(--text-faint); }}

/* ---- callout ink by family: reference (cite, abstract, summary, link) keeps the seal; records and
   procedure (metadata, subjects, procedure, amended, todo, example, info, tip) take bronze. Two inks only. */
.theme-dark  .callout:is([data-callout="metadata"], [data-callout="subjects"], [data-callout="procedure"], [data-callout="amended"], [data-callout="todo"], [data-callout="example"], [data-callout="info"], [data-callout="tip"]) {{ --callout-color: 200, 154, 94; }}
.theme-light .callout:is([data-callout="metadata"], [data-callout="subjects"], [data-callout="procedure"], [data-callout="amended"], [data-callout="todo"], [data-callout="example"], [data-callout="info"], [data-callout="tip"]) {{ --callout-color: 124, 91, 43; }}

/* ---- correction ink: a struck line stays legible, the way a lab book never erases ---- */
.markdown-rendered del, .cm-strikethrough {{ color: var(--text-faint); text-decoration-color: var(--hr-color); text-decoration-thickness: 1px; }}

/* ---- letterforms: small caps for tags, table headers, folders ---------- */
.tag, a.tag {{ font-family: {SC}; letter-spacing: .06em; text-transform: none; border-radius: 2px; padding: 0 8px; }}
.markdown-rendered th {{ font-family: {SC}; font-weight: 400; font-size: .85em; letter-spacing: .06em; text-transform: none; color: var(--text-muted); }}
.nav-folder-title-content {{ font-family: {HEAD}; font-weight: 400; letter-spacing: .06em; font-size: .9em; }}
.metadata-property-key-input {{ letter-spacing: .04em; text-transform: none; font-variant-caps: small-caps; font-size: .95em; }}

/* ---- paper grain (inline SVG). Keep alpha ≤ .5 so small Hangul stays crisp */
.workspace-leaf-content[data-type="markdown"] .view-content {{ background-image: {SVG['grain']}; background-blend-mode: multiply; }}
.theme-dark .workspace-leaf-content[data-type="markdown"] .view-content {{
  background-image: {SVG['stars']}, {SVG['grain']};
  background-repeat: no-repeat, repeat; background-position: top center, 0 0; background-size: 100% auto, auto;
  background-blend-mode: normal, overlay;
}}
"""

open(os.path.join(repo, 'theme.css'), 'w', encoding='utf-8', newline='\n').write(theme)
json.dump({'name': 'Ephemeris', 'version': '0.4.1', 'minAppVersion': '1.5.0', 'author': 'Jin', 'authorUrl': ''},
          open(os.path.join(repo, 'manifest.json'), 'w', encoding='utf-8', newline='\n'), indent=2)
# README.md is written by hand — the generator no longer touches it.
open(os.path.join(repo, '.gitignore'), 'w', encoding='utf-8', newline='\n').write('.DS_Store\nThumbs.db\n__pycache__/\n')

dest = os.path.join(vault, '.obsidian', 'themes', 'Ephemeris'); os.makedirs(dest, exist_ok=True)
for f in ('theme.css', 'manifest.json'):
    open(os.path.join(dest, f), 'w', encoding='utf-8', newline='\n').write(open(os.path.join(repo, f), encoding='utf-8').read())
print('theme.css', os.path.getsize(os.path.join(repo, 'theme.css')), 'bytes; installed to', dest)
