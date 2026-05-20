# MarkNote
Creates a new Basic and a new Cloze Note Type for Anki that support Markdown and KaTeX.

This is a fork of [Jwrede/Anki-KaTeX-Markdown](https://github.com/Jwrede/Anki-KaTeX-Markdown). It installs under its own package name (`MarkNote`) and creates separate card types (`MarkNote Basic` / `MarkNote Cloze`) so it can coexist with the upstream addon.

## Changes from upstream

- **`$` inside code blocks no longer parsed as math.** Math now goes through the [markdown-it-texmath](https://github.com/goessner/markdown-it-texmath) plugin instead of a separate KaTeX auto-render pass; because texmath integrates with markdown-it's tokenizer, fenced and inline code spans are inherently skipped.
- **Dark mode.** Cards and the editor preview respect Anki's `.nightMode` class; ships a paired light/dark `highlight.js` theme (`github` + `github-dark`).
- **Inline code styling.** `` `like this` `` now renders with a subtle gray pill (GitHub-style), distinct from fenced `<pre><code>` blocks.
- **Smaller default font.** Card body font dropped from 20px to 16px.
- **Bumped & pinned dependencies.** KaTeX 0.12 → 0.16.11, markdown-it 12 → 14.1, markdown-it-mark to upstream npm v4, highlight.js 11.0 → 11.10. Versions are pinned in the `Makefile`; `make deps` re-fetches all bundled JS/CSS/fonts.
- **Reinstall actually propagates changes.** Upstream's `update()` kept templates and media files frozen at first install (so user edits weren't clobbered). This fork pushes templates+CSS on every profile load and overwrites media files, which is the right default for a self-managed install.
- **Refactor.** Python split into focused modules (`models.py`, `media.py`, `editor.py`, `constants.py`); the 5 nearly-identical ~100-line JS blocks in `HTMLandCSS.py` consolidated into a single bundled `_render.js`.
- **Local build.** `make package` produces `MarkNote.ankiaddon` without needing the GitHub Actions release pipeline.

![](https://github.com/Jwrede/Anki-KaTeX-Markdown/blob/main/example.gif)

## Features
<ul>
<li><a href="https://www.intmath.com/cg5/katex-mathjax-comparison.php" rel="nofollow">KaTeX is considered way faster than MathJax</a></li>
<li>Works on any device as long as there is internet connection</li>
<li><a href="https://markdown-it.github.io/" rel="nofollow">Markdown is a great all in one solution for Anki cards</a></li>
<li>Access KaTeX by <code>$...$</code> for inline math or <code>$$...$$</code> for displaystyle math, a list of supported functions can be found <a href="https://katex.org/docs/supported.html" rel="nofollow">here</a> </li>
<li>MathJax can also be accessed via <code>\[ ... \]</code> and <code>\(...\)</code></li>
</ul>

## Used Libraries
<a href="https://github.com/markdown-it/markdown-it">Markdown-It</a>  
<a href="https://github.com/KaTeX/KaTeX">KaTeX</a>

## Installation
* Go to 
<a href="https://ankiweb.net/shared/info/1087328706"><img src="https://preview.redd.it/fka0b5cc48t41.png?auto=webp&s=c26da98dca2863e1d0dddbfd59b5bea6165f4bcb" width="24"></a>
to see how to install this addon for anki
* To install locally, download the latest [release](https://github.com/mil-ad/Anki-KaTeX-Markdown/releases) and install by opening **Anki → Tools → Add-ons → Install** from file, then select **MarkNote.ankiaddon**
* The upstream (non-fork) version is at <https://github.com/Jwrede/Anki-KaTeX-Markdown/releases>
