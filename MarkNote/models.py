"""Note-type (model) creation and updates.

`ensure_models()` runs on every profile open: it creates the Basic + Cloze
note types on first install, then pushes the current templates + CSS to both
so changes to HTMLandCSS.py propagate to existing decks. Nothing is written
when the stored templates already match, so an unchanged addon doesn't touch
the collection (or create sync traffic) on every launch.

Fields are set to Anki's "Use HTML editor by default" option, so the editor
shows the raw markdown source in a plain-text (CodeMirror) input rather than
the rich-text WYSIWYG one. The rendered preview overlay (see editor.py) sits
on top of that whenever the field isn't focused. Their "Editing Font" is set
to the card font so source, preview and card share one size.
"""
from anki.consts import MODEL_CLOZE, MODEL_STD
from aqt import mw

from .constants import MODEL_NAME
from .HTMLandCSS import (FONT_FAMILY, FONT_SIZE, back, back_cloze, css, front,
                         front_cloze)

# Anki's stock defaults for a new field. Fields still at these are treated as
# never customised and moved to the card font; anything else is left alone.
_STOCK_FONT = ("Arial", 20)

BASIC_NAME = MODEL_NAME + " Basic"
CLOZE_NAME = MODEL_NAME + " Cloze"


def ensure_models():
    mm = mw.col.models
    basic = mm.by_name(BASIC_NAME) or _create(
        BASIC_NAME, MODEL_STD, ("Front", "Back"), front, back)
    cloze = mm.by_name(CLOZE_NAME) or _create(
        CLOZE_NAME, MODEL_CLOZE, ("Text", "Back Extra"), front_cloze, back_cloze)
    _push_templates(basic, front, back)
    _push_templates(cloze, front_cloze, back_cloze)


def _create(name, kind, field_names, qfmt, afmt):
    mm = mw.col.models
    notetype = mm.new(name)
    notetype["type"] = kind
    notetype["css"] = css
    for field_name in field_names:
        field = mm.new_field(field_name)
        field["plainText"] = True
        field["font"] = FONT_FAMILY
        field["size"] = FONT_SIZE
        mm.add_field(notetype, field)
    template = mm.new_template(name)
    template["qfmt"] = qfmt
    template["afmt"] = afmt
    mm.add_template(notetype, template)
    mm.add(notetype)
    return mm.by_name(name)


def _push_templates(notetype, qfmt, afmt):
    template = notetype["tmpls"][0]
    fields_need_plain = [f for f in notetype["flds"] if not f.get("plainText")]
    fields_need_font = [f for f in notetype["flds"]
                        if (f.get("font"), f.get("size")) == _STOCK_FONT]
    if (template["qfmt"] == qfmt and template["afmt"] == afmt
            and notetype["css"] == css
            and not fields_need_plain and not fields_need_font):
        return
    template["qfmt"] = qfmt
    template["afmt"] = afmt
    notetype["css"] = css
    for field in fields_need_plain:
        field["plainText"] = True
    for field in fields_need_font:
        field["font"] = FONT_FAMILY
        field["size"] = FONT_SIZE
    mw.col.models.update_dict(notetype)
