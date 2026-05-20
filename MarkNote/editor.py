"""Injects the live markdown preview pane into the Anki editor for MarkNote notes."""
from .constants import MODEL_NAME
from .HTMLandCSS import HTMLforEditor

_EDITOR_STYLE = """
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerText = `
        table, th, td {
            border: 1px solid black;
            border-collapse: collapse;
        }
        .nightMode table, .nightMode th, .nightMode td {
            border-color: #555;
        }
        pre code {
            background-color: #eee;
            border: 1px solid #999;
            display: block;
            padding: 20px;
            overflow: auto;
        }
        .nightMode pre code {
            background-color: #0d1117;
            border-color: #444;
        }`;
    document.head.appendChild(style);
"""

_REMOVE_PREVIEW = """
    var area = document.getElementById('markdown-area');
    if(area) area.remove();
"""

_TARGET_MODELS = {MODEL_NAME + " Basic", MODEL_NAME + " Cloze"}


def markdown_preview(editor):
    if editor.note.model()["name"] in _TARGET_MODELS:
        editor.web.eval(HTMLforEditor)
        editor.web.eval(_EDITOR_STYLE)
    else:
        editor.web.eval(_REMOVE_PREVIEW)
