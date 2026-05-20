/* MarkNote — shared renderer used by every card template and the editor.
 *
 * Loaded once via <script src="_render.js">. Exposes window.MarkNote with:
 *   start(ids)     — load deps, render the listed elements, reveal them
 *   startEditor()  — load deps, wire up the editor's live preview pane
 *
 * Versions here should track the pins in the repo's Makefile.
 */
(function () {
'use strict';

var RESOURCES = [
    { type: 'css', path: '_katex.css',           alt: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css' },
    { type: 'css', path: '_texmath.min.css',     alt: 'https://cdn.jsdelivr.net/npm/markdown-it-texmath@1.0.0/css/texmath.min.css' },
    { type: 'css', path: '_highlight.css',       alt: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/styles/github.min.css' },
    { type: 'css', path: '_highlight-dark.css',  alt: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/styles/github-dark.min.css' },
    { type: 'js',  path: '_highlight.js',        alt: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/highlight.min.js' },
    { type: 'js',  path: '_katex.min.js',        alt: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js' },
    { type: 'js',  path: '_markdown-it.min.js',  alt: 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js' },
    { type: 'js',  path: '_markdown-it-mark.js', alt: 'https://cdn.jsdelivr.net/npm/markdown-it-mark@4.0.0/dist/markdown-it-mark.min.js' },
    { type: 'js',  path: '_texmath.min.js',      alt: 'https://cdn.jsdelivr.net/npm/markdown-it-texmath@1.0.0/texmath.min.js' },
];

// mhchem requires KaTeX to be present at evaluation, so it's loaded after the rest.
var MHCHEM = { type: 'js', path: '_mhchem.js', alt: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js' };

function makeScript(src) {
    var s = document.createElement('script');
    s.src = src;
    return s;
}

function makeLink(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.type = 'text/css';
    l.href = href;
    return l;
}

function loadOne(r) {
    return new Promise(function (resolve, reject) {
        var primary = r.type === 'css' ? makeLink(r.path) : makeScript(r.path);
        primary.onload = resolve;
        primary.onerror = function () {
            var fallback = r.type === 'css' ? makeLink(r.alt) : makeScript(r.alt);
            fallback.onload = resolve;
            fallback.onerror = reject;
            document.head.appendChild(fallback);
        };
        document.head.appendChild(primary);
    });
}

function loadAll() {
    return Promise.all(RESOURCES.map(loadOne)).then(function () {
        return loadOne(MHCHEM);
    });
}

// Anki stores field content as HTML (with <div>, <br>, &nbsp;, ...). Reduce it
// back to a plain markdown source string before handing to markdown-it.
function ankiHtmlToSource(html) {
    return html
        .replace(/<[\/]?pre[^>]*>/gi, '')
        .replace(/<br\s*[\/]?[^>]*>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div[^>]*>/gi, '')
        .replace(/<[\/]?span[^>]*>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&tab;/gi, '\t')
        .replace(/&gt;/gi, '>')
        .replace(/&lt;/gi, '<')
        .replace(/&amp;/gi, '&');
}

function newMarkdownIt() {
    return window.markdownit({
        typographer: true,
        html: true,
        highlight: function (str, lang) {
            if (lang && window.hljs.getLanguage(lang)) {
                try { return window.hljs.highlight(str, { language: lang }).value; } catch (__) {}
            }
            return '';
        },
    })
    .use(window.markdownitMark)
    .use(window.texmath, {
        engine: window.katex,
        delimiters: 'dollars',
        katexOptions: { throwOnError: false },
    });
}

function reveal(ids) {
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.style.visibility = 'visible';
    }
}

window.MarkNote = {
    start: function (ids) {
        return loadAll().then(function () {
            var md = newMarkdownIt();
            for (var i = 0; i < ids.length; i++) {
                var el = document.getElementById(ids[i]);
                if (el) el.innerHTML = md.render(ankiHtmlToSource(el.innerHTML));
            }
            reveal(ids);
        }).catch(function () { reveal(ids); });
    },

    startEditor: function () {
        var existing = document.getElementById('markdown-area');
        if (existing) existing.remove();

        var area = document.createElement('markdown-area');
        area.id = 'markdown-area';
        area.style.display = 'inline-block';
        area.style.overflowY = 'auto';
        area.style.padding = '1%';
        area.style.visibility = 'hidden';
        area.style.width = '98%';
        area.style.height = '100%';

        // Newer Anki (id="fields") vs legacy (class="fields") — both expose
        // field content via a shadow-DOM rich-text editable.
        var modernRoot = document.getElementById('fields');
        var getFieldsText;
        if (modernRoot !== null) {
            document.body.appendChild(area);
            getFieldsText = function () {
                var t  = '# Field 1\n' + modernRoot.children[0].children[1].shadowRoot.children[2].innerHTML;
                    t += '\n# Field 2\n' + modernRoot.children[1].children[1].shadowRoot.children[2].innerHTML;
                return t;
            };
        } else {
            var legacyRoot = document.getElementsByClassName('fields')[0];
            legacyRoot.appendChild(area);
            getFieldsText = function () {
                var t  = '# Field 1\n' + legacyRoot.children[0].getElementsByClassName('rich-text-editable')[0].shadowRoot.children[2].innerHTML;
                    t += '\n# Field 2\n' + legacyRoot.children[1].getElementsByClassName('rich-text-editable')[0].shadowRoot.children[2].innerHTML;
                return t;
            };
        }

        return loadAll().then(function () {
            var md = newMarkdownIt();
            var onKeyup = function () {
                area.innerHTML = md.render(ankiHtmlToSource(getFieldsText()));
                area.style.visibility = 'visible';
            };
            onKeyup();
            document.addEventListener('keyup', onKeyup);
        });
    },
};
})();
