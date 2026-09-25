# MarkNote
Creates a new Basic and a new Cloze Note Type for Anki that support Markdown and KaTeX.

This is a fork of [Jwrede/Anki-KaTeX-Markdown](https://github.com/Jwrede/Anki-KaTeX-Markdown). It installs under its own package name (`MarkNote`) and creates separate card types (`MarkNote Basic` / `MarkNote Cloze`) so it can coexist with the upstream addon.

Requires Anki 2.1.50 or later.

## Changes from upstream

- **`$` inside code blocks no longer parsed as math.** Math now goes through the [markdown-it-texmath](https://github.com/goessner/markdown-it-texmath) plugin instead of a separate KaTeX auto-render pass; because texmath integrates with markdown-it's tokenizer, fenced and inline code spans are inherently skipped.
- **Dark mode.** Cards and the editor preview respect Anki's `.nightMode` class; ships a paired light/dark `highlight.js` theme (`github` + `github-dark`).
- **Inline code styling.** `` `like this` `` now renders with a subtle gray pill (GitHub-style), distinct from fenced `<pre><code>` blocks.
- **Cloze styling survives rendering.** Upstream stripped the `<span class="cloze">` that `{{cloze:Text}}` produces, so deletions lost Anki's blue highlight. They're now preserved in prose and code, and rendered via `\htmlClass` inside math.
- **Smaller default font.** Card body font dropped from 20px to 16px.
- **Bumped & pinned dependencies.** KaTeX 0.12 → 0.16.11, markdown-it 12 → 14.1, markdown-it-mark to upstream npm v4, highlight.js 11.0 → 11.10. Versions are pinned in the `Makefile`; `make deps` re-fetches all bundled JS/CSS/fonts.
- **Reinstall actually propagates changes.** Upstream's `update()` kept templates and media files frozen at first install (so user edits weren't clobbered). This fork pushes templates+CSS and media files whenever they differ from the bundled ones, which is the right default for a self-managed install.
- **Rendered preview in place.** Each editor field shows the rendered markdown while it isn't focused and the raw source while it is: click a field (or tab into it) to edit, move focus away to see the result. Fields default to Anki's plain-text HTML editor (the per-field "Use HTML editor by default" option), so you type markdown as plain text rather than in the rich-text WYSIWYG input. This replaces upstream's separate preview pane below the fields. It works under Anki's editor CSP (the renderer loads from the addon folder via `setWebExports`) and uses the `anki/NoteEditor` JavaScript API for field content and focus rather than probing the DOM.
- **One renderer load per page.** Anki's reviewer keeps a single page alive across cards and re-runs template scripts each time; the renderer and its libraries are now loaded once and reused, instead of being re-fetched and re-evaluated on every card.
- **Refactor.** Python split into focused modules (`models.py`, `media.py`, `editor.py`, `constants.py`); the 5 nearly-identical ~100-line JS blocks in `HTMLandCSS.py` consolidated into a single bundled `_render.js`, copied into the media folder under a content-hashed name so a stale copy from another synced machine can never shadow it.
- **Local build.** `make package` produces `MarkNote.ankiaddon` without needing the GitHub Actions release pipeline.

![](example.gif)

## Features
<ul>
<li><a href="https://www.intmath.com/cg5/katex-mathjax-comparison.php" rel="nofollow">KaTeX is considered way faster than MathJax</a></li>
<li>Works offline on every synced client: all libraries are copied into the media folder, and a CDN fallback covers clients that haven't synced media yet</li>
<li><a href="https://markdown-it.github.io/" rel="nofollow">Markdown is a great all in one solution for Anki cards</a></li>
<li>Access KaTeX by <code>$...$</code> for inline math or <code>$$...$$</code> for displaystyle math, a list of supported functions can be found <a href="https://katex.org/docs/supported.html" rel="nofollow">here</a> </li>
<li>The LaTeX-style delimiters <code>\[ ... \]</code> (display) and <code>\(...\)</code> (inline) are also rendered via KaTeX</li>
</ul>

## Used Libraries
<a href="https://github.com/markdown-it/markdown-it">Markdown-It</a>  
<a href="https://github.com/KaTeX/KaTeX">KaTeX</a>

## Installation
* Download the latest [release](https://github.com/mil-ad/MarkNote/releases) and install it via **Anki → Tools → Add-ons → Install from file**, selecting **MarkNote.ankiaddon**
* Or build it yourself with `make package`
* The upstream (non-fork) version is on [AnkiWeb](https://ankiweb.net/shared/info/1087328706) and at <https://github.com/Jwrede/Anki-KaTeX-Markdown/releases>

## Releasing
1. Bump `human_version` in `MarkNote/manifest.json` and merge to `main`.
2. Run the **Release MarkNote ankiaddon** workflow. It tags the commit `v<version>` and attaches the built `.ankiaddon`.

The tag matters beyond the download: card templates fall back to `https://cdn.jsdelivr.net/gh/mil-ad/MarkNote@v<version>/MarkNote/_render.js` when the media folder doesn't yet contain the renderer, so the tag pins which renderer that fallback serves.
