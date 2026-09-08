# Ephemeris

An Obsidian theme for the notebook a Hogwarts student would actually keep: ink on midnight paper, a bronze rule, a single star between sections, and a page that stays readable through three thousand words of Korean prose. Built for a research vault (Zettelkasten, Dataview dashboards, paper reviews), not for a character shop.

> Screenshot to come: a paper review in dark mode beside the Observation log dashboard.

## What it looks like

**Two papers.** Dark mode is a midnight page (`#141A2A`) with moon-silver ink; light mode is parchment (`#EFE8D6`) with iron-gall ink. Links and rules are bronze in both; callouts, third-level headings and unresolved links carry a blue-black "seal" colour. The ground never changes with the house colours — they are accents only.

**A frame that recedes.** The sidebar, tabs, ribbon and status bar are navy book cloth in dark mode and dark leather in light mode, one step deeper than the page, so the note is the brightest thing on screen.

**Type.** IM Fell English for headings, the inline title, callout titles, tags and table headers (letter-spaced small caps); EB Garamond for Latin text; Noto Serif KR for the body. 17 px on a 1.85 line, a 46.5 rem measure, `word-break: keep-all` for Korean. Both Latin faces are embedded in `theme.css`; Noto Serif KR must be installed on the machine.

**Print conventions rather than decoration.**
- Three-line tables: a rule above the head, one under it, one under the last row — no cell walls.
- Images and transcluded notes sit on a hairline mount, like a tipped-in plate. No rounded corners anywhere.
- The properties block closes with a double rule; list values are bordered labels, the way tags are.
- The hover preview is the same square-cornered card as a callout.
- Date and time fields in rendered notes are an underlined figure in the text face, not a form box.
- List bullets are an em dash in both Reading view and Live Preview.
- Status marks (📚 ✏ 📖 📗 📜 💀) render as monochrome ink from an embedded Noto Emoji subset, so a status column reads as marks, not stickers.

**Ornaments, deliberately few.** One star ✦ on section rules (Reading view and Live Preview); a manicule ☞ on callouts; one feather beside the vault name; a drop cap on the first paragraph in Reading view; a faint star field across the top of the editor pane in dark mode, generated once from a fixed seed. A student uses one or two marks naturally and never plasters them.

## Requirements

- Obsidian 1.5 or later (tested on 1.14).
- **Noto Serif KR** installed on every machine (Google Fonts, OFL). Without it the body falls back to Georgia.
- Settings → Appearance → *Text font* and *Interface font* must be **empty**. Any value there overrides the theme's fonts.
- Windows renders the monochrome symbol fallback from Segoe UI Symbol; on macOS or Linux install Google's *Noto Emoji* (the monochrome one) for glyphs outside the six embedded status marks.

## Install

**Manually:** copy `manifest.json` and `theme.css` into `<vault>/.obsidian/themes/Ephemeris/`, then Settings → Appearance → Themes → Ephemeris.

**With BRAT:** install *Obsidian42 – BRAT*, choose *Add a beta theme*, and give it this repository's URL (the repository must be public, or BRAT needs a token).

The theme is not yet in the community theme list.

## Companion pieces (`extras/dashboard`)

The vault's dashboards are Dataview scripts, not part of the theme, but they are styled for it and kept here:

- `dashboard.js` + `dashboard.css` — the **Observation log**: a star chart in which each open project is a constellation and each unread review a field star, the day's orders, the ephemeris (calendar), conditions (weather with an observer's lines), and a line under the chart on days the sky has an event — a new or full moon, a season, a planet at opposition or station, a meteor shower's peak night, an eclipse — computed in the script from orbital elements, no library.
- `Observation log.md` — the note that hosts it (`dv.view("Vector/dashboard", { layout: "log" })`).
- `Broadsheet dashboard.md` — an earlier newspaper layout, kept as a template.

Copy `dashboard.js` to `Vector/` and `dashboard.css` to `.obsidian/snippets/` (enable the snippet); the note carries `cssclasses: [ephemeris-dash]`.

## Adjusting it

There are no Style Settings. The palette is a handful of variables at the top of `theme.css`, one block per mode:

| variable | dark | light | role |
|---|---|---|---|
| `--background-primary` | `#141A2A` | `#EFE8D6` | the page |
| `--text-normal` | `#D9D5C8` | `#2A211A` | ink |
| `--interactive-accent` / `--text-accent` | `#8E6C3C` / `#C89A5E` | `#A98A4A` / `#7C5B2B` | bronze: links, rules, the star |
| `--ephemeris-seal` | `#9DB1DC` | `#26345F` | blue-black: callouts, H3, unresolved links |
| `--background-secondary` | `#0C1019` | `#1C140F` | the frame |

Contrast was checked by script: ink ≥ 8:1 on the dark page, muted text ≥ 5:1, links and seals ≥ 4.5:1.

## Building

`theme.css` is generated. `build/make_theme.py <repo> <vault> [vault-name-selector]` downloads the Latin faces from Google Fonts into `build/fonts/` (cached here), embeds them as base64, draws the star field, and writes `theme.css`, `manifest.json` and this file's companions; it also copies the theme into the vault. `build/emoji_subset.py` makes `fonts/status-marks.woff2` (six glyphs of Noto Emoji with widened advances) with fontTools. Edit the template inside `make_theme.py`, not `theme.css`, or the next build will drop the change.

## Notes and known limits

- Callout colours are bare `R, G, B` triplets because core still composes `rgba(var(--callout-color), a)`.
- The drop cap renders in Reading view only; Live Preview has no per-paragraph wrapper.
- The feather uses the vault-profile selector (`.workspace-sidedock-vault-profile .workspace-drawer-vault-name`); if it vanishes after an Obsidian update, adjust the selector near the end of `theme.css`.
- Tables inside Bases keep their own `--bases-table-*` styling.
- Printing and PDF export use the screen palette; a paper-white print sheet is on the list.

## Fonts and licences

- IM Fell English — Igino Marini, SIL Open Font License 1.1 (embedded).
- EB Garamond — Georg Duffner and Octavio Pardo, SIL Open Font License 1.1 (embedded).
- Noto Emoji subset — Google, SIL Open Font License 1.1 (embedded, six glyphs).
- Noto Serif KR — Google and Adobe, SIL Open Font License 1.1 (not embedded; install it).

The theme's own CSS is released under the MIT License.

## Per-template treatments (`extras/notes/notes.css`)

A second, vault-specific snippet. It knows the templates' headings and fields, so it stays out of the theme: figure headings in a paper review become numbered plates (Reading view), a gene note's fact table becomes a specimen label, an experiment note sits on faint ruled paper and can carry a `> [!amended]` margin correction, a paper record's accession keys are set as small print, and a disambiguation hub lists its names with a cross-reference arrow. Each hooks on a `cssclasses` value the template writes.

## Changelog

- **0.4.1** — The chart's symbols embedded (Noto Sans Symbols, Symbols 2 and monochrome Noto Emoji subsets, ~10 KB): planets, zodiac signs, ☉, the manicule, ✦ and the Moon's phases draw as ink on every device — phones without Segoe UI Symbol had shown the zodiac as colour emoji. Almanac: Sky tonight as an astrolabe (graduated limb and dial outside the ring in both modes, ecliptic through the stars, almucantars, Latin horizon words, stars by magnitude class, planet glyphs, the Moon as its true phase, a magnitude key, almanac time notation).
- **0.4.0** — IM Fell English SC embedded: real small caps for tags, table heads and callout titles (property keys use EB Garamond's); callout ink by family (seal for reference, bronze for records and procedure); struck text as correction ink. Almanac: the chart's outer ring is an ecliptic dial with today's Sun and Moon; moonrise, moonset and astronomical night in Conditions; primary-phase moon marks on the calendar; weekly notes share the ledger controls.
- **0.3.1** — star rule in Live Preview; properties colophon; hover card; plates for embeds and images; three-line tables; ledger date fields; Reading-view bullet fix for Obsidian 1.14.
- **0.3.0** — star field at the top of the editor pane.
- **0.2.2** — embedded status marks; em-dash bullets.
- **0.2.0** — navy cloth frame in dark mode; monochrome status emoji.
- **0.1.0** — first release: the two papers, the type, the four ornaments.
