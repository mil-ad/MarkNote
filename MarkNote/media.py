"""Copies bundled JS/CSS/fonts from the addon dir into Anki's media folder.

The media folder syncs to AnkiWeb, so card templates work on any client
(including mobile) without the addon installed there.
"""
import os
import shutil

from aqt import mw

# Files in the addon directory (flat) to mirror into the media folder.
BUNDLED_FILES = [
    "_render.js",
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

    for filename in BUNDLED_FILES:
        _copy(os.path.join(addon_path, filename),
              os.path.join(media_dir, filename))

    fonts_dir = os.path.join(addon_path, "fonts")
    for font in os.listdir(fonts_dir):
        _copy(os.path.join(fonts_dir, font),
              os.path.join(media_dir, font))


def _copy(src, dst):
    # Always overwrite: addon updates need to push new bundled files into the
    # media folder. Anki's media sync detects the content change.
    shutil.copyfile(src, dst)
