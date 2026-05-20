# MarkNote
Creates a new Basic and a new Cloze Note Type for Anki that support Markdown and KaTeX.

This is a fork of [Jwrede/Anki-KaTeX-Markdown](https://github.com/Jwrede/Anki-KaTeX-Markdown). It installs under its own package name (`MarkNote`) and creates separate card types (`MarkNote Basic` / `MarkNote Cloze`) so it can coexist with the upstream addon.

Differences from upstream: math is rendered via [markdown-it-texmath](https://github.com/goessner/markdown-it-texmath) instead of a separate KaTeX auto-render pass, so `$` inside fenced/inline code blocks is no longer parsed as math. Adds dark-mode support, bundles `make deps` for pinned dependency refresh, and bumps KaTeX/markdown-it/highlight.js to current versions.

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
