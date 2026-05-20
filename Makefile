PACKAGE := MDKaTeX-mil
ANKIADDON := $(PACKAGE).ankiaddon
SRC_DIR := MDKaTeX
FONTS_DIR := $(SRC_DIR)/fonts

# Pinned dependency versions. Bump these and run `make deps` to refresh.
KATEX_VERSION             := 0.16.11
MARKDOWN_IT_VERSION       := 14.1.0
MARKDOWN_IT_MARK_VERSION  := 4.0.0
HIGHLIGHT_JS_VERSION      := 11.10.0
TEXMATH_VERSION           := 1.0.0

JSDELIVR := https://cdn.jsdelivr.net/npm

.PHONY: package clean deps

package:
	rm -f $(ANKIADDON)
	cd $(SRC_DIR) && zip -r -q ../$(ANKIADDON) ./* -x '*.pyc' -x '__pycache__/*'
	@echo "Built $(ANKIADDON)"

clean:
	rm -f $(ANKIADDON)

# Refresh all bundled JS/CSS/fonts to the pinned versions above.
# Run this after bumping a version; commit the resulting file changes.
deps:
	@echo "→ KaTeX $(KATEX_VERSION)"
	curl -fsSL $(JSDELIVR)/katex@$(KATEX_VERSION)/dist/katex.min.js -o $(SRC_DIR)/_katex.min.js
	curl -fsSL $(JSDELIVR)/katex@$(KATEX_VERSION)/dist/katex.min.css \
	  | sed 's|url(fonts/KaTeX_|url(_KaTeX_|g' > $(SRC_DIR)/_katex.css
	curl -fsSL $(JSDELIVR)/katex@$(KATEX_VERSION)/dist/contrib/mhchem.min.js -o $(SRC_DIR)/_mhchem.js
	@echo "→ KaTeX fonts (derived from katex.min.css)"
	rm -rf $(FONTS_DIR) && mkdir -p $(FONTS_DIR)
	@for f in $$(grep -oE '_KaTeX_[A-Za-z0-9-]+\.(woff2|woff|ttf)' $(SRC_DIR)/_katex.css | sort -u); do \
	  upstream=$${f#_}; \
	  curl -fsSL $(JSDELIVR)/katex@$(KATEX_VERSION)/dist/fonts/$$upstream -o $(FONTS_DIR)/$$f || exit 1; \
	done
	@echo "  fetched $$(ls $(FONTS_DIR) | wc -l) fonts"
	@echo "→ markdown-it $(MARKDOWN_IT_VERSION)"
	curl -fsSL $(JSDELIVR)/markdown-it@$(MARKDOWN_IT_VERSION)/dist/markdown-it.min.js -o $(SRC_DIR)/_markdown-it.min.js
	@echo "→ markdown-it-mark $(MARKDOWN_IT_MARK_VERSION)"
	curl -fsSL $(JSDELIVR)/markdown-it-mark@$(MARKDOWN_IT_MARK_VERSION)/dist/markdown-it-mark.min.js -o $(SRC_DIR)/_markdown-it-mark.js
	@echo "→ highlight.js $(HIGHLIGHT_JS_VERSION)"
	curl -fsSL $(JSDELIVR)/@highlightjs/cdn-assets@$(HIGHLIGHT_JS_VERSION)/highlight.min.js -o $(SRC_DIR)/_highlight.js
	curl -fsSL $(JSDELIVR)/@highlightjs/cdn-assets@$(HIGHLIGHT_JS_VERSION)/styles/default.min.css -o $(SRC_DIR)/_highlight.css
	@echo "→ markdown-it-texmath $(TEXMATH_VERSION)"
	curl -fsSL $(JSDELIVR)/markdown-it-texmath@$(TEXMATH_VERSION)/texmath.min.js -o $(SRC_DIR)/_texmath.min.js
	curl -fsSL $(JSDELIVR)/markdown-it-texmath@$(TEXMATH_VERSION)/css/texmath.min.css -o $(SRC_DIR)/_texmath.min.css
	@echo "Done. Review changes with: git diff --stat"
