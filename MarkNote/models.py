"""Note-type (model) creation and updates.

`ensure_models()` runs on every profile load: creates the Basic + Cloze
note types on first install, and overwrites templates + CSS on every load
afterwards so changes to HTMLandCSS.py propagate to existing decks.
"""
import anki
from aqt import mw

from .constants import MODEL_NAME
from .HTMLandCSS import back, back_cloze, css, front, front_cloze


def ensure_models():
    if not mw.col.models.byName(MODEL_NAME + " Basic"):
        _create_basic()
    if not mw.col.models.byName(MODEL_NAME + " Cloze"):
        _create_cloze()
    _push_templates()


def _create_basic():
    m = mw.col.models
    model = m.new(MODEL_NAME + " Basic")
    model['css'] = css
    for field_name in ("Front", "Back"):
        m.addField(model, m.newField(field_name))
    template = m.newTemplate(MODEL_NAME + " Basic")
    template['qfmt'] = front
    template['afmt'] = back
    m.addTemplate(model, template)
    m.add(model)
    m.save(model)


def _create_cloze():
    m = mw.col.models
    model = m.new(MODEL_NAME + " Cloze")
    model["type"] = anki.consts.MODEL_CLOZE
    model['css'] = css
    for field_name in ("Text", "Back Extra"):
        m.addField(model, m.newField(field_name))
    template = m.newTemplate(MODEL_NAME + " Cloze")
    template['qfmt'] = front_cloze
    template['afmt'] = back_cloze
    m.addTemplate(model, template)
    m.add(model)
    m.save(model)


def _push_templates():
    basic = mw.col.models.byName(MODEL_NAME + " Basic")
    cloze = mw.col.models.byName(MODEL_NAME + " Cloze")

    basic['tmpls'][0]['qfmt'] = front
    basic['tmpls'][0]['afmt'] = back
    basic['css'] = css

    cloze['tmpls'][0]['qfmt'] = front_cloze
    cloze['tmpls'][0]['afmt'] = back_cloze
    cloze['css'] = css

    mw.col.models.save(basic)
    mw.col.models.save(cloze)
