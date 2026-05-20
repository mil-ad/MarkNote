PACKAGE := MDKaTeX-mil
ANKIADDON := $(PACKAGE).ankiaddon
SRC_DIR := MDKaTeX

.PHONY: package clean

package:
	rm -f $(ANKIADDON)
	cd $(SRC_DIR) && zip -r -q ../$(ANKIADDON) ./* -x '*.pyc' -x '__pycache__/*'
	@echo "Built $(ANKIADDON)"

clean:
	rm -f $(ANKIADDON)
