"""Adds the rendered-preview overlay to editor fields of MarkNote notes.

Each field shows the rendered markdown while it is not focused and the raw
source while it is; the JS side lives in _render.js (startEditor).
"""
import json

from .constants import ADDON_PACKAGE, MODEL_NAME
from .HTMLandCSS import editor_css

_TARGET_MODELS = {MODEL_NAME + " Basic", MODEL_NAME + " Cloze"}

_STYLE_ID = "marknote-editor-style"

# The editor's Content Security Policy only allows scripts from Anki's own
# paths and /_addons/, so the renderer and its libraries are fetched from the
# addon folder (exported via setWebExports in __init__.py). Stylesheets aren't
# restricted, so they come from the media folder, as on cards — that also
# keeps the KaTeX font URLs (relative to the CSS file) resolving.
_JS_BASE = "/_addons/" + ADDON_PACKAGE + "/"
_CSS_BASE = "/"


def _start_js(field_fonts):
    # field_fonts: one {"family", "size"} per field, so each overlay renders in
    # the same font as the raw source it covers (whatever the user set it to).
    opts = {"jsBase": _JS_BASE, "cssBase": _CSS_BASE, "fieldFonts": field_fonts}
    return """
(function() {
    if (!document.getElementById(%(style_id)s)) {
        var style = document.createElement('style');
        style.id = %(style_id)s;
        style.textContent = %(css)s;
        document.head.appendChild(style);
    }
    function go() { MarkNote.startEditor(%(opts)s); }
    if (window.MarkNote) { go(); return; }
    var s = document.createElement('script');
    s.src = %(src)s;
    s.onload = go;
    document.head.appendChild(s);
})();
""" % {
        "style_id": json.dumps(_STYLE_ID),
        "css": json.dumps(editor_css),
        "opts": json.dumps(opts),
        "src": json.dumps(_JS_BASE + "_render.js"),
    }


_STOP_JS = """
(function() {
    if (window.MarkNote) MarkNote.stopEditor();
})();
"""


def on_load_note(editor):
    notetype = editor.note.note_type()
    if notetype["name"] in _TARGET_MODELS:
        fonts = [{"family": f.get("font"), "size": f.get("size")} for f in notetype["flds"]]
        editor.web.eval(_start_js(fonts))
    else:
        editor.web.eval(_STOP_JS)
