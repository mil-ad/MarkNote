"""MarkNote — Markdown + KaTeX Anki note types with code-block-safe math."""
import os

from anki.hooks import addHook

from . import editor, media, models

_ADDON_PATH = os.path.dirname(os.path.realpath(__file__))


def _on_profile_loaded():
    models.ensure_models()
    media.sync_media(_ADDON_PATH)


addHook("profileLoaded", _on_profile_loaded)
addHook("loadNote", editor.markdown_preview)
