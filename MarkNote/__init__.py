"""MarkNote — Markdown + KaTeX Anki note types with code-block-safe math."""
import os

from aqt import gui_hooks, mw

from . import editor, media, models

_ADDON_PATH = os.path.dirname(os.path.realpath(__file__))

# Expose the bundled JS/CSS at /_addons/<package>/... . The editor webview's
# Content Security Policy only permits scripts from Anki's own paths and
# /_addons/ — not the media folder — so the editor preview loads from here.
mw.addonManager.setWebExports(__name__, r".*\.(js|css|woff2?|ttf)")


def _on_profile_open():
    models.ensure_models()
    media.sync_media(_ADDON_PATH)


gui_hooks.profile_did_open.append(_on_profile_open)
gui_hooks.editor_did_load_note.append(editor.on_load_note)
