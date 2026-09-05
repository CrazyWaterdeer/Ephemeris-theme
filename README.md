# Grimoire

An Obsidian theme for a Hogwarts student's notebook — wizarding-world dark academia, built for a Korean-prose research vault.

- Dark: **Midnight** `#141A2A`, moon-silver ink, bronze links and rules, blue-black seals (callouts, H3).
- Light: **Parchment** `#EFE8D6`, iron-gall ink.
- Frame (sidebar, tabs, status bar): navy book cloth in dark mode, leather in light mode.
- Status emoji (📚 ✏ 📖 📗 📜 💀) render monochrome, in the text colour, via a local symbol font (Segoe UI Symbol on Windows; install Noto Emoji elsewhere).
- Type: IM Fell English headings, EB Garamond for Latin (both embedded), **Noto Serif KR** for the body — install it on each machine.
- Ornaments, deliberately few: one star on section rules, a manicule on callouts, a feather beside the vault name, a drop cap in Reading view.

## Install

**In a vault:** copy `manifest.json` and `theme.css` into `.obsidian/themes/Grimoire/`, then Settings → Appearance → Themes → Grimoire.

**On another machine via BRAT:** install the *Obsidian42 – BRAT* plugin → "Add a beta theme" → this repository's URL. (The repository must be public, or BRAT needs a token.)

**Required:** Settings → Appearance → *Text font* and *Interface font* must be empty; any value there overrides the theme's fonts.

## Notes

- Callout colours are bare `R, G, B` triplets because core still composes `rgba(var(--callout-color), a)`.
- The feather uses the vault-profile selector; if it does not appear after an Obsidian update, adjust the selector at the end of `theme.css`.
- The drop cap only renders in Reading view.
