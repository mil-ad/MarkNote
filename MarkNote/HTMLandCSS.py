"""Card templates and CSS for MarkNote note types.

The heavy lifting (resource loading, markdown-it + texmath pipeline, editor
preview wiring) lives in MarkNote/_render.js. The templates here just embed
the field placeholders and bootstrap _render.js with a CDN fallback. The
editor's bootstrap lives in editor.py because it loads from a different URL.
"""

from .constants import RENDER_CDN_URL, RENDER_FILE


def _bootstrap(invocation):
    """Return a <script> block that loads _render.js then runs `invocation`."""
    return f"""<script>
(function() {{
    function go() {{ {invocation} }}
    // The reviewer keeps one page alive across cards and re-runs template
    // scripts for each one. Reuse the renderer that's already loaded rather
    // than re-fetching it and all its libraries every card.
    if (window.MarkNote) {{ go(); return; }}
    var s = document.createElement('script');
    s.src = '{RENDER_FILE}';
    s.onload = go;
    s.onerror = function() {{
        var s2 = document.createElement('script');
        s2.src = '{RENDER_CDN_URL}';
        s2.onload = go;
        document.head.appendChild(s2);
    }};
    document.head.appendChild(s);
}})();
</script>"""


front = """
<div id="front"><pre>{{Front}}</pre></div>
""" + _bootstrap("MarkNote.start(['front']);")

back = """
<div id="front"><pre>{{Front}}</pre></div>

<hr id=answer>

<div id="back"><pre>{{Back}}</pre></div>
""" + _bootstrap("MarkNote.start(['front', 'back']);")

front_cloze = """
<div id="front"><pre>{{cloze:Text}}</pre></div>
""" + _bootstrap("MarkNote.start(['front']);")

back_cloze = """
<div id="back"><pre>{{cloze:Text}}</pre></div><br>
<div id="extra"><pre>{{Back Extra}}</pre></div>
""" + _bootstrap("MarkNote.start(['back', 'extra']);")


# Styling for rendered markdown. Shared by the card CSS below and the editor
# preview (editor.py injects it into the editor page).
content_css = """
table, th, td {
  border: 1px solid black;
  border-collapse: collapse;
}
.nightMode table, .nightMode th, .nightMode td {
  border-color: #555;
}
:not(pre) > code {
  background-color: rgba(175, 184, 193, 0.25);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}
.nightMode :not(pre) > code {
  background-color: rgba(110, 118, 129, 0.4);
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
}
blockquote {
  margin: 0 0 1em 0;
  padding: 0 1em;
  color: #656d76;
  border-left: 0.25em solid #d0d7de;
}
.nightMode blockquote {
  color: #9198a1;
  border-left-color: #3d444d;
}
"""

css = """
.card {
  font-family: arial;
  font-size: 16px;
  color: black;
  background-color: white;
}
.card.nightMode {
  color: #ececec;
  background-color: #2f2f31;
}
#front, #back, #extra {
  visibility: hidden;
}
""" + content_css

# The reviewer styles .cloze itself; the editor page doesn't, so the preview
# adds Anki's default cloze look.
editor_css = content_css + """
#markdown-area {
  box-sizing: border-box;
  width: 100%;
  padding: 1em;
}
.cloze {
  font-weight: bold;
  color: blue;
}
.nightMode .cloze {
  color: lightblue;
}
"""
