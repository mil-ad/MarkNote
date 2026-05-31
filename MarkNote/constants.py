import hashlib
import os

MODEL_NAME = 'MarkNote'
CONF_NAME = 'MARKNOTE'

_SRC_DIR = os.path.dirname(os.path.realpath(__file__))


def _render_filename():
    """Content-hashed media name for _render.js.

    Cards load this exact filename from the media folder. Hashing the file's
    contents means a stale copy left in collection.media by an out-of-date
    install on another synced machine has a *different* name and simply isn't
    referenced by the template — so it can't shadow the current renderer.
    The name also changes automatically whenever _render.js changes, so there
    is nothing to bump by hand.
    """
    with open(os.path.join(_SRC_DIR, '_render.js'), 'rb') as fh:
        digest = hashlib.sha1(fh.read()).hexdigest()[:8]
    return '_render-' + digest + '.js'


RENDER_FILE = _render_filename()
