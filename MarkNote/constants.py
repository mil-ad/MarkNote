"""Names and derived constants shared by the other modules."""
import hashlib
import json
import os

MODEL_NAME = 'MarkNote'

# The addon's top-level package, i.e. its folder name under addons21/. Webviews
# can fetch files exported via setWebExports from /_addons/<ADDON_PACKAGE>/.
ADDON_PACKAGE = __name__.split('.', 1)[0]

_SRC_DIR = os.path.dirname(os.path.realpath(__file__))


def _read_version():
    with open(os.path.join(_SRC_DIR, 'manifest.json'), encoding='utf-8') as fh:
        return json.load(fh)['human_version']


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


VERSION = _read_version()
RENDER_FILE = _render_filename()

# Fallback for clients whose media folder lacks RENDER_FILE (e.g. a phone that
# hasn't synced media yet). Pinned to the release tag for this version, so the
# fallback is a known build rather than whatever `main` holds at the moment.
# The Release workflow creates the `v<VERSION>` tag from manifest.json.
RENDER_CDN_URL = (
    'https://cdn.jsdelivr.net/gh/mil-ad/MarkNote@v' + VERSION + '/MarkNote/_render.js'
)
