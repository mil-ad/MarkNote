"""Card templates and CSS for MarkNote note types.

The heavy lifting (resource loading, markdown-it + texmath pipeline, editor
preview wiring) lives in MarkNote/_render.js. The templates here just embed
the field placeholders and bootstrap _render.js with a CDN fallback.
"""

from .constants import RENDER_FILE

_RENDER_JS_CDN = (
    "https://cdn.jsdelivr.net/gh/mil-ad/MarkNote@main/MarkNote/_render.js"
)


def _bootstrap(invocation):
    """Return a <script> block that loads _render.js then runs `invocation`."""
    return f"""<script>
(function() {{
    function go() {{ {invocation} }}
    var s = document.createElement('script');
    s.src = '{RENDER_FILE}';
    s.onload = go;
    s.onerror = function() {{
        var s2 = document.createElement('script');
        s2.src = '{_RENDER_JS_CDN}';
        s2.onload = go;
        document.head.appendChild(s2);
    }};
    document.head.appendChild(s);
}})();
</script>"""


# Editor preview is injected via editor.web.eval(); no <script> wrapper.
HTMLforEditor = f"""
(function() {{
    function go() {{ MarkNote.startEditor(); }}
    var s = document.createElement('script');
    s.src = '{RENDER_FILE}';
    s.onload = go;
    s.onerror = function() {{
        var s2 = document.createElement('script');
        s2.src = '{_RENDER_JS_CDN}';
        s2.onload = go;
        document.head.appendChild(s2);
    }};
    document.head.appendChild(s);
}})();
"""

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
table, th, td {
	border: 1px solid black;
	border-collapse: collapse;
}
.nightMode table, .nightMode th, .nightMode td {
	border-color: #555;
}
#front, #back, #extra {
	visibility: hidden;
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
"""
