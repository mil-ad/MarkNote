"""Note-type (model) creation and updates.

`ensure_models()` runs on every profile open: it creates the Basic + Cloze
note types on first install, then pushes the current templates + CSS to both
so changes to HTMLandCSS.py propagate to existing decks. Nothing is written
when the stored templates already match, so an unchanged addon doesn't touch
the collection (or create sync traffic) on every launch.
"""
from anki.consts import MODEL_CLOZE, MODEL_STD
from aqt import mw

from .constants import MODEL_NAME
from .HTMLandCSS import back, back_cloze, css, front, front_cloze

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
        mm.add_field(notetype, mm.new_field(field_name))
    template = mm.new_template(name)
    template["qfmt"] = qfmt
    template["afmt"] = afmt
    mm.add_template(notetype, template)
    mm.add(notetype)
    return mm.by_name(name)


def _push_templates(notetype, qfmt, afmt):
    template = notetype["tmpls"][0]
    if (template["qfmt"] == qfmt and template["afmt"] == afmt
            and notetype["css"] == css):
        return
    template["qfmt"] = qfmt
    template["afmt"] = afmt
    notetype["css"] = css
    mw.col.models.update_dict(notetype)
