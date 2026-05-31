"""Copies bundled JS/CSS/fonts from the addon dir into Anki's media folder.

The media folder syncs to AnkiWeb, so card templates work on any client
(including mobile) without the addon installed there.
"""
import os
import re
import shutil

from aqt import mw

from .constants import RENDER_FILE

# Matches the legacy unversioned _render.js and any content-hashed _render-<hash>.js.
_RENDER_RE = re.compile(r"^_render(-[0-9a-f]+)?\.js$")

# Files in the addon directory (flat) to mirror into the media folder.
# _render.js is handled separately: it's copied under a content-hashed name
# (RENDER_FILE) so a stale copy from an out-of-date install on another synced
# machine can't shadow it.
BUNDLED_FILES = [
    "_katex.min.js",
    "_katex.css",
    "_markdown-it.min.js",
    "_markdown-it-mark.js",
    "_highlight.js",
    "_highlight.css",
    "_highlight-dark.css",
    "_mhchem.js",
    "_texmath.min.js",
    "_texmath.min.css",
]

# Legacy directories from very old upstream installs; remove if present.
LEGACY_DIRS = ("_katex", "_markdown-it")


def sync_media(addon_path):
    media_dir = mw.col.media.dir()

    for legacy in LEGACY_DIRS:
        legacy_path = os.path.join(media_dir, legacy)
        if os.path.isdir(legacy_path):
            shutil.rmtree(legacy_path)

    _copy(os.path.join(addon_path, "_render.js"),
          os.path.join(media_dir, RENDER_FILE))

    for filename in BUNDLED_FILES:
        _copy(os.path.join(addon_path, filename),
              os.path.join(media_dir, filename))

    fonts_dir = os.path.join(addon_path, "fonts")
    for font in os.listdir(fonts_dir):
        _copy(os.path.join(fonts_dir, font),
              os.path.join(media_dir, font))

    _prune_old_render(media_dir)


def _prune_old_render(media_dir):
    """Trash superseded _render*.js copies so content-hashed names don't pile up.

    Removal goes through col.media.trash_files() rather than os.remove(): per
    the addon docs, the provided methods mark the change for sync (and the files
    go to the media trash rather than vanishing). Best-effort — a failure here
    must never break profile load. Note: while another synced machine is still
    on an older addon, it will keep re-adding its own _render copy, so the two
    may trash/re-add each other's file until every machine is updated. That's
    sync churn, not breakage: each machine's template references the exact name
    it just wrote, so template and renderer always stay a matched pair.
    """
    try:
        stale = [
            name for name in os.listdir(media_dir)
            if name != RENDER_FILE and _RENDER_RE.match(name)
        ]
        if stale:
            mw.col.media.trash_files(stale)
    except Exception:
        pass


def _copy(src, dst):
    # Always overwrite: addon updates need to push new bundled files into the
    # media folder. Anki's media sync detects the content change. (The official
    # add_file/write_data are unsuitable here — they rename on collision, which
    # would break the fixed filenames the templates reference.)
    shutil.copyfile(src, dst)
